/**
 * CONSTANTS & FORMATTERS
 */
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const DEFAULT_REGISTRAR = 'namecheap';
const REGISTRARS = {
    dynadot: { name: 'Dynadot', getUrl: domain => `https://www.dynadot.com/domain/search?domain=${encodeURIComponent(domain)}` },
    porkbun: { name: 'Porkbun', getUrl: domain => `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}` },
    spaceship: { name: 'Spaceship', getUrl: domain => `https://www.spaceship.com/domain-search/?query=${encodeURIComponent(domain)}` },
    namecheap: { name: 'Namecheap', getUrl: domain => `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}` },
    godaddy: { name: 'GoDaddy', getUrl: domain => `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}` },
    namecom: { name: 'Name.com', getUrl: domain => `https://www.name.com/domain/search/${encodeURIComponent(domain)}` },
    cloudflare: { name: 'Cloudflare Registrar', getUrl: domain => `https://domains.cloudflare.com/?domain=${encodeURIComponent(domain)}` },
    squarespace: { name: 'Squarespace Domains', getUrl: domain => `https://domains.squarespace.com/domain-search?query=${encodeURIComponent(domain)}` },
    hostinger: { name: 'Hostinger', getUrl: domain => `https://www.hostinger.com/domain-name-search?domain=${encodeURIComponent(domain)}` },
    namesilo: { name: 'NameSilo', getUrl: domain => `https://www.namesilo.com/domain/search-domains?query=${encodeURIComponent(domain)}` }
};
let preferredRegistrar = DEFAULT_REGISTRAR;
let currentDomain = '';
let isPrivateLookup = false;
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
const dateFormatter = new Intl.DateTimeFormat('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
});

/**
 * UI HELPERS
 */

// Converts a date to "3 years ago" or "in 2 months"
function getRelativeDistance(date) {
    if (!date) return "";
    const now = new Date();
    const diffInMs = date - now;
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
    
    if (Math.abs(diffInDays) < 30) return rtf.format(diffInDays, 'day');
    
    const diffInMonths = Math.round(diffInDays / 30.44);
    if (Math.abs(diffInMonths) < 12) return rtf.format(diffInMonths, 'month');
    
    const diffInYears = Math.round(diffInDays / 365.25);
    return rtf.format(diffInYears, 'year');
}

// Renders a date as "relative DD/MM/YYYY" without injecting HTML.
function renderDateWithRelative(element, dateString) {
    element.replaceChildren();
    if (!dateString) {
        element.textContent = 'N/A';
        return;
    }
    const date = new Date(dateString);
    if (isNaN(date)) {
        element.textContent = 'N/A';
        return;
    }

    const relative = document.createElement('span');
    relative.className = 'date-relative';
    relative.textContent = `(${getRelativeDistance(date)})`;

    const value = document.createElement('span');
    value.className = 'value-main';
    value.textContent = dateFormatter.format(date);
    element.append(relative, ' ', value);
}

// Logic to turn aistudio.google.com -> google.com 
// and bbc.co.uk -> bbc.co.uk
function getBaseDomain(hostname) {
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname)) return hostname;
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;

    const sld = parts[parts.length - 2];
    const multiPartSuffixes = ['com', 'co', 'net', 'org', 'edu', 'gov', 'ac'];

    if (multiPartSuffixes.includes(sld) && parts.length > 2) {
        return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
}

/**
 * CORE LOGIC
 */

async function init() {
    await initSettings();
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.url) {
        showUnsupportedPage();
        return;
    }
    isPrivateLookup = Boolean(tabs[0].incognito);

    let url;
    try {
        url = new URL(tabs[0].url);
    } catch {
        showUnsupportedPage();
        return;
    }

    const isIpAddress = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) || url.hostname.includes(':');
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || isIpAddress) {
        showUnsupportedPage();
        return;
    }

    const fullHostname = url.hostname.replace(/\.$/, '').toLowerCase();
    const baseDomain = getBaseDomain(fullHostname);
    currentDomain = baseDomain;

    // Update Header UI
    document.getElementById('domain-name').textContent = baseDomain;

    // Check Cache
    const cached = isPrivateLookup ? {} : await browser.storage.local.get(baseDomain);
    const now = Date.now();

    if (cached[baseDomain] && (now - cached[baseDomain].timestamp < CACHE_DURATION)) {
        displayData(cached[baseDomain].data, cached[baseDomain].timestamp);
    } else {
        fetchWhois(baseDomain);
    }

    document.getElementById('refresh-btn').onclick = () => fetchWhois(baseDomain);
}

function showUnsupportedPage() {
    document.getElementById('domain-name').textContent = 'No website domain';
    document.getElementById('refresh-btn').disabled = true;
    showError('Open an HTTP or HTTPS website with a domain name, then try again.');
}

async function initSettings() {
    initNavigation();
    const stored = await browser.storage.local.get('preferredRegistrar');
    preferredRegistrar = REGISTRARS[stored.preferredRegistrar]
        ? stored.preferredRegistrar
        : DEFAULT_REGISTRAR;

    const select = document.getElementById('registrar-select');
    select.value = preferredRegistrar;
    select.onchange = async () => {
        preferredRegistrar = select.value;
        await browser.storage.local.set({ preferredRegistrar });
        updateRegisterButton();
        showSettingsStatus('Preferred registrar saved.');
    };

    document.getElementById('clear-cache-btn').onclick = clearLookupCache;
    document.getElementById('register-btn').onclick = () => {
        browser.tabs.create({ url: REGISTRARS[preferredRegistrar].getUrl(currentDomain) });
    };
}

function initNavigation() {
    const whoisTab = document.getElementById('whois-tab');
    const settingsTab = document.getElementById('settings-tab');
    const whoisPane = document.getElementById('whois-pane');
    const settingsPane = document.getElementById('settings-pane');

    const activate = (showSettings) => {
        whoisPane.classList.toggle('hidden', showSettings);
        settingsPane.classList.toggle('hidden', !showSettings);
        whoisTab.classList.toggle('hidden', !showSettings);
        settingsTab.classList.toggle('hidden', showSettings);
    };

    whoisTab.onclick = () => activate(false);
    settingsTab.onclick = () => activate(true);
}

async function clearLookupCache() {
    const stored = await browser.storage.local.get(null);
    const lookupKeys = Object.entries(stored)
        .filter(([, item]) => item?.data && typeof item?.timestamp === 'number')
        .map(([key]) => key);

    if (lookupKeys.length) await browser.storage.local.remove(lookupKeys);
    showSettingsStatus(lookupKeys.length ? 'Lookup cache cleared.' : 'Cache is already empty.');
}

function showSettingsStatus(message) {
    const status = document.getElementById('settings-status');
    status.textContent = message;
    window.setTimeout(() => {
        if (status.textContent === message) status.textContent = '';
    }, 2500);
}

function updateRegisterButton() {
    const registrar = REGISTRARS[preferredRegistrar];
    document.getElementById('register-btn').textContent = `Check at ${registrar.name}`;
}

async function fetchWhois(domain) {
    toggleLoading(true);
    try {
        // Send message to background.js (which uses IANA bootstrap)
        const response = await browser.runtime.sendMessage({
            action: "fetchWhois",
            domain: domain
        });

        if (response.possiblyAvailable) {
            showPossiblyAvailable(domain);
            return;
        }
        if (response.error) throw new Error(response.error);

        const data = response.data;
        const timestamp = Date.now();

        // Save to cache
        if (!isPrivateLookup) {
            await browser.storage.local.set({ [domain]: { data, timestamp } });
        }
        displayData(data, timestamp);
    } catch (err) {
        showError(err.message);
    } finally {
        toggleLoading(false);
    }
}

function displayData(data, timestamp) {
    document.getElementById('error').classList.add('hidden');
    document.getElementById('availability').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');

    // 1. Cache footer relative time
    const cacheMinutes = Math.round((timestamp - Date.now()) / 60000);
    document.getElementById('cache-status').textContent = isPrivateLookup
        ? 'not cached (private window)'
        : `cached ${cacheMinutes === 0 ? "just now" : rtf.format(cacheMinutes, 'minute')}`;
    document.getElementById('lookup-source').textContent =
        data._lookupSource === 'WHOIS' ? 'Classic WHOIS' : 'RDAP';

    // 2. Registrar
    const regEntity = data.entities?.find(e => e.roles?.includes('registrar'));
    const regName = regEntity?.vcardArray?.[1]?.find(p => p[0] === 'fn')?.[3] || "N/A";
    document.getElementById('registrar').textContent = regName;

    // 3. Dates
    const events = data.events || [];
    const getEventDate = (action) => events.find(e => e.eventAction === action)?.eventDate;

    renderDateWithRelative(document.getElementById('created'), getEventDate('registration'));
    renderDateWithRelative(document.getElementById('updated'), getEventDate('last changed'));
    renderDateWithRelative(document.getElementById('expiry'), getEventDate('expiration'));

    // 4. Nameservers
    const nsContainer = document.getElementById('nameservers-list');
    nsContainer.replaceChildren();
    if (data.nameservers && data.nameservers.length > 0) {
        data.nameservers.forEach(ns => {
            const span = document.createElement('span');
            span.className = 'ns-tag';
            span.textContent = ns.ldhName.toLowerCase();
            nsContainer.appendChild(span);
        });
    } else {
        nsContainer.textContent = "N/A";
    }

    // 5. Status Tags
    const statusContainer = document.getElementById('status-container');
    statusContainer.replaceChildren();
    (data.status || []).forEach(s => {
        const span = document.createElement('span');
        span.className = 'status-tag';
        span.textContent = s.replace(/ /g, '-');
        statusContainer.appendChild(span);
    });
    if (!statusContainer.children.length) statusContainer.textContent = 'N/A';
}

function showPossiblyAvailable(domain) {
    currentDomain = domain;
    document.getElementById('error').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('availability').classList.remove('hidden');
    updateRegisterButton();
}

/**
 * UI STATE CONTROL
 */

function toggleLoading(show) {
    const loader = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    
    if (show) {
        loader.classList.remove('hidden');
        results.classList.add('hidden');
        error.classList.add('hidden');
        document.getElementById('availability').classList.add('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function showError(msg) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = msg;
    errorDiv.classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('availability').classList.add('hidden');
}

// Start the extension
init();

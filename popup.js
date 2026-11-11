/**
 * CONSTANTS & FORMATTERS
 */
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const MAX_CACHED_LOOKUPS = 100;
const DEFAULT_REGISTRAR = 'namecheap';
const extensionApi = globalThis.browser ?? globalThis.chrome;
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
let lookupRevision = 0;
let viewState = { kind: 'unsupported' };
let settingsMessage = '';
let rtf;
let dateFormatter;
const DATE_FORMATS = ['auto', 'dmy', 'mdy', 'ymd'];
let dateFormat = 'auto';
let stopFollowingTab = () => {};
const t = (key, ...values) => I18n.t(key, ...values);
function updateFormatters() {
    rtf = new Intl.RelativeTimeFormat(I18n.locale, { numeric: 'auto', style: 'short' });
    // Undefined preserves the browser's regional locale, including en-US vs en-GB.
    // Leave timeZone unset to use the client's local timezone for every format.
    dateFormatter = new Intl.DateTimeFormat(dateFormat === 'auto' ? undefined : 'en-US-u-ca-gregory-nu-latn', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDate(date) {
    if (dateFormat === 'auto') return dateFormatter.format(date);
    const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(part => [part.type, part.value]));
    const year = parts.year.padStart(4, '0');
    if (dateFormat === 'dmy') return `${parts.day}/${parts.month}/${year}`;
    if (dateFormat === 'mdy') return `${parts.month}/${parts.day}/${year}`;
    return `${year}-${parts.month}-${parts.day}`;
}

function updateDateFormatOptions() {
    const regionalFormatter = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const example = regionalFormatter.format(new Date(2026, 10, 23, 12));
    document.getElementById('date-format-auto').textContent = t('dateFormatAutomatic', example);
}

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

// Renders a relative time and the selected absolute date format without HTML injection.
function renderDateWithRelative(element, dateString) {
    element.replaceChildren();
    if (!dateString) {
        element.textContent = t('notAvailable');
        return;
    }
    const date = new Date(dateString);
    if (isNaN(date)) {
        element.textContent = t('notAvailable');
        return;
    }

    const relative = document.createElement('span');
    relative.className = 'date-relative';
    relative.textContent = `(${getRelativeDistance(date)})`;

    const value = document.createElement('span');
    value.className = 'value-main';
    value.textContent = formatDate(date);
    element.append(relative, ' ', value);
}

// Both automatic and manual input use the same normalization and lookup flow.
async function init() {
    stopFollowingTab();
    const stored = await extensionApi.storage.local.get(['language', 'dateFormat']);
    dateFormat = DATE_FORMATS.includes(stored.dateFormat) ? stored.dateFormat : 'auto';
    await I18n.setLanguage(stored.language || 'auto');
    updateFormatters();
    I18n.apply();
    await initSettings();
    // extension.inIncognitoContext also covers tabs whose URL is unavailable.
    isPrivateLookup = Boolean(extensionApi.extension?.inIncognitoContext);
    let domain;
    try {
        const tabs = await extensionApi.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        isPrivateLookup = isPrivateLookup || Boolean(tab?.incognito);
        if (tab && extensionApi.tabs.onUpdated) {
            const onUpdated = (tabId, changes, updatedTab) => {
                if (tabId !== tab.id || (!('url' in changes) && !('pendingUrl' in changes) && !('status' in changes))) return;
                try {
                    const next = getTabDomain(updatedTab);
                    if (next !== currentDomain) void fetchWhois(next, false);
                } catch {
                    ++lookupRevision;
                    showUnsupportedPage();
                }
            };
            extensionApi.tabs.onUpdated.addListener(onUpdated);
            stopFollowingTab = () => extensionApi.tabs.onUpdated.removeListener(onUpdated);
        }
        domain = getTabDomain(tab);
    } catch {
        showUnsupportedPage();
    }
    initDomainEditor();
    document.getElementById('refresh-btn').onclick = () => {
        if (currentDomain) fetchWhois(currentDomain, true);
    };
    if (domain) await fetchWhois(domain, false);
}

function getTabDomain(tab) {
    // A committed URL can still refer to the previous site during navigation.
    const url = tab?.pendingUrl || tab?.url;
    if (!url || !/^https?:\/\//i.test(url)) throw new Error('unsupported');
    return DomainInput.normalize(url);
}

function initDomainEditor() {
    const form = document.getElementById('domain-form');
    const input = document.getElementById('domain-input');
    const button = document.getElementById('edit-domain-btn');
    const close = () => {
        form.classList.add('hidden');
        button.setAttribute('aria-expanded', 'false');
        button.focus();
    };
    button.onclick = () => {
        form.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
        input.value = currentDomain;
        input.removeAttribute('aria-invalid');
        document.getElementById('domain-input-error').textContent = '';
        input.focus();
        input.select();
    };
    document.getElementById('cancel-domain-btn').onclick = close;
    form.onkeydown = event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
    };
    form.onsubmit = event => {
        event.preventDefault();
        let domain;
        try { domain = DomainInput.normalize(input.value); } catch {
            input.setAttribute('aria-invalid', 'true');
            document.getElementById('domain-input-error').textContent = t('invalidDomain');
            input.focus();
            return;
        }
        close();
        stopFollowingTab();
        fetchWhois(domain, false);
    };
}

function showUnsupportedPage() {
    currentDomain = '';
    viewState = { kind: 'unsupported' };
    renderView();
}

function renderView() {
    document.getElementById('domain-name').textContent = currentDomain || t('noDomain');
    document.getElementById('refresh-btn').disabled = !currentDomain;
    for (const id of ['loading', 'results', 'error', 'availability']) document.getElementById(id).classList.add('hidden');
    switch (viewState.kind) {
        case 'loading': toggleLoading(true); break;
        case 'data': displayData(viewState.data, viewState.timestamp); break;
        case 'available': showPossiblyAvailable(currentDomain); break;
        case 'error': showError(t(viewState.code, viewState.status)); break;
        default: showError(t('unsupported'));
    }
    updateRegisterButton();
}

async function initSettings() {
    initNavigation();
    const dateSelect = document.getElementById('date-format-select');
    dateSelect.value = dateFormat;
    updateDateFormatOptions();
    dateSelect.onchange = async () => {
        dateFormat = DATE_FORMATS.includes(dateSelect.value) ? dateSelect.value : 'auto';
        dateSelect.value = dateFormat;
        updateFormatters();
        renderView();
        await extensionApi.storage.local.set({ dateFormat });
        showSettingsStatus('dateFormatSaved');
    };
    const languageSelect = document.getElementById('language-select');
    const languagePreference = await extensionApi.storage.local.get('language');
    languageSelect.value = Object.hasOwn(I18n.languages, languagePreference.language) ? languagePreference.language : 'auto';
    languageSelect.onchange = async () => {
        const language = languageSelect.value;
        // Start catalog loading before awaiting storage so the latest selection wins.
        const applying = I18n.setLanguage(language);
        await extensionApi.storage.local.set({ language });
        await applying;
        updateFormatters();
        I18n.apply();
        updateDateFormatOptions();
        renderView();
        if (document.getElementById('domain-input').getAttribute('aria-invalid') === 'true') {
            document.getElementById('domain-input-error').textContent = t('invalidDomain');
        }
        showSettingsStatus('languageSaved');
    };
    const stored = await extensionApi.storage.local.get('preferredRegistrar');
    preferredRegistrar = REGISTRARS[stored.preferredRegistrar]
        ? stored.preferredRegistrar
        : DEFAULT_REGISTRAR;

    const select = document.getElementById('registrar-select');
    select.value = preferredRegistrar;
    select.onchange = async () => {
        preferredRegistrar = select.value;
        await extensionApi.storage.local.set({ preferredRegistrar });
        updateRegisterButton();
        showSettingsStatus('registrarSaved');
    };

    document.getElementById('clear-cache-btn').onclick = clearLookupCache;
    document.getElementById('register-btn').onclick = () => {
        extensionApi.tabs.create({ url: REGISTRARS[preferredRegistrar].getUrl(currentDomain) });
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
        document.getElementById(showSettings ? 'settings-title' : 'edit-domain-btn').focus();
    };

    whoisTab.onclick = () => activate(false);
    settingsTab.onclick = () => activate(true);
}

async function clearLookupCache() {
    const stored = await extensionApi.storage.local.get(null);
    const lookupKeys = Object.entries(stored)
        .filter(([, item]) => item?.data && typeof item?.timestamp === 'number')
        .map(([key]) => key);

    if (lookupKeys.length) await extensionApi.storage.local.remove(lookupKeys);
    showSettingsStatus(lookupKeys.length ? 'cacheCleared' : 'cacheEmpty');
}

function showSettingsStatus(message) {
    const status = document.getElementById('settings-status');
    settingsMessage = message;
    status.textContent = t(message);
    window.setTimeout(() => {
        if (settingsMessage === message) { settingsMessage = ''; status.textContent = ''; }
    }, 2500);
}

function updateRegisterButton() {
    const registrar = REGISTRARS[preferredRegistrar];
    document.getElementById('register-btn').textContent = t('checkAt', registrar.name);
}

async function fetchWhois(domain, force = true) {
    const revision = ++lookupRevision;
    currentDomain = domain;
    viewState = { kind: 'loading' };
    renderView();
    try {
        if (!force && !isPrivateLookup) {
            // Cache availability must not prevent a network lookup.
            const cached = await extensionApi.storage.local.get(domain).catch(() => ({}));
            if (revision !== lookupRevision) return;
            const entry = cached[domain];
            if (entry?.data && Number.isFinite(entry.timestamp) && Date.now() - entry.timestamp < CACHE_DURATION) {
                viewState = { kind: 'data', data: entry.data, timestamp: entry.timestamp };
                return;
            }
        }
        const response = await extensionApi.runtime.sendMessage({ action: 'fetchWhois', domain });
        if (revision !== lookupRevision) return;
        if (response?.possiblyAvailable) {
            viewState = { kind: 'available' };
        } else if (response?.error) {
            const codes = { INVALID_DOMAIN: 'invalidDomain', REGISTRY_ERROR: 'registryError', WHOIS_ERROR: 'whoisError', TIMEOUT: 'timeout', LOOKUP_FAILED: 'lookupFailed' };
            viewState = { kind: 'error', code: codes[response.errorCode] || 'lookupFailed', status: response.status };
        } else if (response?.data) {
            const timestamp = Date.now();
            viewState = { kind: 'data', data: response.data, timestamp };
            renderView();
            // Show the result immediately; persistence is best-effort.
            if (!isPrivateLookup) await cacheLookup(domain, response.data, timestamp);
        } else {
            viewState = { kind: 'error', code: 'lookupFailed' };
        }
    } catch {
        if (revision === lookupRevision) viewState = { kind: 'error', code: 'lookupFailed' };
    } finally {
        if (revision === lookupRevision) renderView();
    }
}

async function cacheLookup(domain, data, timestamp) {
    try {
        const stored = await extensionApi.storage.local.get(null);
        const entries = Object.entries(stored)
            .filter(([key, item]) => key !== domain && item?.data && typeof item.timestamp === 'number')
            .sort((a, b) => b[1].timestamp - a[1].timestamp);
        let retained = 0;
        const remove = entries.filter(([, item]) => {
            if (!Number.isFinite(item.timestamp) || timestamp - item.timestamp >= CACHE_DURATION || item.timestamp > timestamp) return true;
            return ++retained >= MAX_CACHED_LOOKUPS;
        }).map(([key]) => key);
        if (remove.length) await extensionApi.storage.local.remove(remove);
        await extensionApi.storage.local.set({ [domain]: { data, timestamp } });
    } catch {
        // A full or unavailable cache must not turn a successful lookup into an error.
    }
}

function displayData(data, timestamp) {
    document.getElementById('error').classList.add('hidden');
    document.getElementById('availability').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');

    // 1. Cache footer relative time
    const cacheMinutes = Math.round((timestamp - Date.now()) / 60000);
    document.getElementById('cache-status').textContent = isPrivateLookup
        ? t('privateCache')
        : (cacheMinutes === 0 ? t('cachedNow') : t('cachedAgo', rtf.format(cacheMinutes, 'minute')));
    document.getElementById('lookup-source').textContent =
        data._lookupSource === 'WHOIS' ? t('classicWhois') : 'RDAP';

    // 2. Registrar
    const regEntity = data.entities?.find(e => e.roles?.includes('registrar'));
    const regName = regEntity?.vcardArray?.[1]?.find(p => p[0] === 'fn')?.[3] || t('notAvailable');
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
        nsContainer.textContent = t('notAvailable');
    }

    // 5. Status Tags
    const statusContainer = document.getElementById('status-container');
    statusContainer.replaceChildren();
    (data.status || []).forEach(s => {
        const span = document.createElement('span');
        span.className = 'status-tag';
        span.textContent = s;
        statusContainer.appendChild(span);
    });
    if (!statusContainer.children.length) statusContainer.textContent = t('notAvailable');
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

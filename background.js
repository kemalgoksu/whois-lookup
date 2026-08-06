const IANA_DNS_BOOTSTRAP = "https://data.iana.org/rdap/dns.json";
const WHOIS_FALLBACK_URL = "https://who-dat.as93.net/";
const BOOTSTRAP_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const POSSIBLY_AVAILABLE = "Possibly available — no registration record was found.";

// 1. Fetch and Cache the TLD map from IANA
async function updateBootstrap() {
  try {
    const response = await fetch(IANA_DNS_BOOTSTRAP);
    const data = await response.json();
    // Store with a timestamp
    await browser.storage.local.set({ 
      bootstrap: data, 
      bootstrapTimestamp: Date.now() 
    });
    console.log("IANA Bootstrap Map Updated.");
  } catch (err) {
    console.error("Failed to update bootstrap:", err);
  }
}

// 2. Find the direct RDAP URL for a TLD
async function getBaseRdapUrl(tld) {
  let { bootstrap, bootstrapTimestamp } = await browser.storage.local.get([
    "bootstrap",
    "bootstrapTimestamp"
  ]);
  
  // If no bootstrap, or it's older than 7 days, refresh it
  if (!bootstrap || !bootstrapTimestamp || Date.now() - bootstrapTimestamp > BOOTSTRAP_MAX_AGE) {
    await updateBootstrap();
    ({ bootstrap } = await browser.storage.local.get("bootstrap"));
  }

  if (!bootstrap?.services) return null;

  // Search the IANA 'services' array
  // Structure: [ [ [tld1, tld2], [base_url1, base_url2] ], ... ]
  const service = bootstrap.services.find(s => s[0].includes(tld.toLowerCase()));
  
  if (service && service[1] && service[1].length > 0) {
    return service[1][0]; // Return the first primary RDAP URL
  }
  return null;
}

// Convert the fallback service response to the small RDAP subset used by popup.js.
function normalizeWhois(data, requestedDomain) {
  const domain = data.domain || data;
  const registrar = data.registrar || {};
  const value = (...values) => values.find(item => item !== undefined && item !== null && item !== "");
  const list = (...values) => {
    const found = value(...values);
    if (!found) return [];
    return Array.isArray(found) ? found : [found];
  };

  const registrarName = value(registrar.name, domain.registrar, data.registrar_name);
  const created = value(
    domain.created_date,
    domain.creation_date,
    data.created_date,
    data.creation_date,
    data.dates?.created
  );
  const updated = value(domain.updated_date, data.updated_date, data.dates?.updated);
  const expires = value(
    domain.expiration_date,
    domain.expiry_date,
    domain.expires_date,
    data.expiration_date,
    data.expiry_date,
    data.dates?.expires
  );

  const events = [];
  if (created) events.push({ eventAction: "registration", eventDate: created });
  if (updated) events.push({ eventAction: "last changed", eventDate: updated });
  if (expires) events.push({ eventAction: "expiration", eventDate: expires });

  return {
    ldhName: value(domain.domain, domain.name, data.domain_name, requestedDomain),
    entities: registrarName ? [{
      roles: ["registrar"],
      vcardArray: ["vcard", [["fn", {}, "text", registrarName]]]
    }] : [],
    events,
    nameservers: list(domain.name_servers, data.name_servers, data.nameservers)
      .filter(Boolean)
      .map(item => value(item?.name, item?.ldhName, item))
      .filter(name => typeof name === "string")
      .map(name => ({ ldhName: name.replace(/\.$/, "") })),
    status: list(domain.status, data.status).filter(Boolean).map(String),
    _lookupSource: "WHOIS"
  };
}

async function fetchClassicWhois(domain) {
  const response = await fetch(`${WHOIS_FALLBACK_URL}${encodeURIComponent(domain)}`, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });

  if (response.status === 404) throw new Error(POSSIBLY_AVAILABLE);
  if (!response.ok) throw new Error(`WHOIS service error (${response.status})`);

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  if (data.isRegistered === false) {
    throw new Error(POSSIBLY_AVAILABLE);
  }
  return normalizeWhois(data, domain);
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message.action === "fetchWhois") {
    const domain = String(message.domain || "").toLowerCase();
    if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain)) {
      return { error: "Invalid domain name." };
    }
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];

    try {
      const baseUrl = await getBaseRdapUrl(tld);
      if (!baseUrl) return { data: await fetchClassicWhois(domain) };

      // Direct query to the Registry server (no rdap.org redirect)
      const queryUrl = `${baseUrl.replace(/\/?$/, "/")}domain/${encodeURIComponent(domain)}`;
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/rdap+json' }
      });

      if (response.status === 404) {
        return { possiblyAvailable: true };
      }
      if (!response.ok) return { error: `Registry error (${response.status})` };

      const data = await response.json();
      data._lookupSource = "RDAP";
      return { data };
    } catch (err) {
      if (err.message === POSSIBLY_AVAILABLE) return { possiblyAvailable: true };
      return { error: err.message || "The registry lookup failed." };
    }
  }
});

// Update bootstrap on install/startup
browser.runtime.onInstalled.addListener(updateBootstrap);
browser.runtime.onStartup.addListener(updateBootstrap);

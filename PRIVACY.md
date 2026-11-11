# Privacy

WHOIS Lookup does not include analytics, advertising, or user accounts.

## Data sent over the network

When you open or refresh the extension popup, or submit a manual lookup, the registered domain name detected from the active tab or entered by you may be sent to:

- The registry RDAP service selected from IANA's bootstrap data; or
- The fallback WHOIS service at `who-dat.as93.net` when no RDAP service is available.

If you select the registration button, the domain name is included in the URL opened at your chosen registrar.

Domain extraction happens locally. Pasted URL paths, query strings, and fragments are discarded; they are not sent for lookup. International domain names are converted to their ASCII (punycode) form. Invalid input is not sent. Only the registered domain is queried, rather than individual subdomains.

These third-party services may process requests according to their own privacy policies and server logs.

## Data stored locally

The extension stores the IANA bootstrap data, lookup results, lookup timestamps, your preferred registrar, and your language preference in the browser's local extension storage. Lookup results expire for display purposes after one hour. Each successful non-private lookup removes expired cached results and retains at most 100 recent lookups; records may remain stored until the next such lookup or until you clear the cache. Lookup results still display if caching is unavailable. You can remove cached lookup results from the extension's settings. Manually entered text is not saved separately as search history; non-private lookup results use the same domain-keyed cache as automatic lookups. Reopening the popup returns to the active tab.

Lookup results from private browsing windows are not stored. The IANA bootstrap data, preferred registrar, and language setting remain available because they are not private browsing-history data. Translation catalogs and the domain parser are packaged locally and do not contact translation services.

Your date-format preference is also stored locally. Automatic formatting reads the browser's regional locale and the client's local timezone, independently of the interface language. These settings are used only for display; no geolocation or IP lookup is performed, and the original cached timestamps are unchanged. Clearing the lookup cache preserves all display preferences.

The extension does not transmit locally stored preferences or cached results to the developer.

## Permissions

- `activeTab` reads the current tab URL after you open the extension so it can identify the domain.
- `storage` keeps bootstrap data, preferences, and non-private lookup results locally.

The extension requests no persistent website access. HTTPS requests to IANA, registry RDAP servers, and the WHOIS fallback use the servers' cross-origin access (CORS) support. A server that does not allow these requests may fail to return a lookup result; the extension does not bypass that restriction or request access to all websites.

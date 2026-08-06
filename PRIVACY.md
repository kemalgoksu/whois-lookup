# Privacy

Pro WHOIS Look does not include analytics, advertising, or user accounts.

## Data sent over the network

When you open or refresh the extension popup, the domain name from the active tab may be sent to:

- The registry RDAP service selected from IANA's bootstrap data; or
- The fallback WHOIS service at `who-dat.as93.net` when no RDAP service is available.

If you select the registration button, the domain name is included in the URL opened at your chosen registrar.

These third-party services may process requests according to their own privacy policies and server logs.

## Data stored locally

The extension stores the IANA bootstrap data, lookup results, lookup timestamps, and your preferred registrar in Firefox's local extension storage. Lookup results expire for display purposes after one hour. You can remove cached lookup results from the extension's settings.

The extension does not transmit locally stored preferences or cached results to the developer.

## Permissions

- `tabs` reads the active tab URL so the extension can identify its domain.
- `storage` and `unlimitedStorage` keep bootstrap data, preferences, and lookup results locally.
- `<all_urls>` allows direct requests to registry RDAP servers, whose hosts vary by top-level domain.

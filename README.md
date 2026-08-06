# Pro WHOIS Look

Pro WHOIS Look is a lightweight Firefox extension that shows registration details for the domain in the active tab. It queries the registry's RDAP endpoint when available and falls back to a classic WHOIS web service.

## Features

- Detects the domain in the active tab
- Shows the registrar, creation/update/expiration dates, nameservers, and domain status
- Caches lookups locally for one hour
- Indicates when a domain may be available
- Opens a configurable registrar for a final availability check
- Lets you clear cached lookup data from the settings view

## Install locally

1. Clone or download this repository.
2. Open `about:debugging` in Firefox.
3. Select **This Firefox**.
4. Select **Load Temporary Add-on**.
5. Choose `manifest.json` from this folder.

Temporary add-ons are removed when Firefox restarts. For permanent distribution, package and sign the extension through [Firefox Add-ons](https://addons.mozilla.org/developers/).

## How it works

The extension downloads the [IANA RDAP DNS bootstrap file](https://data.iana.org/rdap/dns.json), selects the registry endpoint for the domain's top-level domain, and performs a direct RDAP query. If no RDAP endpoint is listed, it uses the fallback WHOIS JSON service configured in `background.js`.

Lookup results and the IANA bootstrap data are stored in Firefox local extension storage. See [PRIVACY.md](PRIVACY.md) for details.

## Development

There is no build step or dependency installation. Edit the HTML, CSS, JavaScript, and manifest files directly, then reload the temporary add-on from `about:debugging`.

Before submitting a change:

1. Confirm `manifest.json` is valid JSON.
2. Reload the extension without errors.
3. Test a registered domain, an unregistered domain, settings persistence, and cache clearing.

## Repository layout

- `manifest.json` — Firefox Manifest V3 configuration
- `background.js` — RDAP/WHOIS lookup and bootstrap caching
- `popup.html`, `popup.css`, `popup.js` — popup interface and local result cache
- `icon.png` — packaged toolbar icon

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

No license has been selected yet. Until a license file is added, copyright law reserves all rights to the repository owner.

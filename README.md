# WHOIS Lookup

WHOIS Lookup is a lightweight Firefox and Chrome extension that shows registration details for the domain in the active tab. It queries the registry's RDAP endpoint when available and falls back to a classic WHOIS web service.

## Features

- Detects the domain in the active tab
- Clearly discloses that the current domain is sent for lookup
- Shows the registrar, creation/update/expiration dates, nameservers, and domain status
- Caches lookups locally for one hour
- Indicates when a domain may be available
- Opens one of 10 configurable popular registrars for a final availability check
- Lets you clear cached lookup data from the settings view
- Does not cache lookup results from private browsing windows

## Build

There are no dependencies to install. Generate ready-to-load extensions for both browsers with:

```sh
node scripts/build.mjs
```

The command writes the shared source files and the appropriate browser manifest to `build/firefox/` and `build/chrome/`.

## Install locally

### Firefox

1. Run the build command above, or use the repository root directly.
2. Open `about:debugging` in Firefox.
3. Select **This Firefox**.
4. Select **Load Temporary Add-on**.
5. Choose `build/firefox/manifest.json` (or the root `manifest.json`).

Temporary add-ons are removed when Firefox restarts. For permanent distribution, package and sign the extension through [Firefox Add-ons](https://addons.mozilla.org/developers/).

Firefox 140 or newer is required so Firefox can display its built-in browsing-data transmission consent during installation.

### Chrome

1. Run the build command above.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the generated `build/chrome/` directory.

## How it works

The extension downloads the [IANA RDAP DNS bootstrap file](https://data.iana.org/rdap/dns.json), selects the registry endpoint for the domain's top-level domain, and performs a direct RDAP query. If no RDAP endpoint is listed, it uses the fallback WHOIS JSON service configured in `background.js`.

Lookup results and the IANA bootstrap data are stored in local extension storage. See [PRIVACY.md](PRIVACY.md) for details.

## Development

Edit the shared HTML, CSS, and JavaScript files directly. Firefox-specific settings live in `manifest.json`; Chrome-specific settings live in `manifest.chrome.json`. Run `node scripts/build.mjs` after changes, then reload the generated extension in the browser.

Before submitting a change:

1. Run `node --test tests/extension.test.cjs`, `node scripts/build.mjs`, and `npx --yes web-ext@10.6.0 lint`.
2. Reload both generated extensions without errors.
3. Test a registered domain, an unregistered domain, settings persistence, and cache clearing.
4. For Firefox, run `npx --yes web-ext@10.6.0 build --overwrite-dest` and upload the ZIP from `web-ext-artifacts/`.
5. For Chrome, ZIP the contents of `build/chrome/` for Chrome Web Store submission.

See [AMO_SUBMISSION.md](AMO_SUBMISSION.md) for listing copy, permission
justifications, reviewer notes, and the pre-submission checklist.

## Repository layout

- `manifest.json` — Firefox Manifest V3 configuration
- `manifest.chrome.json` — Chrome Manifest V3 configuration
- `background.js` — RDAP/WHOIS lookup and bootstrap caching
- `popup.html`, `popup.css`, `popup.js` — popup interface and local result cache
- `icons/` — packaged toolbar and Add-ons Manager icons
- `scripts/build.mjs` — creates browser-specific directories from the shared code

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is open source and available under the [MIT License](LICENSE).

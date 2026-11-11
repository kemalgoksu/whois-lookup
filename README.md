# WHOIS Lookup

WHOIS Lookup is a lightweight Firefox and Chrome extension that shows registration details for the domain in the active tab. It queries the registry's RDAP endpoint when available and falls back to a classic WHOIS web service.

## Features

- Detects the domain in the active tab
- Looks up manually entered domains or pasted HTTP/HTTPS URLs with the edit button
- Resolves registered domains accurately using a bundled public suffix list, including international domain names
- Supports English, Turkish, German, Spanish, French, Brazilian Portuguese, and Japanese, with automatic detection and a saved language override
- Clearly discloses that the current domain is sent for lookup
- Shows the registrar, creation/update/expiration dates, nameservers, and domain status
- Caches up to 100 recent lookups locally for one hour, pruning expired results on successful non-private lookups
- Indicates when a domain may be available
- Opens one of 10 configurable popular registrars for a final availability check
- Lets you clear cached lookup data from the settings view
- Does not cache lookup results from private browsing windows

## Build

The readable domain parser and translations are committed, so building from a checkout requires no dependency download. Generate ready-to-load extensions for both browsers with:

```sh
node scripts/build.mjs
```

The command writes the shared source files and the appropriate browser manifest to `build/firefox/` and `build/chrome/`.

To reproduce the bundled parser, use Node.js 22 or newer, run `npm ci --ignore-scripts`, then `npm run vendor`. Exact dependency versions and integrity hashes are recorded in `package-lock.json`; the licenses ship in `vendor/`. No remote code is loaded by the extension.

## Manual lookups and language

Click the edit button beside the domain, enter a domain or paste an HTTP/HTTPS URL, then press Enter or **Look up**. **Cancel** or Escape keeps the current lookup. International domains are converted to ASCII for queries. Only the registered domain is sent: `shop.example.co.uk/path` becomes `example.co.uk`. Private hosting suffixes are ignored for registration boundaries: `site.blogspot.com` queries `blogspot.com`. Invalid domains, IP addresses, localhost, and bare public suffixes are rejected locally.

Manual entry also works on browser-internal pages. Refresh queries the displayed domain again; reopening the popup returns to the active tab. Manual queries use the same one-hour cache and private-window protections as automatic queries.

Choose **Settings → Language** to override automatic browser-language detection. English is the fallback for unsupported languages and missing translations. Brazilian Portuguese is the only Portuguese locale in this release; other Portuguese variants fall back to English. The override changes popup text and relative-time wording immediately; browser-managed manifest text follows the browser language.

Choose **Settings → Date format** for **Automatic (regional settings)**, **DD/MM/YYYY**, **MM/DD/YYYY**, or **YYYY-MM-DD**, with examples shown beside each choice. Automatic uses the browser's full regional locale, preserving differences such as US and UK English, independently of the interface language. Every format uses the client's local timezone. The saved preference applies immediately without another lookup and survives cache clearing. Detection stays local, without geolocation or an IP lookup. Cached timestamps remain unchanged.

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

The popup prefers a pending navigation URL when the browser exposes it and follows URL updates while it stays open, including redirects. Submitting a manual domain stops this automatic following until the popup is reopened. With the existing `activeTab` permission, browsers can hide a destination before navigation commits; detecting every connecting tab would require broader tab access. No page-load completion event is required when the URL is already available.

An expired IANA map is used immediately while one shared download refreshes it in the background. Only a missing or invalid map requires the lookup to wait for IANA. Registry and WHOIS response times still depend on the external services.

Only `activeTab` and `storage` permissions are requested. Clicking the toolbar icon grants temporary access to the active tab's URL; no persistent website access is requested. Network requests rely on the HTTPS lookup services' cross-origin access (CORS) support. Servers that do not permit these requests may fail to return a result.

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

See [MARKETPLACE.md](MARKETPLACE.md) for Chrome and Firefox localization/promotion instructions and [MARKETPLACE_COPY.md](MARKETPLACE_COPY.md) for copy, release notes, and screenshot captions in all seven languages.

For browser layout and interaction checks, run `npm ci --ignore-scripts`, then `node scripts/ui-check.mjs`. On Windows it uses installed Chrome and Firefox in their default locations; set `CHROME_PATH` and `FIREFOX_PATH` elsewhere. It launches isolated headless profiles, checks the real popup with deterministic extension API fixtures in both engines, and writes screenshots to `output/ui/`. It does not replace loading the actual extension packages or checking live RDAP endpoints.

Run `npm run test:network` for an opt-in live permission check. It builds both extensions and runs their real background lookup code in isolated headless Firefox and Chrome profiles with no host permissions. It clears extension storage, downloads fresh IANA bootstrap data, checks several registered domains and an unregistered domain, and forces the WHOIS fallback path. This sends requests to the disclosed public lookup services; network availability and server rate limits can affect the result. Test copies and profiles are stored under `output/network/`; the built packages contain no test instrumentation.

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

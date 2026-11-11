# Firefox Add-ons submission notes

This file is a checklist and source of copy for the AMO listing. It is excluded
from the extension package by `web-ext-config.mjs`.

For 2.1 localized listing copy, screenshot captions, release notes, and marketplace workflows, see [MARKETPLACE.md](MARKETPLACE.md) and [MARKETPLACE_COPY.md](MARKETPLACE_COPY.md).

## Build and validate

Requires Node.js 22 or newer. There is no source compilation or minification.
The files in the package are the human-readable source files.

```sh
node --test tests/extension.test.cjs
npx --yes web-ext@10.6.0 lint
npx --yes web-ext@10.6.0 build --overwrite-dest
```

Upload the ZIP created in `web-ext-artifacts/`. Do not zip the repository
directory itself.

## Suggested listing copy

Summary:

> Look up registration details for any domain or the website in your active tab.

Description:

> WHOIS Lookup displays the registrar, registration dates, nameservers, and
> registry status for the website in your active tab or a domain you enter. Paste
> a website URL or domain name using the edit button beside the current domain.
> Choose among seven interface languages and regional or explicit date formats
> in Settings. All dates use the local timezone. Lookups use the registry's
> RDAP service when available and a classic WHOIS fallback otherwise. Results are
> cached locally for one hour, private-window results are not cached, and the
> cache can be cleared from the popup settings.

Suggested category: Web Development

## Permissions and data justification

- `activeTab`: reads the active tab URL only after the user opens the toolbar
  popup, so the extension can determine which domain to look up.
- `storage`: stores the IANA RDAP bootstrap data, language and date-format preferences, preferred registrar, and
  non-private lookup results locally.
- No host permissions are requested. Lookup requests use the HTTPS services'
  cross-origin access (CORS) support. `activeTab` is sufficient to read the
  current domain after the user opens the toolbar popup.
- Required data collection, `browsingActivity`: the detected or manually entered domain is sent
  to the applicable registry RDAP service or the disclosed fallback WHOIS
  service. This transmission is the extension's user-triggered primary function.

Mark the listing as having a privacy policy and publish the contents of
`PRIVACY.md` at a stable HTTPS URL, then enter that URL in AMO.

## Notes for reviewers

> No account or paid service is required. Open an HTTP or HTTPS site and click
> the toolbar button, or use the edit button to enter another domain or URL.
> URL paths, query strings, and fragments are discarded locally. The add-on sends only the registered domain for
> the user-requested lookup. It downloads IANA's RDAP bootstrap JSON, queries the
> selected registry over HTTPS, and uses `https://who-dat.as93.net/` only where
> no HTTPS RDAP endpoint is available. Network requests rely on server CORS
> support and no persistent website access is requested. A server that does not
> permit cross-origin access may fail to return a result. The add-on contains no remote code, analytics, advertising,
> or minified code. The bundled readable tldts parser is generated
> reproducibly with the pinned dependencies (see vendor/README.md in the source
> repository). Private-window lookup results are not cached.

Test a registered domain such as `example.com`, a likely unregistered random
domain, a non-web page such as `about:addons`, settings persistence, cache
clearing, and a private window.

## Human decisions before submission

- Confirm that the manifest ID is the permanent ID you want to keep for all
  future versions.
- Select the MIT license in AMO to match the repository's `LICENSE` file.
- Provide support contact details and at least one listing screenshot.
- If the add-on should support Firefox for Android, test it there and add the
  appropriate `gecko_android` manifest settings. The current submission targets
  Firefox desktop.

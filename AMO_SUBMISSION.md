# Firefox Add-ons submission notes

This file is a checklist and source of copy for the AMO listing. It is excluded
from the extension package by `web-ext-config.mjs`.

## Build and validate

Requires Node.js 22 or newer. There is no source compilation or minification.
The files in the package are the human-readable source files.

```sh
npx --yes web-ext@10.6.0 lint
npx --yes web-ext@10.6.0 build --overwrite-dest
```

Upload the ZIP created in `web-ext-artifacts/`. Do not zip the repository
directory itself.

## Suggested listing copy

Summary:

> View registry and WHOIS details for the domain in your active Firefox tab.

Description:

> WHOIS Lookup displays the registrar, registration dates, nameservers, and
> registry status for the website in your active tab. Lookups use the registry's
> RDAP service when available and a classic WHOIS fallback otherwise. Results are
> cached locally for one hour, private-window results are not cached, and the
> cache can be cleared from the popup settings.

Suggested category: Web Development

## Permissions and data justification

- `activeTab`: reads the active tab URL only after the user opens the toolbar
  popup, so the extension can determine which domain to look up.
- `storage`: stores the IANA RDAP bootstrap data, the preferred registrar, and
  non-private lookup results locally.
- `https://*/*`: registry RDAP hosts are selected dynamically from IANA's DNS
  bootstrap file and span hundreds of independently operated HTTPS hosts. The
  extension uses this permission only for lookup requests; it does not inject
  code into websites.
- Required data collection, `browsingActivity`: the active tab's domain is sent
  to the applicable registry RDAP service or the disclosed fallback WHOIS
  service. This transmission is the extension's user-triggered primary function.

Mark the listing as having a privacy policy and publish the contents of
`PRIVACY.md` at a stable HTTPS URL, then enter that URL in AMO.

## Notes for reviewers

> No account or paid service is required. Open an HTTP or HTTPS site and click
> the toolbar button. The add-on sends only that site's lookup domain for
> the user-requested lookup. It downloads IANA's RDAP bootstrap JSON, queries the
> selected registry over HTTPS, and uses `https://who-dat.as93.net/` only where
> no HTTPS RDAP endpoint is available. The broad HTTPS host permission is needed
> because the official IANA bootstrap currently maps TLDs to hundreds of dynamic
> registry hosts. The add-on contains no remote code, analytics, advertising,
> minified code, or build output. Private-window lookup results are not cached.

Test a registered domain such as `example.com`, a likely unregistered random
domain, a non-web page such as `about:addons`, settings persistence, cache
clearing, and a private window.

## Human decisions before submission

- Confirm that the manifest ID is the permanent ID you want to keep for all
  future versions.
- Choose an AMO license. The repository currently declares all rights reserved.
- Provide support contact details and at least one listing screenshot.
- If the add-on should support Firefox for Android, test it there and add the
  appropriate `gecko_android` manifest settings. The current submission targets
  Firefox desktop.

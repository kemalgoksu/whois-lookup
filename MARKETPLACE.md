# WHOIS Lookup 2.1 marketplace guide

Update the existing Firefox and Chrome listings; do not create a new extension for each language. English remains the default. Supported package locales: `en`, `tr`, `de`, `es`, `fr`, `pt_BR`, `ja` (Firefox may display Brazilian Portuguese as `pt-BR`).

## Prepare the release

1. Run `npm test`, `npm run build`, and the lint/package commands in README.md.
2. Use [MARKETPLACE_COPY.md](MARKETPLACE_COPY.md) for each language's summary, description, release notes, and screenshot captions. The manifest description supplies Chrome's short description; the marketplace description is separate from the packaged UI translations.
3. Ask fluent speakers to review the translated UI and listing copy, especially technical terms. Language coverage is a starting hypothesis, not a promise of increased installs.
4. Capture the results, manual domain entry, and Settings screens. For Chrome, capture each in its matching interface language (use the Language selector). For AMO, use one clear shared set with minimal added text and translate the captions.
5. Confirm the privacy-policy URL and support details remain correct. Use PRIVACY.md and AMO_SUBMISSION.md as the disclosure and reviewer-note sources.

## Chrome Web Store

1. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), select the existing item, and upload the ZIP of the contents of `build/chrome/` under its package section.
2. Open **Store listing**. The language dropdown corresponds to the `_locales` folders in the uploaded package. Select English, then each added language.
3. Paste that locale's detailed description from MARKETPLACE_COPY.md. Name and short-description translations come from the package's manifest message catalogs; keep the product name WHOIS Lookup.
4. Under **Localized screenshots**, upload screenshots of that language's interface. Chrome's documented screenshot size is 1280 × 800, with up to five screenshots. Add a localized promotional video only if you have one. Small and marquee promotional tiles are shared across locales.
5. Save each locale, preview the listing, check distribution settings, and submit the update. Store language follows the visitor's marketplace preferences, independently of the popup's saved language override.

Reference: [Chrome listing and localization instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-listing).

## Firefox Add-ons (AMO)

1. Open the [Add-ons Developer Hub](https://addons.mozilla.org/developers/), select the existing add-on, and upload the new Firefox package as a new version.
2. Open **Edit Listing**. Use the language/translation controls in the listing editor to add Turkish, German, Spanish, French, Portuguese (Brazil), and Japanese. Dashboard labels may vary by locale.
3. For each language, enter the summary and description from MARKETPLACE_COPY.md. Retain WHOIS Lookup as the name and English as the default locale. Localize screenshot captions and version release notes where the editor offers those fields.
4. Use the shared screenshot set: Mozilla documents one image set with localized descriptions, rather than separate images for each locale. Avoid baking marketing sentences into those images.
5. Save and preview the localized listing. Verify the privacy policy, support URL, desktop compatibility, and reviewer notes, then submit the version.

References: [Mozilla listing localization and screenshots](https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/), [updating an existing add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/).

## Promote in each language

- Lead with the ability to look up **any domain**, without visiting that website, then explain registrar, dates, nameservers, and status. Show the edit button and URL-paste workflow prominently.
- Use natural terms in sentences: English “domain lookup”; Turkish “alan adı sorgulama”; German “Domain-Abfrage”; Spanish “consulta de dominios”; French “recherche de domaine”; Brazilian Portuguese “consulta de domínio”; Japanese “ドメイン検索”. Keep WHOIS and RDAP recognizable. Do not repeat keyword lists in descriptions.
- Keep feature and privacy claims consistent across languages. Say “possibly available,” with final confirmation at the registrar; no registry record does not guarantee availability.
- Start with the Web Development category when it fits the store's available categories. Confirm global distribution unless you have a deliberate regional restriction.
- After release, review the marketplaces' available country, installation, and listing-performance reports to prioritize later translations. Country is only a rough signal for language; do not add extension telemetry for this purpose.
- Keep a locale checklist for every future release: UI strings, manifest summary, store description, release notes, screenshots/captions, and fluent-speaker review.

Publication and submission are manual release steps; building the packages does not publish either listing.

## Prepared store images

After `node scripts/ui-check.mjs`, run `node scripts/store-assets.mjs` to regenerate the English listing artwork in `output/store/`. The results screenshot also uses `output/ui/chrome-installed-results.png`, captured from an installed extension with a live lookup. The output includes three 1280 × 800 screenshots and a 440 × 280 promotional tile. Inspect the images before uploading, and use screenshots in matching languages for additional localized listings. The Chrome package includes the required 128 × 128 icon.

The Firefox Android validator warning does not block this desktop release. Do not claim Android compatibility until the add-on has been tested there; Android requires its own compatibility settings and Firefox 142 or newer for built-in data consent.

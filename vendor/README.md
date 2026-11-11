# Bundled domain parser

tldts 7.4.18, https://github.com/remusao/tldts, MIT licensed.

Regenerate readable tldts.js with Node 22+: npm ci --ignore-scripts, then npm run vendor.
Exact dependencies and integrity hashes are recorded in package-lock.json.
The extension loads only this local bundle; it does not download code or suffix lists.
Update the pinned dependency and regenerate the bundle to refresh the public suffix data.

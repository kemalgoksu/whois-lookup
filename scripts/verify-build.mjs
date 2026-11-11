import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const browser of ['chrome', 'firefox']) {
  const base = new URL(`../build/${browser}/`, import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('manifest.json', base), 'utf8'));
  assert.equal(manifest.version, '2.1.0');
  assert.equal(manifest.default_locale, 'en');
  if (browser === 'chrome') {
    const icon = await readFile(new URL(manifest.icons['128'], base));
    assert.equal(icon.readUInt32BE(16), 128);
    assert.equal(icon.readUInt32BE(20), 128);
  }
  for (const locale of ['en', 'tr', 'de', 'es', 'fr', 'pt_BR', 'ja']) {
    const name = `_locales/${locale}/messages.json`;
    assert.equal(await readFile(new URL(name, base), 'utf8'), await readFile(new URL(`../${name}`, import.meta.url), 'utf8'));
  }
  for (const name of ['vendor/tldts.js', 'vendor/tldts.LICENSE', 'vendor/tldts-core.LICENSE', 'domain.js', 'i18n.js']) {
    assert.equal(await readFile(new URL(name, base), 'utf8'), await readFile(new URL(`../${name}`, import.meta.url), 'utf8'));
  }
}
console.log('Both packages contain all seven catalogs and the local parser with licenses.');

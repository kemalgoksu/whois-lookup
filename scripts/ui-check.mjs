// Render the real popup in both browser engines with deterministic extension API fixtures.
// This checks layout and events; it does not claim marketplace signing or live-registry coverage.
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'output/ui');
await mkdir(output, { recursive: true });
const server = http.createServer(async (req, res) => {
  try {
    const target = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!target.startsWith(root)) { res.writeHead(403).end(); return; }
    const body = await readFile(target);
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browsers = {
  chrome: { browser: 'chrome', executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  firefox: { browser: 'firefox', executablePath: process.env.FIREFOX_PATH || 'C:/Program Files/Mozilla Firefox/firefox.exe' }
};
try {
  for (const [name, options] of Object.entries(browsers)) {
    const browser = await puppeteer.launch({ ...options, headless: true, userDataDir: path.join(output, `${name}-profile`), ...(name === 'firefox' ? { args: ['-no-remote'] } : {}) });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 360, height: 600 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.evaluateOnNewDocument(() => {
        const stored = {};
        globalThis.fixture = { requests: [], opened: [], tab: { url: 'https://shop.example.co.uk/', incognito: false } };
        globalThis.browser = {
          i18n: { getUILanguage: () => 'en-US' },
          runtime: {
            getURL: p => new URL(p, location.href).href,
            async sendMessage(message) {
              fixture.requests.push(message);
              return { data: {
                ldhName: message.domain,
                entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', 'Example Registrar']]] }],
                events: [{ eventAction: 'registration', eventDate: '2000-01-01T00:00:00Z' }, { eventAction: 'expiration', eventDate: '2029-12-31T00:00:00Z' }],
                nameservers: [{ ldhName: 'ns1.example.com' }, { ldhName: 'ns2.example.com' }], status: ['client transfer prohibited'], _lookupSource: 'RDAP'
              } };
            }
          },
          tabs: { query: async () => [fixture.tab], create: async item => fixture.opened.push(item) },
          storage: { local: {
            get: async keys => keys === null ? { ...stored } : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, stored[k]])),
            set: async values => Object.assign(stored, values),
            remove: async keys => keys.forEach(k => delete stored[k])
          } }
        };
      });
      await page.goto(`${origin}/popup.html`);
      await page.waitForSelector('#results:not(.hidden)');
      for (const locale of ['en', 'tr', 'de', 'es', 'fr', 'pt_BR', 'ja']) {
        await page.click('#settings-tab');
        await page.select('#language-select', locale);
        await page.waitForFunction(locale => document.documentElement.lang === locale.replace('_', '-'), {}, locale);
        for (const format of ['dmy', 'mdy', 'ymd', 'auto']) {
          await page.select('#date-format-select', format);
          await page.waitForFunction(format => dateFormat === format, {}, format);
          if (format === 'ymd') {
            const expected = await page.evaluate(() => {
              const date = new Date('2000-01-01T00:00:00Z');
              return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            });
            assert.equal(await page.$eval('#created .value-main', e => e.textContent), expected);
          }
        }
        await page.screenshot({ path: path.join(output, `${name}-${locale}-settings.png`), fullPage: true });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}/${locale} Settings overflow`);
        for (const scroll of ['top', 'bottom']) {
          await page.evaluate(scroll => window.scrollTo(0, scroll === 'top' ? 0 : document.body.scrollHeight), scroll);
          assert.equal(await page.$eval('#whois-tab', e => {
            const rect = e.getBoundingClientRect();
            return rect.top >= 0 && rect.bottom <= innerHeight;
          }), true, `${name}/${locale} Back visible at ${scroll}`);
        }
        await page.click('#whois-tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'edit-domain-btn');
        await page.click('#edit-domain-btn');
        await page.screenshot({ path: path.join(output, `${name}-${locale}-lookup.png`), fullPage: true });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflow, false, `${name}/${locale} horizontal overflow`);
        await page.focus('#domain-input');
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('#edit-domain-btn', e => e.getAttribute('aria-expanded')), 'false');
      }
      assert.equal(await page.evaluate(() => fixture.requests.length), 1, 'language changes must not query');
      await page.click('#edit-domain-btn');
      await page.$eval('#domain-input', e => { e.value = 'invalid domain'; });
      await page.focus('#domain-input');
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#domain-input', e => e.getAttribute('aria-invalid')), 'true');
      assert.equal(await page.$eval('#results', e => e.classList.contains('hidden')), false);
      await page.$eval('#domain-input', e => { e.value = `https://${'long-domain-'.repeat(4)}example.com/path?q=private`; });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.getElementById('domain-name').textContent.startsWith('long-domain-'));
      await page.waitForSelector('#results:not(.hidden)');
      await page.screenshot({ path: path.join(output, `${name}-long-domain.png`), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, [], `${name} console errors`);
      await page.evaluate(() => { viewState = { kind: 'loading' }; renderView(); });
      assert.equal(await page.$eval('.spinner', e => e.getBoundingClientRect().width), 24);
      if (name === 'chrome') {
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        assert.equal(await page.$eval('.spinner', e => getComputedStyle(e).animationName), 'none');
        await page.emulateMediaFeatures([]);
      }
      await page.screenshot({ path: path.join(output, `${name}-loading.png`) });
      await page.setViewport({ width: 2520, height: 1600 });
      await page.setContent(`<style>body{margin:0;display:grid;grid-template-columns:repeat(7,360px)}img{width:360px;height:800px}</style>${['lookup', 'settings'].flatMap(view => ['en', 'tr', 'de', 'es', 'fr', 'pt_BR', 'ja'].map(locale => `<img src="${origin}/output/ui/${name}-${locale}-${view}.png">`)).join('')}`);
      await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
      await page.screenshot({ path: path.join(output, `${name}-overview.png`), fullPage: true });
      console.log(`${name}: 7 locales, 4 date formats, keyboard submit/cancel, validation, long domain, no extra lookups; screenshots in output/ui`);
    } finally { await browser.close(); }
  }
} finally { server.close(); }

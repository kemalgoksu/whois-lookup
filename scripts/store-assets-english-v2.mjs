// Review artwork only. Captures the real popup with sample registration data.
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import artworkLocales from './store-artwork-locales.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const locale = process.argv[2] || 'en';
const localized = artworkLocales[locale];
if (locale !== 'en' && !localized) throw new Error(`Unsupported artwork locale: ${locale}`);
const output = path.join(root, locale === 'en' ? 'output/store-english-v2' : `output/store-localized-v2/${locale}`);
const relativeOutput = path.relative(root, output);
await mkdir(path.join(output, 'captures'), { recursive: true });
const server = http.createServer(async (req, res) => {
  try {
    const target = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (path.relative(root, target).startsWith('..') || path.isAbsolute(path.relative(root, target))) return res.writeHead(403).end();
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json' };
    let body = await readFile(target);
    // Apply artwork-specific copy without changing the packaged extension.
    if (localized?.uiCopy && path.relative(root, target).replaceAll(path.sep, '/') === `_locales/${locale}/messages.json`) {
      const catalog = JSON.parse(body.toString('utf8'));
      for (const [key, message] of Object.entries(localized.uiCopy)) catalog[key] = { ...catalog[key], message };
      body = JSON.stringify(catalog);
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const png = async name => `data:image/png;base64,${(await readFile(path.join(root, name))).toString('base64')}`;
const images = [];
try {
  const popup = await browser.newPage();
  await popup.setViewport({ width: 360, height: 600, deviceScaleFactor: 2 });
  if (localized) await (await popup.createCDPSession()).send('Emulation.setLocaleOverride', { locale: localized.region });
  await popup.evaluateOnNewDocument((language, sampleRegistrar) => {
    const stored = { language };
    globalThis.browser = {
      i18n: { getUILanguage: () => 'en-US' },
      runtime: {
        getURL: p => new URL(p, location.href).href,
        async sendMessage(message) {
          if (message.domain === 'your-next-idea.com') return { possiblyAvailable: true };
          return { data: {
            ldhName: message.domain,
            entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', sampleRegistrar]]] }],
            events: [
              { eventAction: 'registration', eventDate: '2000-01-01T00:00:00Z' },
              { eventAction: 'last changed', eventDate: '2026-08-01T00:00:00Z' },
              { eventAction: 'expiration', eventDate: '2029-12-31T00:00:00Z' }
            ],
            nameservers: [{ ldhName: 'ns1.example.com' }, { ldhName: 'ns2.example.com' }],
            status: ['client transfer prohibited'], _lookupSource: 'RDAP'
          } };
        }
      },
      tabs: { query: async () => [{ url: 'https://example.com', incognito: false }], create: async () => {} },
      storage: { local: {
        get: async keys => keys === null ? { ...stored } : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, stored[k]])),
        set: async values => Object.assign(stored, values),
        remove: async keys => keys.forEach(k => delete stored[k])
      } }
    };
  }, locale, localized?.registrar || 'Example Registrar');
  const capture = async name => {
    await popup.evaluate(() => document.fonts.ready);
    await popup.$eval('.container', el => el.style.paddingBottom = '16px');
    await (await popup.$('.container')).screenshot({ path: path.join(output, 'captures', `${name}.png`) });
  };
  await popup.goto(`${origin}/popup.html`);
  await popup.waitForSelector('#results:not(.hidden)');
  if (await popup.$eval('html', el => el.lang) !== locale.replace('_', '-')) throw new Error('Popup language mismatch');
  await capture('results');
  await popup.click('#edit-domain-btn');
  await popup.$eval('#domain-input', el => { el.value = 'example.com'; el.blur(); });
  await capture('manual');
  await popup.click('#cancel-domain-btn');
  await popup.click('#settings-tab');
  await capture('settings');
  await popup.click('#whois-tab');
  await popup.click('#edit-domain-btn');
  await popup.$eval('#domain-input', el => { el.value = 'your-next-idea.com'; });
  await popup.click('#domain-form button[type=submit]');
  await popup.waitForSelector('#availability:not(.hidden)');
  await capture('available');

  const icon = await png('icons/icon-128.png');
  const views = [
    { id: '01-domain-details', capture: 'results', category: 'DOMAIN INTELLIGENCE', title: 'Every domain<br>has a <em>story.</em>', description: 'See its registrar, when it was<br>created, and when it expires.', items: ['Registrar & registration dates', 'Nameservers & domain status'], label: 'Domain details, one click away.', note: 'Sample registration data', accent: '#0060df' },
    { id: '02-manual-lookup', capture: 'manual', category: 'LOOK UP ANY DOMAIN', title: 'A new domain.<br>A new <em>search.</em>', description: 'Enter a domain or paste a website URL.<br>Start your next lookup from any tab.', items: ['Automatic active-tab detection', 'Manual lookup with the edit button'], label: 'Your next lookup starts here.', note: 'Sample registration data', accent: '#0060df' },
    { id: '03-settings', capture: 'settings', category: 'MAKE IT YOURS', title: 'Your tools.<br>Your <em>preferences.</em>', description: 'Choose your language, date format,<br>and favorite registrar in one place.', items: ['7 interface languages', 'Local cache you can clear anytime'], label: 'A setup that feels familiar.', note: 'English interface shown', accent: '#0060df' },
    { id: '04-availability', capture: 'available', category: 'FROM IDEA TO NEXT STEP', title: 'Found a name<br>you <em>love?</em>', description: 'No registration record found?<br>Check availability with your registrar.', items: ['10 registrar options', 'Final availability confirmed by registrar'], label: 'Take the next step with confidence.', note: 'Illustrative availability result', accent: '#007e69' }
  ];
  if (localized) for (const [index, copy] of localized.views.entries()) {
    const [category, title, description, items, label, note] = copy;
    Object.assign(views[index], { category, title, description, items, label, note });
  }
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  const styles = `
    *{box-sizing:border-box}body{margin:0;width:1280px;height:800px;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;background:#fbfcff;color:#101f38}
    .stage{position:absolute;inset:0 0 0 660px;background:linear-gradient(140deg,#e8f2ff,#d4e6fc 75%,#c8dfff)}
    .stage:before,.stage:after{content:'';position:absolute;border:1px solid #ffffff9c;border-radius:50%;width:730px;height:730px;left:-50px;top:60px}
    .stage:after{width:530px;height:530px;left:50px;top:160px}
    .brand{position:absolute;left:64px;top:45px;display:flex;align-items:center;gap:13px;font-size:22px;font-weight:650;letter-spacing:-.4px}.brand img{width:46px;height:46px}
    .category{position:absolute;left:68px;top:167px;font-size:12px;letter-spacing:2.3px;font-weight:750;color:var(--accent)}
    h1{position:absolute;left:64px;top:202px;margin:0;font-size:65px;font-weight:720;letter-spacing:-3px;line-height:1.08}em{font-style:normal;color:var(--accent)}
    .description{position:absolute;left:68px;top:380px;margin:0;font-size:22px;line-height:1.6;letter-spacing:-.3px;color:#53647c}
    .items{position:absolute;left:68px;top:496px;display:grid;gap:18px;font-size:17px;color:#263c58}.item{display:flex;align-items:center;gap:11px}.check{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:#e5efff;color:var(--accent);font-size:14px;font-weight:700}
    .footer{position:absolute;left:68px;right:68px;bottom:35px;display:flex;justify-content:space-between;align-items:center;color:#65768d;font-size:13px}.footer b{font-weight:600;color:#304b70}.pages{display:flex;gap:6px}.pages i{display:block;width:20px;height:4px;border-radius:3px;background:#9bb9df}.pages i.active{width:38px;background:var(--accent)}
    .preview-wrap{position:absolute;left:742px;top:79px;width:454px;height:638px;display:flex;align-items:center;justify-content:center}
    .preview{display:block;max-width:382px;max-height:620px;width:auto;height:auto;border-radius:13px;border:1px solid #bbcee5;box-shadow:0 28px 65px #1f4d7c30,0 4px 10px #254d7220;position:relative}
    .available .preview{width:430px;max-width:430px}.preview-label{position:absolute;right:0;top:31px;width:620px;text-align:center;font-size:13px;color:#45658e;font-weight:600;letter-spacing:.1px}
    .caption{position:absolute;left:710px;right:44px;bottom:54px;text-align:center;color:#516f94;font-size:12px}.bottom-rule{position:absolute;left:68px;bottom:81px;width:500px;height:1px;background:#dfe6f0}
    .available .stage{background:linear-gradient(135deg,#e6f5f4,#ccebe5)}.available .preview-wrap:before{content:'';width:112px;height:112px;border-radius:50%;position:absolute;top:28px;background:#fff9;box-shadow:0 12px 40px #00644e10}.available .preview-wrap:after{content:'?';position:absolute;top:28px;height:112px;width:112px;text-align:center;font-size:70px;font-weight:650;color:#00806b;line-height:108px}
  `;
  for (const [index, view] of views.entries()) {
    const screenshot = await png(path.join(relativeOutput, 'captures', `${view.capture}.png`));
    const localStyles = localized ? `h1{max-width:none}.description{max-width:none}.item{white-space:nowrap}.check{flex-shrink:0}${locale === 'ja' ? "body{font-family:'Yu Gothic','Meiryo','Segoe UI',sans-serif}h1{letter-spacing:-2px;font-weight:700}.category{letter-spacing:1px}" : ''}` : '';
    const html = `<!doctype html><html lang="${locale.replace('_', '-')}"><meta charset="utf-8"><title>${view.id}</title><style>${styles}${localStyles}</style><body class="${view.capture}" style="--accent:${view.accent}"><div class="stage"></div><div class="brand"><img src="${icon}">WHOIS Lookup</div><div class="category">${view.category}</div><h1>${view.title}</h1><p class="description">${view.description}</p><div class="items">${view.items.map(item => `<div class="item"><span class="check">✓</span>${item}</div>`).join('')}</div><div class="preview-label">${view.label}</div><div class="preview-wrap"><img class="preview" src="${screenshot}"></div><div class="caption">${view.note}</div><div class="bottom-rule"></div><div class="footer"><span><b>${localized?.footer || 'Firefox extension'}</b> &nbsp; / &nbsp; ${localized?.lookup || 'WHOIS & RDAP lookup'}</span><div class="pages">${views.map((_, i) => `<i class="${i === index ? 'active' : ''}"></i>`).join('')}</div></div>`;
    await page.setContent(html);
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
    await page.evaluate(() => document.fonts.ready);
    if (localized) await page.evaluate(() => {
      for (const [selector, maxWidth, maxHeight, minSize] of [['h1', 550, 158, 42], ['.description', 540, 90, 17], ['.items', 540, 120, 13], ['.category', 540, 30, 10]]) {
        const element = document.querySelector(selector);
        let size = parseFloat(getComputedStyle(element).fontSize);
        while ((element.getBoundingClientRect().width > maxWidth || element.getBoundingClientRect().height > maxHeight) && size > minSize) element.style.fontSize = `${--size}px`;
      }
    });
    const bad = await page.evaluate(() => [...document.querySelectorAll('h1,.description,.items,.preview')].filter(el => { const r = el.getBoundingClientRect(); const limit = el.matches('h1,.description,.items') ? 625 : 1280; return r.x < 0 || r.y < 0 || r.right > limit || r.bottom > 800 || (el.matches('h1') && r.bottom > 375) || (el.matches('.description') && r.bottom > 485); }).map(el => el.className || el.tagName));
    if (bad.length) throw new Error(`Clipped content: ${bad}`);
    await writeFile(path.join(output, `${view.id}.html`), await page.content());
    await page.screenshot({ path: path.join(output, `${view.id}-1280x800.png`) });
    images.push(await png(path.join(relativeOutput, `${view.id}-1280x800.png`)));
  }
  await page.setViewport({ width: 1600, height: 1000 });
  await page.setContent(`<style>body{margin:0;display:grid;grid-template-columns:800px 800px;background:#dce5f2}img{width:800px;height:500px;border:6px solid #dce5f2}</style>${images.map(src => `<img src="${src}">`).join('')}`);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
  await page.screenshot({ path: path.join(output, locale === 'en' ? 'english-review-sheet.png' : `${locale}-review-sheet.png`) });
  await writeFile(path.join(output, 'README.md'), `# ${localized?.name || 'English'} listing artwork\n\nFour 1280 × 800 PNGs, plus a review sheet. Nothing has been uploaded.\n\nSource listing: https://addons.mozilla.org/en-US/firefox/addon/simple-whois-lookup/\n\nBuilt from the actual popup HTML/CSS with deterministic sample registration data. The availability result is illustrative, not a live availability claim. Interface source is unchanged.\n\nRegenerate: node scripts/store-assets-english-v2.mjs ${locale}\n\nHTML compositions and 2× popup captures are retained. No image-generation model was used; the original interface, text and icon are rendered directly for fidelity and reproducibility.\n`);
  console.log(`Created four ${locale} listing images and review sheet in ${output}`);
} finally { await browser.close(); server.close(); }

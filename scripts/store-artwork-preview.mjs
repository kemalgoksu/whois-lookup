import puppeteer from 'puppeteer-core';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import locales from './store-artwork-locales.mjs';

const root = fileURLToPath(new URL('../output/store-localized-v2/', import.meta.url));
const files = ['01-domain-details', '02-manual-lookup', '03-settings', '04-availability'];
const cards = [];
for (const [locale, copy] of Object.entries(locales)) {
  for (const file of files) {
    const buffer = await readFile(path.join(root, locale, `${file}-1280x800.png`));
    if (buffer.readUInt32BE(16) !== 1280 || buffer.readUInt32BE(20) !== 800) throw new Error(`Wrong size: ${locale}/${file}`);
    if (file === files[0]) cards.push({ locale, name: copy.name, src: `data:image/png;base64,${buffer.toString('base64')}` });
  }
}
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 880 });
  await page.setContent(`<meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#dce5f2;display:grid;grid-template-columns:repeat(3,640px);font-family:'Segoe UI','Yu Gothic',sans-serif}.card{height:440px;padding:6px}.card img{display:block;width:628px;height:392.5px}.name{height:35px;display:flex;align-items:center;justify-content:center;color:#162c49;font-size:16px;font-weight:600}</style>${cards.map(card => `<div class="card"><img src="${card.src}"><div class="name">${card.name}</div></div>`).join('')}`);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(img => img.decode()));
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: path.join(root, 'all-languages-preview.png') });
  await writeFile(path.join(root, 'README.md'), '# Localized listing images\n\n24 PNGs: four images each in Turkish, German, Spanish, French, Brazilian Portuguese, and Japanese. All are 1280 × 800. Both the marketing copy and the actual popup interface are localized. The manual lookup input remains example.com in every language. Domain data and availability are illustrative. Nothing has been uploaded.\n\nEach locale folder contains the images, a four-image review sheet, HTML compositions, and original popup captures. ZIP packages contain the four final PNGs per locale.\n');
  console.log('Verified all 24 PNG dimensions and created the six-language preview.');
} finally { await browser.close(); }

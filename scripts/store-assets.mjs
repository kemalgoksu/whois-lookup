// Package existing UI captures as correctly sized Chrome store artwork.
import puppeteer from 'puppeteer-core';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'output/store');
await mkdir(output, { recursive: true });
const png = async name => `data:image/png;base64,${(await readFile(path.join(root, name))).toString('base64')}`;
const icon = await png('icons/icon-128.png');
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  const views = [
    ['results', 'Domain details.<br>One click away.', 'See the registrar, registration dates,<br>nameservers, and domain status.', 'output/ui/chrome-installed-results.png'],
    ['manual', 'Any domain.<br>From any tab.', 'Enter a domain or paste a website URL.<br>Look up registration details in seconds.', 'output/ui/chrome-en-lookup.png'],
    ['settings', 'Make it<br>your own.', 'Choose your language, date format,<br>and preferred registrar.', 'output/ui/chrome-en-settings.png']
  ];
  for (const [name, title, detail, capture] of views) {
    const screenshot = await png(capture);
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;width:1280px;height:800px;background:#eef4fc;color:#162a48;font-family:'Segoe UI',Arial,sans-serif;overflow:hidden}.brand{position:absolute;left:72px;top:60px;display:flex;align-items:center;gap:14px;font-size:26px;font-weight:600}.brand img{width:64px;height:64px}h1{position:absolute;left:72px;top:200px;margin:0;font-size:62px;line-height:1.12;letter-spacing:-2px}p{position:absolute;left:72px;top:390px;font-size:24px;line-height:1.6;color:#425875}.badge{position:absolute;left:72px;bottom:88px;padding:12px 20px;background:#dce9fb;border-radius:24px;font-size:18px;color:#0049ac}.preview{position:absolute;right:88px;top:44px;width:360px;max-height:712px;object-fit:contain;object-position:top;border-radius:12px;box-shadow:0 16px 48px #173b6829}</style><div class="brand"><img src="${icon}">WHOIS Lookup</div><h1>${title}</h1><p>${detail}</p><div class="badge">Chrome & Firefox · 7 languages</div><img class="preview" src="${screenshot}">`);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    await page.screenshot({ path: path.join(output, `screenshot-${name}-1280x800.png`) });
  }
  await page.setViewport({ width: 440, height: 280 });
  await page.setContent(`<style>body{margin:0;background:#eef4fc;color:#162a48;font-family:'Segoe UI',Arial,sans-serif;text-align:center}img{width:88px;height:88px;margin-top:22px}h1{font-size:34px;line-height:1.2;margin:8px 0 12px}p{font-size:19px;line-height:1.5;margin:0;color:#425875}</style><img src="${icon}"><h1>WHOIS Lookup</h1><p>Domain registration details.<br>Always within reach.</p>`);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  await page.screenshot({ path: path.join(output, 'promo-440x280.png') });
  console.log('Created three 1280x800 listing screenshots and a 440x280 promotional tile in output/store.');
} finally { await browser.close(); }

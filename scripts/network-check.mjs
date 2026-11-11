// Opt-in live check: run the actual background code in isolated browser profiles.
// The test copy adds a local reporter, with no extra API or host permissions.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import http from 'node:http';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputRoot = path.join(root, 'output/network');
await mkdir(outputRoot, { recursive: true });
const output = await mkdtemp(path.join(outputRoot, 'run-'));
const browsers = {
  firefox: process.env.FIREFOX_PATH || 'C:/Program Files/Mozilla Firefox/firefox.exe',
  chrome: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
};

for (const [name, executablePath] of Object.entries(browsers)) {
  const reports = [];
  let complete;
  const done = new Promise(resolve => { complete = resolve; });
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try {
      const report = JSON.parse(Buffer.concat(chunks).toString());
      reports.push(report);
      console.log(name, JSON.stringify(report));
      res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }).end('ok');
      if (report.stage === 'done') complete();
    } catch { res.writeHead(400).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const reportUrl = `http://127.0.0.1:${server.address().port}/`;
  let browser;
  let timer;
  try {
    const dir = path.join(output, `${name}-extension`);
    await cp(path.join(root, `build/${name}`), dir, { recursive: true });
    const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
    assert.deepEqual(manifest.permissions.slice().sort(), ['activeTab', 'storage']);
    assert.equal(manifest.host_permissions, undefined);
    assert.equal(manifest.optional_host_permissions, undefined);
    const probe = `
(async () => {
  const report = value => fetch(${JSON.stringify(reportUrl)}, { method: 'POST', body: JSON.stringify(value) });
  const summarize = result => ({ error: result.error, source: result.data?._lookupSource, domain: result.data?.ldhName, possiblyAvailable: result.possiblyAvailable });
  try {
    await report({ stage: 'permissions', ...await extensionApi.permissions.getAll() });
    await extensionApi.storage.local.clear();
    await updateBootstrap();
    const stored = await extensionApi.storage.local.get('bootstrap');
    await report({ stage: 'bootstrap', services: stored.bootstrap?.services?.length || 0 });
    for (const domain of ['example.com', 'example.org', 'nic.uk', 'nic.dev', 'nic.de']) {
      await report({ stage: 'lookup', requested: domain, ...summarize(await handleMessage({ action: 'fetchWhois', domain })) });
    }
    const domain = 'whois-lookup-check-' + Date.now() + '.com';
    await report({ stage: 'unregistered', ...summarize(await handleMessage({ action: 'fetchWhois', domain })) });
    // Force the real fallback path, independently of IANA's current TLD coverage.
    await extensionApi.storage.local.set({ bootstrap: { services: [] }, bootstrapTimestamp: Date.now() });
    await report({ stage: 'fallback', ...summarize(await handleMessage({ action: 'fetchWhois', domain: 'example.com' })) });
  } catch (error) { await report({ stage: 'error', error: String(error) }); }
  finally { await report({ stage: 'done' }); }
})();
`;
    if (name === 'firefox') {
      manifest.background.scripts.push('network-probe.js');
      await writeFile(path.join(dir, 'network-probe.js'), probe);
      await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    } else {
      const background = path.join(dir, manifest.background.service_worker);
      await writeFile(background, (await readFile(background, 'utf8')) + '\n' + probe);
    }
    browser = await puppeteer.launch({
      browser: name, executablePath, headless: true,
      userDataDir: path.join(output, `${name}-profile`),
      ...(name === 'firefox' ? { args: ['-no-remote', '-new-instance'] } : { pipe: true, enableExtensions: [dir] })
    });
    console.log(await browser.version());
    if (name === 'firefox') await browser.installExtension(dir);
    await Promise.race([done, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${name}: no completion report`)), 180000);
    })]);
    assert.deepEqual(reports.filter(item => item.error), [], `${name}: network errors`);
    assert.deepEqual(reports.find(item => item.stage === 'permissions')?.origins, []);
    assert.ok(reports.find(item => item.stage === 'bootstrap')?.services > 0);
    const lookups = reports.filter(item => item.stage === 'lookup');
    assert.equal(lookups.length, 5);
    for (const lookup of lookups) {
      assert.equal(lookup.domain?.toLowerCase(), lookup.requested);
      assert.ok(['RDAP', 'WHOIS'].includes(lookup.source));
    }
    assert.equal(reports.find(item => item.stage === 'unregistered')?.possiblyAvailable, true);
    assert.equal(reports.find(item => item.stage === 'fallback')?.source, 'WHOIS');
    assert.equal(reports.find(item => item.stage === 'fallback')?.domain?.toLowerCase(), 'example.com');
  } finally {
    clearTimeout(timer);
    await browser?.close();
    server.close();
  }
}
console.log('Fresh bootstrap, live lookups, unregistered RDAP response, and WHOIS fallback passed without host permissions in both browsers.');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup(file, fetch = async () => { throw new Error('Unexpected request'); }) {
  const stored = { bootstrap: { services: [[['com'], ['https://registry.test/']]] }, bootstrapTimestamp: Date.now() };
  const nodes = new Map();
  const node = () => ({ textContent: '', children: [], classList: { add() {}, remove() {}, toggle() {} }, replaceChildren() { this.children = []; }, append(...items) { this.children.push(...items); }, appendChild(item) { this.children.push(item); } });
  let listener;
  const context = vm.createContext({
    console, URL, AbortSignal, fetch,
    document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); }, createElement: node },
    window: { setTimeout() {} },
    browser: {
      storage: { local: {
        async get(keys) { return keys === null ? { ...stored } : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, stored[k]])); },
        async set(values) { Object.assign(stored, values); },
        async remove(keys) { keys.forEach(k => delete stored[k]); }
      } },
      runtime: { onMessage: { addListener(fn) { listener = fn; } }, onInstalled: { addListener() {} }, async sendMessage() { return { data: { ldhName: 'example.com' } }; } }
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInContext(file === 'popup.js' ? source.replace(/init\(\);\s*$/, '') : source, context);
  return {
    context,
    stored,
    nodes,
    lookup: domain => new Promise((resolve, reject) => {
      const result = listener({ action: 'fetchWhois', domain }, {}, resolve);
      if (result && typeof result.then === 'function') result.then(resolve, reject);
    })
  };
}

test('runs with the Chrome API namespace when browser is unavailable', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
  let listener;
  const chrome = {
    storage: { local: { async get() { return {}; }, async set() {} } },
    runtime: {
      onMessage: { addListener(fn) { listener = fn; } },
      onInstalled: { addListener() {} }
    }
  };
  vm.runInNewContext(source, { console, AbortSignal, fetch, chrome });
  assert.equal(typeof listener, 'function');
});

test('browser manifests use their supported Manifest V3 background formats', () => {
  const firefox = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json')));
  const chrome = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.chrome.json')));
  assert.deepEqual(firefox.background.scripts, ['background.js']);
  assert.equal(chrome.background.service_worker, 'background.js');
  assert.equal(chrome.browser_specific_settings, undefined);
});

test('rejects invalid domains without a request', async () => {
  const app = setup('background.js');
  for (const domain of ['https://example.com', '127.0.0.1', '-bad.com', 'a/b.com', '']) {
    assert.equal((await app.lookup(domain)).error, 'Invalid domain name.');
  }
});

test('queries HTTPS RDAP with normalized domain and marks source', async () => {
  const app = setup('background.js', async url => {
    assert.equal(url, 'https://registry.test/domain/example.com');
    return { ok: true, json: async () => ({ ldhName: 'EXAMPLE.COM' }) };
  });
  assert.equal((await app.lookup('EXAMPLE.COM')).data._lookupSource, 'RDAP');
});

test('only RDAP 404 indicates possible availability', async () => {
  for (const status of [404, 429, 500]) {
    const app = setup('background.js', async () => ({ ok: false, status }));
    const result = await app.lookup('example.com');
    assert.equal(result.possiblyAvailable, status === 404 ? true : undefined);
    if (status !== 404) assert.match(result.error, new RegExp(String(status)));
  }
});

test('uses and normalizes WHOIS when no RDAP endpoint exists', async () => {
  const app = setup('background.js', async url => {
    assert.equal(url, 'https://who-dat.as93.net/example.test');
    return { ok: true, json: async () => ({ domain: 'example.test', registrar: { name: 'Registrar' }, nameservers: ['NS1.EXAMPLE.TEST.'] }) };
  });
  const { data } = await app.lookup('example.test');
  assert.equal(data._lookupSource, 'WHOIS');
  assert.equal(data.nameservers[0].ldhName, 'NS1.EXAMPLE.TEST');
  assert.equal(data.entities[0].vcardArray[1][0][3], 'Registrar');
});

test('reports lookup timeout', async () => {
  const app = setup('background.js', async () => { const error = new Error(); error.name = 'TimeoutError'; throw error; });
  assert.equal((await app.lookup('example.com')).error, 'The registry lookup timed out.');
});

test('private lookups never write result cache; normal lookups do', async () => {
  for (const privateWindow of [true, false]) {
    const app = setup('popup.js');
    await vm.runInContext(`isPrivateLookup = ${privateWindow}; fetchWhois('example.com')`, app.context);
    assert.equal(Boolean(app.stored['example.com']), !privateWindow);
    assert.equal(app.nodes.get('error').textContent, '');
  }
});

test('cache clearing preserves preferences and bootstrap', async () => {
  const app = setup('popup.js');
  app.stored.preferredRegistrar = 'porkbun';
  app.stored['example.com'] = { data: {}, timestamp: Date.now() };
  await vm.runInContext('clearLookupCache()', app.context);
  assert.equal(app.stored['example.com'], undefined);
  assert.equal(app.stored.preferredRegistrar, 'porkbun');
  assert.ok(app.stored.bootstrap);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

async function setup(file, fetch = async () => { throw new Error('Unexpected request'); }) {
  const stored = { bootstrap: { services: [[['com'], ['https://registry.test/']]] }, bootstrapTimestamp: Date.now() };
  const nodes = new Map();
  const requests = [];
  const opened = [];
  const node = () => {
    const classes = new Set();
    const attributes = new Map();
    return { textContent: '', value: '', children: [], dataset: {}, disabled: false,
      classList: { add(...names) { names.forEach(n => classes.add(n)); }, remove(...names) { names.forEach(n => classes.delete(n)); }, contains(n) { return classes.has(n); }, toggle(n, force) { if (force ?? !classes.has(n)) classes.add(n); else classes.delete(n); } },
      setAttribute(k,v) { attributes.set(k,v); }, getAttribute(k) { return attributes.get(k); }, removeAttribute(k) { attributes.delete(k); },
      focus() {}, select() {}, replaceChildren() { this.children = []; this.textContent = ''; }, append(...items) { this.children.push(...items); }, appendChild(item) { this.children.push(item); }
    };
  };
  let listener;
  const context = vm.createContext({
    console, URL, AbortSignal, fetch: async (url, ...args) => {
      if (String(url).startsWith('extension://')) return { ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(__dirname,'..',String(url).slice('extension://'.length)), 'utf8')) };
      return fetch(url, ...args);
    },
    document: { documentElement: {}, querySelectorAll() { return []; }, getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); }, createElement: node },
    window: { setTimeout() {} },
    browser: {
      i18n: { getUILanguage() { return 'en-US'; } },
      tabs: { async query() { return [{ url: 'https://example.com', incognito: false }]; }, async create(item) { opened.push(item); } },
      storage: { local: {
        async get(keys) { return keys === null ? { ...stored } : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, stored[k]])); },
        async set(values) { Object.assign(stored, values); },
        async remove(keys) { keys.forEach(k => delete stored[k]); }
      } },
      runtime: { getURL(p) { return 'extension://' + p; }, onMessage: { addListener(fn) { listener = fn; } }, onInstalled: { addListener() {} }, async sendMessage(message) { requests.push(message); return { data: { ldhName: message.domain } }; } }
    }
  });
  for (const dependency of ['vendor/tldts.js', 'domain.js', 'i18n.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', dependency), 'utf8'), context);
  await vm.runInContext('I18n.setLanguage()', context);
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInContext(file === 'popup.js' ? source.replace(/init\(\);\s*$/, '') : source, context);
  if (file === 'popup.js') vm.runInContext('updateFormatters()', context);
  return {
    context, requests, opened,
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
  assert.deepEqual(firefox.background.scripts, ['vendor/tldts.js', 'domain.js', 'background.js']);
  assert.equal(firefox.default_locale, 'en');
  assert.equal(chrome.default_locale, 'en');
  assert.equal(chrome.version, '2.1.0');
  assert.equal(chrome.background.service_worker, 'background.js');
  assert.equal(chrome.browser_specific_settings, undefined);
});

test('both browsers request only click-triggered tab access and local storage', () => {
  for (const file of ['manifest.json', 'manifest.chrome.json']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', file)));
    assert.deepEqual(manifest.permissions.slice().sort(), ['activeTab', 'storage']);
    assert.equal(manifest.host_permissions, undefined);
    assert.equal(manifest.optional_host_permissions, undefined);
    assert.equal(manifest.content_scripts, undefined);
  }
});

test('rejects invalid domains without a request', async () => {
  const app = await setup('background.js');
  for (const domain of ['https://example.com', '127.0.0.1', '-bad.com', 'a/b.com', '']) {
    assert.equal((await app.lookup(domain)).error, 'Invalid domain name.');
  }
});

test('queries HTTPS RDAP with normalized domain and marks source', async () => {
  const app = await setup('background.js', async url => {
    assert.equal(url, 'https://registry.test/domain/example.com');
    return { ok: true, json: async () => ({ ldhName: 'EXAMPLE.COM' }) };
  });
  assert.equal((await app.lookup('EXAMPLE.COM')).data._lookupSource, 'RDAP');
});

test('only RDAP 404 indicates possible availability', async () => {
  for (const status of [404, 429, 500]) {
    const app = await setup('background.js', async () => ({ ok: false, status }));
    const result = await app.lookup('example.com');
    assert.equal(result.possiblyAvailable, status === 404 ? true : undefined);
    if (status !== 404) {
      assert.match(result.error, new RegExp(String(status)));
      assert.equal(result.errorCode, 'REGISTRY_ERROR');
      assert.equal(result.status, status);
    }
  }
});

test('uses and normalizes WHOIS when no RDAP endpoint exists', async () => {
  const app = await setup('background.js', async url => {
    assert.equal(url, 'https://who-dat.as93.net/example.net');
    return { ok: true, json: async () => ({ domain: 'example.net', registrar: { name: 'Registrar' }, nameservers: ['NS1.EXAMPLE.TEST.'] }) };
  });
  const { data } = await app.lookup('example.net');
  assert.equal(data._lookupSource, 'WHOIS');
  assert.equal(data.nameservers[0].ldhName, 'NS1.EXAMPLE.TEST');
  assert.equal(data.entities[0].vcardArray[1][0][3], 'Registrar');
});

test('reports lookup timeout', async () => {
  const app = await setup('background.js', async () => { const error = new Error(); error.name = 'TimeoutError'; throw error; });
  assert.equal((await app.lookup('example.com')).error, 'The registry lookup timed out.');
});

test('stale bootstrap does not delay lookups and concurrent refreshes are shared', async () => {
  let finishRefresh;
  let refreshes = 0;
  const app = await setup('background.js', async url => {
    if (url === 'https://data.iana.org/rdap/dns.json') {
      refreshes++;
      return new Promise(resolve => { finishRefresh = resolve; });
    }
    return { ok: true, json: async () => ({ ldhName: 'example.com' }) };
  });
  app.stored.bootstrapTimestamp = 1;
  const results = await Promise.all([app.lookup('example.com'), app.lookup('other.com')]);
  assert.ok(results.every(result => result.data?._lookupSource === 'RDAP'));
  assert.equal(refreshes, 1);
  finishRefresh({ ok: true, json: async () => ({ services: [] }) });
  await vm.runInContext('bootstrapRefresh', app.context);
  assert.equal(app.stored.bootstrap.services.length, 0);
});

test('cold bootstrap waits for one shared download before registry lookups', async () => {
  let refreshes = 0;
  const app = await setup('background.js', async url => {
    if (url === 'https://data.iana.org/rdap/dns.json') {
      refreshes++;
      return { ok: true, json: async () => ({ services: [[['com'], ['https://registry.test/']]] }) };
    }
    return { ok: true, json: async () => ({}) };
  });
  delete app.stored.bootstrap;
  const results = await Promise.all([app.lookup('example.com'), app.lookup('other.com')]);
  assert.ok(results.every(result => result.data?._lookupSource === 'RDAP'));
  assert.equal(refreshes, 1);
});

test('pending navigation wins over the previous committed URL', async () => {
  const app = await setup('popup.js');
  app.context.browser.tabs.query = async () => [{ url: 'https://old.com/', pendingUrl: 'https://shop.example.net/slow', incognito: true }];
  await vm.runInContext('init()', app.context);
  assert.equal(app.requests[0].domain, 'example.net');
  assert.equal(app.nodes.get('domain-name').textContent, 'example.net');
  assert.equal(app.stored['example.net'], undefined);
  app.context.browser.tabs.query = async () => [{ url: 'https://old.com/', pendingUrl: 'about:blank' }];
  await vm.runInContext('init()', app.context);
  assert.equal(app.requests.length, 1);
  assert.equal(app.nodes.get('refresh-btn').disabled, true);
});

test('an open popup detects a late URL and redirects until a manual lookup', async () => {
  const app = await setup('popup.js');
  const listeners = new Set();
  app.context.browser.tabs.onUpdated = {
    addListener(fn) { listeners.add(fn); }, removeListener(fn) { listeners.delete(fn); }
  };
  app.context.browser.tabs.query = async () => [{ id: 7, url: 'about:blank' }];
  await vm.runInContext('init()', app.context);
  const update = async (id, tab) => {
    for (const fn of listeners) fn(id, { status: 'loading' }, tab);
    await new Promise(resolve => setImmediate(resolve));
  };
  await update(8, { url: 'https://other.com/' });
  assert.equal(app.requests.length, 0);
  await update(7, { pendingUrl: 'https://example.com/' });
  await update(7, { url: 'https://example.com/path' });
  assert.equal(app.requests.length, 1);
  await update(7, { url: 'https://example.net/' });
  assert.equal(app.requests[1].domain, 'example.net');
  app.nodes.get('domain-input').value = 'manual.com';
  app.nodes.get('domain-form').onsubmit({ preventDefault() {} });
  await update(7, { url: 'https://redirect.com/' });
  assert.equal(app.requests[2].domain, 'manual.com');
  assert.equal(app.requests.length, 3);
  assert.equal(listeners.size, 0);
});

test('private lookups never write result cache; normal lookups do', async () => {
  for (const privateWindow of [true, false]) {
    const app = await setup('popup.js');
    await vm.runInContext(`isPrivateLookup = ${privateWindow}; fetchWhois('example.com')`, app.context);
    assert.equal(Boolean(app.stored['example.com']), !privateWindow);
    assert.equal(app.nodes.get('error').textContent, '');
  }
});

test('cache clearing preserves preferences and bootstrap', async () => {
  const app = await setup('popup.js');
  app.stored.preferredRegistrar = 'porkbun';
  app.stored.language = 'ja';
  app.stored.dateFormat = 'ymd';
  app.stored['example.com'] = { data: {}, timestamp: Date.now() };
  await vm.runInContext('clearLookupCache()', app.context);
  assert.equal(app.stored['example.com'], undefined);
  assert.equal(app.stored.preferredRegistrar, 'porkbun');
  assert.equal(app.stored.language, 'ja');
  assert.equal(app.stored.dateFormat, 'ymd');
  assert.ok(app.stored.bootstrap);
});

test('cache read and write failures do not hide successful registry results', async () => {
  for (const operation of ['get', 'set', 'remove']) {
    const app = await setup('popup.js');
    app.stored['old.com'] = { data: {}, timestamp: Date.now() - 3600001 };
    app.context.browser.storage.local[operation] = async () => { throw new Error('Storage unavailable'); };
    await vm.runInContext("fetchWhois('example.com', false)", app.context);
    assert.equal(app.requests.length, 1);
    assert.equal(app.nodes.get('results').classList.contains('hidden'), false);
    assert.equal(app.nodes.get('error').classList.contains('hidden'), true);
    assert.equal(vm.runInContext('viewState.kind', app.context), 'data');
  }
});

test('cache cleanup removes expired and oldest lookups while preserving preferences', async () => {
  const app = await setup('popup.js');
  app.stored.language = 'tr';
  app.stored.dateFormat = 'ymd';
  app.stored.preferredRegistrar = 'porkbun';
  app.stored['expired.com'] = { data: {}, timestamp: Date.now() - 3600001 };
  for (let i = 0; i < 110; i++) app.stored[`cached${i}.com`] = { data: {}, timestamp: Date.now() - (i + 1) * 1000 };
  await vm.runInContext("fetchWhois('example.com')", app.context);
  assert.equal(Object.values(app.stored).filter(item => item?.data).length, 100);
  assert.ok(app.stored['example.com']);
  assert.ok(app.stored['cached0.com']);
  assert.equal(app.stored['cached109.com'], undefined);
  assert.equal(app.stored['expired.com'], undefined);
  assert.equal(app.stored.language, 'tr');
  assert.equal(app.stored.dateFormat, 'ymd');
  assert.equal(app.stored.preferredRegistrar, 'porkbun');
  assert.ok(app.stored.bootstrap);
});

test('private lookups do not read, prune, or write the shared lookup cache', async () => {
  const app = await setup('popup.js');
  const accesses = [];
  app.stored['expired.com'] = { data: {}, timestamp: Date.now() - 3600001 };
  for (const operation of ['get', 'set', 'remove']) {
    app.context.browser.storage.local[operation] = async () => { accesses.push(operation); throw new Error('Unexpected storage access'); };
  }
  await vm.runInContext("isPrivateLookup = true; fetchWhois('example.com', false)", app.context);
  assert.equal(app.nodes.get('results').classList.contains('hidden'), false);
  assert.ok(app.stored['expired.com']);
  assert.deepEqual(accesses, []);
});

test('normalizes URLs, IDNs, suffix rules, and ICANN registration boundaries', async () => {
  const app = await setup('popup.js');
  const examples = {
    '  EXAMPLE.COM.  ': 'example.com',
    'https://shop.example.co.uk:8443/path?q=secret#part': 'example.co.uk',
    'shop.example.com/path': 'example.com',
    'https://bücher.de/': 'xn--bcher-kva.de',
    'https://食狮.公司.cn/': 'xn--85x722f.xn--55qx5d.cn',
    'a.b.blogspot.com': 'blogspot.com',
    'www.city.kawasaki.jp': 'city.kawasaki.jp',
    'www.a.ck': 'www.a.ck'
  };
  for (const [input, expected] of Object.entries(examples)) {
    assert.equal(app.context.DomainInput.normalize(input), expected, input);
  }
  for (const input of ['', '127.0.0.1', '0x7f000001', '[::1]', 'localhost', 'com', 'co.uk', 'a.ck',
    '-bad.com', 'foo..com', 'foo_bar.com', 'https://user:pass@example.com', 'ftp://example.com',
    'javascript:alert(1)', 'https:example.com', 'file:///example.com', 'hello world.com', 'x.invalid',
    `${'a'.repeat(64)}.com`]) {
    assert.throws(() => app.context.DomainInput.normalize(input), /invalidDomain/, input);
  }
});

test('language detection, override, substitution and English fallback', async () => {
  const app = await setup('popup.js');
  const i18n = app.context.I18n;
  app.context.browser.i18n.getUILanguage = () => 'de-DE';
  await i18n.setLanguage('auto');
  assert.equal(i18n.t('lookup'), 'Abfragen');
  await i18n.setLanguage('ja');
  assert.equal(i18n.t('lookup'), '検索');
  assert.equal(i18n.t('checkAt', 'Namecheap'), 'Namecheapで確認');
  assert.equal(i18n.resolve('pt-BR'), 'pt_BR');
  assert.equal(i18n.resolve('pt-PT'), 'en');
  assert.equal(i18n.resolve('es-MX'), 'es');
  await i18n.setLanguage('ar');
  assert.equal(i18n.t('lookup'), 'Look up');
});

test('all locale catalogs have complete keys and matching placeholders', () => {
  const root = path.join(__dirname, '..', '_locales');
  const english = JSON.parse(fs.readFileSync(path.join(root,'en','messages.json')));
  for (const locale of fs.readdirSync(root)) {
    const catalog = JSON.parse(fs.readFileSync(path.join(root,locale,'messages.json')));
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(english).sort(), locale);
    for (const key of Object.keys(english)) {
      assert.ok(catalog[key].message.trim(), `${locale}/${key}`);
      assert.deepEqual(catalog[key].message.match(/\$\d+/g), english[key].message.match(/\$\d+/g), `${locale}/${key}`);
    }
    assert.ok(catalog.extensionDescription.message.length <= 132, `${locale} manifest description too long`);
  }
});

test('manual editor keeps results on validation failure and supports cancel/Escape', async () => {
  const app = await setup('popup.js');
  await vm.runInContext('init()', app.context);
  app.nodes.get('edit-domain-btn').onclick();
  assert.equal(app.nodes.get('domain-input').value, 'example.com');
  app.nodes.get('domain-input').value = 'bad domain';
  const event = { preventDefault() {} };
  app.nodes.get('domain-form').onsubmit(event);
  assert.match(app.nodes.get('domain-input-error').textContent, /valid domain/);
  assert.equal(app.nodes.get('results').classList.contains('hidden'), false);
  assert.equal(app.requests.length, 1);
  app.nodes.get('domain-form').onkeydown({ ...event, key: 'Escape' });
  assert.equal(app.nodes.get('domain-form').classList.contains('hidden'), true);
  app.nodes.get('edit-domain-btn').onclick();
  app.nodes.get('cancel-domain-btn').onclick();
  assert.equal(app.nodes.get('edit-domain-btn').getAttribute('aria-expanded'), 'false');
});

test('manual entry works on internal pages and Refresh and registrar links use the new domain', async () => {
  const app = await setup('popup.js');
  app.context.browser.tabs.query = async () => [{ url: 'about:addons', incognito: true }];
  await vm.runInContext('init()', app.context);
  assert.equal(app.nodes.get('refresh-btn').disabled, true);
  assert.equal(app.requests.length, 0);
  app.nodes.get('edit-domain-btn').onclick();
  app.nodes.get('domain-input').value = 'https://shop.example.net/path?secret=true';
  app.nodes.get('domain-form').onsubmit({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.requests[0].domain, 'example.net');
  assert.equal(app.nodes.get('domain-name').textContent, 'example.net');
  assert.equal(app.stored['example.net'], undefined);
  app.nodes.get('refresh-btn').onclick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.requests[1].domain, 'example.net');
  app.context.browser.runtime.sendMessage = async () => ({ possiblyAvailable: true });
  await vm.runInContext("fetchWhois('example.net')", app.context);
  app.nodes.get('register-btn').onclick();
  assert.match(app.opened[0].url, /example.net/);
});

test('fresh caches are reused, Refresh bypasses them, and expired caches are replaced', async () => {
  const app = await setup('popup.js');
  app.stored['example.com'] = { data: { ldhName: 'example.com' }, timestamp: Date.now() };
  await vm.runInContext("fetchWhois('example.com', false)", app.context);
  assert.equal(app.requests.length, 0);
  await vm.runInContext("fetchWhois('example.com', true)", app.context);
  assert.equal(app.requests.length, 1);
  app.stored['example.com'].timestamp -= 3600001;
  await vm.runInContext("fetchWhois('example.com', false)", app.context);
  assert.equal(app.requests.length, 2);
});

test('out-of-order lookups cannot replace newer results or hide their loading state', async () => {
  const app = await setup('popup.js');
  const pending = [];
  app.context.browser.runtime.sendMessage = () => new Promise(resolve => pending.push(resolve));
  const first = vm.runInContext("fetchWhois('example.com')", app.context);
  const second = vm.runInContext("fetchWhois('example.net')", app.context);
  pending[0]({ error: 'old failure', errorCode: 'TIMEOUT' });
  await first;
  assert.equal(app.nodes.get('loading').classList.contains('hidden'), false);
  pending[1]({ data: { ldhName: 'example.net' } });
  await second;
  assert.equal(app.nodes.get('domain-name').textContent, 'example.net');
  assert.equal(app.nodes.get('results').classList.contains('hidden'), false);
  assert.equal(app.stored['example.com'], undefined);
});

test('language switches rerender results and errors without another lookup and persist', async () => {
  const app = await setup('popup.js');
  await vm.runInContext('init()', app.context);
  const select = app.nodes.get('language-select');
  select.value = 'fr';
  await select.onchange();
  assert.equal(app.stored.language, 'fr');
  assert.equal(app.nodes.get('registrar').textContent, 'Indisponible');
  assert.equal(app.requests.length, 1);
  app.context.browser.runtime.sendMessage = async () => ({ error: 'raw backend text', errorCode: 'REGISTRY_ERROR', status: 429 });
  await vm.runInContext("fetchWhois('example.com')", app.context);
  assert.match(app.nodes.get('error').textContent, /Erreur du registre \(429\)/);
  select.value = 'ja';
  await select.onchange();
  assert.match(app.nodes.get('error').textContent, /レジストリ/);
  assert.doesNotMatch(app.nodes.get('error').textContent, /raw backend/);
  await vm.runInContext('init()', app.context);
  assert.equal(app.context.I18n.locale, 'ja');
  assert.equal(app.nodes.get('language-select').value, 'ja');
});

test('reopening starts from the active tab even after a manual lookup', async () => {
  const app = await setup('popup.js');
  await vm.runInContext('init()', app.context);
  await vm.runInContext("fetchWhois('example.net')", app.context);
  await vm.runInContext('init()', app.context);
  assert.equal(app.nodes.get('domain-name').textContent, 'example.com');
});

test('missing messages and failed catalog loads fall back to English', async () => {
  const app = await setup('popup.js');
  const originalFetch = app.context.fetch;
  app.context.fetch = async url => {
    if (url.includes('/tr/')) throw new Error('catalog unavailable');
    const response = await originalFetch(url);
    const data = await response.json();
    if (url.includes('/de/')) delete data.lookup;
    return { ok: true, json: async () => data };
  };
  await app.context.I18n.setLanguage('de');
  assert.equal(app.context.I18n.t('lookup'), 'Look up');
  assert.equal(app.context.I18n.t('cancel'), 'Abbrechen');
  await app.context.I18n.setLanguage('tr');
  assert.equal(app.context.I18n.locale, 'en');
  assert.equal(app.context.I18n.t('lookup'), 'Look up');
});

test('latest language selection wins when catalogs arrive out of order', async () => {
  const app = await setup('popup.js');
  const originalFetch = app.context.fetch;
  let finishGerman;
  app.context.fetch = async url => {
    if (url.includes('/de/')) await new Promise(resolve => { finishGerman = resolve; });
    return originalFetch(url);
  };
  const german = app.context.I18n.setLanguage('de');
  await new Promise(resolve => setImmediate(resolve));
  await app.context.I18n.setLanguage('ja');
  finishGerman();
  await german;
  assert.equal(app.context.I18n.locale, 'ja');
});

test('a delayed old cache read cannot start a request after a newer lookup', async () => {
  const app = await setup('popup.js');
  let release;
  const originalGet = app.context.browser.storage.local.get;
  app.context.browser.storage.local.get = async key => {
    if (key === 'example.com') await new Promise(resolve => { release = resolve; });
    return originalGet(key);
  };
  const old = vm.runInContext("fetchWhois('example.com', false)", app.context);
  await vm.runInContext("fetchWhois('example.net')", app.context);
  release();
  await old;
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].domain, 'example.net');
});

test('WHOIS service errors carry stable codes; only missing records indicate availability', async () => {
  for (const status of [404, 429, 500]) {
    const app = await setup('background.js', async () => ({ ok: false, status }));
    const response = await app.lookup('example.net');
    if (status === 404) assert.equal(response.possiblyAvailable, true);
    else {
      assert.equal(response.possiblyAvailable, undefined);
      assert.equal(response.errorCode, 'WHOIS_ERROR');
      assert.equal(response.status, status);
    }
  }
});

test('Chrome service worker imports its local parser dependencies', async () => {
  const context = vm.createContext({ console, URL, AbortSignal, fetch,
    chrome: { storage: { local: { get: async () => ({}), set: async () => {} } },
      runtime: { onMessage: { addListener() {} }, onInstalled: { addListener() {} } } }
  });
  const imports = [];
  context.importScripts = (...files) => {
    imports.push(...files);
    files.forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context));
  };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8'), context);
  assert.deepEqual(imports, ['vendor/tldts.js', 'domain.js']);
  assert.equal(context.DomainInput.normalize('shop.example.co.uk'), 'example.co.uk');
});

// Inject browser regional defaults independently of the popup's translated language.
function useClientRegion(app, locale, timeZone) {
  app.context.Intl = {
    RelativeTimeFormat: Intl.RelativeTimeFormat,
    DateTimeFormat: function (requestedLocale, options) {
      return new Intl.DateTimeFormat(requestedLocale ?? locale, { ...options, timeZone });
    }
  };
  vm.runInContext('updateFormatters()', app.context);
}

test('automatic dates preserve the browser regional locale independently of interface language', async () => {
  const app = await setup('popup.js');
  await app.context.I18n.setLanguage('ja');
  const expected = {
    'en-US': '11/23/2026', 'en-GB': '23/11/2026', 'tr-TR': '23.11.2026',
    'de-DE': '23.11.2026', 'ja-JP': '2026/11/23'
  };
  for (const [locale, value] of Object.entries(expected)) {
    useClientRegion(app, locale, 'Europe/Istanbul');
    assert.equal(vm.runInContext("formatDate(new Date('2026-11-23T12:00:00Z'))", app.context), value, locale);
    assert.equal(app.context.I18n.locale, 'ja');
  }
});

test('explicit date formats handle leading zeroes and leap days without changing timezone', async () => {
  const app = await setup('popup.js');
  useClientRegion(app, 'ja-JP', 'Europe/Istanbul');
  for (const [format, leapDay, padded] of [
    ['dmy', '29/02/2024', '02/01/2026'], ['mdy', '02/29/2024', '01/02/2026'], ['ymd', '2024-02-29', '2026-01-02']
  ]) {
    vm.runInContext(`dateFormat = '${format}'; updateFormatters()`, app.context);
    assert.equal(vm.runInContext("formatDate(new Date('2024-02-29T12:00:00Z'))", app.context), leapDay);
    assert.equal(vm.runInContext("formatDate(new Date('2026-01-02T12:00:00Z'))", app.context), padded);
  }
  for (const value of [undefined, '', 'invalid date']) {
    app.context.testDateValue = value;
    vm.runInContext("renderDateWithRelative(document.getElementById('created'), testDateValue)", app.context);
    assert.equal(app.nodes.get('created').textContent, 'Not available');
    assert.equal(app.nodes.get('created').children.length, 0);
  }
});

test('all formats use the client calendar day around midnight and DST transitions', async () => {
  const app = await setup('popup.js');
  for (const [zone, timestamp, expected] of [
    ['Europe/Istanbul', '2026-11-23T22:30:00Z', '2026-11-24'],
    ['America/Los_Angeles', '2026-11-23T00:30:00Z', '2026-11-22'],
    ['Asia/Tokyo', '2026-11-23T22:30:00Z', '2026-11-24'],
    ['America/New_York', '2026-03-08T06:30:00Z', '2026-03-08'],
    ['America/New_York', '2026-03-08T07:30:00Z', '2026-03-08']
  ]) {
    for (const format of ['auto', 'dmy', 'mdy', 'ymd']) {
      vm.runInContext(`dateFormat = '${format}'`, app.context);
      useClientRegion(app, 'en-GB', zone);
      const [year, month, day] = expected.split('-');
      const formatted = format === 'ymd' ? expected : format === 'mdy' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
      app.context.testTimestamp = timestamp;
      assert.equal(vm.runInContext('formatDate(new Date(testTimestamp))', app.context), formatted, `${zone}/${format}`);
    }
  }
});

test('date selection updates all displayed dates immediately, saves, and reopens without extra lookups', async () => {
  const app = await setup('popup.js');
  app.context.browser.runtime.sendMessage = async message => {
    app.requests.push(message);
    return { data: { events: ['registration', 'last changed', 'expiration'].map(eventAction => ({ eventAction, eventDate: '2026-01-02T12:00:00Z' })) } };
  };
  await vm.runInContext('init()', app.context);
  assert.equal(app.nodes.get('date-format-select').value, 'auto');
  const originalCache = JSON.stringify(app.stored['example.com']);
  const select = app.nodes.get('date-format-select');
  select.value = 'ymd';
  const saving = select.onchange();
  for (const id of ['created', 'updated', 'expiry']) assert.equal(app.nodes.get(id).children[2].textContent, '2026-01-02');
  await saving;
  assert.equal(app.stored.dateFormat, 'ymd');
  assert.equal(app.requests.length, 1);
  assert.equal(JSON.stringify(app.stored['example.com']), originalCache);
  app.nodes.get('language-select').value = 'tr';
  await app.nodes.get('language-select').onchange();
  assert.equal(app.nodes.get('created').children[2].textContent, '2026-01-02');
  assert.match(app.nodes.get('created').children[0].textContent, /önce/);
  await vm.runInContext('init()', app.context);
  assert.equal(app.nodes.get('date-format-select').value, 'ymd');
  assert.equal(app.requests.length, 1);
});

test('unknown saved date formats fall back to automatic without rewriting preferences', async () => {
  const app = await setup('popup.js');
  app.stored.dateFormat = 'unknown';
  await vm.runInContext('init()', app.context);
  assert.equal(app.nodes.get('date-format-select').value, 'auto');
  assert.equal(app.stored.dateFormat, 'unknown');
  assert.match(app.nodes.get('date-format-auto').textContent, /Automatic/);
});

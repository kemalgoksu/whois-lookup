/* Packaged catalogs serve both browser metadata and the popup's language override. */
globalThis.I18n = (() => {
  const languages = { en: 'English', tr: 'Türkçe', de: 'Deutsch', es: 'Español', fr: 'Français', pt_BR: 'Português (Brasil)', ja: '日本語' };
  const catalogs = new Map();
  let locale = 'en';
  let revision = 0;
  function resolve(language) {
    const normalized = String(language || '').replaceAll('-', '_');
    if (Object.hasOwn(languages, normalized)) return normalized;
    const base = normalized.split('_')[0];
    return Object.hasOwn(languages, base) ? base : 'en';
  }
  async function load(language) {
    if (!catalogs.has(language)) {
      const api = globalThis.browser ?? globalThis.chrome;
      const response = await fetch(api.runtime.getURL(`_locales/${language}/messages.json`));
      if (!response.ok) throw new Error('Could not load packaged language');
      catalogs.set(language, await response.json());
    }
  }
  async function setLanguage(preference = 'auto') {
    const request = ++revision;
    const api = globalThis.browser ?? globalThis.chrome;
    const next = resolve(preference === 'auto' ? api.i18n.getUILanguage() : preference);
    await load('en');
    try { await load(next); } catch { if (request === revision) locale = 'en'; return; }
    if (request === revision) locale = next;
  }
  function t(key, ...values) {
    const message = catalogs.get(locale)?.[key]?.message ?? catalogs.get('en')?.[key]?.message ?? key;
    return message.replace(/\$(\d+)/g, (_, index) => String(values[Number(index) - 1] ?? ''));
  }
  function apply() {
    document.documentElement.lang = locale.replace('_', '-');
    document.title = t('extensionName');
    for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
    for (const attribute of ['title', 'aria-label', 'placeholder']) {
      for (const element of document.querySelectorAll(`[data-i18n-${attribute}]`)) {
        element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
      }
    }
  }
  return { languages, resolve, setLanguage, t, apply, get locale() { return locale.replace('_', '-'); } };
})();

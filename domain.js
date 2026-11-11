/* Shared by the popup and background. Never send URL paths or credentials. */
globalThis.DomainInput = {
  normalize(input) {
    const value = String(input ?? '').trim();
    if (!value || /[\s\\]/u.test(value)) throw new Error('invalidDomain');
    // A colon before any path must be an HTTP(S) scheme or a numeric port.
    if (/^[a-z][a-z\d+.-]*:/i.test(value) &&
        !/^https?:\/\//i.test(value) && !/^[^/:]+:\d+(?:[/?#]|$)/.test(value)) {
      throw new Error('invalidDomain');
    }
    let url;
    try {
      url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    } catch {
      throw new Error('invalidDomain');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('invalidDomain');
    }
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    const labels = hostname.split('.');
    if (hostname.length > 253 || labels.some(label => !/^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/.test(label))) {
      throw new Error('invalidDomain');
    }
    const parsed = tldts.parse(hostname, { allowPrivateDomains: false, detectIp: true });
    if (parsed.isIp || !parsed.domain || !parsed.isIcann) throw new Error('invalidDomain');
    return parsed.domain;
  }
};

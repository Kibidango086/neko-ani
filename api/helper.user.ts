export default async function handler(req: any, res: any) {
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const origin = `${protocol}://${host}`;

  const USERSCRIPT_CODE = `// ==UserScript==
// @name         Neko-Ani Video Helper (${host})
// @namespace    https://github.com/neko-ani/neko-ani
// @version      0.7
// @description  Bypass CORS for Neko-Ani video playback on ${host}
// @author       Neko-Ani
// @match        ${origin}/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    const bridge = {
        fetch: (url, options = {}) => {
            return new Promise((resolve, reject) => {
                const requestOptions = {
                    method: options.method || 'GET',
                    url: url,
                    headers: options.headers || {},
                    data: options.body,
                    responseType: options.responseType || 'arraybuffer',
                    onload: (res) => resolve({
                        status: res.status,
                        statusText: res.statusText,
                        data: res.response,
                        headers: res.responseHeaders,
                        finalUrl: res.finalUrl
                    }),
                    onerror: reject
                };
                if (requestOptions.headers['X-Neko-Referer']) {
                    requestOptions.headers['Referer'] = requestOptions.headers['X-Neko-Referer'];
                    delete requestOptions.headers['X-Neko-Referer'];
                }
                GM_xmlhttpRequest(requestOptions);
            });
        }
    };

    window.NEKO_ANI_BRIDGE = bridge;
    if (typeof unsafeWindow !== 'undefined') unsafeWindow.NEKO_ANI_BRIDGE = bridge;

    const isCrossOrigin = (url) => {
        try {
            return new URL(url, window.location.origin).origin !== window.location.origin;
        } catch (e) { return false; }
    };

    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
        const url = (typeof resource === 'string') ? resource : (resource.url || resource.toString());
        if (isCrossOrigin(url)) {
            const res = await bridge.fetch(url, init);
            return new Response(res.data, {
                status: res.status,
                headers: new Headers((headerStr => {
                    const h = {};
                    (headerStr || '').split(/[\r\n]+/).forEach(l => {
                        const p = l.split(': ');
                        if (p.length >= 2) h[p[0].trim()] = p.slice(1).join(': ').trim();
                    });
                    return h;
                })(res.headers))
            });
        }
        return originalFetch.apply(this, arguments);
    };

    console.log('🐾 [Neko-Ani] Helper script v0.7 Active');
})();`;

  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(USERSCRIPT_CODE);
}
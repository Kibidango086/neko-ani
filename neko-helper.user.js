// ==UserScript==
// @name         Neko-Ani Video Helper
// @namespace    https://github.com/neko-stream/neko-ani
// @version      1.0
// @description  Bypass CORS for Neko-Ani video playback
// @author       Neko-Ani
// @match        *://*/*
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
                    onerror: (err) => reject(err)
                };
                
                // Bypass anti-hotlinking
                if (requestOptions.headers['X-Neko-Referer']) {
                    requestOptions.headers['Referer'] = requestOptions.headers['X-Neko-Referer'];
                    delete requestOptions.headers['X-Neko-Referer'];
                }

                GM_xmlhttpRequest(requestOptions);
            });
        }
    };

    // Expose bridge
    window.NEKO_ANI_BRIDGE = bridge;
    if (typeof unsafeWindow !== 'undefined') unsafeWindow.NEKO_ANI_BRIDGE = bridge;

    // Helper to check if cross-origin
    const isCrossOrigin = (url) => {
        try {
            return new URL(url, window.location.origin).origin !== window.location.origin;
        } catch (e) { return false; }
    };

    // Global Fetch Hook
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
        const url = (typeof resource === 'string') ? resource : (resource.url || resource.toString());
        if (isCrossOrigin(url)) {
            console.log('🌐 [Neko-Ani] CORS Proxy:', url);
            const res = await bridge.fetch(url, init);
            return new Response(res.data, {
                status: res.status,
                headers: new Headers((headerStr => {
                    const h = {};
                    (headerStr || '').split(/[
]+/).forEach(l => {
                        const p = l.split(': ');
                        if (p.length >= 2) h[p[0].trim()] = p.slice(1).join(': ').trim();
                    });
                    return h;
                })(res.headers))
            });
        }
        return originalFetch.apply(this, arguments);
    };

    console.log('%c🐾 Neko-Ani Video Helper v1.0 Active', 'color: #ff69b4; font-weight: bold;');
})();

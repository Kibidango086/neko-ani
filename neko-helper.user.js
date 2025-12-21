// ==UserScript==
// @name         Neko-Ani Video Helper
// @namespace    https://github.com/neko-stream/neko-ani
// @version      1.3
// @description  CORS bypass bridge with enhanced logging
// @author       Neko-Ani
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @connect      *
// ==/UserScript==

(function() {
    'use strict';
    const log = (msg, data, color = '#ff69b4') => {
        console.log(`%c🐾 [Neko-Helper] ${msg}`, `color: ${color}; font-weight: bold;`, data || '');
    };

    const bridge = {
        version: '1.3',
        fetch: (url, options = {}) => {
            return new Promise((resolve, reject) => {
                log('Fetching:', url);
                
                const requestHeaders = Object.assign({}, options.headers || {});
                if (requestHeaders['X-Neko-Referer']) {
                    requestHeaders['Referer'] = requestHeaders['X-Neko-Referer'];
                    delete requestHeaders['X-Neko-Referer'];
                }

                GM_xmlhttpRequest({
                    method: options.method || 'GET',
                    url: url,
                    headers: requestHeaders,
                    data: options.body,
                    responseType: options.responseType || 'arraybuffer',
                    timeout: 15000,
                    onload: (res) => {
                        log(`Done (${res.status}):`, url, res.status >= 400 ? 'red' : '#00ff00');
                        resolve({
                            status: res.status,
                            data: res.response,
                            headers: res.responseHeaders,
                            finalUrl: res.finalUrl
                        });
                    },
                    onerror: (err) => {
                        log('Error:', { url, err }, 'red');
                        reject(err);
                    },
                    ontimeout: () => {
                        log('Timeout:', url, 'orange');
                        reject(new Error('Timeout'));
                    }
                });
            });
        }
    };

    window.NEKO_ANI_BRIDGE = bridge;
    if (typeof unsafeWindow !== 'undefined') unsafeWindow.NEKO_ANI_BRIDGE = bridge;
    log('Bridge v1.3 Ready. Check for Tampermonkey permission popups!');
})();
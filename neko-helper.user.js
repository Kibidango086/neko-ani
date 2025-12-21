// ==UserScript==
// @name         Neko-Ani Video Helper
// @namespace    https://github.com/neko-stream/neko-ani
// @version      1.2
// @description  CORS bypass bridge for Neko-Ani
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
                GM_xmlhttpRequest({
                    method: options.method || 'GET',
                    url: url,
                    headers: options.headers || {},
                    data: options.body,
                    responseType: options.responseType || 'arraybuffer',
                    onload: (res) => {
                        resolve({
                            status: res.status,
                            data: res.response,
                            headers: res.responseHeaders,
                            finalUrl: res.finalUrl
                        });
                    },
                    onerror: reject
                });
            });
        }
    };

    window.NEKO_ANI_BRIDGE = bridge;
    if (typeof unsafeWindow !== 'undefined') unsafeWindow.NEKO_ANI_BRIDGE = bridge;
    console.log('🐾 [Neko-Ani] Bridge Ready');
})();

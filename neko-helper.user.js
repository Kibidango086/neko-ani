// ==UserScript==
// @name         Neko-Ani Video Helper
// @namespace    https://github.com/neko-stream/neko-ani
// @version      1.1
// @description  A robust CORS bypass helper for Neko-Ani video playback
// @author       Neko-Ani
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    const log = (msg, color = '#ff69b4') => console.log(`%c🐾 [Neko-Ani Helper] ${msg}`, `color: ${color}; font-weight: bold;`);

    // Helper to check if cross-origin
    const isCrossOrigin = (url) => {
        try {
            const requestUrl = new URL(url, window.location.origin);
            return requestUrl.origin !== window.location.origin;
        } catch (e) { return false; }
    };

    // --- XMLHTTPREQUEST PROXY ---
    const OriginalXHR = window.XMLHttpRequest;
    
    function ProxiedXHR() {
        const realXHR = new OriginalXHR();
        let useProxy = false;
        let proxyConfig = {
            method: 'GET',
            url: '',
            headers: {},
            responseType: ''
        };

        // We use a Proxy to intercept and handle XHR calls
        return new Proxy(realXHR, {
            get(target, prop) {
                if (prop === 'open') {
                    return function(method, url) {
                        proxyConfig.method = method;
                        proxyConfig.url = url;
                        useProxy = isCrossOrigin(url);
                        if (!useProxy) return target.open.apply(target, arguments);
                    };
                }

                if (prop === 'setRequestHeader') {
                    return function(header, value) {
                        proxyConfig.headers[header] = value;
                        if (!useProxy) return target.setRequestHeader.apply(target, arguments);
                    };
                }

                if (prop === 'send') {
                    return function(data) {
                        if (!useProxy) return target.send.apply(target, arguments);

                        log(`Intercepted XHR: ${proxyConfig.url}`);
                        
                        const gmOptions = {
                            method: proxyConfig.method,
                            url: proxyConfig.url,
                            headers: proxyConfig.headers,
                            data: data,
                            responseType: target.responseType === 'arraybuffer' ? 'arraybuffer' : 'blob',
                            onload: (res) => {
                                // Define properties to mimic a completed XHR
                                Object.defineProperties(target, {
                                    readyState: { value: 4 },
                                    status: { value: res.status },
                                    statusText: { value: res.statusText },
                                    response: { value: res.response },
                                    responseText: { value: res.responseText },
                                    getAllResponseHeaders: { value: () => res.responseHeaders }
                                });
                                
                                // Dispatch events
                                target.dispatchEvent(new Event('readystatechange'));
                                target.dispatchEvent(new Event('load'));
                                if (target.onload) target.onload();
                            },
                            onerror: (err) => {
                                log(`Proxy Error: ${proxyConfig.url}`, 'red');
                                target.dispatchEvent(new Event('error'));
                                if (target.onerror) target.onerror(err);
                            }
                        };

                        // Handle custom Referer
                        if (proxyConfig.headers['X-Neko-Referer']) {
                            gmOptions.headers['Referer'] = proxyConfig.headers['X-Neko-Referer'];
                            delete gmOptions.headers['X-Neko-Referer'];
                        }

                        GM_xmlhttpRequest(gmOptions);
                    };
                }

                const val = target[prop];
                return typeof val === 'function' ? val.bind(target) : val;
            },
            set(target, prop, value) {
                target[prop] = value;
                return true;
            }
        });
    }

    window.XMLHttpRequest = ProxiedXHR;

    // --- FETCH PROXY ---
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init = {}) {
        const url = (typeof resource === 'string') ? resource : (resource.url || resource.toString());
        
        if (isCrossOrigin(url)) {
            log(`Intercepted Fetch: ${url}`);
            return new Promise((resolve, reject) => {
                const gmOptions = {
                    method: init.method || 'GET',
                    url: url,
                    headers: init.headers || {},
                    data: init.body,
                    responseType: 'arraybuffer',
                    onload: (res) => {
                        const response = new Response(res.data, {
                            status: res.status,
                            statusText: res.statusText,
                            headers: new Headers((headerStr => {
                                const h = {};
                                (headerStr || '').split(/[\r\n]+/).forEach(l => {
                                    const p = l.split(': ');
                                    if (p.length >= 2) h[p[0].trim()] = p.slice(1).join(': ').trim();
                                });
                                return h;
                            })(res.responseHeaders))
                        });
                        resolve(response);
                    },
                    onerror: reject
                };

                if (gmOptions.headers['X-Neko-Referer']) {
                    gmOptions.headers['Referer'] = gmOptions.headers['X-Neko-Referer'];
                    delete gmOptions.headers['X-Neko-Referer'];
                }

                GM_xmlhttpRequest(gmOptions);
            });
        }
        return originalFetch.apply(this, arguments);
    };

    log('Active. Transparent CORS bypass for XHR and Fetch is ready.');
})();
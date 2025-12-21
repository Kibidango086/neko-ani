export default async function handler(req: any, res: any) {
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const origin = `${protocol}://${host}`;

  const USERSCRIPT_CODE = `// ==UserScript==
// @name         Neko-Ani Video Helper (${host})
// @namespace    https://github.com/neko-stream/neko-ani
// @version      0.6
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

    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest;

    console.log('%c🐾 [Neko-Ani] Helper script v0.6 initializing...', 'color: #ff69b4; font-weight: bold;');

    // Bridge for explicit calls
    const bridge = {
        version: '0.6',
        fetch: (url, options = {}) => {
            return new Promise((resolve, reject) => {
                const requestOptions = {
                    method: options.method || 'GET',
                    url: url,
                    headers: options.headers || {},
                    data: options.body,
                    responseType: options.responseType || 'arraybuffer',
                    onload: (res) => {
                        resolve({
                            status: res.status,
                            statusText: res.statusText,
                            data: res.response,
                            headers: res.responseHeaders,
                            finalUrl: res.finalUrl
                        });
                    },
                    onerror: (err) => reject(err),
                    ontimeout: () => reject(new Error('Timeout')),
                    onabort: () => reject(new Error('Aborted'))
                };
                
                // Special handling for Referer if requested
                if (options.headers && options.headers['X-Neko-Referer']) {
                    requestOptions.headers['Referer'] = options.headers['X-Neko-Referer'];
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
            const requestUrl = new URL(url, window.location.origin);
            return requestUrl.origin !== window.location.origin;
        } catch (e) {
            return false;
        }
    };

    const parseHeaders = (headerStr) => {
        const headers = {};
        if (!headerStr) return headers;
        headerStr.split(/[\\r\\n]+/).forEach(line => {
            const parts = line.split(': ');
            if (parts.length >= 2) {
                headers[parts[0].trim()] = parts.slice(1).join(': ').trim();
            }
        });
        return headers;
    };

    // Monkey-patch Fetch
    window.fetch = async function(resource, init = {}) {
        const url = (typeof resource === 'string') ? resource : (resource.url || resource.toString());
        
        if (isCrossOrigin(url)) {
            console.log('🌐 [Neko-Ani] Intercepted Fetch:', url);
            try {
                const res = await bridge.fetch(url, init);
                return new Response(res.data, {
                    status: res.status,
                    statusText: res.statusText,
                    headers: new Headers(parseHeaders(res.headers))
                });
            } catch (err) {
                console.error('❌ [Neko-Ani] Fetch Error:', err);
                return originalFetch.apply(this, arguments);
            }
        }
        return originalFetch.apply(this, arguments);
    };

    // Monkey-patch XMLHttpRequest
    window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const state = {
            isCross: false,
            method: 'GET',
            url: '',
            headers: {},
            responseType: ''
        };

        const proxy = new Proxy(xhr, {
            get(target, prop) {
                if (prop === 'open') {
                    return function(method, url) {
                        state.method = method;
                        state.url = url;
                        state.isCross = isCrossOrigin(url);
                        return target.open.apply(target, arguments);
                    };
                }
                if (prop === 'setRequestHeader') {
                    return function(header, value) {
                        state.headers[header] = value;
                        return target.setRequestHeader.apply(target, arguments);
                    };
                }
                if (prop === 'send') {
                    return function(data) {
                        if (state.isCross) {
                            console.log('🌐 [Neko-Ani] Intercepted XHR:', state.url);
                            GM_xmlhttpRequest({
                                method: state.method,
                                url: state.url,
                                headers: state.headers,
                                data: data,
                                responseType: target.responseType || 'arraybuffer',
                                onload: (res) => {
                                    Object.defineProperties(target, {
                                        status: { value: res.status, writable: true },
                                        statusText: { value: res.statusText, writable: true },
                                        response: { value: res.response, writable: true },
                                        responseText: { value: res.responseText, writable: true },
                                        readyState: { value: 4, writable: true },
                                        getAllResponseHeaders: { value: () => res.responseHeaders, writable: true }
                                    });
                                    target.dispatchEvent(new Event('readystatechange'));
                                    target.dispatchEvent(new Event('load'));
                                },
                                onerror: (err) => {
                                    console.error('❌ [Neko-Ani] XHR Error:', err);
                                    return target.send.apply(target, arguments);
                                }
                            });
                            return;
                        }
                        return target.send.apply(target, arguments);
                    };
                }
                
                const val = target[prop];
                if (typeof val === 'function') return val.bind(target);
                return val;
            },
            set(target, prop, value) {
                target[prop] = value;
                return true;
            }
        });

        return proxy;
    };

    console.log('%c🐾 [Neko-Ani] Helper script active. CORS bypass enabled.', 'color: #ff69b4; font-weight: bold;');
})();`;

  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(USERSCRIPT_CODE);
}

  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(USERSCRIPT_CODE);
}
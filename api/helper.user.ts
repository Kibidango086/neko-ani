export default async function handler(req: any, res: any) {
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const origin = `${protocol}://${host}`;

  const USERSCRIPT_CODE = `// ==UserScript==
// @name         Neko-Ani Video Helper (${host})
// @namespace    https://github.com/neko-stream/neko-ani
// @version      0.2
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
                console.log('🌐 [Bridge] Fetching:', url);
                GM_xmlhttpRequest({
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
                            headers: res.responseHeaders
                        });
                    },
                    onerror: (err) => {
                        console.error('❌ [Bridge] Error:', err);
                        reject(err);
                    }
                });
            });
        }
    };

    // 尝试多种方式注入，确保页面能访问到
    if (typeof unsafeWindow !== 'undefined') {
        unsafeWindow.NEKO_ANI_BRIDGE = bridge;
    }
    window.NEKO_ANI_BRIDGE = bridge;
    
    console.log('🐾 Neko-Ani Video Helper Active for ${host}');
})();`;

  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(USERSCRIPT_CODE);
}
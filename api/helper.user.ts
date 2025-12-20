export default async function handler(req: any, res: any) {
  const USERSCRIPT_CODE = `// ==UserScript==
// @name         Neko-Ani Video Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Bypass CORS for Neko-Ani video playback
// @author       Neko-Ani
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function() {
    'use strict';
    // Expose a bridge function to the page
    window.NEKO_ANI_BRIDGE = {
        fetch: (url, options = {}) => {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: options.method || 'GET',
                    url: url,
                    headers: options.headers,
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
                    onerror: reject
                });
            });
        }
    };
    console.log('🐾 Neko-Ani Video Helper Active');
})();`;

  res.setHeader('Content-Type', 'text/javascript');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(USERSCRIPT_CODE);
}

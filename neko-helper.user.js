// ==UserScript==
// @name         Neko-Ani Video Helper
// @namespace    https://github.com/neko-stream/neko-ani
// @version      2.1
// @description  CORS bypass bridge with search, episodes and video extraction
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

    const USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    ];

    const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const result = await bridge.fetch(url, {
                    ...options,
                    headers: {
                        'User-Agent': getRandomUserAgent(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Accept-Encoding': 'gzip, deflate',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        ...options.headers,
                    }
                });
                
                if (result.status < 400) {
                    if (typeof result.data === 'string') {
                        return result.data;
                    }
                    return new TextDecoder().decode(result.data);
                }
                throw new Error(`HTTP ${result.status}`);
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000 + Math.random() * 1000));
                }
            }
        }
        throw lastError;
    };

    const parseHtml = (html) => {
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    };

    const getTxt = (el) => el?.textContent?.trim() || '';
    const getAttr = (el, attr) => el?.getAttribute(attr) || '';

    const findUrlInHtml = (html, regexStr) => {
        try {
            const regex = new RegExp(regexStr);
            const match = html.match(regex);
            if (match) {
                if (match.groups && match.groups['v']) {
                    return match.groups['v'].replace(/\\\//g, '/');
                }
                return (match.length > 1 && match[1] ? match[1] : match[0]).replace(/\\\//g, '/');
            }
        } catch (e) { console.error('Regex error:', e); }
        return null;
    };

    const cleanVideoUrl = (url) => {
        if (!url) return url;
        const matches = Array.from(url.matchAll(/https?:\/\//g));
        if (matches.length > 1) {
            const lastMatch = matches[matches.length - 1];
            if (lastMatch.index !== undefined) return url.substring(lastMatch.index);
        }
        return url;
    };

    const searchSource = async (source, keyword) => {
        const config = source.arguments.searchConfig;
        let searchUrl = config.searchUrl.replace('{keyword}', encodeURIComponent(keyword));
        if (config.searchUseOnlyFirstWord) {
            const firstWord = keyword.split(/[　 ]+/)[0];
            searchUrl = config.searchUrl.replace('{keyword}', encodeURIComponent(firstWord));
        }
        
        const html = await fetchWithRetry(searchUrl);
        const doc = parseHtml(html);
        const results = [];
        
        try {
            if (config.subjectFormatId === 'a' && config.selectorSubjectFormatA) {
                const selector = config.selectorSubjectFormatA.selectLists;
                if (selector) {
                    doc.querySelectorAll(selector).forEach((el) => {
                        const url = getAttr(el, 'href');
                        if (url) {
                            try {
                                results.push({
                                    sourceName: source.arguments.name,
                                    sourceId: Date.now() + Math.random(),
                                    title: getTxt(el),
                                    url: new URL(url, new URL(searchUrl).origin).href,
                                    episodes: [],
                                });
                            } catch (e) {}
                        }
                    });
                }
            } else if (config.subjectFormatId === 'indexed' && config.selectorSubjectFormatIndexed) {
                const nameEls = Array.from(doc.querySelectorAll(config.selectorSubjectFormatIndexed.selectNames));
                const linkEls = Array.from(doc.querySelectorAll(config.selectorSubjectFormatIndexed.selectLinks));
                const count = Math.min(nameEls.length, linkEls.length);
                for (let i = 0; i < count; i++) {
                    const url = getAttr(linkEls[i], 'href');
                    if (url) {
                        try {
                            results.push({
                                sourceName: source.arguments.name,
                                sourceId: Date.now() + Math.random(),
                                title: getTxt(nameEls[i]),
                                url: new URL(url, new URL(searchUrl).origin).href,
                                episodes: [],
                            });
                        } catch (e) {}
                    }
                }
            }
        } catch (e) { console.error('Parse error in search:', e); }
        
        return results.slice(0, 8);
    };

    const getEpisodes = async (source, detailUrl) => {
        const config = source.arguments.searchConfig;
        const html = await fetchWithRetry(detailUrl);
        const doc = parseHtml(html);
        let episodes = [];
        let origin = '';
        try { origin = new URL(detailUrl).origin; } catch (e) { throw new Error('Invalid detail URL'); }
        
        try {
            if (config.channelFormatId === 'index-grouped' || config.channelFormatId === 'flattened') {
                const flatConfig = config.selectorChannelFormatFlattened;
                if (flatConfig) {
                    const episodeLists = Array.from(doc.querySelectorAll(flatConfig.selectEpisodeLists));
                    let bestList = episodeLists[0];
                    let maxItems = 0;
                    episodeLists.forEach((list) => {
                        const count = list.querySelectorAll(flatConfig.selectEpisodesFromList).length;
                        if (count > maxItems) { maxItems = count; bestList = list; }
                    });
                    if (bestList) {
                        bestList.querySelectorAll(flatConfig.selectEpisodesFromList).forEach((ep) => {
                            const href = getAttr(ep, 'href');
                            if (href) {
                                try { episodes.push({ title: getTxt(ep), url: new URL(href, origin).href, sort: getTxt(ep).replace(/\D/g, '') }); } catch (e) {}
                            }
                        });
                    }
                }
            }
            if (episodes.length === 0 && config.selectorChannelFormatNoChannel) {
                const noChConfig = config.selectorChannelFormatNoChannel;
                doc.querySelectorAll(noChConfig.selectEpisodes).forEach((ep) => {
                    const href = getAttr(ep, 'href');
                    if (href) {
                        try { episodes.push({ title: getTxt(ep), url: new URL(href, origin).href, sort: getTxt(ep).replace(/\D/g, '') }); } catch (e) {}
                    }
                });
            }
        } catch (e) { console.error('Parse error in getEpisodes:', e); }
        
        return episodes;
    };



    const bridge = {
        version: '2.1',
        fetch: (url, options = {}) => {
            return new Promise((resolve, reject) => {
                log('Fetching:', url, '#007bff');
                
                const requestHeaders = Object.assign({}, options.headers || {});
                if (requestHeaders['X-Neko-Referer']) {
                    requestHeaders['Referer'] = requestHeaders['X-Neko-Referer'];
                    delete requestHeaders['X-Neko-Referer'];
                }

                // Add CORS headers if not present
                if (!requestHeaders['Origin']) {
                    requestHeaders['Origin'] = window.location.origin;
                }
                if (!requestHeaders['Referer']) {
                    requestHeaders['Referer'] = (new URL(url)).origin;
                }

                GM_xmlhttpRequest({
                    method: options.method || 'GET',
                    url: url,
                    headers: requestHeaders,
                    data: options.body,
                    responseType: options.responseType || 'arraybuffer',
                    timeout: 30000, // Increased timeout for video files
                    onload: (res) => {
                        log(`✅ Done (${res.status}):`, url, res.status >= 400 ? 'red' : '#00ff00');
                        resolve({
                            status: res.status,
                            data: res.response,
                            headers: res.responseHeaders,
                            finalUrl: res.finalUrl || url
                        });
                    },
                    onerror: (err) => {
                        log(`❌ GM_xmlhttpRequest Error:`, { url, error: err }, 'red');
                        reject(new Error(`GM_xmlhttpRequest failed: ${err}`));
                    },
                    ontimeout: () => {
                        log(`⏰ Timeout after 30s:`, url, 'orange');
                        reject(new Error('Request timeout (30s)'));
                    }
                });
            });
        },
        searchSource,
        getEpisodes
    };

    window.NEKO_ANI_BRIDGE = bridge;
    if (typeof unsafeWindow !== 'undefined') unsafeWindow.NEKO_ANI_BRIDGE = bridge;
    log('Bridge v2.1 Ready with search and episodes!');
})();
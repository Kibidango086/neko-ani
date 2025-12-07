import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import type { MediaSource, VideoSourceResult, VideoEpisode } from '../../types.js';
import { renderPageWithBrowser, captureNetworkRequests, executeScriptInBrowser } from './browser.ts';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (
  url: string,
  options: any = {},
  maxRetries = 3
): Promise<string> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
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
        },
        timeout: 15000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response');
      }

      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt + 1} failed for ${url}:`, lastError.message);
      if (attempt < maxRetries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await delay(backoffMs);
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries: ${lastError?.message}`);
};

const parseHtml = (html: string) => {
  const dom = new JSDOM(html);
  return dom.window.document;
};

const getTxt = (el: Element | null) => el?.textContent?.trim() || '';
const getAttr = (el: Element | null, attr: string) => el?.getAttribute(attr) || '';

const cleanVideoUrl = (url: string): string => {
  if (!url) return url;
  const matches = Array.from(url.matchAll(/https?:\/\//g));
  if (matches.length > 1) {
    const lastMatch = matches[matches.length - 1];
    if (lastMatch.index !== undefined) {
      return url.substring(lastMatch.index);
    }
  }
  return url;
};

export const searchSource = async (
  source: MediaSource,
  keyword: string
): Promise<VideoSourceResult[]> => {
  const config = source.arguments.searchConfig;
  let searchUrl = config.searchUrl.replace('{keyword}', encodeURIComponent(keyword));

  if (config.searchUseOnlyFirstWord) {
    const firstWord = keyword.split(/[\s　]+/)[0];
    searchUrl = config.searchUrl.replace('{keyword}', encodeURIComponent(firstWord));
  }

  const html = await fetchWithRetry(searchUrl);
  const doc = parseHtml(html);

  const results: VideoSourceResult[] = [];

  try {
    if (config.subjectFormatId === 'a' && config.selectorSubjectFormatA) {
      const selector = config.selectorSubjectFormatA.selectLists;
      if (selector) {
        const elements = Array.from(doc.querySelectorAll(selector));
        elements.forEach((el) => {
          const url = getAttr(el, 'href');
          if (url) {
            try {
              const fullUrl = new URL(url, new URL(searchUrl).origin).href;
              results.push({
                sourceName: source.arguments.name,
                sourceId: Date.now() + Math.random(),
                title: getTxt(el),
                url: fullUrl,
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
            const fullUrl = new URL(url, new URL(searchUrl).origin).href;
            results.push({
              sourceName: source.arguments.name,
              sourceId: Date.now() + Math.random(),
              title: getTxt(nameEls[i]),
              url: fullUrl,
              episodes: [],
            });
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.error('Parse error in search:', e);
  }

  return results.slice(0, 8);
};

export const getEpisodes = async (
  source: MediaSource,
  detailUrl: string
): Promise<VideoEpisode[]> => {
  const config = source.arguments.searchConfig;
  const html = await fetchWithRetry(detailUrl);
  const doc = parseHtml(html);
  let episodes: VideoEpisode[] = [];
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
          const eps = Array.from(bestList.querySelectorAll(flatConfig.selectEpisodesFromList));
          eps.forEach((ep) => {
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
      const eps = Array.from(doc.querySelectorAll(noChConfig.selectEpisodes));
      eps.forEach((ep) => {
        const href = getAttr(ep, 'href');
        if (href) {
          try { episodes.push({ title: getTxt(ep), url: new URL(href, origin).href, sort: getTxt(ep).replace(/\D/g, '') }); } catch (e) {}
        }
      });
    }
  } catch (e) { console.error('Parse error in getEpisodes:', e); }

  return episodes;
};

const findUrlInHtml = (html: string, regexStr: string): string | null => {
  try {
    const regex = new RegExp(regexStr);
    const match = html.match(regex);
    if (match) {
      if ((match as any).groups && (match as any).groups['v']) {
        const v = (match as any).groups['v'];
        return v.replace(/\\\//g, '/');
      }
      if (match.length > 1 && match[1]) return match[1].replace(/\\\//g, '/');
      return match[0].replace(/\\\//g, '/');
    }
  } catch (e) { console.error('Regex error:', e); }
  return null;
};

export const extractVideoUrl = async (
  source: MediaSource,
  episodeUrl: string
): Promise<string | null> => {
  const config = source.arguments.searchConfig;
  const html = await fetchWithRetry(episodeUrl);
  const doc = parseHtml(html);
  const origin = new URL(episodeUrl).origin;

  if (config.matchVideo?.matchVideoUrl) {
    const directMatch = findUrlInHtml(html, config.matchVideo.matchVideoUrl);
    if (directMatch && directMatch.startsWith('http')) return cleanVideoUrl(decodeURIComponent(directMatch));
  }

  if (config.matchVideo?.enableNestedUrl) {
    const iframes = Array.from(doc.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      const src = iframe.src;
      if (!src) continue;
      let fullSrc = src;
      try { fullSrc = new URL(src, origin).href; } catch (e) { continue; }
      if (fullSrc.includes('.m3u8') || fullSrc.includes('.mp4')) return cleanVideoUrl(fullSrc);
      let shouldParseFrame = false;
      if (config.matchVideo.matchNestedUrl) {
        try { const nestRegex = new RegExp(config.matchVideo.matchNestedUrl); if (nestRegex.test(fullSrc)) shouldParseFrame = true; } catch (e) {}
      } else { if (fullSrc.includes('player') || fullSrc.includes('video')) shouldParseFrame = true; }
      if (shouldParseFrame) {
        try {
          const frameHtml = await fetchWithRetry(fullSrc);
          if (config.matchVideo.matchVideoUrl) {
            const frameMatch = findUrlInHtml(frameHtml, config.matchVideo.matchVideoUrl);
            if (frameMatch && frameMatch.startsWith('http')) return cleanVideoUrl(decodeURIComponent(frameMatch));
          }
          const simpleM3u8Match = frameHtml.match(/https?:\/\/[^"']+\.m3u8/);
          if (simpleM3u8Match) return cleanVideoUrl(simpleM3u8Match[0]);
        } catch (error) { console.warn('⚠️ iframe 获取失败:', error); }
      }
    }
  }

  try {
    let renderedHtml: string;
    if (config.matchVideo?.waitForSelector) {
      renderedHtml = await renderPageWithBrowser(episodeUrl, { waitFor: config.matchVideo.waitForSelector, timeout: 20000 });
    } else if (config.matchVideo?.waitMs) {
      renderedHtml = await renderPageWithBrowser(episodeUrl, { waitMs: config.matchVideo.waitMs, timeout: 20000 });
    } else {
      renderedHtml = await renderPageWithBrowser(episodeUrl, { waitMs: 3000, timeout: 20000 });
    }

    const renderedDoc = parseHtml(renderedHtml);
    if (config.matchVideo?.matchVideoUrl) {
      const directMatch = findUrlInHtml(renderedHtml, config.matchVideo.matchVideoUrl);
      if (directMatch && directMatch.startsWith('http')) return cleanVideoUrl(decodeURIComponent(directMatch));
    }

    if (config.matchVideo?.enableNestedUrl) {
      const iframes = Array.from(renderedDoc.querySelectorAll('iframe'));
      for (const iframe of iframes) {
        const src = iframe.src;
        if (!src) continue;
        let fullSrc = src;
        try { fullSrc = new URL(src, origin).href; } catch (e) { continue; }
        if (fullSrc.includes('.m3u8') || fullSrc.includes('.mp4')) return cleanVideoUrl(fullSrc);
        let shouldParseFrame = false;
        if (config.matchVideo.matchNestedUrl) {
          try { const nestRegex = new RegExp(config.matchVideo.matchNestedUrl); if (nestRegex.test(fullSrc)) shouldParseFrame = true; } catch (e) {}
        } else { if (fullSrc.includes('player') || fullSrc.includes('video')) shouldParseFrame = true; }
        if (shouldParseFrame) {
          try {
            const frameHtml = await renderPageWithBrowser(fullSrc, { waitMs: 2000, timeout: 15000 });
            if (config.matchVideo.matchVideoUrl) {
              const frameMatch = findUrlInHtml(frameHtml, config.matchVideo.matchVideoUrl);
              if (frameMatch && frameMatch.startsWith('http')) return cleanVideoUrl(decodeURIComponent(frameMatch));
            }
            const simpleM3u8Match = frameHtml.match(/https?:\/\/[^"']+\.m3u8/);
            if (simpleM3u8Match) return cleanVideoUrl(simpleM3u8Match[0]);
          } catch (error) { console.warn('⚠️ 浏览器渲染 iframe 失败:', error); }
        }
      }
    }

    if (config.matchVideo?.captureNetworkPattern) {
      try {
        const pattern = new RegExp(config.matchVideo.captureNetworkPattern);
        const requests = await captureNetworkRequests(episodeUrl, pattern, 3000);
        if (requests.length > 0) return cleanVideoUrl(requests[0]);
      } catch (error) { console.warn('⚠️ 网络捕获失败:', error); }
    }
  } catch (error) { console.error('❌ 浏览器渲染错误:', error); }

  console.warn('❌ 未能找到视频 URL');
  return null;
};

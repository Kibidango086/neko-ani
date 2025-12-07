import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import type { MediaSource, VideoSourceResult, VideoEpisode } from '../types.js';
import { renderPageWithBrowser, captureNetworkRequests, executeScriptInBrowser } from './browser.ts';

// Custom user agents to avoid detection
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
];

// Get a random user agent
const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry and headers
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
      
      // Exponential backoff with jitter
      if (attempt < maxRetries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await delay(backoffMs);
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries: ${lastError?.message}`);
};

// Parse HTML with JSDOM
const parseHtml = (html: string) => {
  const dom = new JSDOM(html);
  return dom.window.document;
};

// Utility functions
const getTxt = (el: Element | null) => el?.textContent?.trim() || '';
const getAttr = (el: Element | null, attr: string) => el?.getAttribute(attr) || '';

// 清理视频 URL - 去除重复的协议头
const cleanVideoUrl = (url: string): string => {
  if (!url) return url;
  
  // 找到所有 http:// 或 https:// 的位置
  const matches = Array.from(url.matchAll(/https?:\/\//g));
  
  if (matches.length > 1) {
    // 如果有多个协议头，保留最后一个（通常是真实 URL）
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

  console.log(`Searching: ${searchUrl}`);
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
            } catch (e) {
              // URL parsing failed, skip
            }
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
          } catch (e) {
            // URL parsing failed, skip
          }
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
  
  console.log(`Getting episodes from: ${detailUrl}`);
  const html = await fetchWithRetry(detailUrl);
  const doc = parseHtml(html);

  let episodes: VideoEpisode[] = [];
  let origin = '';

  try {
    origin = new URL(detailUrl).origin;
  } catch (e) {
    throw new Error('Invalid detail URL');
  }

  try {
    if (config.channelFormatId === 'index-grouped' || config.channelFormatId === 'flattened') {
      const flatConfig = config.selectorChannelFormatFlattened;
      if (flatConfig) {
        const episodeLists = Array.from(doc.querySelectorAll(flatConfig.selectEpisodeLists));

        // Find the list with the most items (usually the main playlist)
        let bestList = episodeLists[0];
        let maxItems = 0;

        episodeLists.forEach((list) => {
          const count = list.querySelectorAll(flatConfig.selectEpisodesFromList).length;
          if (count > maxItems) {
            maxItems = count;
            bestList = list;
          }
        });

        if (bestList) {
          const eps = Array.from(bestList.querySelectorAll(flatConfig.selectEpisodesFromList));
          eps.forEach((ep) => {
            const href = getAttr(ep, 'href');
            if (href) {
              try {
                episodes.push({
                  title: getTxt(ep),
                  url: new URL(href, origin).href,
                  sort: getTxt(ep).replace(/\D/g, ''),
                });
              } catch (e) {
                // Skip invalid URLs
              }
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
          try {
            episodes.push({
              title: getTxt(ep),
              url: new URL(href, origin).href,
              sort: getTxt(ep).replace(/\D/g, ''),
            });
          } catch (e) {
            // Skip invalid URLs
          }
        }
      });
    }
  } catch (e) {
    console.error('Parse error in getEpisodes:', e);
  }

  return episodes;
};

// Find video URL in HTML using regex
const findUrlInHtml = (html: string, regexStr: string): string | null => {
  try {
    const regex = new RegExp(regexStr);
    const match = html.match(regex);
    if (match) {
      // Priority: Named group 'v' -> Group 1 -> Full match
      if (match.groups && match.groups['v']) {
        const v = match.groups['v'];
        return v.replace(/\\\//g, '/');
      }
      if (match.length > 1 && match[1]) {
        return match[1].replace(/\\\//g, '/');
      }
      return match[0].replace(/\\\//g, '/');
    }
  } catch (e) {
    console.error('Regex error:', e);
  }
  return null;
};

export const extractVideoUrl = async (
  source: MediaSource,
  episodeUrl: string
): Promise<string | null> => {
  const config = source.arguments.searchConfig;

  console.log(`Extracting video from: ${episodeUrl}`);
  
  // 1. Try static HTML parsing first (faster)
  console.log('📄 尝试静态 HTML 解析...');
  const html = await fetchWithRetry(episodeUrl);
  const doc = parseHtml(html);
  const origin = new URL(episodeUrl).origin;

  // 2. Direct Match on Main Page
  if (config.matchVideo?.matchVideoUrl) {
    const directMatch = findUrlInHtml(html, config.matchVideo.matchVideoUrl);
    if (directMatch && directMatch.startsWith('http')) {
      const cleanedUrl = cleanVideoUrl(decodeURIComponent(directMatch));
      console.log('✓ 找到直接视频 URL:', cleanedUrl);
      return cleanedUrl;
    }
  }

  // 3. Nested/Iframe Check (static)
  if (config.matchVideo?.enableNestedUrl) {
    const iframes = Array.from(doc.querySelectorAll('iframe'));
    console.log(`🔍 找到 ${iframes.length} 个 iframe`);

    for (const iframe of iframes) {
      const src = iframe.src;
      if (!src) continue;

      let fullSrc = src;
      try {
        fullSrc = new URL(src, origin).href;
      } catch (e) {
        continue;
      }

      // Check if iframe URL is directly video
      if (fullSrc.includes('.m3u8') || fullSrc.includes('.mp4')) {
        const cleanedUrl = cleanVideoUrl(fullSrc);
        console.log('✓ 找到 iframe 视频 URL:', cleanedUrl);
        return cleanedUrl;
      }

      let shouldParseFrame = false;
      if (config.matchVideo.matchNestedUrl) {
        try {
          const nestRegex = new RegExp(config.matchVideo.matchNestedUrl);
          if (nestRegex.test(fullSrc)) {
            shouldParseFrame = true;
          }
        } catch (e) {}
      } else {
        if (fullSrc.includes('player') || fullSrc.includes('video')) {
          shouldParseFrame = true;
        }
      }

      if (shouldParseFrame) {
        try {
          console.log('🔗 获取 iframe 内容:', fullSrc);
          const frameHtml = await fetchWithRetry(fullSrc);
          const frameDoc = parseHtml(frameHtml);

          if (config.matchVideo.matchVideoUrl) {
            const frameMatch = findUrlInHtml(frameHtml, config.matchVideo.matchVideoUrl);
            if (frameMatch && frameMatch.startsWith('http')) {
              const cleanedUrl = cleanVideoUrl(decodeURIComponent(frameMatch));
              console.log('✓ 从 iframe 中找到视频 URL:', cleanedUrl);
              return cleanedUrl;
            }
          }

          const simpleM3u8Match = frameHtml.match(/https?:\/\/[^"']+\.m3u8/);
          if (simpleM3u8Match) {
            const cleanedUrl = cleanVideoUrl(simpleM3u8Match[0]);
            console.log('✓ 找到 m3u8 URL:', cleanedUrl);
            return cleanedUrl;
          }
        } catch (error) {
          console.warn('⚠️ iframe 获取失败:', error);
        }
      }
    }
  }

  // 4. 如果静态解析失败，尝试浏览器渲染（支持 JavaScript）
  console.log('🌐 尝试浏览器渲染（支持 JavaScript）...');
  try {
    let renderedHtml: string;

    // 等待特定元素或时间
    if (config.matchVideo?.waitForSelector) {
      renderedHtml = await renderPageWithBrowser(episodeUrl, {
        waitFor: config.matchVideo.waitForSelector,
        timeout: 20000,
      });
    } else if (config.matchVideo?.waitMs) {
      renderedHtml = await renderPageWithBrowser(episodeUrl, {
        waitMs: config.matchVideo.waitMs,
        timeout: 20000,
      });
    } else {
      // 默认等待 3 秒
      renderedHtml = await renderPageWithBrowser(episodeUrl, {
        waitMs: 3000,
        timeout: 20000,
      });
    }

    const renderedDoc = parseHtml(renderedHtml);

    // 尝试直接匹配
    if (config.matchVideo?.matchVideoUrl) {
      const directMatch = findUrlInHtml(renderedHtml, config.matchVideo.matchVideoUrl);
      if (directMatch && directMatch.startsWith('http')) {
        const cleanedUrl = cleanVideoUrl(decodeURIComponent(directMatch));
        console.log('✓ 浏览器渲染找到视频 URL:', cleanedUrl);
        return cleanedUrl;
      }
    }

    // 尝试 iframe
    if (config.matchVideo?.enableNestedUrl) {
      const iframes = Array.from(renderedDoc.querySelectorAll('iframe'));
      console.log(`🔍 浏览器渲染中找到 ${iframes.length} 个 iframe`);

      for (const iframe of iframes) {
        const src = iframe.src;
        if (!src) continue;

        let fullSrc = src;
        try {
          fullSrc = new URL(src, origin).href;
        } catch (e) {
          continue;
        }

        if (fullSrc.includes('.m3u8') || fullSrc.includes('.mp4')) {
          const cleanedUrl = cleanVideoUrl(fullSrc);
          console.log('✓ 浏览器渲染找到视频 URL:', cleanedUrl);
          return cleanedUrl;
        }

        let shouldParseFrame = false;
        if (config.matchVideo.matchNestedUrl) {
          try {
            const nestRegex = new RegExp(config.matchVideo.matchNestedUrl);
            if (nestRegex.test(fullSrc)) {
              shouldParseFrame = true;
            }
          } catch (e) {}
        } else {
          if (fullSrc.includes('player') || fullSrc.includes('video')) {
            shouldParseFrame = true;
          }
        }

        if (shouldParseFrame) {
          try {
            console.log('🔗 浏览器渲染：获取 iframe', fullSrc);
            const frameHtml = await renderPageWithBrowser(fullSrc, {
              waitMs: 2000,
              timeout: 15000,
            });

            if (config.matchVideo.matchVideoUrl) {
              const frameMatch = findUrlInHtml(frameHtml, config.matchVideo.matchVideoUrl);
              if (frameMatch && frameMatch.startsWith('http')) {
                const cleanedUrl = cleanVideoUrl(decodeURIComponent(frameMatch));
                console.log('✓ 浏览器渲染从 iframe 中找到视频 URL:', cleanedUrl);
                return cleanedUrl;
              }
            }

            const simpleM3u8Match = frameHtml.match(/https?:\/\/[^"']+\.m3u8/);
            if (simpleM3u8Match) {
              const cleanedUrl = cleanVideoUrl(simpleM3u8Match[0]);
              console.log('✓ 浏览器渲染找到 m3u8 URL:', cleanedUrl);
              return cleanedUrl;
            }
          } catch (error) {
            console.warn('⚠️ 浏览器渲染 iframe 失败:', error);
          }
        }
      }
    }

    // 5. 尝试捕获网络请求（用于 API 调用）
    if (config.matchVideo?.captureNetworkPattern) {
      try {
        console.log('📡 尝试捕获网络请求...');
        const pattern = new RegExp(config.matchVideo.captureNetworkPattern);
        const requests = await captureNetworkRequests(episodeUrl, pattern, 3000);
        
        if (requests.length > 0) {
          const cleanedUrl = cleanVideoUrl(requests[0]);
          console.log('✓ 捕获到网络请求:', cleanedUrl);
          return cleanedUrl;
        }
      } catch (error) {
        console.warn('⚠️ 网络捕获失败:', error);
      }
    }
  } catch (error) {
    console.error('❌ 浏览器渲染错误:', error);
  }

  console.warn('❌ 未能找到视频 URL');
  return null;
};

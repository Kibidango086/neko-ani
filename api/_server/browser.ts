import fetch from 'node-fetch';

/**
 * 构造 Browserless API 完整的 URL
 */
const getEndpoint = (tokenOrUrl: string | undefined, path: string, params: Record<string, string | number> = {}): string => {
  const raw = tokenOrUrl || process.env.BROWSERLESS_URL;
  if (!raw) throw new Error('Browserless Token/URL not configured');

  let finalUrl: URL;
  if (!raw.includes('://')) {
    finalUrl = new URL(`https://chrome.browserless.io${path}`);
    finalUrl.searchParams.set('token', raw);
  } else {
    const normalized = raw.replace('wss://', 'https://').replace('ws://', 'http://');
    finalUrl = new URL(normalized);
    finalUrl.pathname = path;
  }

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
        finalUrl.searchParams.set(key, String(val));
    }
  }
  return finalUrl.toString();
};

export interface BrowserResult {
    html: string;
    capturedUrls: string[];
    scriptResult?: any;
}

/**
 * 获取页面内容 (稳定接口)
 */
export const renderPageWithBrowser = async (
  url: string,
  options: { waitFor?: string; timeout?: number; browserWSEndpoint?: string } = {}
): Promise<string> => {
    const endpoint = getEndpoint(options.browserWSEndpoint, '/content', {
        timeout: options.timeout || 30000
    });
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, waitForSelector: options.waitFor })
    });

    if (!response.ok) {
        throw new Error(`Browserless Content Error (${response.status}): ${await response.text()}`);
    }
    return await response.text();
};

/**
 * 执行复杂逻辑 (ESM 导出风格)
 */
export const smartBrowserExtract = async (
    url: string,
    options: { 
        waitFor?: string; 
        waitMs?: number; 
        timeout?: number; 
        browserWSEndpoint?: string;
        capturePattern?: string;
        script?: string;
    } = {}
): Promise<BrowserResult> => {
    // 使用 ESM 导出风格，这是目前大多数现代 Browserless 环境的首选
    const code = `
export default async ({ page, context }) => {
  const { url, waitFor, waitMs, timeout, capturePattern, script } = context;
  const capturedUrls = [];
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    const isMatch = capturePattern 
        ? new RegExp(capturePattern, 'i').test(u)
        : (u.includes('.m3u8') || u.includes('.mp4') || u.includes('.ts'));
    if (isMatch) capturedUrls.push(u);
    r.continue();
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: timeout || 30000 });
  } catch (e) {}

  if (waitFor) {
    try { await page.waitForSelector(waitFor, { timeout: 5000 }); } catch (e) {}
  }

  if (waitMs) {
    await new Promise(r => setTimeout(r, waitMs));
  }

  let scriptResult = null;
  if (script) {
    try {
        scriptResult = await page.evaluate((s) => {
            try { return eval('(function() { ' + s + ' })()'); } catch (e) { return null; }
        }, script);
    } catch (e) {}
  }

  const html = await page.content();
  return { html, capturedUrls, scriptResult };
};
`.trim();

    const endpoint = getEndpoint(options.browserWSEndpoint, '/function', {
        timeout: (options.timeout || 30000) + 5000
    });

    console.log(`Sending code to Browserless (first 50 chars): ${code.substring(0, 50)}...`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            context: { 
                url, 
                waitFor: options.waitFor, 
                waitMs: options.waitMs || 3000, 
                capturePattern: options.capturePattern,
                script: options.script
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Browserless Function Error (${response.status}): ${await response.text()}`);
    }

    return await response.json() as BrowserResult;
};

export const captureNetworkRequests = async (url: string, pattern: RegExp, waitMs: number, endpoint?: string) => 
    (await smartBrowserExtract(url, { capturePattern: pattern.source, waitMs, browserWSEndpoint: endpoint })).capturedUrls;

export const executeScriptInBrowser = async (url: string, script: string, waitMs: number, endpoint?: string) => 
    (await smartBrowserExtract(url, { script, waitMs, browserWSEndpoint: endpoint })).scriptResult;

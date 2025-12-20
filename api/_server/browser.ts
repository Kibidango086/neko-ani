import fetch from 'node-fetch';

/**
 * 构造 Browserless API 完整的 URL，包括 Token 和查询参数
 */
const getEndpoint = (tokenOrUrl: string | undefined, path: string, params: Record<string, string | number> = {}): string => {
  const raw = tokenOrUrl || process.env.BROWSERLESS_URL;
  if (!raw) throw new Error('Browserless Token/URL not configured');

  let finalUrl: URL;

  if (!raw.includes('://')) {
    // 纯 Token 情况
    finalUrl = new URL(`https://chrome.browserless.io${path}`);
    finalUrl.searchParams.set('token', raw);
  } else {
    // 完整 URL 情况
    const normalized = raw.replace('wss://', 'https://').replace('ws://', 'http://');
    finalUrl = new URL(normalized);
    finalUrl.pathname = path;
  }

  // 附加额外的查询参数（如 timeout）
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
 * 使用专门的 /content 接口获取页面 HTML（最稳定）
 */
export const renderPageWithBrowser = async (
  url: string,
  options: { waitFor?: string; timeout?: number; browserWSEndpoint?: string } = {}
): Promise<string> => {
    const endpoint = getEndpoint(options.browserWSEndpoint, '/content', {
        timeout: options.timeout || 30000
    });
    
    console.log(`Calling Browserless /content for: ${url}`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url,
            waitForSelector: options.waitFor
        })
    });

    if (!response.ok) {
        throw new Error(`Browserless Content Error (${response.status}): ${await response.text()}`);
    }

    return await response.text();
};

/**
 * 使用 /function 接口执行复杂的拦截和脚本逻辑
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
    // 采用括号包装的匿名函数表达式，这是 eval 环境下最兼容的写法
    const code = `(async ({ page, context }) => {
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
})`;

    const endpoint = getEndpoint(options.browserWSEndpoint, '/function', {
        timeout: (options.timeout || 30000) + 5000 // 给 API 留出一点余量
    });

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

// 保持旧接口兼容
export const captureNetworkRequests = async (url: string, pattern: RegExp, waitMs: number, endpoint?: string) => 
    (await smartBrowserExtract(url, { capturePattern: pattern.source, waitMs, browserWSEndpoint: endpoint })).capturedUrls;

export const executeScriptInBrowser = async (url: string, script: string, waitMs: number, endpoint?: string) => 
    (await smartBrowserExtract(url, { script, waitMs, browserWSEndpoint: endpoint })).scriptResult;
import fetch from 'node-fetch';

/**
 * Helper to get the correct Browserless API endpoint with optional query params
 */
const getEndpoint = (tokenOrUrl: string | undefined, path: string, params: Record<string, string | number> = {}): string => {
  const raw = tokenOrUrl || process.env.BROWSERLESS_URL;
  if (!raw) throw new Error('Browserless Token/URL not configured');

  let baseUrl = '';
  let token = '';

  if (!raw.includes('://')) {
    baseUrl = `https://chrome.browserless.io${path}`;
    token = raw;
  } else {
    let url = raw;
    if (url.startsWith('wss://')) url = url.replace('wss://', 'https://');
    if (url.startsWith('ws://')) url = url.replace('ws://', 'http://');
    
    try {
        const urlObj = new URL(url);
        urlObj.pathname = path;
        token = urlObj.searchParams.get('token') || '';
        urlObj.search = ''; // Clear existing params to rebuild
        baseUrl = urlObj.toString();
    } catch (e) {
        baseUrl = url.replace(/\?(.*)$/, '') + path;
    }
  }

  const query = new URLSearchParams();
  if (token) query.set('token', token);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) query.set(key, String(val));
  }

  const queryString = query.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

export const renderPageWithBrowser = async (
  url: string,
  options: { waitFor?: string; waitMs?: number; timeout?: number; browserWSEndpoint?: string } = {}
): Promise<string> => {
    // timeout 必须作为查询参数传递，不能放在 body 中
    const endpoint = getEndpoint(options.browserWSEndpoint, '/content', {
        timeout: options.timeout || 30000
    });
    
    console.log(`Calling Browserless /content: ${endpoint.replace(/token=[^&]+/, 'token=***')}`);

    const body: any = { url };
    if (options.waitFor) body.waitForSelector = options.waitFor;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Browserless Content Error (${response.status}): ${text}`);
    }

    let html = await response.text();
    
    // 如果有额外的等待时间，/content 接口不支持 waitMs，只能在后续通过 /function 处理或者在这里接受结果
    // 注意：/content 本身是渲染完即返回的。
    return html;
};

export const captureNetworkRequests = async (
  url: string,
  pattern: RegExp,
  waitMs: number = 3000,
  browserWSEndpoint?: string
): Promise<string[]> => {
    const code = `async ({ page, context }) => {
  const { url, waitMs, patternStr } = context;
  const urls = [];
  const regex = new RegExp(patternStr);
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (regex.test(u)) urls.push(u);
    r.continue();
  });
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) {}
  await new Promise(r => setTimeout(r, waitMs));
  return urls;
}`;

    const endpoint = getEndpoint(browserWSEndpoint, '/function');
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            context: { url, waitMs, patternStr: pattern.source }
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Browserless Function Error: ${text}`);
    }

    return await response.json() as string[];
};

export const executeScriptInBrowser = async (
    url: string,
    script: string,
    waitMs: number = 2000,
    browserWSEndpoint?: string
): Promise<any> => {
    const code = `async ({ page, context }) => {
  const { url, waitMs, script } = context;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, waitMs));
  return await page.evaluate((s) => {
    try { return eval('(function() { ' + s + ' })()'); } catch (e) { return null; }
  }, script);
}`;

    const endpoint = getEndpoint(browserWSEndpoint, '/function');
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            context: { url, waitMs, script }
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Browserless Function Error: ${text}`);
    }

    return await response.json();
}
import fetch from 'node-fetch';

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
        urlObj.search = '';
        baseUrl = urlObj.toString();
    } catch (e) { baseUrl = url.replace(/\?(.*)$/, '') + path; }
  }

  const query = new URLSearchParams();
  if (token) query.set('token', token);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) query.set(key, String(val));
  }
  const queryString = query.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

export interface BrowserResult {
    html: string;
    capturedUrls: string[];
    scriptResult?: any;
}

/**
 * Perform a smart extraction in one single Browserless call
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
    const code = `async ({ page, context }) => {
  const { url, waitFor, waitMs, timeout, capturePattern, script } = context;
  const capturedUrls = [];
  
  // Set realistic User Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  // Setup Network Interception
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (capturePattern && new RegExp(capturePattern, 'i').test(u)) {
        capturedUrls.push(u);
    } else if (!capturePattern && (u.includes('.m3u8') || u.includes('.mp4') || u.includes('.ts'))) {
        capturedUrls.push(u);
    }
    r.continue();
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: timeout || 30000 });
  } catch (e) {
    // If navigation fails, we might still have captured some URLs
  }

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

  return {
    html: await page.content(),
    capturedUrls,
    scriptResult
  };
}`;

    const endpoint = getEndpoint(options.browserWSEndpoint, '/function');
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            context: { 
                url, 
                waitFor: options.waitFor, 
                waitMs: options.waitMs || 3000, 
                timeout: options.timeout,
                capturePattern: options.capturePattern,
                script: options.script
            }
        })
    });

    if (!response.ok) throw new Error(`Browserless Error: ${await response.text()}`);
    return await response.json() as BrowserResult;
};

// Keep old exports for compatibility but redirect them to smartBrowserExtract or maintain simple versions
export const renderPageWithBrowser = async (url: string, opts: any) => (await smartBrowserExtract(url, opts)).html;
export const captureNetworkRequests = async (url: string, pattern: RegExp, waitMs: number, endpoint?: string) => 
    (await smartBrowserExtract(url, { capturePattern: pattern.source, waitMs, browserWSEndpoint: endpoint })).capturedUrls;
export const executeScriptInBrowser = async (url: string, script: string, waitMs: number, endpoint?: string) => 
    (await smartBrowserExtract(url, { script, waitMs, browserWSEndpoint: endpoint })).scriptResult;

import fetch from 'node-fetch';

/**
 * Helper to get the correct Browserless API endpoint
 */
const getFunctionEndpoint = (tokenOrUrl?: string, path: string = '/function'): string => {
  const raw = tokenOrUrl || process.env.BROWSERLESS_URL;
  if (!raw) throw new Error('Browserless Token/URL not configured');

  if (!raw.includes('://')) {
    return `https://chrome.browserless.io${path}?token=${raw}`;
  }

  let url = raw;
  if (url.startsWith('wss://')) url = url.replace('wss://', 'https://');
  if (url.startsWith('ws://')) url = url.replace('ws://', 'http://');

  try {
      const urlObj = new URL(url);
      urlObj.pathname = path;
      return urlObj.toString();
  } catch (e) {
      // Fallback for simple string replacement if URL is complex
      return url.replace(/\?(.*)$/, '') + path + (url.includes('?') ? url.substring(url.indexOf('?')) : '');
  }
};

export const renderPageWithBrowser = async (
  url: string,
  options: { waitFor?: string; waitMs?: number; timeout?: number; browserWSEndpoint?: string } = {}
): Promise<string> => {
    const endpoint = getFunctionEndpoint(options.browserWSEndpoint, '/content');
    console.log(`Calling Browserless Content: ${endpoint.replace(/token=[^&]+/, 'token=***')}`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url,
            waitForSelector: options.waitFor,
            timeout: options.timeout || 30000
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Browserless Content Error (${response.status}): ${text}`);
    }

    return await response.text();
};

export const captureNetworkRequests = async (
  url: string,
  pattern: RegExp,
  waitMs: number = 3000,
  browserWSEndpoint?: string
): Promise<string[]> => {
    // Simplest form: an anonymous async function as a string
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

    const endpoint = getFunctionEndpoint(browserWSEndpoint, '/function');
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
        throw new Error(`Browserless API Error: ${text}`);
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

    const endpoint = getFunctionEndpoint(browserWSEndpoint, '/function');
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
        throw new Error(`Browserless API Error: ${text}`);
    }

    return await response.json();
}

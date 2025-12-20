import fetch from 'node-fetch';

/**
 * Helper to convert WSS endpoint to HTTPS Function endpoint
 */
const getFunctionEndpoint = (tokenOrUrl?: string): string => {
  const raw = tokenOrUrl || process.env.BROWSERLESS_URL;
  if (!raw) {
    throw new Error('Browserless Token/URL not configured');
  }

  if (!raw.includes('://')) {
    return `https://chrome.browserless.io/function?token=${raw}`;
  }

  let url = raw;
  if (url.startsWith('wss://')) url = url.replace('wss://', 'https://');
  if (url.startsWith('ws://')) url = url.replace('ws://', 'http://');

  if (!url.includes('/function') && !url.includes('/content') && !url.includes('/scrape')) {
    try {
        const urlObj = new URL(url);
        urlObj.pathname = '/function';
        return urlObj.toString();
    } catch (e) {
        return url.replace(/\?.*$/, '') + '/function' + (url.includes('?') ? url.substring(url.indexOf('?')) : '');
    }
  }
  
  return url;
};

/**
 * Generic helper to call Browserless /function API
 */
const callBrowserlessFunction = async (
    browserWSEndpoint: string | undefined,
    puppeteerScript: string,
    context: any
): Promise<any> => {
    const endpoint = getFunctionEndpoint(browserWSEndpoint);
    console.log(`Calling Browserless: ${endpoint.replace(/token=[^&]+/, 'token=***')}`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: puppeteerScript,
            context: context
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Browserless API Error (${response.status}): ${text}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }
    return await response.text();
};

export const renderPageWithBrowser = async (
  url: string,
  options: { waitFor?: string; waitMs?: number; timeout?: number; browserWSEndpoint?: string } = {}
): Promise<string> => {
    const code = `
module.exports = async ({ page, context }) => {
  const { url, waitFor, waitMs, timeout } = context;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeout || 30000 });
  if (waitFor) {
    try { await page.waitForSelector(waitFor, { timeout: 5000 }); } catch (e) {}
  }
  if (waitMs) {
    await new Promise(r => setTimeout(r, waitMs));
  }
  return await page.content();
};
    `;

    return await callBrowserlessFunction(options.browserWSEndpoint, code, {
        url,
        waitFor: options.waitFor,
        waitMs: options.waitMs,
        timeout: options.timeout
    });
};

export const captureNetworkRequests = async (
  url: string,
  pattern: RegExp,
  waitMs: number = 3000,
  browserWSEndpoint?: string
): Promise<string[]> => {
    const code = `
module.exports = async ({ page, context }) => {
  const { url, waitMs, patternStr } = context;
  const urls = [];
  const regex = new RegExp(patternStr);
  
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (regex.test(u)) { urls.push(u); }
    req.continue();
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch (e) {}
  
  await new Promise(r => setTimeout(r, waitMs));
  return urls;
};
    `;

    return await callBrowserlessFunction(browserWSEndpoint, code, {
        url,
        waitMs,
        patternStr: pattern.source
    });
};

export const executeScriptInBrowser = async (
    url: string,
    script: string,
    waitMs: number = 2000,
    browserWSEndpoint?: string
): Promise<any> => {
    const code = `
module.exports = async ({ page, context }) => {
  const { url, waitMs, script } = context;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, waitMs));
  
  return await page.evaluate((s) => {
    try {
      return eval('(function() { ' + s + ' })()');
    } catch (e) {
      return null;
    }
  }, script);
};
    `;

    return await callBrowserlessFunction(browserWSEndpoint, code, {
        url,
        waitMs,
        script
    });
}
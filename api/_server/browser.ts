import fetch from 'node-fetch';

/**
 * Helper to convert WSS endpoint to HTTPS Function endpoint
 * e.g. wss://chrome.browserless.io?token=XYZ -> https://chrome.browserless.io/function?token=XYZ
 */
const getFunctionEndpoint = (tokenOrUrl?: string): string => {
  const raw = tokenOrUrl || process.env.BROWSERLESS_URL;
  if (!raw) {
    throw new Error('Browserless Token/URL not configured');
  }

  // If it's just a token (e.g. "my-secret-token")
  if (!raw.includes('://')) {
    return `https://chrome.browserless.io/function?token=${raw}`;
  }

  // If it's a full URL (compatibility mode)
  let url = raw;
  if (url.startsWith('wss://')) url = url.replace('wss://', 'https://');
  if (url.startsWith('ws://')) url = url.replace('ws://', 'http://');

  if (!url.includes('/function') && !url.includes('/content') && !url.includes('/scrape')) {
    const urlObj = new URL(url);
    urlObj.pathname = '/function';
    return urlObj.toString();
  }
  
  if (url.includes('browserless.io') && !url.includes('/function')) {
      return url.replace('?', '/function?');
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
    // Log masked endpoint for debugging
    console.log(`Calling Browserless HTTP: ${endpoint.replace(/token=[^&]+/, 'token=***')}`);

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

    // Browserless /function returns the return value of the exported function
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
    // Puppeteer script to run on Browserless server
    // Standard CommonJS export for Browserless
    const code = `
        module.exports = async ({ page, context }) => {
            const { url, waitFor, waitMs, timeout } = context;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeout || 30000 });
            
            if (waitFor) {
                try {
                    await page.waitForSelector(waitFor, { timeout: 5000 });
                } catch(e) {}
            }
            
            if (waitMs) {
                await page.waitForTimeout(waitMs);
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
  pattern: RegExp, // Regex objects cannot be passed directly via JSON, so we pass string
  waitMs: number = 3000,
  browserWSEndpoint?: string
): Promise<string[]> => {
    const code = `
        module.exports = async ({ page, context }) => {
            const { url, waitMs, patternStr } = context;
            const urls = [];
            const regex = new RegExp(patternStr); // Reconstruct regex
            
            await page.setRequestInterception(true);
            page.on('request', req => {
                const u = req.url();
                if (regex.test(u)) {
                    urls.push(u);
                }
                req.continue();
            });

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
            } catch (e) {
                // Ignore nav errors if we captured requests
            }
            
            await page.waitForTimeout(waitMs);
            return urls;
        };
    `;

    return await callBrowserlessFunction(browserWSEndpoint, code, {
        url,
        waitMs,
        patternStr: pattern.source // Pass regex source string
    });
};

export const executeScriptInBrowser = async (
    url: string,
    script: string, // Client-side JS to execute in page
    waitMs: number = 2000,
    browserWSEndpoint?: string
): Promise<any> => {
    const code = `
        module.exports = async ({ page, context }) => {
            const { url, waitMs, script } = context;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForTimeout(waitMs);
            
            // Execute the client-side script
            // The script string is evaluated in the browser context
            const result = await page.evaluate((s) => {
                 // Use eval to execute the passed string code
                 // Beware: 's' is the script string. 
                 // If 's' is "return document.title", we wrap it in a function
                 try {
                    return eval('(function() { ' + s + ' })()');
                 } catch (e) {
                    return null;
                 }
            }, script);
            
            return result;
        };
    `;

    return await callBrowserlessFunction(browserWSEndpoint, code, {
        url,
        waitMs,
        script
    });
}

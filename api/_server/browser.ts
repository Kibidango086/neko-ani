import { chromium, Browser, Page } from 'playwright-core';

let browserInstance: Browser | null = null;

const getBrowser = async (endpoint?: string): Promise<Browser> => {
  if (browserInstance && browserInstance.isConnected()) return browserInstance;

  const browserWSEndpoint = endpoint || process.env.BROWSERLESS_URL;
  if (!browserWSEndpoint) {
    throw new Error('BROWSERLESS_URL not configured and no endpoint provided');
  }

  console.log('Connecting to Browserless...');
  browserInstance = await chromium.connect(browserWSEndpoint);
  return browserInstance;
};

export const renderPageWithBrowser = async (
  url: string,
  options: { waitFor?: string; waitMs?: number; timeout?: number; browserWSEndpoint?: string } = {}
): Promise<string> => {
  let browser: Browser | null = null;
  let page: Page | null = null;
  try {
    browser = await getBrowser(options.browserWSEndpoint);
    page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    await page.goto(url, { timeout: options.timeout || 30000, waitUntil: 'domcontentloaded' });
    
    if (options.waitFor) {
      try {
        await page.waitForSelector(options.waitFor, { timeout: 10000 });
      } catch (e) {
        console.warn(`Timeout waiting for selector: ${options.waitFor}`);
      }
    }

    if (options.waitMs) {
      await page.waitForTimeout(options.waitMs);
    }

    const content = await page.content();
    return content;
  } catch (error) {
    console.error('Browser render error:', error);
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close(); 
    browserInstance = null;
  }
};

export const captureNetworkRequests = async (
  url: string,
  pattern: RegExp,
  waitMs: number = 5000,
  browserWSEndpoint?: string
): Promise<string[]> => {
  let browser: Browser | null = null;
  let page: Page | null = null;
  const captured: string[] = [];

  try {
    browser = await getBrowser(browserWSEndpoint);
    page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    page.on('request', request => {
      const u = request.url();
      if (pattern.test(u)) {
        captured.push(u);
      }
    });

    try {
        await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
    } catch (e) {
        console.warn('Navigation error during capture:', e);
    }
    
    await page.waitForTimeout(waitMs);
    
    return captured;
  } catch (error) {
    console.error('Network capture error:', error);
    return [];
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    browserInstance = null;
  }
};

export const executeScriptInBrowser = async (
    url: string,
    script: string,
    waitMs: number = 2000,
    browserWSEndpoint?: string
): Promise<any> => {
    let browser: Browser | null = null;
    let page: Page | null = null;
    try {
        browser = await getBrowser(browserWSEndpoint);
        page = await browser.newPage();
        await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(waitMs);
        
        const result = await page.evaluate(script);
        return result;
    } catch (error) {
        console.error('Script execution error:', error);
        return null;
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
        browserInstance = null;
    }
}

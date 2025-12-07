import { chromium, Browser, Page } from 'playwright-core';

let browserInstance: Browser | null = null;

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

const getBrowser = async (): Promise<Browser> => {
  if (!browserInstance) {
    console.log('🌐 启动 Playwright/Chromium 浏览器...');

    const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || undefined;

    const launchOptions: any = {
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
      console.log(`使用自定义 Chromium 可执行文件: ${executablePath}`);
    } else {
      console.log('未指定 CHROMIUM_EXECUTABLE_PATH，若未安装浏览器二进制，启动可能失败。');
    }

    browserInstance = await chromium.launch(launchOptions);
    console.log('✓ 浏览器已启动');
  }
  return browserInstance;
};

export const closeBrowser = async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log('✓ 浏览器已关闭');
  }
};

export const renderPageWithBrowser = async (
  url: string,
  options: {
    waitFor?: string;
    waitForFunction?: string;
    timeout?: number;
    waitMs?: number;
    deviceScaleFactor?: number;
  } = {}
): Promise<string> => {
  const browser = await getBrowser();
  let page: Page | null = null;

  try {
    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
    });
    page = await context.newPage();

    await page.setViewportSize({ width: 1920, height: 1080 });

    const timeout = options.timeout || 30000;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    await page.goto(url, { waitUntil: 'networkidle' });

    if (options.waitFor) {
      await page.waitForSelector(options.waitFor, { timeout });
    }

    if (options.waitForFunction) {
      await page.waitForFunction(() => eval(options.waitForFunction!), { timeout });
    }

    if (options.waitMs) {
      await new Promise(resolve => setTimeout(resolve, options.waitMs));
    }

    const html = await page.content();
    return html;
  } catch (error) {
    console.error('浏览器渲染错误:', error);
    throw new Error(`Failed to render page: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (page) await page.close();
  }
};

export const executeScriptInBrowser = async (url: string, scriptFn: string, waitForMs = 2000): Promise<any> => {
  const browser = await getBrowser();
  let page: Page | null = null;
  try {
    const context = await browser.newContext({ userAgent: getRandomUserAgent(), viewport: { width: 1920, height: 1080 } });
    page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    const timeout = 30000;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);
    await page.goto(url, { waitUntil: 'networkidle' });
    if (waitForMs > 0) await new Promise(resolve => setTimeout(resolve, waitForMs));
    const result = await page.evaluate(() => {
      // @ts-ignore
      return (eval(`(${scriptFn})`))(document, window);
    });
    return result;
  } catch (error) {
    console.error('脚本执行错误:', error);
    throw new Error(`Failed to execute script: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (page) await page.close();
  }
};

export const captureNetworkRequests = async (url: string, urlPattern: RegExp, waitForMs = 3000): Promise<string[]> => {
  const browser = await getBrowser();
  let page: Page | null = null;
  try {
    const context = await browser.newContext({ userAgent: getRandomUserAgent(), viewport: { width: 1920, height: 1080 } });
    page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    const capturedUrls: string[] = [];
    page.on('response', (response) => {
      if (urlPattern.test(response.url())) capturedUrls.push(response.url());
    });
    const timeout = 30000;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);
    await page.goto(url, { waitUntil: 'networkidle' });
    await new Promise(resolve => setTimeout(resolve, waitForMs));
    return capturedUrls;
  } catch (error) {
    console.error('网络捕获错误:', error);
    throw new Error(`Failed to capture requests: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (page) await page.close();
  }
};

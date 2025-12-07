import { chromium, Browser, Page } from 'playwright-core';

/**
 * 浏览器渲染引擎
 * 用于需要执行 JavaScript 的动态页面
 */

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

    // 支持按需传入浏览器二进制路径（例如在自托管环境中预置二进制）
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

/**
 * 用浏览器渲染页面（支持 JavaScript）
 * @param url 页面 URL
 * @param options 配置选项
 */
export const renderPageWithBrowser = async (
  url: string,
  options: {
    waitFor?: string; // CSS 选择器，等待元素出现
    waitForFunction?: string; // JavaScript 函数，等待自定义条件
    timeout?: number; // 超时时间（毫秒）
    waitMs?: number; // 等待时间（毫秒）
    deviceScaleFactor?: number; // 设备缩放比例
  } = {}
): Promise<string> => {
  const browser = await getBrowser();
  let page: Page | null = null;

  try {
    // 在创建上下文时设置 UA
    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
    });
    page = await context.newPage();

    // 设置视口大小
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 设置超时
    const timeout = options.timeout || 30000;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    console.log(`🔄 加载页面: ${url}`);

    // 加载页面
    await page.goto(url, { waitUntil: 'networkidle' });

    // 等待特定元素或条件
    if (options.waitFor) {
      console.log(`⏳ 等待元素: ${options.waitFor}`);
      await page.waitForSelector(options.waitFor, { timeout });
    }

    if (options.waitForFunction) {
      console.log(`⏳ 执行等待条件...`);
      await page.waitForFunction(
        () => eval(options.waitForFunction!),
        { timeout }
      );
    }

    // 额外等待时间
    if (options.waitMs) {
      console.log(`⏳ 等待 ${options.waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, options.waitMs));
    }

    // 获取渲染后的 HTML
    const html = await page.content();
    console.log(`✓ 页面加载完成 (${html.length} 字符)`);

    return html;
  } catch (error) {
    console.error('浏览器渲染错误:', error);
    throw new Error(`Failed to render page: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * 用浏览器执行 JavaScript 并获取结果
 */
export const executeScriptInBrowser = async (
  url: string,
  scriptFn: string, // JavaScript 函数体
  waitForMs: number = 2000
): Promise<any> => {
  const browser = await getBrowser();
  let page: Page | null = null;

  try {
    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
    });
    page = await context.newPage();

    await page.setViewportSize({ width: 1920, height: 1080 });

    const timeout = 30000;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    console.log(`🔄 加载页面: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });

    // 等待一段时间让动态内容加载
    if (waitForMs > 0) {
      console.log(`⏳ 等待 ${waitForMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitForMs));
    }

    // 执行脚本
    console.log(`⚙️ 执行脚本...`);
    const result = await page.evaluate(() => {
      // @ts-ignore
      return (eval(`(${scriptFn})`))(document, window);
    });

    console.log(`✓ 脚本执行完成`);
    return result;
  } catch (error) {
    console.error('脚本执行错误:', error);
    throw new Error(`Failed to execute script: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (page) {
      await page.close();
    }
  }
};

/**
 * 获取页面中的网络请求（用于捕获 API 调用）
 */
export const captureNetworkRequests = async (
  url: string,
  urlPattern: RegExp,
  waitForMs: number = 3000
): Promise<string[]> => {
  const browser = await getBrowser();
  let page: Page | null = null;

  try {
    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
    });
    page = await context.newPage();

    await page.setViewportSize({ width: 1920, height: 1080 });

    const capturedUrls: string[] = [];

    // 监听响应
    page.on('response', (response) => {
      if (urlPattern.test(response.url())) {
        capturedUrls.push(response.url());
        console.log(`📡 捕获请求: ${response.url()}`);
      }
    });

    const timeout = 30000;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    console.log(`🔄 加载页面: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });

    // 等待动态请求
    console.log(`⏳ 等待网络请求 ${waitForMs}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitForMs));

    console.log(`✓ 捕获完成，共 ${capturedUrls.length} 个请求`);
    return capturedUrls;
  } catch (error) {
    console.error('网络捕获错误:', error);
    throw new Error(`Failed to capture requests: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (page) {
      await page.close();
    }
  }
};

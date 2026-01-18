cat > src/bypasser/methods/browser.js << 'EOF'
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../../utils/logger');

puppeteer.use(StealthPlugin());

class BrowserBypasser {
  constructor() {
    this.browser = null;
    this.adDomains = [
      'doubleclick.net', 'googlesyndication.com', 'google-analytics.com',
      'googletagmanager.com', 'facebook.com/tr', 'popads.net',
      'adsterra.com', 'propellerads.com', 'mgid.com', 'taboola.com',
      'outbrain.com', 'adf.ly', 'sh.st', 'bc.vc', 'exe.io'
    ];
    this.destinationPatterns = [
      'mega.nz', 'mediafire.com', 'drive.google.com', 'dropbox.com',
      'discord.com/attachments', 'github.com', 'pastebin.com',
      'gofile.io', 'anonfiles.com', 'pixeldrain.com'
    ];
  }

  async init() {
    if (this.browser) return;
    
    logger.info('[Browser] Launching browser...');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      ignoreHTTPSErrors: true
    });
    
    logger.success('[Browser] Browser launched');
  }

  async createPage() {
    if (!this.browser) await this.init();
    
    const page = await this.browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Block ads and trackers
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const type = request.resourceType();

      // Block ads
      if (this.adDomains.some(domain => url.includes(domain))) {
        request.abort();
        return;
      }

      // Block heavy resources
      if (['image', 'media', 'font'].includes(type)) {
        request.abort();
        return;
      }

      request.continue();
    });

    // Inject anti-detection scripts
    await page.evaluateOnNewDocument(() => {
      // Override webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Speed up timers
      const originalSetInterval = window.setInterval;
      const originalSetTimeout = window.setTimeout;
      
      window.setInterval = function(fn, delay, ...args) {
        if (delay > 1000) delay = Math.min(delay, 500);
        return originalSetInterval(fn, delay, ...args);
      };
      
      window.setTimeout = function(fn, delay, ...args) {
        if (delay > 1000) delay = Math.min(delay, 500);
        return originalSetTimeout(fn, delay, ...args);
      };

      // Block popups
      window.open = () => null;
      window.alert = () => {};
      window.confirm = () => true;
    });

    return page;
  }

  async bypass(url, options = {}) {
    const { maxGates = 10, timeout = 60000 } = options;
    
    logger.info(`[Browser] Starting bypass for: ${url}`);
    
    let page;
    let destination = null;
    const startTime = Date.now();
    let gatesCompleted = 0;

    try {
      page = await this.createPage();

      // Listen for redirects to destination
      page.on('response', async (response) => {
        const resUrl = response.url();
        const status = response.status();

        if ([301, 302, 303, 307, 308].includes(status)) {
          const location = response.headers()['location'];
          if (location && this.isDestination(location)) {
            destination = location;
            logger.success(`[Browser] Found redirect to: ${location}`);
          }
        }

        if (this.isDestination(resUrl)) {
          destination = resUrl;
          logger.success(`[Browser] Found destination: ${resUrl}`);
        }
      });

      // Navigate to URL
      logger.debug('[Browser] Navigating...');
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait for initial load
      await this.sleep(2000);

      // Main bypass loop
      while (gatesCompleted < maxGates && !destination) {
        if (Date.now() - startTime > timeout) {
          logger.warn('[Browser] Timeout reached');
          break;
        }

        // Check current URL
        const currentUrl = page.url();
        if (this.isDestination(currentUrl)) {
          destination = currentUrl;
          break;
        }

        // Try to find and click gate buttons
        const clicked = await this.clickGateButton(page);
        
        if (clicked) {
          gatesCompleted++;
          logger.debug(`[Browser] Gate ${gatesCompleted} clicked`);
          await this.sleep(3000);

          // Handle new tabs
          const pages = await this.browser.pages();
          if (pages.length > 2) {
            // Close partner tabs (keep main page)
            for (let i = pages.length - 1; i > 1; i--) {
              await pages[i].close();
            }
          }
        } else {
          // No button found, try to extract link
          destination = await this.extractFromPage(page);
          if (destination) break;
          
          // Wait and retry
          await this.sleep(2000);
        }
      }

      // Final extraction attempt
      if (!destination) {
        destination = await this.extractFromPage(page);
      }

    } catch (error) {
      logger.error(`[Browser] Error: ${error.message}`);
    } finally {
      if (page) await page.close();
    }

    if (destination) {
      return {
        success: true,
        url: destination,
        method: 'browser',
        gates: gatesCompleted,
        time: Date.now() - startTime
      };
    }

    return { success: false, gates: gatesCompleted };
  }

  async clickGateButton(page) {
    const buttonSelectors = [
      'button[class*="verify"]',
      'button[class*="continue"]',
      'button[class*="next"]',
      'button[class*="unlock"]',
      'a[class*="verify"]',
      'a[class*="continue"]',
      'a[class*="next"]',
      'a[class*="unlock"]',
      '#continueButton',
      '#verifyButton',
      '.btn-primary',
      '.btn-success',
      'button[type="submit"]',
      '[data-action="verify"]',
      '[onclick*="verify"]',
      '[onclick*="continue"]'
    ];

    for (const selector of buttonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          const isVisible = await page.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0';
          }, button);

          if (isVisible) {
            await button.click();
            return true;
          }
        }
      } catch (e) {}
    }

    return false;
  }

  async extractFromPage(page) {
    try {
      const content = await page.content();
      
      // Find destination URLs in page
      const urlRegex = /https?:\/\/[^\s"'<>\\]+/g;
      const urls = content.match(urlRegex) || [];
      
      for (const url of urls) {
        if (this.isDestination(url)) {
          return url;
        }
      }

      // Check for Base64 encoded links
      const base64Regex = /atob\(["']([A-Za-z0-9+/=]+)["']\)/g;
      let match;
      while ((match = base64Regex.exec(content)) !== null) {
        try {
          const decoded = Buffer.from(match[1], 'base64').toString();
          if (decoded.startsWith('http') && this.isDestination(decoded)) {
            return decoded;
          }
        } catch (e) {}
      }

      // Check download buttons
      const downloadLink = await page.$eval(
        'a[href*="mega.nz"], a[href*="mediafire"], a[href*="drive.google"], a.download-button',
        el => el.href
      ).catch(() => null);

      if (downloadLink) return downloadLink;

    } catch (error) {
      logger.debug(`[Browser] Extract error: ${error.message}`);
    }

    return null;
  }

  isDestination(url) {
    if (!url || typeof url !== 'string') return false;
    return this.destinationPatterns.some(pattern => url.includes(pattern));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new BrowserBypasser();
EOF

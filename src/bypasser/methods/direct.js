cat > src/bypasser/methods/direct.js << 'EOF'
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');

class DirectExtractor {
  constructor() {
    this.destinationPatterns = [
      'mega.nz',
      'mediafire.com',
      'drive.google.com',
      'dropbox.com',
      'discord.com/attachments',
      'github.com',
      'pastebin.com',
      'gofile.io',
      'anonfiles.com'
    ];
  }

  async extract(url) {
    logger.info(`[Direct] Trying direct extraction for: ${url}`);
    
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        maxRedirects: 5
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Method 1: Check final URL (follow redirects)
      if (response.request?.res?.responseUrl) {
        const finalUrl = response.request.res.responseUrl;
        if (this.isValidDestination(finalUrl)) {
          logger.success(`[Direct] Found via redirect: ${finalUrl}`);
          return { success: true, url: finalUrl, method: 'redirect' };
        }
      }

      // Method 2: Find in anchor tags
      const links = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && this.isValidDestination(href)) {
          links.push(href);
        }
      });

      if (links.length > 0) {
        logger.success(`[Direct] Found in anchor: ${links[0]}`);
        return { success: true, url: links[0], method: 'anchor' };
      }

      // Method 3: Find in data attributes
      const dataLinks = [];
      $('[data-url], [data-href], [data-destination], [data-link]').each((_, el) => {
        const attrs = ['data-url', 'data-href', 'data-destination', 'data-link'];
        for (const attr of attrs) {
          const value = $(el).attr(attr);
          if (value && this.isValidDestination(value)) {
            dataLinks.push(value);
          }
        }
      });

      if (dataLinks.length > 0) {
        logger.success(`[Direct] Found in data attr: ${dataLinks[0]}`);
        return { success: true, url: dataLinks[0], method: 'data-attr' };
      }

      // Method 4: Find Base64 encoded links in scripts
      const scripts = $('script').map((_, el) => $(el).html()).get().join('\n');
      
      // Base64 pattern
      const base64Regex = /["']([A-Za-z0-9+/=]{30,})["']/g;
      let match;
      while ((match = base64Regex.exec(scripts)) !== null) {
        try {
          const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
          if (decoded.startsWith('http') && this.isValidDestination(decoded)) {
            logger.success(`[Direct] Found Base64: ${decoded}`);
            return { success: true, url: decoded, method: 'base64' };
          }
        } catch (e) {}
      }

      // Method 5: Find URLs in JavaScript
      const urlRegex = /https?:\/\/[^\s"'<>\\]+/g;
      const foundUrls = scripts.match(urlRegex) || [];
      for (const foundUrl of foundUrls) {
        if (this.isValidDestination(foundUrl)) {
          logger.success(`[Direct] Found in JS: ${foundUrl}`);
          return { success: true, url: foundUrl, method: 'js-parse' };
        }
      }

      // Method 6: Meta refresh redirect
      const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
      if (metaRefresh) {
        const urlMatch = metaRefresh.match(/url=(.+)/i);
        if (urlMatch && this.isValidDestination(urlMatch[1])) {
          logger.success(`[Direct] Found meta refresh: ${urlMatch[1]}`);
          return { success: true, url: urlMatch[1], method: 'meta-refresh' };
        }
      }

      logger.warn('[Direct] No destination found');
      return { success: false };

    } catch (error) {
      logger.error(`[Direct] Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  isValidDestination(url) {
    if (!url || typeof url !== 'string') return false;
    return this.destinationPatterns.some(pattern => url.includes(pattern));
  }
}

module.exports = new DirectExtractor();
EOF

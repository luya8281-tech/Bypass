cat > src/bypasser/sites/linkvertise.js << 'EOF'
const browser = require('../methods/browser');
const direct = require('../methods/direct');
const logger = require('../../utils/logger');

class LinkvertiseHandler {
  constructor() {
    this.patterns = [
      'linkvertise.com',
      'link-to.net',
      'direct-link.net',
      'linkvertise.net'
    ];
  }

  canHandle(url) {
    return this.patterns.some(pattern => url.includes(pattern));
  }

  async bypass(url) {
    logger.info(`[Linkvertise] Handling: ${url}`);
    
    // Try direct first
    const directResult = await direct.extract(url);
    if (directResult.success) {
      return directResult;
    }

    // Fall back to browser
    return await browser.bypass(url, {
      maxGates: 5,
      timeout: 60000
    });
  }
}

module.exports = new LinkvertiseHandler();
EOF

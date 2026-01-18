cat > src/bypasser/sites/boostink.js << 'EOF'
const browser = require('../methods/browser');
const direct = require('../methods/direct');
const logger = require('../../utils/logger');

class BoostInkHandler {
  constructor() {
    this.patterns = [
      'boost.ink',
      'booo.st',
      'bst.gg',
      'bst.wtf',
      'mboost.me',
      'work.ink',
      'workink.net',
      'workink.one',
      'workink.me'
    ];
  }

  canHandle(url) {
    return this.patterns.some(pattern => url.includes(pattern));
  }

  async bypass(url) {
    logger.info(`[BoostInk] Handling: ${url}`);
    
    // Try direct extraction
    const directResult = await direct.extract(url);
    if (directResult.success) {
      return directResult;
    }

    // Browser automation
    return await browser.bypass(url, {
      maxGates: 3,
      timeout: 45000
    });
  }
}

module.exports = new BoostInkHandler();
EOF

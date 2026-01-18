cat > src/bypasser/sites/universal.js << 'EOF'
const direct = require('../methods/direct');
const api = require('../methods/api');
const browser = require('../methods/browser');
const logger = require('../../utils/logger');

class UniversalHandler {
  constructor() {
    // Generic patterns that need bypass
    this.patterns = [
      'sub2unlock', 'sub2get', 'sub4unlock',
      'rekonise.com', 'social-unlock.com',
      'adfoc.us', 'cuty.io', 'cety.app',
      'ouo.io', 'ouo.press',
      'paster.so', 'paster.gg',
      'shorte.st', 'adf.ly',
      'bc.vc', 'exe.io'
    ];
  }

  canHandle(url) {
    // Universal handler - always returns true as fallback
    return true;
  }

  async bypass(url) {
    logger.info(`[Universal] Handling: ${url}`);
    
    // Method 1: Try direct extraction
    logger.debug('[Universal] Trying direct extraction...');
    const directResult = await direct.extract(url);
    if (directResult.success) {
      logger.success('[Universal] Direct extraction worked!');
      return directResult;
    }

    // Method 2: Try public APIs
    logger.debug('[Universal] Trying API bypass...');
    const apiResult = await api.bypass(url);
    if (apiResult.success) {
      logger.success('[Universal] API bypass worked!');
      return apiResult;
    }

    // Method 3: Browser automation (last resort)
    logger.debug('[Universal] Trying browser bypass...');
    const browserResult = await browser.bypass(url, {
      maxGates: 5,
      timeout: 60000
    });
    
    return browserResult;
  }
}

module.exports = new UniversalHandler();
EOF

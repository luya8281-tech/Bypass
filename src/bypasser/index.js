cat > src/bypasser/index.js << 'EOF'
const logger = require('../utils/logger');

// Import site handlers
const lootlabs = require('./sites/lootlabs');
const linkvertise = require('./sites/linkvertise');
const boostink = require('./sites/boostink');
const universal = require('./sites/universal');

class Bypasser {
  constructor() {
    // Order matters - specific handlers first, universal last
    this.handlers = [
      lootlabs,
      linkvertise,
      boostink,
      universal // Fallback handler
    ];
  }

  async bypass(url) {
    const startTime = Date.now();
    
    // Validate URL
    if (!url || !url.startsWith('http')) {
      return {
        success: false,
        error: 'Invalid URL provided'
      };
    }

    logger.info(`[Bypasser] Processing: ${url}`);

    // Find appropriate handler
    for (const handler of this.handlers) {
      if (handler.canHandle(url)) {
        const handlerName = handler.constructor.name;
        logger.debug(`[Bypasser] Using handler: ${handlerName}`);
        
        try {
          const result = await handler.bypass(url);
          
          if (result.success) {
            result.time = Date.now() - startTime;
            logger.success(`[Bypasser] Success in ${result.time}ms`);
            return result;
          }
        } catch (error) {
          logger.error(`[Bypasser] Handler error: ${error.message}`);
        }
      }
    }

    return {
      success: false,
      error: 'All bypass methods failed',
      time: Date.now() - startTime
    };
  }

  getSupportedSites() {
    const sites = [];
    for (const handler of this.handlers) {
      if (handler.patterns) {
        sites.push(...handler.patterns);
      }
    }
    return sites;
  }
}

module.exports = new Bypasser();
EOF

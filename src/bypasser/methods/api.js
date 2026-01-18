cat > src/bypasser/methods/api.js << 'EOF'
const axios = require('axios');
const logger = require('../../utils/logger');

class APIBypasser {
  constructor() {
    // Public bypass APIs (may change over time)
    this.apis = [
      {
        name: 'bypass.vip',
        url: 'https://api.bypass.vip/bypass',
        method: 'GET',
        params: (url) => ({ url }),
        extract: (data) => data.destination || data.result
      },
      {
        name: 'bypass.bot',
        url: 'https://api.bypass.bot/bypass',
        method: 'POST',
        body: (url) => ({ url }),
        extract: (data) => data.bypassed || data.destination
      }
    ];
  }

  async bypass(url) {
    logger.info(`[API] Trying API bypass for: ${url}`);

    for (const api of this.apis) {
      try {
        logger.debug(`[API] Trying ${api.name}...`);

        let response;
        if (api.method === 'GET') {
          response = await axios.get(api.url, {
            params: api.params(url),
            timeout: 30000,
            headers: {
              'User-Agent': 'Discord Bypass Bot/2.0'
            }
          });
        } else {
          response = await axios.post(api.url, api.body(url), {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Discord Bypass Bot/2.0'
            }
          });
        }

        const destination = api.extract(response.data);
        
        if (destination && destination.startsWith('http')) {
          logger.success(`[API] Success via ${api.name}: ${destination}`);
          return {
            success: true,
            url: destination,
            method: `api-${api.name}`
          };
        }

      } catch (error) {
        logger.warn(`[API] ${api.name} failed: ${error.message}`);
      }
    }

    logger.warn('[API] All APIs failed');
    return { success: false };
  }
}

module.exports = new APIBypasser();
EOF

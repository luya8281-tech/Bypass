cat > src/index.js << 'EOF'
require('dotenv').config();
const { Client, GatewayIntentBits, Events, AttachmentBuilder } = require('discord.js');
const express = require('express');
const bypasser = require('./bypasser');
const createEmbed = require('./utils/embed');
const logger = require('./utils/logger');

// ============================================
// DISCORD BOT SETUP
// ============================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const PREFIX = process.env.PREFIX || '!';

// ============================================
// HEALTH CHECK SERVER (for Render)
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: client.user?.tag || 'starting...',
    servers: client.guilds?.cache.size || 0,
    uptime: process.uptime()
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  logger.info(`Health check server running on port ${PORT}`);
});

// ============================================
// BOT READY EVENT
// ============================================
client.once(Events.ClientReady, () => {
  logger.success(`Logged in as ${client.user.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} servers`);
  
  client.user.setActivity(`${PREFIX}help | Bypassing links`, { type: 3 });
});

// ============================================
// MESSAGE HANDLER
// ============================================
client.on(Events.MessageCreate, async (message) => {
  // Ignore bots
  if (message.author.bot) return;
  
  // Check prefix
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ========== HELP COMMAND ==========
  if (command === 'help' || command === 'h') {
    return message.reply({ embeds: [createEmbed.help()] });
  }

  // ========== SUPPORTED COMMAND ==========
  if (command === 'supported' || command === 'sites') {
    return message.reply({ embeds: [createEmbed.supported()] });
  }

  // ========== BYPASS COMMAND ==========
  if (command === 'bypass' || command === 'b') {
    const url = args[0];
    
    if (!url) {
      return message.reply({
        embeds: [createEmbed.error('No URL', 'Please provide a URL to bypass!\n\nUsage: `!bypass <url>`')]
      });
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return message.reply({
        embeds: [createEmbed.error(url, 'Invalid URL format! Must start with http:// or https://')]
      });
    }

    // Send loading message
    const loadingMsg = await message.reply({ embeds: [createEmbed.loading(url)] });

    try {
      // Perform bypass
      const result = await bypasser.bypass(url);

      if (result.success) {
        const embed = createEmbed.success(url, result.url, {
          method: result.method,
          time: result.time,
          gates: result.gates
        });

        // If result URL is too long, send as file
        if (result.url.length > 1000) {
          const buffer = Buffer.from(result.url, 'utf-8');
          const attachment = new AttachmentBuilder(buffer, { name: 'bypassed_link.txt' });
          
          await loadingMsg.edit({
            embeds: [embed],
            files: [attachment]
          });
        } else {
          await loadingMsg.edit({ embeds: [embed] });
        }

      } else {
        await loadingMsg.edit({
          embeds: [createEmbed.error(url, result.error || 'Unable to bypass this link')]
        });
      }

    } catch (error) {
      logger.error(`Bypass error: ${error.message}`);
      await loadingMsg.edit({
        embeds: [createEmbed.error(url, `Error: ${error.message}`)]
      });
    }
  }

  // ========== PING COMMAND ==========
  if (command === 'ping') {
    const latency = Date.now() - message.createdTimestamp;
    message.reply(`🏓 Pong! Latency: ${latency}ms | API: ${Math.round(client.ws.ping)}ms`);
  }

  // ========== STATS COMMAND ==========
  if (command === 'stats') {
    const embed = {
      color: 0x3498db,
      title: '📊 Bot Statistics',
      fields: [
        { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Users', value: `${client.users.cache.size}`, inline: true },
        { name: 'Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: 'Uptime', value: formatUptime(process.uptime()), inline: true },
        { name: 'Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
        { name: 'Node.js', value: process.version, inline: true }
      ],
      timestamp: new Date()
    };
    message.reply({ embeds: [embed] });
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ============================================
// ERROR HANDLING
// ============================================
client.on(Events.Error, (error) => {
  logger.error(`Client error: ${error.message}`);
});

process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error.message}`);
});

process.on('SIGTERM', async () => {
  logger.warn('SIGTERM received, shutting down...');
  client.destroy();
  process.exit(0);
});

// ============================================
// LOGIN
// ============================================
const token = process.env.DISCORD_TOKEN;

if (!token) {
  logger.error('DISCORD_TOKEN not found in environment!');
  process.exit(1);
}

client.login(token);
EOF

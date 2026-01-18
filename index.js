const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const express = require('express');

// ============ CONFIG ============
const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = '!';
const PORT = process.env.PORT || 3000;

// ============ HEALTH SERVER ============
const app = express();
app.get('/', (_, res) => res.send('Bot Online!'));
app.get('/health', (_, res) => res.send('OK'));
app.listen(PORT, () => console.log(`Server on port ${PORT}`));

// ============ DISCORD BOT ============
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ============ BYPASS CLASS ============
class Bypasser {
  constructor() {
    this.browser = null;
    this.destinations = ['mega.nz', 'mediafire.com', 'drive.google.com', 'dropbox.com', 'gofile.io', 'discord.com/attachments', 'github.com', 'pastebin.com'];
    this.ads = ['doubleclick.net', 'googlesyndication.com', 'google-analytics.com', 'popads.net', 'adsterra.com'];
  }

  isDestination(url) {
    return url && this.destinations.some(d => url.includes(d));
  }

  // Method 1: Direct Extract
  async direct(url) {
    try {
      const { data } = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
        maxRedirects: 5
      });

      const $ = cheerio.load(data);

      // Find in links
      let found = null;
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (this.isDestination(href)) found = href;
      });
      if (found) return { success: true, url: found, method: 'direct-link' };

      // Find in data attributes
      $('[data-url], [data-href], [data-destination]').each((_, el) => {
        const val = $(el).data('url') || $(el).data('href') || $(el).data('destination');
        if (this.isDestination(val)) found = val;
      });
      if (found) return { success: true, url: found, method: 'data-attr' };

      // Find Base64 in scripts
      const scripts = $('script').map((_, el) => $(el).html()).get().join('\n');
      const b64Match = scripts.match(/["']([A-Za-z0-9+/=]{30,})["']/);
      if (b64Match) {
        try {
          const decoded = Buffer.from(b64Match[1], 'base64').toString();
          if (decoded.startsWith('http') && this.isDestination(decoded)) {
            return { success: true, url: decoded, method: 'base64' };
          }
        } catch (e) {}
      }

      // Find URLs in JS
      const urlMatch = scripts.match(/https?:\/\/[^\s"'<>]+/g);
      if (urlMatch) {
        for (const u of urlMatch) {
          if (this.isDestination(u)) return { success: true, url: u, method: 'js-parse' };
        }
      }

      return { success: false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Method 2: Browser Automation
  async browser_bypass(url) {
    try {
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });
      }

      const page = await this.browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');

      // Block ads
      await page.setRequestInterception(true);
      page.on('request', req => {
        if (this.ads.some(ad => req.url().includes(ad)) || ['image', 'media', 'font'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Speed up timers
      await page.evaluateOnNewDocument(() => {
        const origInterval = window.setInterval;
        const origTimeout = window.setTimeout;
        window.setInterval = (fn, delay, ...args) => origInterval(fn, Math.min(delay, 500), ...args);
        window.setTimeout = (fn, delay, ...args) => origTimeout(fn, Math.min(delay, 500), ...args);
        window.open = () => null;
      });

      let destination = null;

      // Listen for redirects
      page.on('response', res => {
        const resUrl = res.url();
        if (this.isDestination(resUrl)) destination = resUrl;
        if ([301, 302, 303, 307].includes(res.status())) {
          const loc = res.headers()['location'];
          if (this.isDestination(loc)) destination = loc;
        }
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      // Try clicking buttons
      const buttons = ['button.verify', 'button.continue', 'button.next', 'a.continue', '#continueButton', '.btn-primary'];
      for (let i = 0; i < 5 && !destination; i++) {
        for (const sel of buttons) {
          try {
            const btn = await page.$(sel);
            if (btn) {
              await btn.click();
              await new Promise(r => setTimeout(r, 2000));
              break;
            }
          } catch (e) {}
        }

        // Check current URL
        const curr = page.url();
        if (this.isDestination(curr)) {
          destination = curr;
          break;
        }

        // Extract from page
        const content = await page.content();
        const match = content.match(/https?:\/\/[^\s"'<>]+/g);
        if (match) {
          for (const u of match) {
            if (this.isDestination(u)) {
              destination = u;
              break;
            }
          }
        }
      }

      await page.close();
      
      if (destination) return { success: true, url: destination, method: 'browser' };
      return { success: false };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Main bypass
  async bypass(url) {
    const start = Date.now();

    // Try direct first
    console.log('[Bypass] Trying direct...');
    let result = await this.direct(url);
    if (result.success) {
      result.time = Date.now() - start;
      return result;
    }

    // Try browser
    console.log('[Bypass] Trying browser...');
    result = await this.browser_bypass(url);
    result.time = Date.now() - start;
    return result;
  }
}

const bypasser = new Bypasser();

// ============ BOT EVENTS ============
client.once('ready', () => {
  console.log(`✅ Bot ready: ${client.user.tag}`);
  console.log(`📊 Servers: ${client.guilds.cache.size}`);
  client.user.setActivity(`${PREFIX}bypass | ${PREFIX}help`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith(PREFIX)) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // Help
  if (cmd === 'help' || cmd === 'h') {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🔓 Bypass Bot')
      .setDescription('Bypass ad-links automatically!')
      .addFields(
        { name: '📋 Commands', value: '`!bypass <url>` - Bypass link\n`!b <url>` - Short alias\n`!help` - Show this\n`!ping` - Check latency' },
        { name: '✅ Supported', value: 'LootLabs, Linkvertise, Boost.ink, Work.ink, Sub2Unlock, Rekonise, dan lainnya...' }
      );
    return msg.reply({ embeds: [embed] });
  }

  // Ping
  if (cmd === 'ping') {
    return msg.reply(`🏓 Pong! ${Date.now() - msg.createdTimestamp}ms`);
  }

  // Bypass
  if (cmd === 'bypass' || cmd === 'b') {
    const url = args[0];
    
    if (!url) {
      return msg.reply('❌ Usage: `!bypass <url>`');
    }

    if (!url.startsWith('http')) {
      return msg.reply('❌ Invalid URL! Must start with http:// or https://');
    }

    const loading = await msg.reply('🔄 **Processing...** Please wait ~10-30 seconds');

    try {
      const result = await bypasser.bypass(url);

      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('✅ Bypass Successful!')
          .addFields(
            { name: '🔗 Original', value: `\`\`\`${url.substring(0, 200)}\`\`\`` },
            { name: '🎯 Result', value: result.url },
            { name: '⏱️ Time', value: `${result.time}ms`, inline: true },
            { name: '🛠️ Method', value: result.method, inline: true }
          );
        await loading.edit({ content: '', embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Bypass Failed')
          .setDescription(result.error || 'Could not bypass this link')
          .addFields({ name: '🔗 Link', value: `\`\`\`${url.substring(0, 200)}\`\`\`` });
        await loading.edit({ content: '', embeds: [embed] });
      }
    } catch (e) {
      await loading.edit(`❌ Error: ${e.message}`);
    }
  }
});

// ============ START ============
if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN not set!');
  process.exit(1);
}

client.login(TOKEN);

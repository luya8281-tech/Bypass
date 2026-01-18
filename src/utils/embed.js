cat > src/utils/embed.js << 'EOF'
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

const createEmbed = {
  loading: (url) => {
    return new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🔄 Processing Link...')
      .setDescription(`\`\`\`${url.substring(0, 100)}${url.length > 100 ? '...' : ''}\`\`\``)
      .addFields(
        { name: '📊 Status', value: 'Analyzing link type...', inline: true },
        { name: '⏱️ ETA', value: '~10-30 seconds', inline: true }
      )
      .setFooter({ text: 'Universal Bypass Bot' })
      .setTimestamp();
  },

  progress: (step, total, detail) => {
    const progress = '█'.repeat(step) + '░'.repeat(total - step);
    return new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('⚙️ Bypassing...')
      .setDescription(`\`[${progress}]\` ${step}/${total}`)
      .addFields({ name: '🔧 Current Step', value: detail })
      .setTimestamp();
  },

  success: (originalUrl, bypassedUrl, details = {}) => {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Bypass Successful!')
      .addFields(
        { name: '🔗 Original Link', value: `\`\`\`${originalUrl.substring(0, 200)}\`\`\``, inline: false },
        { name: '🎯 Bypassed Link', value: bypassedUrl.length > 1000 ? 'See attached file' : bypassedUrl, inline: false }
      )
      .setTimestamp();

    if (details.method) {
      embed.addFields({ name: '🛠️ Method', value: details.method, inline: true });
    }
    if (details.time) {
      embed.addFields({ name: '⏱️ Time', value: `${details.time}ms`, inline: true });
    }
    if (details.gates) {
      embed.addFields({ name: '🚪 Gates', value: `${details.gates} completed`, inline: true });
    }

    embed.setFooter({ text: 'Universal Bypass Bot • Powered by Puppeteer' });
    
    return embed;
  },

  error: (originalUrl, errorMessage) => {
    return new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Bypass Failed')
      .setDescription(`\`\`\`${errorMessage}\`\`\``)
      .addFields(
        { name: '🔗 Link', value: `\`\`\`${originalUrl.substring(0, 200)}\`\`\``, inline: false }
      )
      .addFields(
        { name: '💡 Possible Reasons', value: 
          '• Site has advanced protection\n' +
          '• Link expired or invalid\n' +
          '• Captcha required (not supported)\n' +
          '• Server timeout'
        }
      )
      .setFooter({ text: 'Try again or use manual bypass' })
      .setTimestamp();
  },

  help: () => {
    return new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('📖 Universal Bypass Bot')
      .setDescription('Bypass ad-links and content lockers automatically!')
      .addFields(
        { name: '🔧 Commands', value: 
          '`!bypass <url>` - Bypass a link\n' +
          '`!b <url>` - Short alias\n' +
          '`!supported` - Show supported sites\n' +
          '`!help` - Show this message'
        },
        { name: '📋 Supported Sites', value: 
          '• LootLabs / Loot-Links\n' +
          '• Linkvertise\n' +
          '• Boost.ink / Work.ink\n' +
          '• Sub2Unlock\n' +
          '• Rekonise\n' +
          '• And 50+ more...'
        },
        { name: '⚠️ Note', value: 'Some links with captcha may fail' }
      )
      .setFooter({ text: 'Made with ❤️' })
      .setTimestamp();
  },

  supported: () => {
    return new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('📋 Supported Sites')
      .setDescription('Full list of supported link shorteners:')
      .addFields(
        { name: '🎮 Gaming/Scripts', value: 
          '`loot-labs.com` `loot-link.com` `lootdest.com`\n' +
          '`linkvertise.com` `direct-link.net`\n' +
          '`flux.li` `fluxus`'
        , inline: false },
        { name: '💰 Ad-Links', value: 
          '`boost.ink` `booo.st` `bst.gg`\n' +
          '`work.ink` `workink.net`\n' +
          '`sub2unlock.com` `sub2get.com`\n' +
          '`rekonise.com` `social-unlock.com`'
        , inline: false },
        { name: '🔗 Shorteners', value: 
          '`adfoc.us` `cuty.io` `cety.app`\n' +
          '`paster.so` `paster.gg`\n' +
          '`v.gd` `ouo.io`'
        , inline: false },
        { name: '📦 Content Lockers', value: 
          '`mega-guy.com` `megaup.net`\n' +
          '`onlyfans related domains`\n' +
          '`And many more...`'
        , inline: false }
      )
      .setFooter({ text: 'Request more sites in support server!' });
  }
};

module.exports = createEmbed;
EOF

cat > README.md << 'EOF'
# 🔓 Universal Discord Bypass Bot

Bot Discord untuk bypass berbagai link shortener dan content locker secara otomatis.

## ✨ Features

- 🚀 Multi-method bypass (Direct, API, Browser)
- 🔗 Support 50+ sites (LootLabs, Linkvertise, Boost.ink, dll)
- 🤖 Auto-detect link type
- ⚡ Fast response
- 📊 Progress tracking
- 🛡️ Anti-detection (Stealth mode)

## 📋 Supported Sites

- LootLabs / Loot-Links / LootDest
- Linkvertise / Direct-Link
- Boost.ink / Work.ink / Booo.st
- Sub2Unlock / Sub2Get
- Rekonise / Social-Unlock
- And 50+ more...

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `!bypass <url>` | Bypass a link |
| `!b <url>` | Short alias |
| `!supported` | Show supported sites |
| `!help` | Show help |
| `!ping` | Check latency |
| `!stats` | Bot statistics |

## 🚀 Deployment

### Deploy to Render

1. Fork this repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Add Environment Variable:
   - `DISCORD_TOKEN`: Your bot token
6. Deploy!

## 📝 Setup Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application
3. Go to "Bot" tab → Add Bot
4. Enable **Message Content Intent**
5. Copy Token
6. Go to OAuth2 → URL Generator:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Embed Links`, `Read Message History`
7. Use generated URL to invite bot

## 📄 License

MIT License
EOF

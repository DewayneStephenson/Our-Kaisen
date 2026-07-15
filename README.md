# Our Kaisen - Discord Bot

A Discord bot built with discord.js for managing game interactions.

## Setup

### Prerequisites
- Node.js 18+
- Discord Bot Token
- Server IDs (Guild ID and Channel IDs)

### Installation

1. Clone/download this project
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```
TOKEN=your_discord_bot_token_here
```

4. Update `config/config.json` with your Discord IDs:
```json
{
    "clientId": "your_bot_client_id",
    "guildId": "your_guild_id"
}
```

## Running the Bot

### Start the bot:
```bash
npm start
```

### Deploy slash commands to Discord:
```bash
npm run deploy
```

## Project Structure

- `index.js` - Main bot entry point
- `config/config.json` - Discord IDs configuration
- `.env` - Environment variables (token)
- `commands/` - Slash command files
- `events/` - Event handlers (interactionCreate, ready, etc.)
- `handlers/` - Handler modules (commands, cooldowns, etc.)
- `utils/` - Utility functions (logger, error handling, etc.)

## Commands

- `/ping` - Check bot latency
- `/user` - Get user info
- `/server` - Get server info
- `/reload [command]` - Reload a command

## Features

- Slash command framework
- Cooldown system
- Error handling & logging
- Dynamic command loading
- Event error protection
- Configuration validation

## Troubleshooting

If the bot fails to start:
1. Check `.env` file has valid TOKEN
2. Check `config/config.json` has valid clientId and guildId
3. Run `npm install` to ensure all dependencies are installed
4. Check console logs for detailed error messages

## License

ISC

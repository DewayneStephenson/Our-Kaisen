# Our Kaisen

A TypeScript Discord bot for running social-deduction games inspired by Jujutsu Kaisen.

## Requirements

- Node.js 24 or newer
- A Discord application and bot token
- Discord client and guild IDs

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and provide the required values:

   ```dotenv
   TOKEN=your_discord_bot_token
   CLIENT_ID=your_application_id
   GUILD_ID=your_development_guild_id
   ```

   Alternatively, copy `config/config.example.json` to `config/config.json` for
   the client and guild IDs. Environment variables are still required for the
   token.

3. Build and deploy the commands:

   ```bash
   npm run build
   npm run deploy
   ```

4. Start the bot:

   ```bash
   npm start
   ```

For a one-command local build and start, use `npm run build:start`.

## Development

```bash
npm run lint
npm test
npm run test:watch
npm run build
```

`npm run test:watch` observes TypeScript files under `src` and `tests`, then
recompiles and reruns the test suite after changes. GitHub Actions runs lint,
tests, and the production build for pushes and pull requests.

## Architecture

- `src/commands` contains Discord slash-command adapters.
- `src/events` and `src/handlers` route Discord events and interactions.
- `src/game` contains game entities, rule managers, and shared game-flow services.
- `src/lobby` owns lobby state and role configuration.
- `src/ui` creates Discord embeds and message components.
- `src/utils` contains infrastructure such as timers, logging, configuration,
  command loading, and Discord channel operations.
- `tests` contains deterministic unit tests for domain and state-management logic.

Domain rules belong in managers or services rather than Discord handlers. In
particular, `MissionManager` validates phase transitions, expedition membership,
team size, and voting permissions. `MissionFlowService` owns the transition after
an expedition vote. `MissionCoordinator` owns timer rollover and accepted phase
transitions, while `GameAccess` applies the same active-game and game-mode checks
to command and component entry points.

Bot lobbies can be inspected and driven with the administrator-only
`/mission_control` command. Its `selection`, `approval`, `mission`, and
`sealing` subcommands fill every required bot input and immediately advance the
game. An optional bot and choice can override the otherwise random behavior.

## Deployment

`npm run deploy` deploys commands to the configured development guild. Global
deployment excludes development commands and asks for confirmation:

```bash
npm run deploy:global
```

## Troubleshooting

- Run `npm run build` to catch configuration-independent TypeScript errors.
- Confirm the token and IDs are present and are 18–19 digit Discord IDs.
- Redeploy commands after changing slash-command definitions.
- Check the process logs for command-loading, Discord API, or permission errors.

## License

ISC

# Our Kaisen

**Version 1.0.0-beta.1**

Our Kaisen is a Discord social-deduction game inspired by *The Resistance:
Avalon* and the discontinued Warriors v Soldiers bot.

Players are divided into two teams: **Sorcerers** and **Curses**. They compete
across five missions in a best-of-five contest. The first team to get three
mission results gains the advantage, but even three successful missions may not
guarantee a Sorcerer victory.

## How to Play

Each round, one player becomes the mission leader and selects a team to
participate in the mission. Everyone then votes to approve or reject the proposed
team.

- If the team is rejected, leadership passes to the next player and the selection
  phase begins again.
- If the team is approved, the selected players proceed to the mission phase.
- Sorcerers can only vote to succeed a mission.
- Curses can vote to either succeed or fail a mission.

The game continues until three missions succeed or three missions fail.

- If three missions fail, the Curses win.
- If three missions succeed, the Curses have one opportunity to identify and seal
  the Honored One.
- If the Honored One is sealed, the Curses steal the victory.
- If the Curses choose incorrectly, the Sorcerers win.

## Base Roles

### Sorcerers

**Grade 2 Sorcerer**

A standard Sorcerer with no special abilities.

**Honored One**

Knows the identities of the visible Curses but must avoid revealing their own
identity. After three successful missions, the Curses may attempt to seal the
Honored One and steal the victory.

### Curses

**Finger Bearer**

A standard Curse with no special abilities.

## Optional Roles

Our Kaisen includes seven optional roles that can be added to customize the game.

### Sorcerer Roles

**Nail and Hammer**

Once per game, marks a player during the mission phase. If that player fails the
mission, their identity is revealed to the entire lobby. Nothing happens if the
marked player succeeds the mission.

**Cursed Child**

Knows the identity of the Honored One. Their goal is to protect the Honored One
from being sealed, often by pretending to be the Honored One themselves.

**Grade 4 Sorcerer**

A debuff role that appears to the Honored One as a member of the Curses.

### Curse Roles

**Stitched Face**

Hidden from the Honored One.

**Cursed Sorcerer**

Appears to the Cursed Child as another possible Honored One.

**Energyless**

Hidden from the other Curses and does not know their identities.

**Fly Head**

Can fail a mission only once per game.

## Features

- Three base roles and seven optional roles
- Five-mission social-deduction gameplay
- Configurable role selections and game settings
- Mission-team selection and approval voting
- Mission success and failure voting
- Leader rotation and phase timers
- Support for up to 15 players

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

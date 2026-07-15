require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { loadCommandsFromFolder } = require('./utils/loadCommands');
const { validateConfig } = require('./utils/configValidator');
const logger = require('./utils/logger');
const RoleManager = require('./game/RoleManager');
const LobbyManager = require('./game/LobbyManager')

// Validate config/config.json
if (!validateConfig()) {
	process.exit(1);
}

// Validate token exists
if (!process.env.TOKEN) {
	logger.error('TOKEN not found in .env file');
	process.exit(1);
}

// Graceful shutdown handlers
process.on('uncaughtException', (error) => {
	logger.error(`Uncaught exception: ${error.message}`);
	logger.error(error.stack);
	process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
	logger.error(`Unhandled rejection at ${promise}: ${reason}`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
client.commandPaths = new Map();
client.cooldowns = new Collection();
client.handlers = {};
client.startTime = Date.now();

/**
 * Get bot uptime in readable format
 */
client.getUptime = function() {
	const uptime = Date.now() - this.startTime;
	const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
	const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
	return `${minutes}m ${seconds}s`;
};

const foldersPath = path.join(__dirname, 'commands');
const loadedCommands = loadCommandsFromFolder(foldersPath);

for (const { command, filePath } of loadedCommands) {
	const commandName = command.data.name;
	client.commands.set(commandName, command);
	client.commandPaths.set(commandName, filePath);
}

logger.info(`Loaded ${loadedCommands.length} commands`);

const handlersPath = path.join(__dirname, 'handlers');
const handlerFiles = fs.readdirSync(handlersPath).filter(file => file.endsWith('.js'));

let loadedHandlers = 0;
for (const file of handlerFiles) {
	try {
		const filePath = path.join(handlersPath, file);
		const stat = fs.statSync(filePath);
		
		// Skip empty files
		if (stat.size === 0) {
			logger.warn(`Handler ${file} is empty (skipping)`);
			continue;
		}

		const handlerModule = require(filePath);
		// Convert filename to camelCase (e.g., commandhandler.js -> commandHandler)
		let name = file.replace('.js', '');
		// Replace 'handler' at the end with 'Handler' to create proper camelCase
		name = name.replace(/handler$/, 'Handler');
		client.handlers[name] = handlerModule;
		logger.debug(`Loaded handler: ${name}`);
		loadedHandlers++;
	} catch (error) {
		logger.error(`Failed to load handler ${file}: ${error.message}`);
	}
}

logger.info(`Loaded ${loadedHandlers} handlers`);
logger.info(`Available handlers: ${Object.keys(client.handlers).join(', ')}`);
const handlerStatus = Object.entries(client.handlers).map(([k, v]) => `${k}:${typeof v === 'object' ? 'OK' : 'BROKEN'}`).join(', ');
logger.info(`Handler status: ${handlerStatus}`);

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

let loadedEvents = 0;
for (const file of eventFiles) {
	try {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);

		if (!event.name || !event.execute) {
			logger.warn(`Event ${file} is missing "name" or "execute" property`);
			continue;
		}

		if (event.once) {
			client.once(event.name, (...args) => {
				try {
					event.execute(...args, client);
				} catch (err) {
					logger.error(`Event ${event.name} threw error: ${err.message}`);
				}
			});
		} else {
			client.on(event.name, (...args) => {
				try {
					event.execute(...args, client);
				} catch (err) {
					logger.error(`Event ${event.name} threw error: ${err.message}`);
				}
			});
		}
		loadedEvents++;
	} catch (error) {
		logger.error(`Failed to load event ${file}: ${error.message}`);
	}
}

logger.info(`Loaded ${loadedEvents} events`);

// Start cooldown cleanup timer
const cooldownCleanup = require('./utils/cooldownCleanup');
cooldownCleanup.startCleanupTimer(client);

// Set bot activity/status
client.on('ready', () => {
	client.user.setActivity('/help - Get started', { type: 'LISTENING' });
	logger.debug('Bot activity set');
});

// Graceful shutdown handlers
process.on('SIGINT', () => {
	logger.info('Shutting down gracefully...');
	client.destroy();
	process.exit(0);
});

// Client event handlers
client.on('error', (error) => logger.error(`Client error: ${error.message}`));
client.on('warn', (info) => logger.warn(`Client warning: ${info}`));

//lobby initialization
client.lobbyManager = new LobbyManager();
client.roleManager = RoleManager;

// Login with error handling
client.login(process.env.TOKEN)
	.then(() => logger.info('Successfully logged in to Discord'))
	.catch((error) => {
		logger.error(`Failed to login to Discord: ${error.message}`);
		process.exit(1);
	});
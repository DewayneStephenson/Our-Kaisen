require('dotenv').config();
const { REST, Routes } = require('discord.js');
const readline = require('node:readline');
const path = require('node:path');
const { loadCommandsFromFolder } = require('./utils/loadCommands');
const logger = require('./utils/logger');
const { clientId, guildId } = require('./config/config.json');

// Validate config
if (!process.env.TOKEN) {
	logger.error('TOKEN not found in .env file');
	process.exit(1);
}

if (!clientId || !guildId) {
	logger.error('clientId or guildId missing in config/config.json');
	process.exit(1);
}

const isGlobalDeploy = process.argv.includes('--global');
const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('--force');

function promptConfirmation(question) {
	const interface = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		interface.question(question, (answer) => {
			interface.close();
			resolve(answer.trim().toLowerCase());
		});
	});
}

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const loadedCommands = loadCommandsFromFolder(foldersPath);

for (const { command, filePath } of loadedCommands) {
	const isDevCommand = path.relative(foldersPath, filePath).startsWith(`dev${path.sep}`);

	if (isGlobalDeploy && isDevCommand) {
		logger.info(`Skipping dev command during global deploy: ${command.data.name}`);
		continue;
	}

	commands.push(typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data);
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN);

// and deploy your commands!
(async () => {
	try {
		if (isGlobalDeploy) {
			if (!skipConfirmation) {
				const answer = await promptConfirmation(
					`Deploy ${commands.length} global application (/) commands and skip dev commands? Type y to continue: `
				);

				if (answer !== 'y' && answer !== 'yes') {
					logger.info('Global deploy cancelled.');
					process.exit(0);
				}
			}

			logger.info(`Deploying ${commands.length} global application (/) commands...`);
			const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
			logger.info(`Successfully deployed ${data.length} global application (/) commands.`);
			return;
		}

		logger.info(`Deploying ${commands.length} guild application (/) commands...`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });

		logger.info(`Successfully deployed ${data.length} application (/) commands.`);
	} catch (error) {
		logger.error(`Failed to deploy commands: ${error.message}`);
		if (error.response) {
			logger.error(`HTTP Status: ${error.response.status}`);
		}
	}
})();
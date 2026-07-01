require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { clientId, guildId } = require('./config.json');
const path = require('node:path');
const { loadCommandsFromFolder } = require('./utils/loadCommands');
const logger = require('./utils/logger');

// Validate config
if (!process.env.TOKEN) {
	logger.error('TOKEN not found in .env file');
	process.exit(1);
}

if (!clientId || !guildId) {
	logger.error('clientId or guildId missing in config.json');
	process.exit(1);
}

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const loadedCommands = loadCommandsFromFolder(foldersPath);

for (const { command } of loadedCommands) {
	commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN);

// and deploy your commands!
(async () => {
	try {
		logger.info(`Deploying ${commands.length} application (/) commands...`);

		// The put method is used to fully refresh all commands in the guild with the current set
		// to update globally replace the next line with Routes.applicationCommands(clientId)
		const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });

		logger.info(`Successfully deployed ${data.length} application (/) commands.`);
	} catch (error) {
		logger.error(`Failed to deploy commands: ${error.message}`);
		if (error.response) {
			logger.error(`HTTP Status: ${error.response.status}`);
		}
	}
})();
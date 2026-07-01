const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');

/**
 * Loads all commands from a folder structure
 * Recursively searches subfolders for .js files with data and execute properties
 * @param {string} foldersPath - Root path to commands folder
 * @returns {Array<{command: object, filePath: string}>} Array of loaded commands with their paths
 */
function loadCommandsFromFolder(foldersPath) {
	const commands = [];
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const stat = fs.statSync(commandsPath);
		if (!stat.isDirectory()) continue;
		const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
		
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			
			try {
				const command = require(filePath);
				
				if ('data' in command && 'execute' in command) {
					commands.push({ command, filePath });
				} else {
					logger.warn(`Command at ${filePath} is missing "data" or "execute" property`);
				}
			} catch (error) {
				logger.error(`Failed to load command ${filePath}: ${error.message}`);
			}
		}
	}

	return commands;
}

module.exports = { loadCommandsFromFolder };

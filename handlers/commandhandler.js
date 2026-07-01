const logger = require('../utils/logger');

module.exports = {
	/**
	 * Retrieves a command from the client's command collection
	 * Validates the interaction is a slash command and the command exists
	 * @param {Interaction} interaction - The Discord interaction
	 * @returns {object|null} The command object or null if not found
	 */
	getCommand(interaction) {
		if (!interaction.isChatInputCommand()) return null;

		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) {
			logger.error(`No command matching ${interaction.commandName} was found`);
			return null;
		}

		logger.debug(`Command loaded: ${interaction.commandName}`);
		return command;
	},

	/**
	 * Checks if user has required permissions for a command
	 * @param {Interaction} interaction - The Discord interaction
	 * @param {object} command - The command object with optional permissions array
	 * @returns {boolean} True if user has permission, false otherwise
	 */
	hasPermission(interaction, command) {
		if (!command.permissions || command.permissions.length === 0) {
			return true;
		}

		const memberPermissions = interaction.member.permissions;
		return command.permissions.every((permission) => memberPermissions.has(permission));
	}
};

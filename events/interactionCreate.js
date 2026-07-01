const { Events } = require('discord.js');
const { sendErrorReply } = require('../utils/sendErrorReply');
const logger = require('../utils/logger');
const { MESSAGES } = require('../utils/constants');
const commandUsageTracker = require('../utils/commandUsageTracker');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction, client) {
		// Slash Commands
		if (interaction.isChatInputCommand()) {
			if (!client.handlers.commandHandler) {
				logger.error('commandHandler not loaded');
				return sendErrorReply(interaction, MESSAGES.BOT_NOT_CONFIGURED);
			}

			if (!client.handlers.cooldownHandler) {
				logger.error('cooldownHandler not loaded');
				return sendErrorReply(interaction, MESSAGES.BOT_NOT_CONFIGURED);
			}

			const command = client.handlers.commandHandler.getCommand(interaction);
			if (!command) return;

			// Track command usage
			commandUsageTracker.track(interaction.commandName, interaction.user.id);

			// Check permissions
			if (!client.handlers.commandHandler.hasPermission(interaction, command)) {
				return sendErrorReply(interaction, MESSAGES.MISSING_PERMISSIONS);
			}

			const blocked = await client.handlers.cooldownHandler.handleCooldown(interaction, command);
			if (blocked) return;

			try {
				const startTime = performance.now();
				await command.execute(interaction, client);
				const executionTime = (performance.now() - startTime).toFixed(2);
				logger.debug(`Command '${interaction.commandName}' executed in ${executionTime}ms`);
			} catch (error) {
				console.error(error);
				await sendErrorReply(interaction, MESSAGES.ERROR_EXECUTING_COMMAND);
			}

			return;
		}

		// Buttons
		if (interaction.isButton() && client.handlers.buttonHandler) {
			return client.handlers.buttonHandler.handle(interaction, client);
		}

		// Select Menus
		if (interaction.isStringSelectMenu() && client.handlers.menuHandler) {
			return client.handlers.menuHandler.handle(interaction, client);
		}

		// Modals
		if (interaction.isModalSubmit() && client.handlers.modalHandler) {
			return client.handlers.modalHandler.handle(interaction, client);
		}

		// Autocomplete
		if (interaction.isAutocomplete() && client.handlers.autocompleteHandler) {
			return client.handlers.autocompleteHandler.handle(interaction, client);
		}
	}
};

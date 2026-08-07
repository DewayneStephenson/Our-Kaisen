import { Events, type Interaction, type Client } from "discord.js";
import { sendErrorReply } from "../utils/sendErrorReply.js";
import { MESSAGES } from "../utils/constants.js";
import CommandUsageTracker from "../utils/commandUsageTracker.js";
import * as logger from "../utils/logger.js";

const commandUsageTracker = new CommandUsageTracker();

export default {
    name: Events.InteractionCreate,

    async execute(interaction: Interaction, client: Client) {
        if (interaction.isChatInputCommand()) {
            const { commandHandler, cooldownHandler } = client.handlers;

            if (!commandHandler || !cooldownHandler) {
                logger.error("Required command handlers were not loaded");
                return sendErrorReply(interaction, MESSAGES.BOT_NOT_CONFIGURED);
            }

            const command = commandHandler.getCommand(interaction);
            if (!command) return;

            commandUsageTracker.track(interaction.commandName, interaction.user.id);

            if (!commandHandler.hasPermission(interaction, command)) {
                return sendErrorReply(interaction, MESSAGES.MISSING_PERMISSIONS);
            }

            if (await cooldownHandler.handleCooldown(interaction, command)) return;

            try {
                const startTime = performance.now();
                await command.execute(interaction, client);
                logger.debug(
                    `Command '${interaction.commandName}' executed in ${(performance.now() - startTime).toFixed(2)}ms`
                );
            } catch (error) {
                logger.error(`Command '${interaction.commandName}' failed: ${error instanceof Error ? error.message : String(error)}`);
                await sendErrorReply(interaction, MESSAGES.ERROR_EXECUTING_COMMAND);
            }

            return;
        }

        if (interaction.isButton() && client.handlers.buttonHandler) {
            return client.handlers.buttonHandler.handle(interaction, client);
        }

        if (interaction.isStringSelectMenu() && client.handlers.componentHandler) {
            return client.handlers.componentHandler.handle(interaction, client);
        }

        if (interaction.isModalSubmit() && client.handlers.modalHandler) {
            return client.handlers.modalHandler.handle(interaction, client);
        }

        if (interaction.isAutocomplete() && client.handlers.autocompleteHandler) {
            return client.handlers.autocompleteHandler.handle(interaction, client);
        }
    }
};

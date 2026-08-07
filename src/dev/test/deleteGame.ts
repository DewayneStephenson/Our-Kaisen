import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    PermissionFlagsBits
} from "discord.js";

import * as logger from "../../utils/logger.js";

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("delete_game")
        .setDescription("Delete the active game in this channel for development purposes"),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game) {
            return interaction.reply({
                content: "No active game exists in this channel.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (game.lobby.message) {
            try {
                await game.lobby.message.delete();
            } catch (error) {
                logger.warn(
                    `[${interaction.channelId}] Failed to delete game message: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        client.lobbyManager.lobbies.delete(interaction.channelId);
        client.gameRegistry.deleteGame(interaction.channelId);

        return interaction.reply({
            content: "Deleted the active game.",
            flags: MessageFlags.Ephemeral
        });
    }
};
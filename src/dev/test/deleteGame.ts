import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import * as logger from "../../utils/logger.js";
import { destroyGameSession } from "../../utils/gameChannels.js";

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("delete_game")
        .setDescription(
            "Delete the active game in this channel for development purposes",
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game) {
            return interaction.reply({
                content: "No active game exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (game.lobby.message) {
            try {
                await game.lobby.message.delete();
            } catch (error) {
                logger.warn(
                    `[${interaction.channelId}] Failed to delete game message: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }

        await interaction.reply({
            content: "Deleting the game text channel, voice channel, and participant role.",
            flags: MessageFlags.Ephemeral,
        });
        client.lobbyManager.deleteLobby(game.lobbyChannelId);
        await destroyGameSession(client, game);
    },
};

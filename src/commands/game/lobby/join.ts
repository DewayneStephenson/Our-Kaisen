import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";

import { EmbedCreator } from "../../../ui/EmbedCreator.js";

export default {
    data: new SlashCommandBuilder()
        .setName("join")
        .setDescription("Join the lobby"),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.reply({
                content: "No lobby exists here.",
                flags: MessageFlags.Ephemeral,
            });
        }
        if (lobby.isBotLobby) {
            return interaction.reply({
                content: "You cannot join a bot lobby.",
                flags: MessageFlags.Ephemeral,
            });
        }

        client.lobbyManager.addPlayer(
            interaction.channelId,
            interaction.user.id,
            interaction.user.username,
        );

        const embed = EmbedCreator.lobby(lobby);

        if (lobby.message) {
            await lobby.message.edit({ embeds: [embed] });
        }

        return interaction.reply({
            content: "You joined the lobby.",
            flags: MessageFlags.Ephemeral,
        });
    },
};

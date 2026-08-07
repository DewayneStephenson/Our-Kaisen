import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";

import { EmbedCreator } from "../../../ui/EmbedCreator.js";
export default {
    data: new SlashCommandBuilder()
        .setName("create")
        .setDescription("Create a lobby"),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const lobby = client.lobbyManager.createLobby(
            interaction.channelId,
            interaction.user.id,
            interaction.user.username,
        );
        if (!lobby) {
            return interaction.reply({
                content: "A lobby already exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const embed = EmbedCreator.lobby(lobby);
        await interaction.reply({ embeds: [embed] });
        const message = await interaction.fetchReply();
        lobby.message = message;
    },
};

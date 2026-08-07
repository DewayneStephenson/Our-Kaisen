import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";

import { startGameSession } from "../../../utils/startGameSession.js";

export default {
    data: new SlashCommandBuilder()
        .setName("start")
        .setDescription("Start a game"),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.editReply({
                content: "No lobby exists in this channel.",
            });
        }

        const result = await startGameSession(interaction, client, lobby);
        return interaction.editReply({ content: result.message });
    },
};

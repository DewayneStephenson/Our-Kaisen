import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";

import { startGameSession } from "../../../utils/startGameSession.js";


export default {
	data: new SlashCommandBuilder()
		.setName('start')
		.setDescription('Start a game'),

	async execute(interaction:ChatInputCommandInteraction, client:Client) {
		await interaction.deferReply({ ephemeral: true });

		const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
			return interaction.editReply({ content: 'No lobby exists in this channel.' });
        }

		const result = await startGameSession(interaction, client, lobby);
		return interaction.editReply({ content: result.message });
	},
};

import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client,
	MessageFlags
} from "discord.js";

import  {EmbedCreator} from "../../../ui/EmbedCreator.js"
export default {
	data: new SlashCommandBuilder()
		.setName('create')
		.setDescription('Create a lobby'),

	async execute(interaction:ChatInputCommandInteraction, client:Client) {
		const lobby = client.lobbyManager.createLobby(interaction.channelId,interaction.user.id, interaction.user.username);
		if (!lobby) {
			return interaction.reply({ content: 'A lobby already exists in this channel.', flags: MessageFlags.Ephemeral});
		}

		const embed = EmbedCreator.lobby(lobby)
		const message = await interaction.reply({ embeds: [embed], fetchReply: true });
		lobby.message = message;
	},
};

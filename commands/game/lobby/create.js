const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create')
		.setDescription('Create a lobby'),

	async execute(interaction, client) {
		const lobby = client.lobbyManager.createLobby(interaction.channelId,interaction.user.id);
		if (!lobby) {
			return interaction.reply({ content: 'A lobby already exists in this channel.', ephemeral: true });
		}

		const embed = client.lobbyManager.buildEmbed(interaction.channelId);
		const message = await interaction.reply({ embeds: [embed], fetchReply: true });

		lobby.message = message;
	},
};

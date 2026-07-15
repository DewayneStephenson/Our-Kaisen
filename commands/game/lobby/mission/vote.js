const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('vote')
		.setDescription('Vote on a mission outcome'),

	async execute(interaction) {
		await interaction.reply({
			content: 'Voting is not implemented yet.',
			ephemeral: true,
		});
	},
};

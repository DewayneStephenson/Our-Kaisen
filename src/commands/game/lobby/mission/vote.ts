import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction
} from "discord.js";
export default {
	data: new SlashCommandBuilder()
		.setName('vote')
		.setDescription('Vote on a mission outcome'),

	async execute(interaction:ChatInputCommandInteraction) {
		await interaction.reply({
			content: 'Voting is not implemented yet.',
			ephemeral: true,
		});
	},
};

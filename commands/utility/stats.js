const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const commandUsageTracker = require('../../utils/commandUsageTracker');

module.exports = {
	category: 'utility',
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('View bot command usage statistics')
		.addIntegerOption(option =>
			option.setName('limit')
				.setDescription('Number of top commands to show (default: 10)')
				.setMinValue(1)
				.setMaxValue(50),
		),
	async execute(interaction) {
		const limit = interaction.options.getInteger('limit') || 10;
		const topCommands = commandUsageTracker.getTopCommands(limit);

		if (topCommands.length === 0) {
			return interaction.reply({
				content: '📊 No command usage data yet. Start using commands!',
				ephemeral: true,
			});
		}

		const embed = new EmbedBuilder()
			.setColor(0x5865F2)
			.setTitle('📊 Command Usage Statistics')
			.setDescription(`Top ${topCommands.length} most used commands`)
			.setTimestamp();

		topCommands.forEach((cmd, index) => {
			const { name, executions, users } = cmd;
			embed.addFields({
				name: `${index + 1}. /${name}`,
				value: `**${executions}** executions • **${users}** unique users`,
				inline: true,
			});
		});

		const allStats = commandUsageTracker.getAllStats();
		embed.setFooter({
			text: `Total commands tracked: ${Object.keys(allStats).length} | Total executions: ${Object.values(allStats).reduce((sum, cmd) => sum + cmd.executions, 0)}`,
		});

		return interaction.reply({ embeds: [embed] });
	},
};

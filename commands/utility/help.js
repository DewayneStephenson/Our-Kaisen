const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
/* fix autocomplete not working
*/

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Shows all available commands')
		.addStringOption((option) =>
			option
				.setName('category')
				.setDescription('Filter by command category')
				.setAutocomplete(true)
		),
	async execute(interaction) {
		const categoryFilter = interaction.options.getString('category');
		const commands = interaction.client.commands;
		const commandPaths = interaction.client.commandPaths;
		const commandsRoot = path.join(__dirname, '..', '..', 'commands');

		function getCommandCategory(commandName) {
			const filePath = commandPaths?.get(commandName);

			if (filePath) {
				const relativePath = path.relative(commandsRoot, filePath);
				const parts = relativePath.split(path.sep).filter(Boolean);

				return parts[0] || 'other';
			}

			return 'other';
		}

		// Group commands by category
		const categories = new Map();
		for (const [name] of commands) {
			const category = getCommandCategory(name);
			if (!categories.has(category)) {
				categories.set(category, []);
			}
			categories.get(category).push(name);
		}

		
		if (interaction.isAutocomplete?.()) {
			const focusedValue = interaction.options.getFocused();
			const choices = Array.from(categories.keys()).filter((cat) =>
				cat.toLowerCase().startsWith(focusedValue.toLowerCase())
			);
			return interaction.respond(choices.map((cat) => ({ name: cat, value: cat })).slice(0, 25));
		}

		// Filter if category specified
		if (categoryFilter && categories.has(categoryFilter)) {
			const categoryCommands = categories.get(categoryFilter);
			const embed = new EmbedBuilder()
				.setColor('#0099ff')
				.setTitle(`Commands - ${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}`)
				.setDescription(categoryCommands.map((cmd) => `\`/${cmd}\``).join(', '))
				.setFooter({ text: `Total: ${categoryCommands.length}` });

			return interaction.reply({ embeds: [embed] });
		}

		// Show all categories
		const embeds = [];
		for (const [category, cmds] of categories) {
			const embed = new EmbedBuilder()
				.setColor('#0099ff')
				.setTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
				.setDescription(cmds.map((cmd) => `\`/${cmd}\``).join(', '))
				.setFooter({ text: `Total: ${cmds.length}` });
			embeds.push(embed);
		}

		interaction.reply({ embeds });
	},
};

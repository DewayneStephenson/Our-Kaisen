const { SlashCommandBuilder } = require('discord.js');
const { sendErrorReply } = require('../../utils/sendErrorReply');

module.exports = {
	category: 'admin',
	permissions: ['Administrator'],
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads a command.')
		.addStringOption((option) => option.setName('command').setDescription('The command to reload.').setRequired(true)),
	async execute(interaction) {
		const commandName = interaction.options.getString('command', true).toLowerCase();
		const command = interaction.client.commands.get(commandName);
		if (!command) {
			return sendErrorReply(interaction, `There is no command with name \`${commandName}\`!`);
		}

		// Get command file path from stored map
		const commandFilePath = interaction.client.commandPaths.get(commandName);
		if (!commandFilePath) {
			return sendErrorReply(interaction, `Could not find file path for command \`${commandName}\`!`);
		}

		delete require.cache[require.resolve(commandFilePath)];
		try {
			const newCommand = require(commandFilePath);
			interaction.client.commands.set(newCommand.data.name, newCommand);
			interaction.client.commandPaths.set(newCommand.data.name, commandFilePath);
			await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
		} catch (error) {
			console.error(error);
			await sendErrorReply(interaction, `Error reloading \`${command.data.name}\`: ${error.message}`);
		}
	},
};
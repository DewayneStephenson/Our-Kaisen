/**
 * Command Template
 * Copy this file and modify to create new commands
 * 
 * Command Structure:
 * - permissions: (optional) Required Discord permissions ['Administrator', 'ManageMessages']
 * - cooldown: (optional) Cooldown in seconds (default: 3)
 * - data: SlashCommandBuilder - Defines the command structure
 * - execute: Async function that runs the command
 */

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	permissions: [], // Add required permissions if needed
	cooldown: 3, // Cooldown in seconds (optional)
	data: new SlashCommandBuilder()
		.setName('commandname') // Your command name (lowercase, no spaces)
		.setDescription('Brief description of what the command does'),
	
	/**
	 * Execute the command
	 * @param {Interaction} interaction - The Discord interaction
	 * @param {Client} client - The bot client
	 */
	async execute(interaction) {
		// Command logic here
		await interaction.reply('Command executed successfully!');
	},
};

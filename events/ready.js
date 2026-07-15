const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		const guildCount = client.guilds.cache.size;
		const commandCount = client.commands.size;
		logger.info(`Bot ready! Logged in as ${client.user.tag}`);
		logger.info(`Serving ${guildCount} guild(s) with ${commandCount} command(s)`);
		logger.info(`Uptime: ${client.getUptime()}`);
	},
};
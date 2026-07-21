import { Events, type Client } from 'discord.js';
import logger from "../utils/logger.js";

export default {
    name: Events.ClientReady,
    once: true,

    execute(client: Client) {
        const guildCount = client.guilds.cache.size;
        const commandCount = client.commands.size;

        logger.info(`Bot ready! Logged in as ${client.user?.tag}`);
        logger.info(`Serving ${guildCount} guild(s) with ${commandCount} command(s)`);
        logger.info(`Uptime: ${client.getUptime()}`);
    }
};

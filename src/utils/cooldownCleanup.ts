import type { Client } from "discord.js";
import * as logger from "./logger.js";

/**
 * Utility for managing cooldown cleanup to prevent memory leaks
 */
export const cooldownCleanup = {
    /**
     * Starts a periodic cleanup of expired cooldowns
     * Removes cooldown entries that have expired
     * @param client - The Discord client
     * @param intervalMs - Interval between cleanups (default: 5 minutes)
     */
    startCleanupTimer(client: Client, intervalMs = 5 * 60 * 1000) {
        setInterval(() => {
            const now = Date.now();
            let totalCleaned = 0;

            for (const [commandName, userCooldowns] of client.cooldowns) {
                for (const [userId, timestamp] of userCooldowns) {
                    // Get command for cooldown duration
                    const command = client.commands.get(commandName);
                    const cooldownAmount = (command?.cooldown ?? 3) * 1000;
                    const expires = timestamp + cooldownAmount;

                    // Remove expired cooldown
                    if (now > expires) {
                        userCooldowns.delete(userId);
                        totalCleaned++;
                    }
                }

                // Clean up empty command entries
                if (userCooldowns.size === 0) {
                    client.cooldowns.delete(commandName);
                }
            }

            if (totalCleaned > 0) {
                logger.debug(`Cleaned up ${totalCleaned} expired cooldowns`);
            }
        }, intervalMs);
    },
};

export default cooldownCleanup;

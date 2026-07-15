// command.cooldown = number of seconds
const { sendErrorReply } = require('../utils/sendErrorReply');
const { DEFAULT_COOLDOWN_SECONDS, MS_PER_SECOND } = require('../utils/constants');

module.exports = {
	/**
	 * Handles cooldown logic for commands
	 * Prevents users from using the same command too frequently
	 * @async
	 * @param {Interaction} interaction - The Discord interaction
	 * @param {object} command - The command object with optional cooldown property
	 * @returns {Promise<boolean>} True if user is on cooldown, false otherwise
	 */
	async handleCooldown(interaction, command) {
        const userId = interaction.user.id;
    const name = command.data.name;

        const cooldownAmount = (command.cooldown ?? DEFAULT_COOLDOWN_SECONDS) * MS_PER_SECOND;

        if (!interaction.client.cooldowns.has(name)) {
            interaction.client.cooldowns.set(name, new Map());
        }

        const timestamps = interaction.client.cooldowns.get(name);

        if (timestamps.has(userId)) {
            const expires = timestamps.get(userId) + cooldownAmount;

            if (Date.now() < expires) {
                const remaining = ((expires - Date.now()) / MS_PER_SECOND).toFixed(1);
                await sendErrorReply(interaction, `Cooldown: ${remaining}s remaining.`);
                return true; // BLOCKED
            }
        }

        timestamps.set(userId, Date.now());
        return false; // NOT BLOCKED
    }
};

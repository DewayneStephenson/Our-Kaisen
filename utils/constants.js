// Default configuration constants
module.exports = {
	// Environment
	NODE_ENV: process.env.NODE_ENV || 'production',

	// Cooldown settings
	DEFAULT_COOLDOWN_SECONDS: 3,
	MS_PER_SECOND: 1000,

	// Discord intents
	DEFAULT_INTENTS: ['Guilds'],

	// Logging
	LOG_LEVELS: {
		ERROR: 'ERROR',
		WARN: 'WARN',
		INFO: 'INFO',
		DEBUG: 'DEBUG'
	},

	// Messages
	MESSAGES: {
		BOT_NOT_CONFIGURED: 'Bot is not properly configured.',
		ERROR_EXECUTING_COMMAND: 'There was an error while executing this command.',
		MISSING_PERMISSIONS: 'You do not have permission to use this command.'
	}
};

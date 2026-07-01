const logger = require('./logger');

/**
 * Centralized error reporter for handling and logging errors
 * Can be extended to send errors to external services (Sentry, etc.)
 */
module.exports = {
	/**
	 * Reports an error with context
	 * @param {Error} error - The error object
	 * @param {string} context - Context description (e.g., 'command execution', 'event handler')
	 * @param {object} metadata - Additional metadata (user ID, command name, etc.)
	 */
	report(error, context, metadata = {}) {
		const contextStr = context ? ` in ${context}` : '';
		const metadataStr = Object.keys(metadata).length > 0 ? ` | ${JSON.stringify(metadata)}` : '';
		
		logger.error(`Error${contextStr}: ${error.message}${metadataStr}`);
		logger.debug(error.stack);

		// TODO: Extend this to send to external error tracking service
		// Example: Sentry.captureException(error, { contexts: { metadata } });
	},

	/**
	 * Reports a warning
	 * @param {string} message - Warning message
	 * @param {object} metadata - Additional context
	 */
	warn(message, metadata = {}) {
		const metadataStr = Object.keys(metadata).length > 0 ? ` | ${JSON.stringify(metadata)}` : '';
		logger.warn(`${message}${metadataStr}`);
	}
};

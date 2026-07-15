const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');

const configPath = path.join(__dirname, '..', 'config', 'config.json');

/**
 * Validates config/config.json has all required Discord IDs
 * @returns {boolean} true if valid, false if missing fields
 */
function validateConfig() {
	try {
		if (!fs.existsSync(configPath)) {
			logger.error('config/config.json not found');
			return false;
		}

		const config = require(configPath);

		if (!config.clientId) {
			logger.error('config/config.json missing clientId');
			return false;
		}

		if (!config.guildId) {
			logger.error('config/config.json missing guildId');
			return false;
		}

		// Validate format (Discord IDs are 18-19 digit numbers)
		if (!/^\d{18,19}$/.test(config.clientId)) {
			logger.error('config/config.json clientId invalid format (must be 18-19 digits)');
			return false;
		}

		if (!/^\d{18,19}$/.test(config.guildId)) {
			logger.error('config/config.json guildId invalid format (must be 18-19 digits)');
			return false;
		}

		logger.info('config/config.json validated successfully');
		return true;
	}
	catch (error) {
		logger.error(`Error validating config/config.json: ${error.message}`);
		return false;
	}
}

module.exports = { validateConfig };

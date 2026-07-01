const { NODE_ENV, LOG_LEVELS } = require('./constants');

function log(level, message) {
	// Skip debug logs in production
	if (level === LOG_LEVELS.DEBUG && NODE_ENV === 'production') {
		return;
	}

	const timestamp = new Date().toISOString();
	console.log(`[${timestamp}] [${level}] ${message}`);
}

module.exports = {
	error: (message) => log(LOG_LEVELS.ERROR, message),
	warn: (message) => log(LOG_LEVELS.WARN, message),
	info: (message) => log(LOG_LEVELS.INFO, message),
	debug: (message) => log(LOG_LEVELS.DEBUG, message),
};

/**
 * Command usage tracking for analytics
 * Tracks which commands are used most frequently and persists to JSON file
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const STATS_FILE = path.join(__dirname, 'commandStats.json');

class CommandUsageTracker {
	constructor() {
		this.stats = new Map();
		this.loadStats();
	}

	/**
	 * Load stats from JSON file
	 * @private
	 */
	loadStats() {
		try {
			if (fs.existsSync(STATS_FILE)) {
				const data = fs.readFileSync(STATS_FILE, 'utf8');
				const parsed = JSON.parse(data);

				for (const [command, stat] of Object.entries(parsed)) {
					this.stats.set(command, {
						count: stat.count || 0,
						lastUsed: stat.lastUsed ? new Date(stat.lastUsed) : null,
						users: new Set(stat.users || []),
					});
				}

				logger.debug(`📊 Loaded ${this.stats.size} tracked commands from file`);
			}
		}
		catch (error) {
			logger.warn(`⚠️ Failed to load command stats: ${error.message}`);
		}
	}

	/**
	 * Save stats to JSON file (async, non-blocking)
	 * @private
	 */
	saveStats() {
		// Use setImmediate to defer file write to next event loop iteration
		// This prevents blocking command execution
		setImmediate(() => {
			try {
				const data = {};

				for (const [command, stat] of this.stats.entries()) {
					data[command] = {
						count: stat.count,
						lastUsed: stat.lastUsed,
						users: Array.from(stat.users),
					};
				}

				fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2), 'utf8');
			}
			catch (error) {
				logger.warn(`⚠️ Failed to save command stats: ${error.message}`);
			}
		});
	}

	/**
	 * Track a command execution
	 * @param {string} commandName - Name of the command
	 * @param {string} userId - ID of user who ran it
	 */
	track(commandName, userId) {
		if (!this.stats.has(commandName)) {
			this.stats.set(commandName, {
				count: 0,
				lastUsed: null,
				users: new Set(),
			});
		}

		const stat = this.stats.get(commandName);
		stat.count++;
		stat.lastUsed = new Date();
		stat.users.add(userId);

		this.saveStats();
	}

	/**
	 * Get stats for a specific command
	 * @param {string} commandName - Name of the command
	 * @returns {object} Command statistics
	 */
	getStats(commandName) {
		return this.stats.get(commandName) || null;
	}

	/**
	 * Get top N most used commands
	 * @param {number} limit - Number of commands to return
	 * @returns {Array} Array of commands sorted by usage
	 */
	getTopCommands(limit = 10) {
		return Array.from(this.stats.entries())
			.map(([name, stat]) => ({
				name,
				executions: stat.count,
				users: stat.users.size,
				lastUsed: stat.lastUsed,
			}))
			.sort((a, b) => b.executions - a.executions)
			.slice(0, limit);
	}

	/**
	 * Get all statistics
	 * @returns {Object} All tracked commands and their stats
	 */
	getAllStats() {
		const result = {};

		for (const [name, stat] of this.stats.entries()) {
			result[name] = {
				executions: stat.count,
				users: stat.users.size,
				lastUsed: stat.lastUsed,
			};
		}

		return result;
	}

	/**
	 * Log statistics summary
	 */
	logSummary() {
		const topCommands = this.getTopCommands();
		const totalCommands = this.stats.size;
		const totalExecutions = Array.from(this.stats.values()).reduce((sum, stat) => sum + stat.count, 0);

		logger.info(`=== Command Usage Stats ===`);
		logger.info(`Total commands tracked: ${totalCommands}`);
		logger.info(`Total executions: ${totalExecutions}`);

		if (topCommands.length > 0) {
			logger.info('Top 5 commands:');
			topCommands.slice(0, 5).forEach((cmd, i) => {
				logger.info(`  ${i + 1}. /${cmd.name} - ${cmd.executions} uses (${cmd.users} unique users)`);
			});
		}
	}
}

module.exports = new CommandUsageTracker();

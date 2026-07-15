const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');

/**
 * Recursively loads commands from a folder structure
 * Returns an array of { command, filePath }
 */
function loadCommandsFromFolder(foldersPath) {
    const results = [];

    const files = fs.readdirSync(foldersPath);

    for (const file of files) {
        const fullPath = path.join(foldersPath, file);
        const stat = fs.statSync(fullPath);

        // If folder → recurse
        if (stat.isDirectory()) {
            results.push(...loadCommandsFromFolder(fullPath));
            continue;
        }

        // Only load .js files
        if (!file.endsWith('.js')) continue;

        try {
            const command = require(fullPath);

            // Ensure command has required properties
            if (!command.data || !command.execute) {
                logger.warn(`Command at ${fullPath} missing data or execute`);
                continue;
            }

            // Store file path inside command so reload works
            command.filePath = fullPath;

            // Return both command and filePath
            results.push({
                command,
                filePath: fullPath
            });

        } catch (err) {
            logger.error(`Failed to load command ${fullPath}: ${err.message}`);
        }
    }

    return results;
}

module.exports = { loadCommandsFromFolder };

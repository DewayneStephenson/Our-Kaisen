import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM-safe __dirname + __filename for Node16
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct ESM import (Node16 requires .js extension)
import logger from "./logger.js";

interface Config {
    clientId: string;
    guildId: string;
}

/**
 * Validates config/config.json has all required Discord IDs
 * @returns true if valid, false otherwise
 */
export function validateConfig(): boolean {
    try {
        const configPath = path.join(__dirname, "..", "config", "config.json");

        if (!fs.existsSync(configPath)) {
            logger.error("config/config.json not found");
            return false;
        }

        const raw = fs.readFileSync(configPath, "utf8");
        const config: Config = JSON.parse(raw);

        if (!config.clientId) {
            logger.error("config/config.json missing clientId");
            return false;
        }

        if (!config.guildId) {
            logger.error("config/config.json missing guildId");
            return false;
        }

        const idRegex = /^\d{18,19}$/;

        if (!idRegex.test(config.clientId)) {
            logger.error("config/config.json clientId invalid format (must be 18-19 digits)");
            return false;
        }

        if (!idRegex.test(config.guildId)) {
            logger.error("config/config.json guildId invalid format (must be 18-19 digits)");
            return false;
        }

        logger.info("config/config.json validated successfully");
        return true;
    } catch (error: any) {
        logger.error(`Error validating config/config.json: ${error.message}`);
        return false;
    }
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ESM-safe __dirname + __filename for Node16
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct ESM import (Node16 requires .js extension)
import logger from "./logger.js";
import { errorMessage } from "./errors.js";

interface Config {
    clientId: string;
    guildId: string;
}

/**
 * Validates config/config.json or environment variables have all required Discord IDs
 * @returns true if valid, false otherwise
 */
export function validateConfig(): boolean {
    try {
        const configPath = path.join(__dirname, "..", "config", "config.json");

        const config: Config = fs.existsSync(configPath)
            ? JSON.parse(fs.readFileSync(configPath, "utf8"))
            : {
                  clientId: process.env.CLIENT_ID ?? "",
                  guildId: process.env.GUILD_ID ?? "",
              };

        if (!config.clientId) {
            logger.error(
                "Missing clientId. Set CLIENT_ID or config/config.json clientId.",
            );
            return false;
        }

        if (!config.guildId) {
            logger.error(
                "Missing guildId. Set GUILD_ID or config/config.json guildId.",
            );
            return false;
        }

        const idRegex = /^\d{18,19}$/;

        if (!idRegex.test(config.clientId)) {
            logger.error(
                "config/config.json clientId invalid format (must be 18-19 digits)",
            );
            return false;
        }

        if (!idRegex.test(config.guildId)) {
            logger.error(
                "config/config.json guildId invalid format (must be 18-19 digits)",
            );
            return false;
        }

        logger.info("config/config.json validated successfully");
        return true;
    } catch (error) {
        logger.error(`Error validating config/config.json: ${errorMessage(error)}`);
        return false;
    }
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import logger from "./logger.js"; // bundler mode: no .js extension
import type { BotCommand } from "../types/bot.js";
import { errorMessage } from "./errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively loads commands from a folder structure
 * Returns an array of { command, filePath }
 */
export async function loadCommandsFromFolder(foldersPath: string) {
    const results: Array<{ command: BotCommand; filePath: string }> = [];

    const files = fs.readdirSync(foldersPath);

    for (const file of files) {
        const fullPath = path.join(foldersPath, file);
        const stat = fs.statSync(fullPath);

        // If folder → recurse
        if (stat.isDirectory()) {
            results.push(...(await loadCommandsFromFolder(fullPath)));
            continue;
        }

        // Only load .js files (after build)
        if (!file.endsWith(".js")) continue;

        try {
            const imported: unknown = await import(
                pathToFileURL(fullPath).href
            );
            const moduleRecord = imported as Record<string, unknown>;
            const candidate = moduleRecord.default ?? moduleRecord;

            if (!isBotCommand(candidate)) {
                logger.warn(`Command at ${fullPath} missing data or execute`);
                continue;
            }

            const command = candidate;
            command.filePath = fullPath;

            results.push({ command, filePath: fullPath });
        } catch (error) {
            logger.error(
                `Failed to load command ${fullPath}: ${errorMessage(error)}`,
            );
        }
    }

    return results;
}

function isBotCommand(value: unknown): value is BotCommand {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    const data = candidate.data;
    return (
        typeof candidate.execute === "function" &&
        !!data &&
        typeof data === "object" &&
        typeof (data as Record<string, unknown>).name === "string"
    );
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import logger from "./logger.js"; // bundler mode: no .js extension

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively loads commands from a folder structure
 * Returns an array of { command, filePath }
 */
export async function loadCommandsFromFolder(foldersPath: string) {
    const results: Array<{ command: any; filePath: string }> = [];

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
            const commandModule = await import(pathToFileURL(fullPath).href);
            const command = commandModule.default ?? commandModule;

            if (!command.data || !command.execute) {
                logger.warn(`Command at ${fullPath} missing data or execute`);
                continue;
            }

            command.filePath = fullPath;

            results.push({ command, filePath: fullPath });
        } catch (err: any) {
            logger.error(`Failed to load command ${fullPath}: ${err.message}`);
        }
    }

    return results;
}

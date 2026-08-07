import dotenv from 'dotenv';
dotenv.config();

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCommandsFromFolder } from './utils/loadCommands.js';
import * as logger from './utils/logger.js';

// Load config.json manually (Node16-safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../config/config.json');
const config = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, "utf8"))
    : {
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID
    };
const { clientId, guildId } = config;

// Validate config
if (!process.env.TOKEN) {
    logger.error('TOKEN not found in .env file');
    process.exit(1);
}

if (!clientId || !guildId) {
    logger.error(
        "Missing Discord IDs. Set CLIENT_ID and GUILD_ID in .env, or create config/config.json from config/config.example.json."
    );
    process.exit(1);
}

const isGlobalDeploy = process.argv.includes('--global');
const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('--force');

function promptConfirmation(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

const commands: any[] = [];
const foldersPath = path.join(__dirname, 'commands');
const loadedCommands = await loadCommandsFromFolder(foldersPath);
const devCommandsPath = path.join(__dirname, "dev");
const devCommands = !isGlobalDeploy
    ? await loadCommandsFromFolder(devCommandsPath)
    : [];

for (const { command } of [...loadedCommands, ...devCommands]) {
    commands.push(
        typeof command.data.toJSON === 'function'
            ? command.data.toJSON()
            : command.data
    );
}

// Construct REST instance
const rest = new REST().setToken(process.env.TOKEN);

// Deploy commands
(async () => {
    try {
        if (isGlobalDeploy) {
            if (!skipConfirmation) {
                const answer = await promptConfirmation(
                    `Deploy ${commands.length} global application (/) commands and skip dev commands? Type y to continue: `
                );

                if (answer !== 'y' && answer !== 'yes') {
                    logger.info('Global deploy cancelled.');
                    process.exit(0);
                }
            }

            logger.info(`Deploying ${commands.length} global application (/) commands...`);
            const data: any = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );

            logger.info(`Successfully deployed ${data.length} global commands.`);
            return;
        }

        logger.info(`Deploying ${commands.length} guild application (/) commands...`);

        const data: any = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        logger.info(`Successfully deployed ${data.length} guild commands.`);
    } catch (error: any) {
        logger.error(`Failed to deploy commands: ${error.message}`);
        if (error.response) {
            logger.error(`HTTP Status: ${error.response.status}`);
        }
        if (error.rawError) {
            logger.error(`Discord API error: ${JSON.stringify(error.rawError)}`);
        }
        logger.error(`Deploy error details: ${error.stack ?? String(error)} ${error.cause ? `cause: ${String(error.cause)}` : ""}`);
    }
})();

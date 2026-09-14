import dotenv from "dotenv";

dotenv.config();

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
    ActivityType,
    Client,
    Collection,
    Events,
    GatewayIntentBits,
} from "discord.js";
import GameRegistry from "./game/GameRegistry.js";
import LobbyManager from "./lobby/LobbyManager.js";
import RoleManager from "./lobby/LobbyRoleManager.js";
import { validateConfig } from "./utils/configValidator.js";
import cooldownCleanup from "./utils/cooldownCleanup.js";
import { errorMessage } from "./utils/errors.js";
import {
    executeEventSafely,
    type LoadedEvent,
} from "./utils/eventExecution.js";
import { loadCommandsFromFolder } from "./utils/loadCommands.js";
import * as logger from "./utils/logger.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate config/config.json
if (!validateConfig()) {
    process.exit(1);
}

// Validate token exists
if (!process.env.TOKEN) {
    logger.error("TOKEN not found in .env file");
    process.exit(1);
}

// Create client
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

function isLoadedEvent(value: unknown): value is LoadedEvent {
    if (!value || typeof value !== "object") return false;
    const event = value as Record<string, unknown>;
    return typeof event.name === "string" && typeof event.execute === "function";
}

// Custom client properties
client.commands = new Collection();
client.commandPaths = new Map();
client.cooldowns = new Collection();
client.handlers = {};
client.startTime = Date.now();

// Uptime helper
client.getUptime = function () {
    const uptime = Date.now() - this.startTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
        (uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
};

// MAIN BOOTSTRAP FUNCTION
async function bootstrap() {
    // Load commands
    const foldersPath = path.join(__dirname, "commands");
    const loadedCommands = await loadCommandsFromFolder(foldersPath);

    for (const { command, filePath } of loadedCommands) {
        const commandName = command.data.name;
        client.commands.set(commandName, command);
        client.commandPaths.set(commandName, filePath);
    }

    const devCommandsPath = path.join(__dirname, "dev");
    const devCommands = await loadCommandsFromFolder(devCommandsPath);

    for (const { command, filePath } of devCommands) {
        const commandName = command.data.name;
        client.commands.set(commandName, command);
        client.commandPaths.set(commandName, filePath);
    }

    logger.info(
        `Loaded ${loadedCommands.length} commands and ${devCommands.length} development commands`,
    );

    // Load handlers
    const handlersPath = path.join(__dirname, "handlers");
    const handlerFiles = fs
        .readdirSync(handlersPath)
        .filter((file) => file.endsWith(".js"));

    let loadedHandlers = 0;

    for (const file of handlerFiles) {
        try {
            const filePath = path.join(handlersPath, file);

            const stat = fs.statSync(filePath);
            if (stat.size === 0) {
                logger.warn(`Handler ${file} is empty (skipping)`);
                continue;
            }

            const handlerModule = await import(pathToFileURL(filePath).href);
            let name = file.replace(".js", "");
            name = name.replace(/handler$/, "Handler");

            Object.assign(client.handlers, {
                [name]: handlerModule.default ?? handlerModule,
            });

            logger.debug(`Loaded handler: ${name}`);
            loadedHandlers++;
        } catch (error) {
            logger.error(
                `Failed to load handler ${file}: ${errorMessage(error)}`,
            );
        }
    }

    logger.info(`Loaded ${loadedHandlers} handlers`);
    logger.info(
        `Available handlers: ${Object.keys(client.handlers).join(", ")}`,
    );

    // Load events
    const eventsPath = path.join(__dirname, "events");
    const eventFiles = fs
        .readdirSync(eventsPath)
        .filter((file) => file.endsWith(".js"));

    let loadedEvents = 0;

    for (const file of eventFiles) {
        try {
            const filePath = path.join(eventsPath, file);
            const imported: unknown = await import(pathToFileURL(filePath).href);
            const eventModule = imported as Record<string, unknown>;
            const event = eventModule.default ?? eventModule;

            if (!isLoadedEvent(event)) {
                logger.warn(
                    `Event ${file} is missing "name" or "execute" property`,
                );
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args: unknown[]) =>
                    executeEventSafely(event, args, client, (error) => {
                        logger.error(
                            `Event ${event.name} threw error: ${errorMessage(error)}`,
                        );
                    }),
                );
            } else {
                client.on(event.name, (...args: unknown[]) =>
                    executeEventSafely(event, args, client, (error) => {
                        logger.error(
                            `Event ${event.name} threw error: ${errorMessage(error)}`,
                        );
                    }),
                );
            }

            loadedEvents++;
        } catch (error) {
            logger.error(`Failed to load event ${file}: ${errorMessage(error)}`);
        }
    }

    logger.info(`Loaded ${loadedEvents} events`);

    // Cooldown cleanup
    cooldownCleanup.startCleanupTimer(client);

    // Activity
    client.once(Events.ClientReady, () => {
        client.user?.setActivity("/help - Get started", {
            type: ActivityType.Listening,
        });
        logger.debug("Bot activity set");
    });

    // Game managers
    client.lobbyManager = new LobbyManager();
    client.roleManager = RoleManager;
    client.gameRegistry = new GameRegistry();

    // Login
    await client.login(process.env.TOKEN);
    logger.info("Successfully logged in to Discord");
}

// Start bootstrap
bootstrap().catch((err) => {
    logger.error(`Fatal startup error: ${errorMessage(err)}`);
    process.exit(1);
});

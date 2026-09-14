import type { Collection } from "discord.js";
import type GameRegistry from "../game/GameRegistry.js";
import type LobbyManager from "../lobby/LobbyManager.js";
import type { BotCommand, HandlerRegistry } from "./bot.js";

declare module "discord.js" {
    interface Client {
        commands: Collection<string, BotCommand>;
        commandPaths: Map<string, string>;
        cooldowns: Collection<string, Map<string, number>>;
        handlers: HandlerRegistry;
        startTime: number;
        getUptime(): string;
        lobbyManager: LobbyManager;
        roleManager: typeof import("../lobby/LobbyRoleManager.js").default;
        gameRegistry: GameRegistry;
    }
}

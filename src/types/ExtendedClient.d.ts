import {
    Collection
} from "discord.js";
import LobbyManager from "../game/LobbyManager";
import RoleManager from "../game/RoleManager";

declare module "discord.js" {
    interface Client {
        commands: Collection<string, any>;
        commandPaths: Map<string, string>;
        cooldowns: Collection<string, Map<string, number>>;
        handlers: Record<string, any>;
        startTime: number;
        getUptime(): string;

        lobbyManager: LobbyManager;
        roleManager: typeof RoleManager;
    }
}

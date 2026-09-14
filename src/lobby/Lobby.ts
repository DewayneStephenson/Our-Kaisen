import type { Message } from "discord.js";
import type { RoleKey } from "../lobby/LobbyRoleManager.js";
import type { TimerSettings } from "../types/game.js";
import { DEFAULT_TIMER_SETTINGS } from "../utils/constants.js";

export default class Lobby {
    channelId: string;
    players: string[];
    isBotLobby: boolean;
    botNames: Map<string, string>;
    humanNames: Map<string, string>;
    settings: string;
    title: string | null;
    timerSettings: TimerSettings;
    roles: RoleKey[];
    host: string | null;
    message?: Message<boolean>;

    constructor(channelId: string) {
        this.channelId = channelId;
        this.players = [];
        this.isBotLobby = false;
        this.botNames = new Map();
        this.humanNames = new Map();
        this.settings = "lobby";
        this.title = null;
        this.timerSettings = { ...DEFAULT_TIMER_SETTINGS };
        this.roles = []; // now stores role KEYS
        this.host = null;
    }
}

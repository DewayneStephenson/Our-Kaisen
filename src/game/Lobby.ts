import type Role from "./Role.js";
export default class Lobby {
    channelId: string;
    players: string[];
    isBotLobby: boolean;
    botNames: Map<string, string>;
    settings: string;
    roles: Role[];
    host: string | null;

    constructor(channelId: string) {
        this.channelId = channelId;
        this.players = [];
        this.isBotLobby = false; 
        this.botNames = new Map();
        this.settings = "lobby";
        this.roles = [];
        this.host = null;
    }
}

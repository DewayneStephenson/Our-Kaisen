import Role from "./Role.js";
export default class Lobby {
    channelId: string;
    players: string[];
    settings: string;
    roles: Role[];
    host: string | null;

    constructor(channelId: string) {
        this.channelId = channelId;
        this.players = [];
        this.settings = "lobby";
        this.roles = [];
        this.host = null;
    }
}

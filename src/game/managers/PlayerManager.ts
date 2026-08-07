import type Lobby from "../../lobby/Lobby.js";
import type LobbyManager from "../../lobby/LobbyManager.js";
import Player from "../Player.js";

export default class PlayerManager {
    players: Player[];

    constructor(lobby: Lobby, lobbyManager: LobbyManager) {
        this.players = this.convertPlayers(lobby, lobbyManager);
    }

    convertPlayers(lobby: Lobby, lobbyManager: LobbyManager): Player[] {
        const result: Player[] = [];

        while (lobby.players.length > 0) {
            const discordId = lobby.players.shift();
            if (!discordId) continue;
            const username = lobbyManager.getUsername(discordId, lobby);
            const player = new Player(discordId, username);
            result.push(player);
        }

        return result;
    }

    add(profile: { discordId: string; username: string }) {
        if (this.players.some((p) => p.discordId === profile.discordId)) {
            return { success: false, reason: "already_in_game" };
        }

        const player = new Player(profile.discordId, profile.username);
        this.players.push(player);

        return { success: true };
    }

    getAll() {
        return this.players;
    }

    getById(id: string) {
        return this.players.find((p) => p.discordId === id) || null;
    }
}

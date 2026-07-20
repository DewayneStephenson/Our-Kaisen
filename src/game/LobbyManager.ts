import { EmbedBuilder } from "discord.js";
import Lobby from "./Lobby.js";
import RoleManager from "./RoleManager.js";

export default class LobbyManager {
    lobbies: Map<string, Lobby>;

    constructor() {
        this.lobbies = new Map();
    }

    createLobby(channelId: string, userID: string) {
        if (this.lobbies.has(channelId)) return null;

        const lobby = new Lobby(channelId);

        lobby.players.push(userID);

        lobby.roles = RoleManager.DefaultMode(lobby.players.length);

        this.lobbies.set(channelId, lobby);
        return lobby;
    }

    getLobby(channelId: string) {
        return this.lobbies.get(channelId);
    }

    deleteLobby(channelId: string) {
        return this.lobbies.delete(channelId);
    }

    buildEmbed(channelId: string) {
        const lobby = this.getLobby(channelId);
        if (!lobby) return null;

        return new EmbedBuilder()
            .setTitle("Lobby")
            .addFields(
                {
                    name: `Players (${lobby.players.length})`,
                    value: lobby.players.length
                        ? lobby.players.map(id => `<@${id}>`).join("\n")
                        : "Empty Lobby",
                },
                {
                    name: "Roles",
                    value: lobby.roles.length
                        ? lobby.roles.map(r => r.name).join(", ")
                        : "Default Mode",
                }
            );
    }

    addPlayer(channelId: string, userId: string) {
        const lobby = this.getLobby(channelId);
        if (!lobby) return null;

        if (!lobby.players.includes(userId)) {
            lobby.players.push(userId);
        }
        return lobby;
    }

    removePlayer(channelId: string, userId: string) {
        const lobby = this.getLobby(channelId);
        if (!lobby) return null;

        lobby.players = lobby.players.filter(id => id !== userId);

        if (lobby.players.length === 0) {
            this.deleteLobby(channelId);
        }

        return lobby;
    }
}

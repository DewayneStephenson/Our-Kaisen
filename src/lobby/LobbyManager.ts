import { EmbedBuilder, Role } from "discord.js";
import Lobby from "../lobby/Lobby.js";
import RoleManager from "../lobby/LobbyRoleManager.js";
import { generateBotUser } from "../utils/botUser.js";

export default class LobbyManager {
    lobbies: Map<string, Lobby>;

    constructor() {
        this.lobbies = new Map();
    }
    

   createLobby(channelId: string, userID: string, username: string) {
    if (this.lobbies.has(channelId)) return null;

    const lobby = new Lobby(channelId);

    lobby.players.push(userID);

    lobby.humanNames.set(userID, username);

    lobby.roles = RoleManager.DefaultMode(lobby.players.length);
    lobby.timerSettings = {
        missionSelectionSeconds: 30,
        votingSeconds: 60,
        missionSeconds: 30
    };

    this.lobbies.set(channelId, lobby);

    lobby.host = userID;

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
                    ? lobby.players
                    .map(id => `<@${id}>`)
                    .join("\n")
                    : "No players yet."
            },
            {
                name: "Roles",
                value: lobby.roles.length
                    ? lobby.roles.map(r => RoleManager.ROLES[r].name).join(", ")
                    : "No roles selected."
            }
        );
}

    getUsername(id: string, lobby: Lobby): string {
    return lobby.botNames.get(id)
        ?? lobby.humanNames.get(id)
        ?? `<@${id}>`;
    }

    addPlayer(channelId: string, userId: string,username: string) {
        const lobby = this.getLobby(channelId);
        if (!lobby) return null;
        if (lobby.isBotLobby) return null;
        if (!lobby.players.includes(userId)) {
            lobby.players.push(userId);
        }

        lobby.roles = RoleManager.updateRole(lobby.roles,lobby.players.length);
        return lobby;
    }

    removePlayer(channelId: string, userId: string) {
        const lobby = this.getLobby(channelId);
        if (!lobby) return null; 
        if (lobby.isBotLobby) return null;

        lobby.players = lobby.players.filter(id => id !== userId);

        if (lobby.players.length === 0) {
            this.deleteLobby(channelId);
            return lobby;
        }
        if (lobby.host === userId) {
            lobby.host = lobby.players[0];
        }
        lobby.humanNames.delete(userId);
        lobby.roles = RoleManager.updateRole(lobby.roles,lobby.players.length);
        

        return lobby;
    }
    botLobby(channelId: string,userId:string, bots: number) {
        if (this.lobbies.has(channelId)) return null;

        const lobby = new Lobby(channelId);
        lobby.isBotLobby = true;
        for (let i = 0; i < bots; i++) {
            const fake = generateBotUser();
            lobby.players.push(fake.id);
            lobby.botNames.set(fake.id, fake.name);
        }

        lobby.roles = RoleManager.DefaultMode(lobby.players.length);
        lobby.timerSettings = {
            missionSelectionSeconds: 30,
            votingSeconds: 60,
            missionSeconds: 30
        };
        this.lobbies.set(channelId, lobby);
        lobby.host = userId;
        return lobby;
    }
     addBots(channelId: string, bots: number) {
        const lobby = this.getLobby(channelId);
        if (!lobby) return null;
        if (!lobby.isBotLobby) return null;
        if (bots + lobby.players.length > 25) bots = 25 - lobby.players.length;
        for (let i = 0; i < bots; i++) {
            const fake = generateBotUser();
            lobby.players.push(fake.id);
            lobby.botNames.set(fake.id, fake.name);
        }
        lobby.roles = RoleManager.updateRole(lobby.roles,lobby.players.length);
        return lobby;
    }
    removeBots(channelId: string, bots: number) {
    const lobby = this.getLobby(channelId);
    if (!lobby) return null;
    if (!lobby.isBotLobby) return null;

    if (bots > lobby.players.length) {
        bots = lobby.players.length;
    }
    lobby.players = lobby.players.slice(0, lobby.players.length - bots);
    if (lobby.players.length === 0) {
        this.deleteLobby(channelId);
        return lobby;
    }
    lobby.roles = RoleManager.updateRole(lobby.roles,lobby.players.length)

    return lobby;
    }   
}

// GameRegistry.ts
import Game from "../game/Game.js";
import Lobby from "../lobby/Lobby.js";

const games = new Map<string, Game>();

export function createGame(channelId: string, userId: string, lobby: Lobby) {
    if (games.has(channelId)) {
        return { success: false, reason: "game_exists", game: null };
    }

    if (lobby.host !== userId) {
        return { success: false, reason: "not_host", game: null };
    }
    if (lobby.players.length < 5) {
        return {success: false, reason: "min_players", game: null}
    }

    const game = new Game(channelId,lobby);
    games.set(channelId, game);

    return { success: true, game };
}

export function getGame(channelId: string) {
    return games.get(channelId) || null;
}

export function deleteGame(channelId: string) {
    return games.delete(channelId);
}

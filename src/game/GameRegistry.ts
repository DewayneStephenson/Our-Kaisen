// GameRegistry.ts
import Game from "../game/Game.js";
import type Lobby from "../lobby/Lobby.js";

const games = new Map<string, Game>();

export function createGame(channelId: string, userId: string, lobby: Lobby) {
    if (games.has(channelId)) {
        return { success: false, reason: "game_exists", game: null };
    }

    if (lobby.host !== userId) {
        return { success: false, reason: "not_host", game: null };
    }
    if (lobby.players.length < 5) {
        return { success: false, reason: "min_players", game: null };
    }

    const game = new Game(channelId, lobby);
    games.set(channelId, game);

    return { success: true, game };
}

export function getGame(channelId: string) {
    return games.get(channelId) || null;
}

export function moveGameToChannel(game: Game, channelId: string) {
    games.delete(game.channelId);
    game.channelId = channelId;
    games.set(channelId, game);
}

export function deleteGame(channelId: string) {
    const game = games.get(channelId);

    if (game?.cleanupTimer) {
        clearTimeout(game.cleanupTimer);
    }

    return games.delete(channelId);
}

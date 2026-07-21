import Game from "./Game.js";

const games = new Map<string, Game>();

function createGame(channelId: string) {
    if (games.has(channelId)) return null;

    const game = new Game(channelId);
    games.set(channelId, game);
    return game;
}

function getGame(channelId: string) {
    return games.get(channelId);
}

function deleteGame(channelId: string) {
    return games.delete(channelId);
}

export default { createGame, getGame, deleteGame };

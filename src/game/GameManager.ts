import Game from "./Game.js";

export default class GameManager {
    static games = new Map<string, Game>();

    static createGame(channelId: string) {
        if (this.games.has(channelId)) return null;

        const game = new Game(channelId);
        this.games.set(channelId, game);
        return game;
    }

    static getGame(channelId: string) {
        return this.games.get(channelId);
    }

    static deleteGame(channelId: string) {
        return this.games.delete(channelId);
    }
}

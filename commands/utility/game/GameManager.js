const Game = require('./Game');

class GameManager {
    static games = new Map();
    // key is channelId, value is the state of game

    static createGame(channelId) {
        if (this.games.has(channelId)) return null;
        const game = new Game(channelId);
        this.games.set(channelId, game);
        return game;
    }

    static getGame(channelId) {
        return this.games.get(channelId);
    }
    static deleteGame(channelID) {
        return this.games.delete(channelID);
    }
}

module.exports = GameManager;

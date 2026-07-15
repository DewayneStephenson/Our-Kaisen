class Game {
    constructor(channelId) {
        this.channelId = channelId;
        this.players = [];
        this.phase = "lobby";
        this.votes = {};
        this.actions = {};
        this.started = false;
    }
}
module.exports = Game;
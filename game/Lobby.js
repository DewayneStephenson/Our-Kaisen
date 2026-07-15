class Lobby {
    constructor(channelId) {
        this.channelId = channelId;
        this.players = [];
        this.settings = "lobby";
        this.roles = [];
        this.host = null;
    }
    
}
module.exports = Lobby;
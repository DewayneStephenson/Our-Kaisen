export default class Game {
    channelId: string;
    players: string[];
    phase: string;
    votes: Record<string, string>;
    actions: Record<string, any>;
    started: boolean;

    constructor(channelId: string) {
        this.channelId = channelId;
        this.players = [];
        this.phase = "lobby";
        this.votes = {};
        this.actions = {};
        this.started = false;
    }
}

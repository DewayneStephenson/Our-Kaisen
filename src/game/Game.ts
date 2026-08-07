// Game.ts
import { GamePhase,KaisenRole, type TimerSettings } from "../types/game.js";
import Player from "./Player.js"
import Lobby from "../lobby/Lobby.js"

export default class Game {
    channelId: string;
    lobby: Lobby;
    players: Player[];
    roles: KaisenRole[];
    missionResults: Array<boolean | null>;
    missionCount: number;
    phase: GamePhase;
    votes: Record<string, string>;
    expedition: string[];
    expeditionVotes: Record<string, "approve" | "reject">;
    missionVotes: Record<string, "pass" | "fail">;
    timerSettings: TimerSettings;
    phaseTimer: ReturnType<typeof setTimeout> | null;
    started: boolean;

    constructor(channelId: string, lobby: Lobby) {
        this.channelId = channelId;
        this.lobby = lobby
        this.players = [];
        this.roles = [];
        this.missionCount = 5;
        this.missionResults = Array(this.missionCount).fill(null);
        this.phase = "LOBBY";
        this.votes = {};
        this.expedition = [];
        this.expeditionVotes = {};
        this.missionVotes = {};
        this.timerSettings = { ...lobby.timerSettings };
        this.phaseTimer = null;
        this.started = false;
    }
}

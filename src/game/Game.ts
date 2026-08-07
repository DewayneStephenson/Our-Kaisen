// Game.ts
import { GamePhase,KaisenRole, type TimerSettings } from "../types/game.js";
import Player from "./Player.js"
import Lobby from "../lobby/Lobby.js"

export default class Game {
    channelId: string;
    lobbyChannelId: string;
    logChannelId: string | null;
    resultsChannelId: string | null;
    voiceChannelId: string | null;
    cleanupTimer: ReturnType<typeof setTimeout> | null;
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
    missionVoteResults: Array<Array<"pass" | "fail"> | null>;
    missionVoteHistory: Array<Record<string, "pass" | "fail"> | null>;
    timerSettings: TimerSettings;
    phaseTimer: ReturnType<typeof setTimeout> | null;
    phaseTimerEndsAt: number | null;
    voiceMuteTimers: Array<ReturnType<typeof setTimeout>>;
    chatLockTimers: Array<ReturnType<typeof setTimeout>>;
    voiceMuteOperation: Promise<void>;
    winnerAlignment: "Sorcerer" | "Curse" | null;
    sealingAssassinId: string | null;
    sealingTargetId: string | null;
    pendingMissionReveals: string[];
    roundResultAnnounced: boolean;
    started: boolean;

    constructor(channelId: string, lobby: Lobby) {
        this.channelId = channelId;
        this.lobbyChannelId = channelId;
        this.logChannelId = null;
        this.resultsChannelId = null;
        this.voiceChannelId = null;
        this.cleanupTimer = null;
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
        this.missionVoteResults = Array(this.missionCount).fill(null);
        this.missionVoteHistory = Array(this.missionCount).fill(null);
        this.timerSettings = { ...lobby.timerSettings };
        this.phaseTimer = null;
        this.phaseTimerEndsAt = null;
        this.voiceMuteTimers = [];
        this.chatLockTimers = [];
        this.voiceMuteOperation = Promise.resolve();
        this.winnerAlignment = null;
        this.sealingAssassinId = null;
        this.sealingTargetId = null;
        this.pendingMissionReveals = [];
        this.roundResultAnnounced = false;
        this.started = false;
    }
}

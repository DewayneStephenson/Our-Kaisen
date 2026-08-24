// Game.ts
import { randomUUID } from "node:crypto";
import type Lobby from "../lobby/Lobby.js";
import type {
    GamePhase,
    KaisenRole,
    PhaseStage,
    TimerSettings,
} from "../types/game.js";
import type Player from "./Player.js";

export default class Game {
    id: string;
    name: string;
    channelId: string;
    guildId: string | null;
    lobbyChannelId: string;
    logChannelId: string | null;
    logThreadId: string | null;
    resultsChannelId: string | null;
    voiceChannelId: string | null;
    participantRoleId: string | null;
    cleanupTimer: ReturnType<typeof setTimeout> | null;
    lobby: Lobby;
    players: Player[];
    leaderIndex: number;
    roles: KaisenRole[];
    missionResults: Array<boolean | null>;
    missionCount: number;
    phase: GamePhase;
    phaseStage: PhaseStage;
    phaseTransitionInProgress: boolean;
    votes: Record<string, string>;
    expedition: string[];
    expeditionVotes: Record<string, "approve" | "reject">;
    missionVotes: Record<string, "pass" | "fail">;
    missionVoteResults: Array<Array<"pass" | "fail"> | null>;
    missionVoteHistory: Array<Record<string, "pass" | "fail"> | null>;
    timerSettings: TimerSettings;
    phaseTimer: ReturnType<typeof setTimeout> | null;
    phaseWarningTimer: ReturnType<typeof setTimeout> | null;
    phaseTimerVersion: number;
    phaseTimerEndsAt: number | null;
    actionWindowActive: boolean;
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
        this.id = randomUUID().split("-")[0].toUpperCase();
        this.name = lobby.title?.trim() || "Kaisen";
        this.channelId = channelId;
        this.guildId = null;
        this.lobbyChannelId = channelId;
        this.logChannelId = null;
        this.logThreadId = null;
        this.resultsChannelId = null;
        this.voiceChannelId = null;
        this.participantRoleId = null;
        this.cleanupTimer = null;
        this.lobby = lobby;
        this.players = [];
        this.leaderIndex = 0;
        this.roles = [];
        this.missionCount = 5;
        this.missionResults = Array(this.missionCount).fill(null);
        this.phase = "LOBBY";
        this.phaseStage = "discussion";
        this.phaseTransitionInProgress = false;
        this.votes = {};
        this.expedition = [];
        this.expeditionVotes = {};
        this.missionVotes = {};
        this.missionVoteResults = Array(this.missionCount).fill(null);
        this.missionVoteHistory = Array(this.missionCount).fill(null);
        this.timerSettings = { ...lobby.timerSettings };
        this.phaseTimer = null;
        this.phaseWarningTimer = null;
        this.phaseTimerVersion = 0;
        this.phaseTimerEndsAt = null;
        this.actionWindowActive = false;
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

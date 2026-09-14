import type Player from "../game/Player.js";
export type GamePhase =
    | "LOBBY"
    | "START"
    | "SELECTION"
    | "VOTING"
    | "MISSION"
    | "SEALING";

export type PhaseStage = "discussion" | "action";

export interface TimerSettings {
    missionSelectionSeconds: number;
    votingSeconds: number;
    missionSeconds: number;
    sealingSeconds: number;
    actionTimeSeconds: number;
    phaseMuteEnabled: boolean;
    phaseChatLockEnabled: boolean;
    skipTimerWhenReady: boolean;
}

export interface KaisenRole {
    roleName: string;
    alignment: "Sorcerer" | "Curse";
    calculateTeammates(viewer: Player, allPlayers: Player[]): string[];
    canFail: boolean;
    description?: string;
    missionFails?: number;
    power?: Power;
}

export interface Profile {
    discordId: string;
    username: string;
}

export interface Power {
    PowerName: string;
    uses: number;
    revealTiming?: "immediate" | "after_mission" | "private";
    target?(actor: Player, target: Player): string;
}

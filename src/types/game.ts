import Player from "../game/Player.js"
export type GamePhase = 'LOBBY' | 'START' | 'PLANNING' | 'VOTING' | 'MISSION' | 'SEALING'

export interface TimerSettings {
    missionSelectionSeconds: number;
    votingSeconds: number;
    missionSeconds: number;
}

export interface KaisenRole {
    roleName: string;
    alignment: "Sorcerer" | "Curse";
    calculateTeammates(viewer: Player, allPlayers: Player[]): string[]; 
    canFail: boolean;
    description?: string
    missionFails?: number;
    power?: Power;
}



export interface Profile {
    discordId: string;
    username: string;
}

export interface Power {
    PowerName: string;
    uses: number,
    target?(actor: Player, target: Player): string;
}
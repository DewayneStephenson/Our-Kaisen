import Game from "../Game.js";
import RoleManager from "../../lobby/LobbyRoleManager.js";

export type ExpeditionVote = "approve" | "reject";
export type MissionVote = "pass" | "fail";

const OFFICIAL_MISSION_TEAM_SIZES: Record<number, number[]> = {
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5]
};

const IMPROVISED_MISSION_TEAM_SIZES: Record<number, number[]> = {
    11: [4, 5, 5, 6, 6],
    12: [4, 5, 6, 6, 7],
    13: [4, 5, 6, 7, 7],
    14: [5, 6, 6, 7, 8],
    15: [5, 6, 7, 8, 8]
};

export function getMissionTeamSizes(playerCount: number): number[] {
    if (OFFICIAL_MISSION_TEAM_SIZES[playerCount]) {
        return OFFICIAL_MISSION_TEAM_SIZES[playerCount];
    }

    if (IMPROVISED_MISSION_TEAM_SIZES[playerCount]) {
        return IMPROVISED_MISSION_TEAM_SIZES[playerCount];
    }

    return OFFICIAL_MISSION_TEAM_SIZES[10];
}

export function getRequiredFails(playerCount: number, missionNumber: number): number {
    if (missionNumber === 4 && playerCount >= 7) {
        return 2;
    }

    return 1;
}

export default class MissionManager {
    game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    getCurrentMissionIndex() {
        return this.game.missionResults.findIndex(result => result === null);
    }

    getCurrentMissionNumber() {
        const index = this.getCurrentMissionIndex();
        return index === -1 ? this.game.missionCount : index + 1;
    }

    getLeader() {
        return this.game.players[0] || null;
    }

    getRequiredTeamSize() {
        return getMissionTeamSizes(this.game.players.length)[this.getCurrentMissionIndex()] ?? 0;
    }

    getRequiredFails() {
        return getRequiredFails(this.game.players.length, this.getCurrentMissionNumber());
    }

    beginPlanning() {
        this.game.phase = "PLANNING";
        this.game.expedition = [];
        this.game.expeditionVotes = {};
        this.game.missionVotes = {};
        return { success: true };
    }

    setExpedition(playerIds: string[]) {
        this.game.expedition = [...playerIds];
        this.game.expeditionVotes = {};
        this.game.missionVotes = {};
        return { success: true };
    }

    beginVoting() {
        this.game.phase = "VOTING";
        this.game.expeditionVotes = {};
        return { success: true };
    }

    castExpeditionVote(playerId: string, vote: ExpeditionVote) {
        this.game.expeditionVotes[playerId] = vote;
        return { success: true };
    }

    getExpeditionVoteCounts() {
        const counts = { approve: 0, reject: 0 };

        for (const vote of Object.values(this.game.expeditionVotes)) {
            counts[vote] += 1;
        }

        return counts;
    }

    allPlayersVoted() {
        return Object.keys(this.game.expeditionVotes).length >= this.game.players.length;
    }

    approvalPassed() {
        const counts = this.getExpeditionVoteCounts();
        return counts.approve > counts.reject;
    }

    beginMission() {
        this.game.phase = "MISSION";
        this.game.missionVotes = {};
        return { success: true };
    }

    startMission() {
        return this.beginMission();
    }

    castMissionVote(playerId: string, vote: MissionVote) {
        if (!this.game.expedition.includes(playerId)) {
            return { success: false, reason: "not_in_expedition" };
        }

        const player = this.game.players.find(currentPlayer => currentPlayer.discordId === playerId);

        if (!player?.role) {
            return { success: false, reason: "player_not_found" };
        }

        if (vote === "fail" && player.role.alignment !== "Curse") {
            return { success: false, reason: "sorcerer_cannot_fail" };
        }

        this.game.missionVotes[playerId] = vote;
        return { success: true };
    }

    allExpeditionMembersVoted() {
        return this.game.expedition.every(playerId => playerId in this.game.missionVotes);
    }

    private shuffleMissionVotes(votes: MissionVote[]) {
        const shuffledVotes = [...votes];

        for (let index = shuffledVotes.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [shuffledVotes[index], shuffledVotes[randomIndex]] = [shuffledVotes[randomIndex], shuffledVotes[index]];
        }

        return shuffledVotes;
    }

    private getSealingAssassin() {
        const curses = this.game.players.filter(player => player.role?.alignment === "Curse");
        const stitchedFace = curses.find(player => player.role.roleName === RoleManager.ROLES.kenny.name);
        return stitchedFace ?? curses[Math.floor(Math.random() * curses.length)] ?? null;
    }

    beginSealing() {
        const assassin = this.getSealingAssassin();

        this.game.sealingAssassinId = assassin?.discordId ?? null;
        this.game.sealingTargetId = null;
        this.game.phase = "SEALING";
        return { success: assassin !== null };
    }

    resolveSealingTarget(assassinId: string, targetId: string) {
        if (this.game.phase !== "SEALING" || this.game.winnerAlignment) {
            return { success: false, reason: "not_sealing" };
        }

        if (this.game.sealingAssassinId !== assassinId) {
            return { success: false, reason: "not_assassin" };
        }

        const target = this.game.players.find(player => player.discordId === targetId);

        if (!target) {
            return { success: false, reason: "target_not_found" };
        }

        this.game.sealingTargetId = target.discordId;
        this.game.winnerAlignment = target.role.roleName === RoleManager.ROLES.gojo.name
            ? "Curse"
            : "Sorcerer";
        return { success: true };
    }

    resolveSealingTimeout() {
        if (this.game.phase !== "SEALING" || this.game.winnerAlignment) {
            return { success: false, reason: "not_sealing" };
        }

        this.game.winnerAlignment = "Sorcerer";
        return { success: true };
    }

    resolveMission() {
        const fails = Object.values(this.game.missionVotes).filter(vote => vote === "fail").length;
        const requiredFails = this.getRequiredFails();
        const success = fails < requiredFails;
        const missionIndex = this.getCurrentMissionIndex();

        if (missionIndex !== -1) {
            this.game.missionResults[missionIndex] = success;
            this.game.missionVoteHistory[missionIndex] = { ...this.game.missionVotes };
            this.game.missionVoteResults[missionIndex] = this.shuffleMissionVotes(Object.values(this.game.missionVotes));
        }

        this.rotateLeader();
        this.game.expedition = [];
        this.game.expeditionVotes = {};
        this.game.missionVotes = {};

        const successes = this.game.missionResults.filter(result => result === true).length;
        const failures = this.game.missionResults.filter(result => result === false).length;

        if (successes >= 3) {
            this.beginSealing();
        } else if (failures >= 3 || this.getCurrentMissionIndex() === -1) {
            this.game.phase = "SEALING";
            this.game.winnerAlignment = "Curse";
        } else {
            this.game.phase = "PLANNING";
        }

        return {
            success: true,
            data: {
                fails,
                requiredFails,
                success,
                missionNumber: missionIndex + 1,
                votes: this.game.missionVoteResults[missionIndex] ?? []
            }
        };
    }

    resolve() {
        return this.resolveMission();
    }

    rotateLeader() {
        const leader = this.game.players.shift();

        if (leader) {
            this.game.players.push(leader);
        }

        return { success: true };
    }
}

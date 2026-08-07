import type { Client } from "discord.js";
import Game from "../game/Game.js";
import Player from "../game/Player.js";
import MissionManager from "../game/managers/MissionManager.js";
import { buildMissionView, updateMissionMessage } from "./missionDebug.js";

function pickRandomPlayers(players: Player[], count: number): Player[] {
    return [...players].sort(() => Math.random() - 0.5).slice(0, count);
}

function fillPlanningTimeout(game: Game) {
    const missionManager = new MissionManager(game);
    const requiredTeamSize = missionManager.getRequiredTeamSize();
    const expedition = pickRandomPlayers(game.players, requiredTeamSize);

    missionManager.setExpedition(expedition.map(player => player.discordId));
    missionManager.beginVoting();
}

function fillVotingTimeout(game: Game) {
    const missionManager = new MissionManager(game);

    for (const player of game.players) {
        if (game.expeditionVotes[player.discordId]) continue;

        const vote = Math.random() < 0.5 ? "approve" : "reject";
        missionManager.castExpeditionVote(player.discordId, vote);
    }

    if (missionManager.approvalPassed()) {
        missionManager.beginMission();
        return;
    }

    missionManager.rotateLeader();
    missionManager.beginPlanning();
}

function fillMissionTimeout(game: Game) {
    const missionManager = new MissionManager(game);

    for (const player of game.players) {
        if (!game.expedition.includes(player.discordId)) continue;
        if (game.missionVotes[player.discordId]) continue;

        const vote = player.role?.alignment === "Curse" && player.role.canFail ? "fail" : "pass";
        missionManager.castMissionVote(player.discordId, vote);
    }

    missionManager.resolveMission();
}

export function clearMissionTimer(game: Game) {
    if (game.phaseTimer) {
        clearTimeout(game.phaseTimer);
        game.phaseTimer = null;
    }
}

export function scheduleMissionTimer(client: Client, game: Game) {
    clearMissionTimer(game);

    const seconds =
        game.phase === "PLANNING"
            ? game.timerSettings.missionSelectionSeconds
            : game.phase === "VOTING"
                ? game.timerSettings.votingSeconds
                : game.phase === "MISSION"
                    ? game.timerSettings.missionSeconds
                    : 0;

    if (!seconds || game.phase === "SEALING" || game.phase === "LOBBY" || game.phase === "START") {
        return;
    }

    game.phaseTimer = setTimeout(async () => {
        const currentGame = client.gameRegistry.getGame(game.channelId);

        if (!currentGame || currentGame.phase !== game.phase) {
            return;
        }

        if (currentGame.phase === "PLANNING") {
            fillPlanningTimeout(currentGame);
        } else if (currentGame.phase === "VOTING") {
            fillVotingTimeout(currentGame);
        } else if (currentGame.phase === "MISSION") {
            fillMissionTimeout(currentGame);
        }

        await updateMissionMessage(currentGame);
    }, seconds * 1000);
}

export function buildMissionSnapshot(game: Game) {
    return buildMissionView(game);
}
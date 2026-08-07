import type { Client } from "discord.js";
import type Game from "../game/Game.js";
import type Player from "../game/Player.js";
import MissionManager from "../game/managers/MissionManager.js";
import {
    buildMissionView,
    publishPendingMissionReveals,
    publishRoundResult,
    updateMissionMessage,
} from "./missionDebug.js";
import {
    clearPhaseVoiceMutes,
    schedulePhaseVoiceMutes,
} from "./missionVoice.js";
import { schedulePhaseChatLocks } from "./missionChat.js";
import { postGameLog } from "./gameChannels.js";

function pickRandomPlayers(players: Player[], count: number): Player[] {
    return [...players].sort(() => Math.random() - 0.5).slice(0, count);
}

function fillPlanningTimeout(game: Game) {
    const missionManager = new MissionManager(game);
    const requiredTeamSize = missionManager.getRequiredTeamSize();
    const expedition = pickRandomPlayers(game.players, requiredTeamSize);

    missionManager.setExpedition(expedition.map((player) => player.discordId));
    missionManager.beginVoting();
}

function fillVotingTimeout(game: Game) {
    const missionManager = new MissionManager(game);

    for (const player of game.players) {
        if (game.expeditionVotes[player.discordId]) continue;

        const vote = Math.random() < 0.5 ? "approve" : "reject";
        missionManager.castExpeditionVote(player.discordId, vote);
    }

    const approvalPassed = missionManager.approvalPassed();
    const votes = { ...game.expeditionVotes };

    if (approvalPassed) {
        missionManager.beginMission();
        return { votes, approvalPassed };
    }

    missionManager.rotateLeader();
    missionManager.beginPlanning();
    return { votes, approvalPassed };
}

function fillMissionTimeout(game: Game) {
    const missionManager = new MissionManager(game);

    for (const player of game.players) {
        if (!game.expedition.includes(player.discordId)) continue;
        if (game.missionVotes[player.discordId]) continue;
        const vote =
            player.role?.alignment === "Curse" && player.role.canFail
                ? "fail"
                : "pass";
        missionManager.castMissionVote(player.discordId, vote);
    }

    return missionManager.resolveMission();
}

function fillSealingTimeout(game: Game) {
    new MissionManager(game).resolveSealingTimeout();
}

export function clearMissionTimer(game: Game) {
    if (game.phaseTimer) {
        clearTimeout(game.phaseTimer);
        game.phaseTimer = null;
    }

    game.phaseTimerEndsAt = null;
}

export function scheduleMissionTimer(client: Client, game: Game) {
    clearMissionTimer(game);

    // Keep the phase that this timer belongs to. `game.phase` is mutable, so
    // reading it from inside the callback would not identify a stale timer.
    const scheduledPhase = game.phase;

    const seconds =
        game.phase === "PLANNING"
            ? game.timerSettings.missionSelectionSeconds
            : game.phase === "VOTING"
              ? game.timerSettings.votingSeconds
              : game.phase === "MISSION"
                ? game.timerSettings.missionSeconds
                : game.phase === "SEALING"
                  ? game.timerSettings.sealingSeconds
                  : 0;

    if (
        !seconds ||
        game.winnerAlignment ||
        game.phase === "LOBBY" ||
        game.phase === "START"
    ) {
        clearPhaseVoiceMutes(client, game);
        return;
    }

    game.phaseTimerEndsAt = Date.now() + seconds * 1000;
    schedulePhaseVoiceMutes(client, game, seconds);
    schedulePhaseChatLocks(client, game, seconds);

    const timer = setTimeout(async () => {
        const currentGame = client.gameRegistry.getGame(game.channelId);

        if (
            !currentGame ||
            currentGame !== game ||
            currentGame.phase !== scheduledPhase
        ) {
            return;
        }

        currentGame.phaseTimer = null;
        if (currentGame.phase === "PLANNING") {
            fillPlanningTimeout(currentGame);
            await postGameLog(
                currentGame,
                `⏱️ Planning timed out. <@${currentGame.players[0]?.discordId}> automatically selected: ${currentGame.expedition.map((playerId: string) => `<@${playerId}>`).join(", ")}.`,
            );
        } else if (currentGame.phase === "VOTING") {
            const voteResult = fillVotingTimeout(currentGame);
            await postGameLog(
                currentGame,
                `⏱️ Approval voting timed out. Recorded votes: ${Object.entries(
                    voteResult.votes,
                )
                    .map(([playerId, vote]) => `<@${playerId}> ${vote}`)
                    .join(
                        ", ",
                    )}. ${voteResult.approvalPassed ? "Expedition approved." : `Expedition rejected. Next leader: <@${currentGame.players[0]?.discordId}>.`}`,
            );
        } else if (currentGame.phase === "MISSION") {
            const missionResult = fillMissionTimeout(currentGame);
            await postGameLog(
                currentGame,
                `⏱️ Mission ${missionResult.data.missionNumber} timed out and resolved ${missionResult.data.success ? "successfully" : "as a failure"}. Votes: ${missionResult.data.votes
                    .map((vote) => (vote === "pass" ? "succeed" : "fail"))
                    .join(
                        ", ",
                    )}.${currentGame.phase === "PLANNING" ? ` Next leader: <@${currentGame.players[0]?.discordId}>.` : ""}`,
            );
        } else if (currentGame.phase === "SEALING") {
            fillSealingTimeout(currentGame);
            await postGameLog(
                currentGame,
                "⏱️ Sealing timed out; the Sorcerers win.",
            );
        }

        scheduleMissionTimer(client, currentGame);
        await updateMissionMessage(currentGame);
        if (scheduledPhase === "MISSION") {
            await publishPendingMissionReveals(currentGame);
        }
        await publishRoundResult(currentGame);
    }, seconds * 1000);

    game.phaseTimer = timer;
}

export function buildMissionSnapshot(game: Game) {
    return buildMissionView(game);
}

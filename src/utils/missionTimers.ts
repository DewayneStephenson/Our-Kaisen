import type { Client } from "discord.js";
import type Game from "../game/Game.js";
import MissionManager from "../game/managers/MissionManager.js";
import { resolveExpeditionVote } from "../game/services/MissionFlowService.js";
import type Player from "../game/Player.js";
import { postGameLog } from "./gameChannels.js";
import * as logger from "./logger.js";

function reportTimerError(game: Game, error: unknown) {
    logger.error(
        `[${game.channelId}] Phase timer failed: ${
            error instanceof Error ? error.message : String(error)
        }`,
    );
}

import { clearPhaseChatLocks } from "./missionChat.js";
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

function pickRandomPlayers(players: Player[], count: number): Player[] {
    return [...players].sort(() => Math.random() - 0.5).slice(0, count);
}

function fillPlanningTimeout(game: Game) {
    const missionManager = new MissionManager(game);
    const requiredTeamSize = missionManager.getRequiredTeamSize();
    const expedition =
        game.expedition.length === requiredTeamSize
            ? game.expedition
            : pickRandomPlayers(game.players, requiredTeamSize).map(
                  (player) => player.discordId,
              );

    missionManager.setExpedition(expedition);
    missionManager.beginVoting();
}

function fillVotingTimeout(game: Game) {
    const missionManager = new MissionManager(game);

    for (const player of game.players) {
        if (game.expeditionVotes[player.discordId]) continue;

        // Automated games remain random. In player-run games, a missing vote
        // becomes a deterministic rejection rather than impersonating a player.
        const vote =
            game.lobby.isBotLobby && Math.random() < 0.5
                ? "approve"
                : "reject";
        missionManager.castExpeditionVote(player.discordId, vote);
    }

    const votes = { ...game.expeditionVotes };
    return { votes, ...resolveExpeditionVote(missionManager) };
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
    game.phaseTimerVersion++;
    if (game.phaseTimer) {
        clearTimeout(game.phaseTimer);
        game.phaseTimer = null;
    }
    if (game.phaseWarningTimer) {
        clearTimeout(game.phaseWarningTimer);
        game.phaseWarningTimer = null;
    }

    game.phaseTimerEndsAt = null;
    game.actionWindowActive = false;
}

export function actionWindowIsOpen(game: Game) {
    return (
        game.timerSettings.actionTimeSeconds === 0 || game.actionWindowActive
    );
}

function phaseLabel(game: Game) {
    return game.phase === "SELECTION"
        ? "mission selection"
        : game.phase === "VOTING"
          ? "approval voting"
          : game.phase === "MISSION"
            ? "mission decisions"
            : "Sealing";
}

async function resolvePhase(
    client: Client,
    currentGame: Game,
    scheduledPhase: Game["phase"],
) {
    if (currentGame.phase !== scheduledPhase) return;

    currentGame.phaseTimer = null;
    currentGame.actionWindowActive = false;
    currentGame.phaseStage = "discussion";
    let logMessage = "";

    if (currentGame.phase === "SELECTION") {
        fillPlanningTimeout(currentGame);
        logMessage = `⏱️ Mission selection closed. <@${new MissionManager(currentGame).getLeader()?.discordId}> proposed: ${currentGame.expedition.map((playerId) => `<@${playerId}>`).join(", ")}.`;
    } else if (currentGame.phase === "VOTING") {
        const voteResult = fillVotingTimeout(currentGame);
        logMessage = `⏱️ Approval voting closed. ${voteResult.approvalPassed ? "Mission plan approved." : `Mission plan rejected. Next leader: <@${new MissionManager(currentGame).getLeader()?.discordId}>.`}`;
    } else if (currentGame.phase === "MISSION") {
        const missionResult = fillMissionTimeout(currentGame);
        logMessage = `⏱️ Mission ${missionResult.data.missionNumber} resolved ${missionResult.data.success ? "successfully" : "as a failure"}.`;
    } else if (currentGame.phase === "SEALING") {
        fillSealingTimeout(currentGame);
        logMessage = "⏱️ Sealing timed out; the Sorcerers win.";
    }

    // Phase progression must never wait on the optional log-thread request.
    scheduleMissionTimer(client, currentGame);
    await updateMissionMessage(currentGame);
    if (logMessage) void postGameLog(currentGame, logMessage);
    if (scheduledPhase === "MISSION")
        await publishPendingMissionReveals(currentGame);
    await publishRoundResult(currentGame);
}

export function scheduleMissionTimer(client: Client, game: Game) {
    clearMissionTimer(game);
    const timerVersion = game.phaseTimerVersion;

    // Keep the phase that this timer belongs to. `game.phase` is mutable, so
    // reading it from inside the callback would not identify a stale timer.
    const scheduledPhase = game.phase;

    const seconds =
        game.phase === "SELECTION"
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
        clearPhaseChatLocks(client, game);
        return;
    }

    game.actionWindowActive = game.timerSettings.actionTimeSeconds === 0;
    game.phaseStage = game.actionWindowActive ? "action" : "discussion";
    clearPhaseVoiceMutes(client, game);
    clearPhaseChatLocks(client, game);
    game.phaseTimerEndsAt = Date.now() + seconds * 1000;
    const discussionEndsAt = game.phaseTimerEndsAt;

    if (game.timerSettings.actionTimeSeconds > 0 && seconds > 10) {
        game.phaseWarningTimer = setTimeout(
            () => {
                void (async () => {
                    if (
                        game.phaseTimerVersion !== timerVersion ||
                        game.phase !== scheduledPhase ||
                        game.actionWindowActive
                    )
                        return;
                    const channel = await client.channels.fetch(game.channelId);
                    if (
                        channel?.isSendable() &&
                        game.phaseTimerVersion === timerVersion &&
                        game.phase === scheduledPhase &&
                        !game.actionWindowActive
                    ) {
                        const warning = await channel.send({
                            content: `⏳ Discussion ends in 10 seconds. Get ready for ${phaseLabel(game)}.`,
                        });
                        const deleteAfter = Math.max(
                            0,
                            discussionEndsAt - Date.now(),
                        );
                        setTimeout(() => {
                            void warning.delete().catch(() => undefined);
                        }, deleteAfter);
                    }
                })().catch((error: unknown) => reportTimerError(game, error));
            },
            (seconds - 10) * 1000,
        );
    }

    const timer = setTimeout(() => {
        void (async () => {
            const currentGame = client.gameRegistry.getGame(game.channelId);

            if (
                !currentGame ||
                currentGame !== game ||
                currentGame.phaseTimerVersion !== timerVersion ||
                currentGame.phase !== scheduledPhase
            ) {
                return;
            }

            const actionTime = currentGame.timerSettings.actionTimeSeconds;
            const supportsActionTime =
                currentGame.phase !== "SEALING" && actionTime > 0;
            if (!supportsActionTime)
                return resolvePhase(client, currentGame, scheduledPhase);

            currentGame.actionWindowActive = true;
            currentGame.phaseStage = "action";
            currentGame.phaseTimerEndsAt = Date.now() + actionTime * 1000;
            schedulePhaseVoiceMutes(client, currentGame, actionTime);
            currentGame.phaseTimer = setTimeout(() => {
                void (async () => {
                    const activeGame = client.gameRegistry.getGame(
                        currentGame.channelId,
                    );
                    if (
                        activeGame === currentGame &&
                        activeGame.phaseTimerVersion === timerVersion &&
                        activeGame.phase === scheduledPhase &&
                        activeGame.actionWindowActive
                    ) {
                        await resolvePhase(client, activeGame, scheduledPhase);
                    }
                })().catch((error: unknown) =>
                    reportTimerError(currentGame, error),
                );
            }, actionTime * 1000);
            await updateMissionMessage(currentGame);
        })().catch((error: unknown) => reportTimerError(game, error));
    }, seconds * 1000);

    game.phaseTimer = timer;
}

export function buildMissionSnapshot(game: Game) {
    return buildMissionView(game);
}

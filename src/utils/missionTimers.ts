import type { Client } from "discord.js";
import type Game from "../game/Game.js";
import MissionManager from "../game/managers/MissionManager.js";
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

import { clearPhaseChatLocks, schedulePhaseChatLocks } from "./missionChat.js";
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
    return game.phase === "PLANNING"
        ? "expedition selection"
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
    currentGame.phaseTimer = null;
    currentGame.actionWindowActive = false;
    if (currentGame.phase === "PLANNING") {
        fillPlanningTimeout(currentGame);
        await postGameLog(
            currentGame,
            `⏱️ Expedition selection closed. <@${currentGame.players[0]?.discordId}> proposed: ${currentGame.expedition.map((playerId) => `<@${playerId}>`).join(", ")}.`,
        );
    } else if (currentGame.phase === "VOTING") {
        const voteResult = fillVotingTimeout(currentGame);
        await postGameLog(
            currentGame,
            `⏱️ Approval voting closed. ${voteResult.approvalPassed ? "Expedition approved." : `Expedition rejected. Next leader: <@${currentGame.players[0]?.discordId}>.`}`,
        );
    } else if (currentGame.phase === "MISSION") {
        const missionResult = fillMissionTimeout(currentGame);
        await postGameLog(
            currentGame,
            `⏱️ Mission ${missionResult.data.missionNumber} resolved ${missionResult.data.success ? "successfully" : "as a failure"}.`,
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
    if (scheduledPhase === "MISSION")
        await publishPendingMissionReveals(currentGame);
    await publishRoundResult(currentGame);
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
        clearPhaseChatLocks(client, game);
        return;
    }

    game.actionWindowActive = game.timerSettings.actionTimeSeconds === 0;
    clearPhaseVoiceMutes(client, game);
    clearPhaseChatLocks(client, game);
    game.phaseTimerEndsAt = Date.now() + seconds * 1000;

    if (game.timerSettings.actionTimeSeconds > 0 && seconds > 10) {
        game.phaseWarningTimer = setTimeout(
            () => {
                void (async () => {
                    if (
                        game.phase !== scheduledPhase ||
                        game.actionWindowActive
                    )
                        return;
                    const channel = await client.channels.fetch(game.channelId);
                    if (channel?.isSendable()) {
                        await channel.send({
                            content: `⏳ Discussion ends in 10 seconds. Get ready for ${phaseLabel(game)}.`,
                        });
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
            currentGame.phaseTimerEndsAt = Date.now() + actionTime * 1000;
            schedulePhaseVoiceMutes(client, currentGame, actionTime);
            schedulePhaseChatLocks(client, currentGame, actionTime);
            await updateMissionMessage(currentGame);
            const channel = await client.channels.fetch(currentGame.channelId);
            if (channel?.isSendable()) {
                await channel.send({
                    content: `🔇 **Action time:** ${phaseLabel(currentGame)} is open for ${actionTime} seconds. Use the controls above or the matching slash command.`,
                    components: buildMissionView(currentGame).components,
                });
            }
            currentGame.phaseTimer = setTimeout(() => {
                void (async () => {
                    const activeGame = client.gameRegistry.getGame(
                        currentGame.channelId,
                    );
                    if (
                        activeGame === currentGame &&
                        activeGame.phase === scheduledPhase &&
                        activeGame.actionWindowActive
                    ) {
                        await resolvePhase(client, activeGame, scheduledPhase);
                    }
                })().catch((error: unknown) =>
                    reportTimerError(currentGame, error),
                );
            }, actionTime * 1000);
        })().catch((error: unknown) => reportTimerError(game, error));
    }, seconds * 1000);

    game.phaseTimer = timer;
}

export function buildMissionSnapshot(game: Game) {
    return buildMissionView(game);
}

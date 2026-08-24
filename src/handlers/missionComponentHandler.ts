import {
    type ButtonInteraction,
    type Client,
    MessageFlags,
    type StringSelectMenuInteraction,
} from "discord.js";
import type Game from "../game/Game.js";
import MissionManager from "../game/managers/MissionManager.js";
import type Player from "../game/Player.js";
import { EmbedCreator } from "../ui/EmbedCreator.js";
import {
    buildMissionComponents,
    buildPlanningComponents,
    buildSealingComponents,
    buildVotingComponents,
} from "../ui/MissionComponents.js";
import { postGameLog } from "../utils/gameChannels.js";
import * as logger from "../utils/logger.js";
import { publishRoundResult } from "../utils/missionDebug.js";
import { scheduleMissionTimer } from "../utils/missionTimers.js";

function isGamePlayer(
    game: { players: { discordId: string }[] },
    userId: string,
) {
    return game.players.some((player) => player.discordId === userId);
}

type MissionDecisionInteraction =
    | ButtonInteraction
    | StringSelectMenuInteraction;

async function _logNextLeaderIfPlanning(game: Game) {
    if (game.phase === "PLANNING") {
        await postGameLog(
            game,
            `🧭 Next expedition leader: <@${new MissionManager(game).getLeader()?.discordId}>.`,
        );
    }
}

async function handleMissionDecision(
    interaction: MissionDecisionInteraction,
    _client: Client,
    game: Game,
    missionManager: MissionManager,
    decision: "pass" | "fail",
) {
    if (game.phase !== "MISSION") {
        return interaction.reply({
            content: "The game is not in the mission phase.",
            flags: MessageFlags.Ephemeral,
        });
    }

    if (!game.expedition.includes(interaction.user.id)) {
        return interaction.reply({
            content: "Only expedition members can decide the mission.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const result = missionManager.castMissionVote(
        interaction.user.id,
        decision,
    );

    if (!result.success) {
        if (result.reason === "sorcerer_cannot_fail") {
            return interaction.reply({
                content: "Sorcerers can only vote to succeed.",
                flags: MessageFlags.Ephemeral,
            });
        }

        logger.warn(
            `Failed to record mission decision in ${interaction.channelId}`,
        );
        return interaction.reply({
            content: "Could not record your mission decision.",
            flags: MessageFlags.Ephemeral,
        });
    }

    // A log write can involve a network fetch and must not delay Discord's
    // three-second interaction acknowledgement.
    await interaction.deferUpdate();
    await postGameLog(
        game,
        `🎯 <@${interaction.user.id}> submitted a **${decision}** mission decision.`,
    );

    return interaction.editReply({
        embeds: [EmbedCreator.mission(game)],
        components: buildMissionComponents(game),
    });
}

export async function handleMissionButton(
    interaction: ButtonInteraction,
    client: Client,
) {
    if (
        interaction.customId !== "mission_decision_pass" &&
        interaction.customId !== "mission_decision_fail"
    ) {
        return interaction.reply({
            content: "Unknown mission action.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const game = client.gameRegistry.getGame(interaction.channelId);

    if (!game?.started) {
        return interaction.reply({
            content: "No active game exists here.",
            flags: MessageFlags.Ephemeral,
        });
    }

    return handleMissionDecision(
        interaction,
        client,
        game,
        new MissionManager(game),
        interaction.customId === "mission_decision_pass" ? "pass" : "fail",
    );
}

export async function handleMissionInteraction(
    interaction: StringSelectMenuInteraction,
    client: Client,
) {
    const game = client.gameRegistry.getGame(interaction.channelId);

    if (!game?.started) {
        return interaction.reply({
            content: "No active game exists here.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const missionManager = new MissionManager(game);

    if (interaction.customId === "mission_planning_select") {
        const leader = missionManager.getLeader();

        if (!leader || leader.discordId !== interaction.user.id) {
            return interaction.reply({
                content: "Only the mission-planning leader can choose the team.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (game.phase !== "PLANNING") {
            return interaction.reply({
                content: "The game is not in the mission-planning phase.",
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferUpdate();
        missionManager.setExpedition(interaction.values);

        await postGameLog(
            game,
            `🧭 Mission-planning leader <@${leader.discordId}> selected: ${interaction.values.map((playerId) => `<@${playerId}>`).join(", ")}.`,
        );

        if (
            game.timerSettings.skipTimerWhenReady &&
            interaction.values.length === missionManager.getRequiredTeamSize()
        ) {
            missionManager.beginVoting();
            scheduleMissionTimer(client, game);
            await postGameLog(
                game,
                `🧭 Mission plan submitted early; approval voting has started.`,
            );
        }

        return interaction.editReply({
            embeds: [EmbedCreator.mission(game)],
            components:
                game.phase === "VOTING"
                    ? buildVotingComponents()
                    : buildPlanningComponents(game),
        });
    }

    if (interaction.customId === "mission_vote_select") {
        if (game.phase !== "VOTING") {
            return interaction.reply({
                content: "The game is not in the voting phase.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!isGamePlayer(game, interaction.user.id)) {
            return interaction.reply({
                content: "Only players in the game can vote.",
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferUpdate();
        const vote = interaction.values[0] as "approve" | "reject";
        missionManager.castExpeditionVote(interaction.user.id, vote);
        await postGameLog(
            game,
            `🗳️ <@${interaction.user.id}> voted **${vote}** on the mission plan.`,
        );

        if (
            game.timerSettings.skipTimerWhenReady &&
            missionManager.allPlayersVoted()
        ) {
            if (missionManager.approvalPassed()) {
                missionManager.beginMission();
                await postGameLog(game, "🗳️ Mission plan approved early.");
            } else {
                missionManager.rotateLeader();
                missionManager.beginPlanning();
                await postGameLog(
                    game,
                    `🗳️ Mission plan rejected early. Next leader: <@${missionManager.getLeader()?.discordId}>.`,
                );
            }
            scheduleMissionTimer(client, game);
        }

        return interaction.editReply({
            embeds: [EmbedCreator.mission(game)],
            components:
                game.phase === "MISSION"
                    ? buildMissionComponents(game)
                    : game.phase === "PLANNING"
                      ? buildPlanningComponents(game)
                      : buildVotingComponents(),
        });
    }

    if (interaction.customId.startsWith("mission_power_select:")) {
        if (game.phase !== "MISSION") {
            return interaction.reply({
                content: "Powers can only be used during a mission.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const actorId = interaction.customId.slice(
            "mission_power_select:".length,
        );

        if (actorId !== interaction.user.id) {
            return interaction.reply({
                content: "Only the player with this power can use it.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const actor = game.players.find(
            (player: Player) => player.discordId === actorId,
        );
        const power = actor?.role?.power;

        if (!actor || !power?.target) {
            return interaction.reply({
                content: "This power is no longer available.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (power.uses < 1) {
            return interaction.reply({
                content: `${power.PowerName} has no uses remaining.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const target = game.players.find(
            (player: Player) => player.discordId === interaction.values[0],
        );

        if (!target) {
            return interaction.reply({
                content: "That player is no longer in this game.",
                flags: MessageFlags.Ephemeral,
            });
        }

        power.uses--;
        await interaction.deferUpdate();
        const outcome = power.target(actor, target);
        await postGameLog(
            game,
            `✨ <@${actor.discordId}> used **${power.PowerName}** on <@${target.discordId}>.`,
        );

        if (power.revealTiming === "after_mission") {
            game.pendingMissionReveals.push(`📌 ${outcome}`);
        } else if (
            power.revealTiming === "immediate" &&
            interaction.channel?.isSendable()
        ) {
            await interaction.channel.send({ content: `📌 ${outcome}` });
        } else {
            await interaction.followUp({
                content: outcome,
                flags: MessageFlags.Ephemeral,
            });
        }

        return interaction.message.edit({
            embeds: [EmbedCreator.mission(game)],
            components: buildMissionComponents(game),
        });
    }

    if (interaction.customId === "sealing_target_select") {
        if (game.phase !== "SEALING" || game.winnerAlignment) {
            return interaction.reply({
                content: "Sealing is no longer active.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (game.sealingAssassinId !== interaction.user.id) {
            return interaction.reply({
                content:
                    "Only the selected Curse can choose the Sealing target.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const result = missionManager.resolveSealingTarget(
            interaction.user.id,
            interaction.values[0],
        );

        if (!result.success) {
            return interaction.reply({
                content: "Could not resolve the Sealing target.",
                flags: MessageFlags.Ephemeral,
            });
        }

        scheduleMissionTimer(client, game);
        await interaction.deferUpdate();
        await postGameLog(
            game,
            `🔒 <@${interaction.user.id}> selected <@${interaction.values[0]}> as the Sealing target.`,
        );
        await publishRoundResult(game);

        return interaction.message.edit({
            embeds: [EmbedCreator.mission(game)],
            components: buildSealingComponents(game),
        });
    }

    return interaction.reply({
        content: "Unknown mission interaction.",
        flags: MessageFlags.Ephemeral,
    });
}

import type { ButtonInteraction, Client, StringSelectMenuInteraction } from "discord.js";
import type Game from "../game/Game.js";
import type Player from "../game/Player.js";
import MissionManager from "../game/managers/MissionManager.js";
import { EmbedCreator } from "../ui/EmbedCreator.js";
import {
    buildMissionComponents,
    buildPlanningComponents,
    buildSealingComponents,
    buildVotingComponents
} from "../ui/MissionComponents.js";
import * as logger from "../utils/logger.js";
import { scheduleMissionTimer } from "../utils/missionTimers.js";
import { publishPendingMissionReveals, publishRoundResult } from "../utils/missionDebug.js";
import { postGameLog } from "../utils/gameChannels.js";

function isGamePlayer(game: { players: { discordId: string }[] }, userId: string) {
	return game.players.some(player => player.discordId === userId);
}

type MissionDecisionInteraction = ButtonInteraction | StringSelectMenuInteraction;

function buildPostMissionComponents(game: Game) {
    return game.phase === "PLANNING"
        ? buildPlanningComponents(game)
        : game.phase === "SEALING"
            ? buildSealingComponents(game)
            : [];
}

async function logNextLeaderIfPlanning(game: Game) {
    if (game.phase === "PLANNING") {
        await postGameLog(game, `🧭 Next expedition leader: <@${new MissionManager(game).getLeader()?.discordId}>.`);
    }
}

async function handleMissionDecision(
    interaction: MissionDecisionInteraction,
    client: Client,
    game: Game,
    missionManager: MissionManager,
    decision: "pass" | "fail"
) {
    if (game.phase !== "MISSION") {
        return interaction.reply({ content: "The game is not in the mission phase.", ephemeral: true });
    }

    if (!game.expedition.includes(interaction.user.id)) {
        return interaction.reply({ content: "Only expedition members can decide the mission.", ephemeral: true });
    }

    const result = missionManager.castMissionVote(interaction.user.id, decision);

    if (!result.success) {
        if (result.reason === "sorcerer_cannot_fail") {
            return interaction.reply({ content: "Sorcerers can only vote to succeed.", ephemeral: true });
        }

        logger.warn(`Failed to record mission decision in ${interaction.channelId}`);
        return interaction.reply({ content: "Could not record your mission decision.", ephemeral: true });
    }

    await postGameLog(game, `🎯 <@${interaction.user.id}> submitted a **${decision}** mission decision.`);

    if (!missionManager.allExpeditionMembersVoted()) {
        return interaction.update({
            embeds: [EmbedCreator.mission(game)],
            components: buildMissionComponents(game)
        });
    }

    const resolution = missionManager.resolveMission();
    scheduleMissionTimer(client, game);
    await interaction.deferUpdate();

    if (interaction.channel?.isSendable()) {
        await interaction.channel.send({ embeds: [EmbedCreator.missionResult(
            resolution.data.missionNumber,
            resolution.data.success,
            resolution.data.fails,
            resolution.data.requiredFails,
            resolution.data.votes
        )] });
    }

    await postGameLog(
        game,
        `Mission ${resolution.data.missionNumber}: ${resolution.data.success ? "✅ succeeded" : "❌ failed"} (${resolution.data.fails} fail${resolution.data.fails === 1 ? "" : "s"}).`
    );
    await logNextLeaderIfPlanning(game);

    await publishPendingMissionReveals(game);
    await publishRoundResult(game);

    return interaction.message.edit({
        embeds: [EmbedCreator.mission(game)],
        components: buildPostMissionComponents(game)
    });
}

export async function handleMissionButton(interaction: ButtonInteraction, client: Client) {
    if (interaction.customId !== "mission_decision_pass" && interaction.customId !== "mission_decision_fail") {
        return interaction.reply({ content: "Unknown mission action.", ephemeral: true });
    }

    const game = client.gameRegistry.getGame(interaction.channelId);

    if (!game || !game.started) {
        return interaction.reply({ content: "No active game exists here.", ephemeral: true });
    }

    return handleMissionDecision(
        interaction,
        client,
        game,
        new MissionManager(game),
        interaction.customId === "mission_decision_pass" ? "pass" : "fail"
    );
}

export async function handleMissionInteraction(interaction: StringSelectMenuInteraction, client: Client) {
	const game = client.gameRegistry.getGame(interaction.channelId);

	if (!game || !game.started) {
		return interaction.reply({ content: "No active game exists here.", ephemeral: true });
	}

	const missionManager = new MissionManager(game);

	if (interaction.customId === "mission_planning_select") {
		const leader = missionManager.getLeader();

		if (!leader || leader.discordId !== interaction.user.id) {
			return interaction.reply({ content: "Only the mission leader can choose the expedition.", ephemeral: true });
		}

		if (game.phase !== "PLANNING") {
			return interaction.reply({ content: "The game is not in the planning phase.", ephemeral: true });
		}

		missionManager.setExpedition(interaction.values);

        await postGameLog(
            game,
            `🧭 Expedition leader <@${leader.discordId}> selected: ${interaction.values.map(playerId => `<@${playerId}>`).join(", ")}.`
        );

        if (interaction.values.length === missionManager.getRequiredTeamSize()) {
            missionManager.beginVoting();
            scheduleMissionTimer(client, game);

            await postGameLog(
                game,
                `🧭 Expedition leader <@${leader.discordId}> proposed: ${interaction.values.map(playerId => `<@${playerId}>`).join(", ")}.`
            );
		}

		return interaction.update({
			embeds: [EmbedCreator.mission(game)],
			components: game.phase === "PLANNING"
				? buildPlanningComponents(game)
				: buildVotingComponents()
		});
	}

	if (interaction.customId === "mission_vote_select") {
		if (game.phase !== "VOTING") {
			return interaction.reply({ content: "The game is not in the voting phase.", ephemeral: true });
		}

		if (!isGamePlayer(game, interaction.user.id)) {
			return interaction.reply({ content: "Only players in the game can vote.", ephemeral: true });
		}

		const vote = interaction.values[0] as "approve" | "reject";
		missionManager.castExpeditionVote(interaction.user.id, vote);
        await postGameLog(game, `🗳️ <@${interaction.user.id}> voted **${vote}** on the expedition.`);

		if (!missionManager.allPlayersVoted()) {
			return interaction.update({
				embeds: [EmbedCreator.mission(game)],
				components: buildVotingComponents()
			});
		}

		if (missionManager.approvalPassed()) {
            await postGameLog(
                game,
                `🗳️ Approval vote: ${Object.entries(game.expeditionVotes)
                    .map(([playerId, vote]) => `<@${playerId}> ${vote}`)
                    .join(", ")}. Expedition approved.`
            );
            missionManager.beginMission();
            scheduleMissionTimer(client, game);
            return interaction.update({
				embeds: [EmbedCreator.mission(game)],
				components: buildMissionComponents(game)
			});
		}

        await postGameLog(
            game,
            `🗳️ Approval vote: ${Object.entries(game.expeditionVotes)
                .map(([playerId, vote]) => `<@${playerId}> ${vote}`)
                .join(", ")}. Expedition rejected; next leader: <@${game.players[1]?.discordId ?? game.players[0]?.discordId}>.`
        );

        missionManager.rotateLeader();
        missionManager.beginPlanning();
        scheduleMissionTimer(client, game);

		return interaction.update({
			embeds: [EmbedCreator.mission(game)],
			components: buildPlanningComponents(game)
		});
	}

    if (interaction.customId.startsWith("mission_power_select:")) {
        if (game.phase !== "MISSION") {
            return interaction.reply({ content: "Powers can only be used during a mission.", ephemeral: true });
        }

        const actorId = interaction.customId.slice("mission_power_select:".length);

        if (actorId !== interaction.user.id) {
            return interaction.reply({ content: "Only the player with this power can use it.", ephemeral: true });
        }

        const actor = game.players.find((player: Player) => player.discordId === actorId);
        const power = actor?.role?.power;

        if (!actor || !power?.target) {
            return interaction.reply({ content: "This power is no longer available.", ephemeral: true });
        }

        if (power.uses < 1) {
            return interaction.reply({ content: `${power.PowerName} has no uses remaining.`, ephemeral: true });
        }

        const target = game.players.find((player: Player) => player.discordId === interaction.values[0]);

        if (!target) {
            return interaction.reply({ content: "That player is no longer in this game.", ephemeral: true });
        }

        power.uses--;
        await interaction.deferUpdate();
        const outcome = power.target(actor, target);
        await postGameLog(game, `✨ <@${actor.discordId}> used **${power.PowerName}** on <@${target.discordId}>.`);

        if (power.revealTiming === "after_mission") {
            game.pendingMissionReveals.push(`📌 ${outcome}`);
        } else if (power.revealTiming === "immediate" && interaction.channel?.isSendable()) {
            await interaction.channel.send({ content: `📌 ${outcome}` });
        } else {
            await interaction.followUp({ content: outcome, ephemeral: true });
        }

        return interaction.message.edit({
            embeds: [EmbedCreator.mission(game)],
            components: buildMissionComponents(game)
        });
	}

	if (interaction.customId === "sealing_target_select") {
        if (game.phase !== "SEALING" || game.winnerAlignment) {
            return interaction.reply({ content: "Sealing is no longer active.", ephemeral: true });
        }

        if (game.sealingAssassinId !== interaction.user.id) {
            return interaction.reply({ content: "Only the selected Curse can choose the Sealing target.", ephemeral: true });
        }

        const result = missionManager.resolveSealingTarget(interaction.user.id, interaction.values[0]);

        if (!result.success) {
            return interaction.reply({ content: "Could not resolve the Sealing target.", ephemeral: true });
        }

        scheduleMissionTimer(client, game);
        await interaction.deferUpdate();
        await postGameLog(game, `🔒 <@${interaction.user.id}> selected <@${interaction.values[0]}> as the Sealing target.`);
        await publishRoundResult(game);

        return interaction.message.edit({
            embeds: [EmbedCreator.mission(game)],
            components: buildSealingComponents(game)
        });
	}

	return interaction.reply({ content: "Unknown mission interaction.", ephemeral: true });
}

import { type Client, type StringSelectMenuInteraction } from "discord.js";
import MissionManager from "../game/managers/MissionManager.js";
import { EmbedCreator } from "../ui/EmbedCreator.js";
import {
    buildMissionComponents,
    buildPlanningComponents,
    buildVotingComponents
} from "../ui/MissionComponents.js";
import * as logger from "../utils/logger.js";

function isGamePlayer(game: { players: { discordId: string }[] }, userId: string) {
	return game.players.some(player => player.discordId === userId);
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

		if (interaction.values.length === missionManager.getRequiredTeamSize()) {
			missionManager.beginVoting();
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

		if (!missionManager.allPlayersVoted()) {
			return interaction.update({
				embeds: [EmbedCreator.mission(game)],
				components: buildVotingComponents()
			});
		}

		if (missionManager.approvalPassed()) {
			missionManager.beginMission();
			return interaction.update({
				embeds: [EmbedCreator.mission(game)],
				components: buildMissionComponents()
			});
		}

		missionManager.rotateLeader();
		missionManager.beginPlanning();

		return interaction.update({
			embeds: [EmbedCreator.mission(game)],
			components: buildPlanningComponents(game)
		});
	}

	if (interaction.customId === "mission_decision_select") {
		if (game.phase !== "MISSION") {
			return interaction.reply({ content: "The game is not in the mission phase.", ephemeral: true });
		}

		if (!game.expedition.includes(interaction.user.id)) {
			return interaction.reply({ content: "Only expedition members can decide the mission.", ephemeral: true });
		}

		const decision = interaction.values[0] as "pass" | "fail";
		const result = missionManager.castMissionVote(interaction.user.id, decision);

		if (!result.success) {
			logger.warn(`Failed to record mission decision in ${interaction.channelId}`);
			return interaction.reply({ content: "Could not record your mission decision.", ephemeral: true });
		}

		if (!missionManager.allExpeditionMembersVoted()) {
			return interaction.update({
				embeds: [EmbedCreator.mission(game)],
				components: buildMissionComponents()
			});
		}

		missionManager.resolveMission();

		return interaction.update({
			embeds: [EmbedCreator.mission(game)],
			components: game.phase === "PLANNING"
				? buildPlanningComponents(game)
				: []
		});
	}

	return interaction.reply({ content: "Unknown mission interaction.", ephemeral: true });
}
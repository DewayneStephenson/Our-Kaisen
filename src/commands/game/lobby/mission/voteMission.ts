import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";

import MissionManager from "../../../../game/managers/MissionManager.js";
import { findActiveGame } from "../../../../game/services/GameAccess.js";
import MissionCoordinator from "../../../../game/services/MissionCoordinator.js";
import { refreshMissionMessage } from "../../../../utils/missionDebug.js";

function parseVoteValue(value: string) {
    const normalized = value.trim().toLowerCase();

    if (normalized === "approve" || normalized === "reject") {
        return normalized;
    }

    return null;
}

export default {
    data: new SlashCommandBuilder()
        .setName("vote_mission")
        .setDescription("Vote to approve or reject the mission team")
        .addStringOption((option) =>
            option
                .setName("vote")
                .setDescription("Approve or reject")
                .addChoices(
                    { name: "Approve", value: "approve" },
                    { name: "Reject", value: "reject" },
                )
                .setRequired(true),
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const access = findActiveGame(client, interaction.channelId, "player");
        if (!access.success) {
            return interaction.reply({
                content: "No active player-run game exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }
        const { game } = access;

        if (game.phase !== "VOTING") {
            return interaction.reply({
                content: "The game must be in voting before votes can be cast.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const missionManager = new MissionManager(game);
        const vote = parseVoteValue(
            interaction.options.getString("vote", true),
        );
        if (!vote) {
            return interaction.reply({
                content: "Vote must be approve or reject.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const voteResult = missionManager.castExpeditionVote(
            interaction.user.id,
            vote,
        );
        if (!voteResult.success) {
            return interaction.reply({
                content: "Only players in this game can vote.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (
            game.timerSettings.skipTimerWhenReady &&
            missionManager.allPlayersVoted()
        ) {
            new MissionCoordinator(client, game).resolveApproval();
        }

        await refreshMissionMessage(interaction, game);

        return interaction.reply({
            content: "Recorded the mission vote.",
            flags: MessageFlags.Ephemeral,
        });
    },
};

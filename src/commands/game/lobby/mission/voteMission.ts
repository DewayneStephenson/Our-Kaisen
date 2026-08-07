import {
    MessageFlags,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client,
} from "discord.js";

import MissionManager from "../../../../game/managers/MissionManager.js";
import {
    actionWindowIsOpen,
    scheduleMissionTimer,
} from "../../../../utils/missionTimers.js";
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
        .setDescription("Cast votes for the human mission")
        .addStringOption((option) =>
            option
                .setName("mode")
                .setDescription("Vote randomly or manually")
                .addChoices(
                    { name: "Random", value: "random" },
                    { name: "Manual", value: "manual" },
                )
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("vote")
                .setDescription("approve or reject")
                .setRequired(false),
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game || !game.started || game.lobby.isBotLobby) {
            return interaction.reply({
                content: "No started human game exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (game.phase !== "VOTING") {
            return interaction.reply({
                content: "The game must be in voting before votes can be cast.",
                flags: MessageFlags.Ephemeral,
            });
        }
        if (!actionWindowIsOpen(game)) {
            return interaction.reply({
                content: "Wait for action time to begin.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const missionManager = new MissionManager(game);
        const mode = interaction.options.getString("mode", true);
        const phaseBeforeVote = game.phase;

        if (mode === "manual") {
            const voteInput = interaction.options.getString("vote");

            if (!voteInput) {
                return interaction.reply({
                    content: "Provide approve or reject.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const vote = parseVoteValue(voteInput);

            if (!vote) {
                return interaction.reply({
                    content: "Vote must be approve or reject.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            missionManager.castExpeditionVote(interaction.user.id, vote);
        } else {
            const vote = Math.random() < 0.5 ? "approve" : "reject";
            missionManager.castExpeditionVote(interaction.user.id, vote);
        }

        if (
            game.timerSettings.actionTimeSeconds === 0 &&
            missionManager.allPlayersVoted()
        ) {
            if (missionManager.approvalPassed()) {
                missionManager.beginMission();
            } else {
                missionManager.rotateLeader();
                missionManager.beginPlanning();
            }
        }

        if (game.phase !== phaseBeforeVote) {
            scheduleMissionTimer(client, game);
        }
        await refreshMissionMessage(interaction, game);

        return interaction.reply({
            content: "Recorded the mission vote.",
            flags: MessageFlags.Ephemeral,
        });
    },
};

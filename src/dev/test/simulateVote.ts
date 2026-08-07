import {
    PermissionFlagsBits,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags
} from "discord.js";

import Player from "../../game/Player.js";
import MissionManager, { type ExpeditionVote, type MissionVote } from "../../game/managers/MissionManager.js";
import { findPlayerByToken, refreshMissionMessage } from "../../utils/missionDebug.js";

function getManualVoteValue(phase: "VOTING" | "MISSION", value: string): ExpeditionVote | MissionVote | null {
    const normalized = value.trim().toLowerCase();

    if (phase === "VOTING") {
        if (normalized === "approve" || normalized === "reject") {
            return normalized;
        }

        return null;
    }

    if (normalized === "pass" || normalized === "fail") {
        return normalized;
    }

    return null;
}

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("simulate_vote")
        .setDescription("Simulate bot approval votes or mission votes")
        .addStringOption(option =>
            option
                .setName("mode")
                .setDescription("Vote randomly or choose manually")
                .addChoices(
                    { name: "Random", value: "random" },
                    { name: "Manual", value: "manual" }
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("target")
                .setDescription("Vote for every eligible bot or one specific bot")
                .addChoices(
                    { name: "Every eligible bot", value: "all" },
                    { name: "Specific bot", value: "specific" }
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("bot")
                .setDescription("Bot name, number, or id when targeting a specific bot")
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName("vote")
                .setDescription("approve/reject for voting or pass/fail for mission")
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game || !game.started || !game.lobby.isBotLobby) {
            return interaction.reply({
                content: "No started bot game exists in this channel.",
                flags: MessageFlags.Ephemeral
            });
        }

        const mode = interaction.options.getString("mode", true);
        const target = interaction.options.getString("target", true);
        const botToken = interaction.options.getString("bot");
        const manualVote = interaction.options.getString("vote");
        const missionManager = new MissionManager(game);

        if (game.phase !== "VOTING" && game.phase !== "MISSION") {
            return interaction.reply({
                content: "The game must be in voting or mission before simulating votes.",
                flags: MessageFlags.Ephemeral
            });
        }

        const eligiblePlayers = game.phase === "VOTING"
            ? game.players
            : game.players.filter((player: Player) => game.expedition.includes(player.discordId));

        if (!eligiblePlayers.length) {
            return interaction.reply({
                content: "There are no eligible players to vote.",
                flags: MessageFlags.Ephemeral
            });
        }

        let selectedPlayers = eligiblePlayers;

        if (target === "specific") {
            if (!botToken) {
                return interaction.reply({
                    content: "Provide a bot name, number, or id.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const player = findPlayerByToken(game, botToken);

            if (!player || !eligiblePlayers.some((candidate: Player) => candidate.discordId === player.discordId)) {
                return interaction.reply({
                    content: `No eligible bot matched \"${botToken}\".`,
                    flags: MessageFlags.Ephemeral
                });
            }

            selectedPlayers = [player];
        }

        if (mode === "manual") {
            if (!manualVote) {
                return interaction.reply({
                    content: "Provide a vote value.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const voteValue = getManualVoteValue(game.phase, manualVote);

            if (!voteValue) {
                return interaction.reply({
                    content: game.phase === "VOTING"
                        ? "Use approve or reject in voting phase."
                        : "Use pass or fail in mission phase.",
                    flags: MessageFlags.Ephemeral
                });
            }

            for (const player of selectedPlayers) {
                if (game.phase === "VOTING") {
                    missionManager.castExpeditionVote(player.discordId, voteValue as ExpeditionVote);
                } else {
                    missionManager.castMissionVote(player.discordId, voteValue as MissionVote);
                }
            }
        } else {
            for (const player of selectedPlayers) {
                if (game.phase === "VOTING") {
                    const vote: ExpeditionVote = Math.random() < 0.5 ? "approve" : "reject";
                    missionManager.castExpeditionVote(player.discordId, vote);
                } else {
                    const vote: MissionVote = player.role?.alignment === "Curse" && player.role.canFail
                        ? "fail"
                        : "pass";
                    missionManager.castMissionVote(player.discordId, vote);
                }
            }
        }

        await refreshMissionMessage(interaction, game);

        return interaction.reply({
            content: `Simulated ${selectedPlayers.length} ${game.phase === "VOTING" ? "approval" : "mission"} vote(s).`,
            flags: MessageFlags.Ephemeral
        });
    }
};
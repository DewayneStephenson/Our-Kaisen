import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import MissionManager, {
    type ExpeditionVote,
    type MissionVote,
} from "../../game/managers/MissionManager.js";
import type Player from "../../game/Player.js";
import { EmbedCreator } from "../../ui/EmbedCreator.js";
import {
    findPlayerByToken,
    publishPendingMissionReveals,
    publishRoundResult,
    refreshMissionMessage,
} from "../../utils/missionDebug.js";
import { scheduleMissionTimer } from "../../utils/missionTimers.js";

function getManualVoteValue(
    phase: "VOTING" | "MISSION",
    value: string,
): ExpeditionVote | MissionVote | null {
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
        .addSubcommand((subcommand) =>
            subcommand
                .setName("random_all")
                .setDescription("Randomly vote for every eligible bot"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("random_bot")
                .setDescription("Randomly vote for one bot")
                .addStringOption((option) =>
                    option
                        .setName("bot")
                        .setDescription("Bot name, number, or id")
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("manual_all")
                .setDescription("Give every eligible bot the same vote")
                .addStringOption((option) =>
                    option
                        .setName("vote")
                        .setDescription("approve/reject or pass/fail")
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("manual_bot")
                .setDescription("Give one bot a specific vote")
                .addStringOption((option) =>
                    option
                        .setName("bot")
                        .setDescription("Bot name, number, or id")
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("vote")
                        .setDescription("approve/reject or pass/fail")
                        .setRequired(true),
                ),
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game?.started || !game.lobby.isBotLobby) {
            return interaction.reply({
                content: "No started bot game exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const mode = interaction.options.getSubcommand();
        const isManual = mode.startsWith("manual");
        const targetsAllBots = mode.endsWith("all");
        const botToken = interaction.options.getString("bot");
        const manualVote = interaction.options.getString("vote");
        const missionManager = new MissionManager(game);

        if (game.phase !== "VOTING" && game.phase !== "MISSION") {
            return interaction.reply({
                content:
                    "The game must be in voting or mission before simulating votes.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const eligiblePlayers =
            game.phase === "VOTING"
                ? game.players
                : game.players.filter((player: Player) =>
                      game.expedition.includes(player.discordId),
                  );

        if (!eligiblePlayers.length) {
            return interaction.reply({
                content: "There are no eligible players to vote.",
                flags: MessageFlags.Ephemeral,
            });
        }

        let selectedPlayers = eligiblePlayers;

        if (!targetsAllBots) {
            if (!botToken) {
                return interaction.reply({
                    content: "Provide a bot name, number, or id.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const player = findPlayerByToken(game, botToken);

            if (
                !player ||
                !eligiblePlayers.some(
                    (candidate: Player) =>
                        candidate.discordId === player.discordId,
                )
            ) {
                return interaction.reply({
                    content: `No eligible bot matched "${botToken}".`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            selectedPlayers = [player];
        }

        if (isManual) {
            if (!manualVote) {
                return interaction.reply({
                    content: "Provide a vote value.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const voteValue = getManualVoteValue(game.phase, manualVote);

            if (!voteValue) {
                return interaction.reply({
                    content:
                        game.phase === "VOTING"
                            ? "Use approve or reject in voting phase."
                            : "Use pass or fail in mission phase.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            for (const player of selectedPlayers) {
                if (game.phase === "VOTING") {
                    missionManager.castExpeditionVote(
                        player.discordId,
                        voteValue as ExpeditionVote,
                    );
                } else {
                    missionManager.castMissionVote(
                        player.discordId,
                        voteValue as MissionVote,
                    );
                }
            }
        } else {
            for (const player of selectedPlayers) {
                if (game.phase === "VOTING") {
                    const vote: ExpeditionVote =
                        Math.random() < 0.5 ? "approve" : "reject";
                    missionManager.castExpeditionVote(player.discordId, vote);
                } else {
                    const vote: MissionVote =
                        player.role?.alignment === "Curse" &&
                        player.role.canFail
                            ? "fail"
                            : "pass";
                    missionManager.castMissionVote(player.discordId, vote);
                }
            }
        }

        let missionResult: ReturnType<MissionManager["resolveMission"]> | null =
            null;

        if (game.phase === "VOTING" && missionManager.allPlayersVoted()) {
            if (missionManager.approvalPassed()) {
                missionManager.beginMission();
            } else {
                missionManager.rotateLeader();
                missionManager.beginPlanning();
            }
            scheduleMissionTimer(client, game);
        } else if (
            game.phase === "MISSION" &&
            missionManager.allExpeditionMembersVoted()
        ) {
            missionResult = missionManager.resolveMission();
            scheduleMissionTimer(client, game);
        }

        if (missionResult && interaction.channel?.isSendable()) {
            await interaction.channel.send({
                embeds: [
                    EmbedCreator.missionResult(
                        missionResult.data.missionNumber,
                        missionResult.data.success,
                        missionResult.data.fails,
                        missionResult.data.requiredFails,
                        missionResult.data.votes,
                    ),
                ],
            });
        }

        await refreshMissionMessage(interaction, game);
        if (missionResult) {
            await publishPendingMissionReveals(game);
        }
        await publishRoundResult(game);

        return interaction.reply({
            content: `Simulated ${selectedPlayers.length} ${game.phase === "VOTING" ? "approval" : "mission"} vote(s).`,
            flags: MessageFlags.Ephemeral,
        });
    },
};

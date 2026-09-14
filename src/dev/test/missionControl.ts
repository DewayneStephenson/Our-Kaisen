import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import type Game from "../../game/Game.js";
import type {
    ExpeditionVote,
    MissionVote,
} from "../../game/managers/MissionManager.js";
import type Player from "../../game/Player.js";
import { findActiveGame } from "../../game/services/GameAccess.js";
import MissionCoordinator from "../../game/services/MissionCoordinator.js";
import {
    findPlayerByToken,
    pickRandomPlayers,
    publishPendingMissionReveals,
    publishRoundResult,
    refreshMissionMessage,
} from "../../utils/missionDebug.js";

function findBot(game: Game, token: string | null) {
    return token ? findPlayerByToken(game, token) : null;
}

function randomApproval(): ExpeditionVote {
    return Math.random() < 0.5 ? "approve" : "reject";
}

function randomMissionVote(player: Player): MissionVote {
    return player.role.alignment === "Curse" &&
        player.role.canFail &&
        Math.random() < 0.5
        ? "fail"
        : "pass";
}

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("mission_control")
        .setDescription("Supply bot actions and immediately resolve each phase")
        .addSubcommand((command) =>
            command
                .setName("selection")
                .setDescription("Randomly select the mission team")
                .addStringOption((option) =>
                    option
                        .setName("bot")
                        .setDescription("Optional bot that must be on the team"),
                ),
        )
        .addSubcommand((command) =>
            command
                .setName("approval")
                .setDescription("Fill all approval votes")
                .addStringOption((option) =>
                    option
                        .setName("bot")
                        .setDescription("Optional bot whose vote is overridden"),
                )
                .addStringOption((option) =>
                    option
                        .setName("choice")
                        .setDescription("Optional vote override")
                        .addChoices(
                            { name: "Approve", value: "approve" },
                            { name: "Reject", value: "reject" },
                        ),
                ),
        )
        .addSubcommand((command) =>
            command
                .setName("mission")
                .setDescription("Fill all mission decisions")
                .addStringOption((option) =>
                    option
                        .setName("bot")
                        .setDescription("Optional bot whose decision is overridden"),
                )
                .addStringOption((option) =>
                    option
                        .setName("choice")
                        .setDescription("Optional decision override")
                        .addChoices(
                            { name: "Pass", value: "pass" },
                            { name: "Fail", value: "fail" },
                        ),
                ),
        )
        .addSubcommand((command) =>
            command
                .setName("sealing")
                .setDescription("Resolve the sealing target")
                .addStringOption((option) =>
                    option
                        .setName("bot")
                        .setDescription("Optional target; omit for random"),
                ),
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const access = findActiveGame(
            client,
            interaction.channelId,
            "automated",
        );
        if (!access.success) {
            return interaction.reply({
                content: "No active automated game was found for this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }
        const { game } = access;

        const action = interaction.options.getSubcommand();
        const botToken = interaction.options.getString("bot");
        const overrideBot = findBot(game, botToken);
        if (botToken && !overrideBot) {
            return interaction.reply({
                content: `No bot matched "${botToken}".`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const coordinator = new MissionCoordinator(client, game);
        const { manager } = coordinator;

        if (action === "selection") {
            if (game.phase !== "SELECTION") {
                return interaction.reply({
                    content: "The game is not accepting a mission team right now.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const required = manager.getRequiredTeamSize();
            const pool = overrideBot
                ? game.players.filter(
                      (player) => player.discordId !== overrideBot.discordId,
                  )
                : game.players;
            const selected = pickRandomPlayers(
                pool,
                required - (overrideBot ? 1 : 0),
            );
            if (overrideBot) selected.unshift(overrideBot);

            const result = manager.setExpedition(
                selected.map((player) => player.discordId),
            );
            if (!result.success) {
                return interaction.reply({
                    content: `Selection failed: ${result.reason.replaceAll("_", " ")}.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            coordinator.beginApproval();
        } else if (action === "approval") {
            if (game.phase !== "VOTING") {
                return interaction.reply({
                    content: "The game is not accepting approval votes right now.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const choice = interaction.options.getString("choice") as
                | ExpeditionVote
                | null;
            for (const player of game.players) {
                const vote =
                    choice &&
                    (!overrideBot ||
                        overrideBot.discordId === player.discordId)
                        ? choice
                        : randomApproval();
                manager.castExpeditionVote(player.discordId, vote);
            }
            coordinator.resolveApproval();
        } else if (action === "mission") {
            if (game.phase !== "MISSION") {
                return interaction.reply({
                    content: "The game is not accepting mission decisions right now.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const choice = interaction.options.getString("choice") as
                | MissionVote
                | null;
            for (const playerId of game.expedition) {
                const player = game.players.find(
                    (candidate) => candidate.discordId === playerId,
                );
                if (!player) continue;

                let vote: MissionVote = randomMissionVote(player);
                if (choice) {
                    // A manual mission outcome is deterministic: the selected
                    // bot receives the override and every other bot passes. If
                    // no bot is selected, all bots receive the choice where legal.
                    const requestedVote =
                        !overrideBot || overrideBot.discordId === player.discordId
                            ? choice
                            : "pass";
                    vote =
                        requestedVote === "fail" &&
                        player.role.alignment !== "Curse"
                            ? "pass"
                            : requestedVote;
                }
                manager.castMissionVote(player.discordId, vote);
            }
            coordinator.resolveMission();
            await publishPendingMissionReveals(game);
        } else {
            if (game.phase !== "SEALING" || game.winnerAlignment) {
                return interaction.reply({
                    content: "Sealing is not active right now.",
                    flags: MessageFlags.Ephemeral,
                });
            }
            if (overrideBot?.discordId === game.sealingAssassinId) {
                return interaction.reply({
                    content: "The sealing actor cannot target themselves.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const candidates = game.players.filter(
                (player) => player.discordId !== game.sealingAssassinId,
            );
            const target =
                overrideBot ??
                candidates[Math.floor(Math.random() * candidates.length)];
            if (!target || !game.sealingAssassinId) {
                return interaction.reply({
                    content: "No valid sealing target is available.",
                    flags: MessageFlags.Ephemeral,
                });
            }
            coordinator.resolveSealing(
                game.sealingAssassinId,
                target.discordId,
            );
        }

        await refreshMissionMessage(interaction, game);
        await publishRoundResult(game);
        return interaction.reply({
            content: `Bot input applied. Current phase: ${game.phase}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};

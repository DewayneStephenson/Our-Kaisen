import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import { findActiveGame } from "../../game/services/GameAccess.js";
import MissionCoordinator from "../../game/services/MissionCoordinator.js";
import {
    findPlayerByToken,
    publishRoundResult,
    refreshMissionMessage,
} from "../../utils/missionDebug.js";

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("simulate_sealing")
        .setDescription("Simulate the selected Curse choosing a Sealing target")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("random")
                .setDescription("Choose a random target"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("manual")
                .setDescription("Choose a target manually")
                .addStringOption((option) =>
                    option
                        .setName("bot")
                        .setDescription("Bot name, number, or id")
                        .setRequired(true),
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
                content: "No started bot game exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }
        const { game } = access;

        if (
            game.phase !== "SEALING" ||
            game.winnerAlignment ||
            !game.sealingAssassinId
        ) {
            return interaction.reply({
                content: "There is no active Sealing selection.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const target =
            interaction.options.getSubcommand() === "random"
                ? game.players[Math.floor(Math.random() * game.players.length)]
                : findPlayerByToken(
                      game,
                      interaction.options.getString("bot", true),
                  );

        if (!target) {
            return interaction.reply({
                content: "No matching bot was found.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const result = new MissionCoordinator(client, game).resolveSealing(
            game.sealingAssassinId,
            target.discordId,
        );

        if (!result.success) {
            return interaction.reply({
                content: "Could not resolve the Sealing target.",
                flags: MessageFlags.Ephemeral,
            });
        }

        await refreshMissionMessage(interaction, game);
        await publishRoundResult(game);

        return interaction.reply({
            content: `Simulated Sealing target: ${target.username}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};

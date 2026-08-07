import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import MissionManager from "../../game/managers/MissionManager.js";
import {
    findPlayerByToken,
    publishRoundResult,
    refreshMissionMessage,
} from "../../utils/missionDebug.js";
import { scheduleMissionTimer } from "../../utils/missionTimers.js";

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
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game?.started || !game.lobby.isBotLobby) {
            return interaction.reply({
                content: "No started bot game exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

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

        const result = new MissionManager(game).resolveSealingTarget(
            game.sealingAssassinId,
            target.discordId,
        );

        if (!result.success) {
            return interaction.reply({
                content: "Could not resolve the Sealing target.",
                flags: MessageFlags.Ephemeral,
            });
        }

        scheduleMissionTimer(client, game);
        await refreshMissionMessage(interaction, game);
        await publishRoundResult(game);

        return interaction.reply({
            content: `Simulated Sealing target: ${target.username}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};

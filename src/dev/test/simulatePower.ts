import {
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";
import type Player from "../../game/Player.js";
import { findPlayerByToken, refreshMissionMessage } from "../../utils/missionDebug.js";

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("simulate_power")
        .setDescription("Simulate a bot using a targeted power")
        .addSubcommand(subcommand => subcommand
            .setName("random")
            .setDescription("Use a power on a random bot"))
        .addSubcommand(subcommand => subcommand
            .setName("manual")
            .setDescription("Use a power on a selected bot")
            .addStringOption(option => option
                .setName("bot")
                .setDescription("Bot name, number, or id")
                .setRequired(true))),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game?.started || !game.lobby.isBotLobby) {
            return interaction.reply({ content: "No started bot game exists in this channel.", flags: MessageFlags.Ephemeral });
        }

        if (game.phase !== "MISSION") {
            return interaction.reply({ content: "Powers can only be simulated during a mission.", flags: MessageFlags.Ephemeral });
        }

        const actor = game.players.find((player: Player) =>
            game.lobby.botNames.has(player.discordId) && player.role?.power?.target && player.role.power.uses > 0);
        const power = actor?.role.power;

        if (!actor || !power?.target) {
            return interaction.reply({ content: "No bot has a targeted power with uses remaining.", flags: MessageFlags.Ephemeral });
        }

        const candidates = game.players.filter((player: Player) => player.discordId !== actor.discordId);
        const mode = interaction.options.getSubcommand();
        const target = mode === "random"
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : findPlayerByToken(game, interaction.options.getString("bot", true));

        if (!target || !candidates.some((player: Player) => player.discordId === target.discordId)) {
            return interaction.reply({ content: "Choose another bot in this game.", flags: MessageFlags.Ephemeral });
        }

        power.uses--;
        await refreshMissionMessage(interaction, game);
        const outcome = power.target(actor, target);

        if (power.revealTiming === "after_mission") {
            game.pendingMissionReveals.push(`📌 ${outcome}`);
            return interaction.reply({ content: `${power.PowerName} was used; its result will be revealed after the mission.`, flags: MessageFlags.Ephemeral });
        }

        return interaction.reply({ content: outcome, flags: MessageFlags.Ephemeral });
    }
};

import {
    PermissionFlagsBits,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags
} from "discord.js";

import Player from "../../game/Player.js";
import MissionManager from "../../game/managers/MissionManager.js";
import { findPlayerByToken, pickRandomPlayers, refreshMissionMessage } from "../../utils/missionDebug.js";

function parseTokens(input: string) {
    return input
        .split(/[,\n;]/)
        .map(token => token.trim())
        .filter(Boolean);
}

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("simulate_expedition")
        .setDescription("Simulate bot expedition selection in planning")
        .addStringOption(option =>
            option
                .setName("mode")
                .setDescription("Choose expedition randomly or manually")
                .addChoices(
                    { name: "Random", value: "random" },
                    { name: "Manual", value: "manual" }
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("bots")
                .setDescription("Comma-separated bot names, numbers, or ids for manual selection")
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

        if (game.phase !== "PLANNING") {
            return interaction.reply({
                content: "The game must be in planning before selecting an expedition.",
                flags: MessageFlags.Ephemeral
            });
        }

        const mode = interaction.options.getString("mode", true);
        const missionManager = new MissionManager(game);
        const requiredTeamSize = missionManager.getRequiredTeamSize();

        let selectedPlayers;

        if (mode === "random") {
            selectedPlayers = pickRandomPlayers(game.players, requiredTeamSize);
        } else {
            const botTokens = interaction.options.getString("bots");

            if (!botTokens) {
                return interaction.reply({
                    content: "Provide a comma-separated list of bot names, numbers, or ids.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const tokens = parseTokens(botTokens);
            const uniquePlayers: string[] = [];

            for (const token of tokens) {
                const player = findPlayerByToken(game, token);

                if (!player) {
                    return interaction.reply({
                        content: `No bot matched \"${token}\".`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (!uniquePlayers.includes(player.discordId)) {
                    uniquePlayers.push(player.discordId);
                }
            }

            if (uniquePlayers.length !== requiredTeamSize) {
                return interaction.reply({
                    content: `The expedition must contain exactly ${requiredTeamSize} unique bot(s).`,
                    flags: MessageFlags.Ephemeral
                });
            }

            selectedPlayers = uniquePlayers
                .map(playerId => game.players.find((player: Player) => player.discordId === playerId))
                .filter((player): player is Player => player !== undefined);
        }

        missionManager.setExpedition(selectedPlayers.map(player => player.discordId));
        missionManager.beginVoting();

        await refreshMissionMessage(interaction, game);

        return interaction.reply({
            content: `Selected expedition: ${selectedPlayers.map(player => player.username).join(", ")}.`,
            flags: MessageFlags.Ephemeral
        });
    }
};
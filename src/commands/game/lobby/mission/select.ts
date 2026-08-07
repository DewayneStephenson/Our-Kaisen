import {
    MessageFlags,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";

import Player from "../../../../game/Player.js";
import MissionManager from "../../../../game/managers/MissionManager.js";
import { actionWindowIsOpen, scheduleMissionTimer } from "../../../../utils/missionTimers.js";
import { refreshMissionMessage } from "../../../../utils/missionDebug.js";

function parseTokens(input: string) {
    return input.split(/[,\n;]/).map(token => token.trim()).filter(Boolean);
}

export default {
    data: new SlashCommandBuilder()
        .setName("select_expedition")
        .setDescription("Select the expedition for the human game")
        .addStringOption(option =>
            option
                .setName("mode")
                .setDescription("Choose randomly or manually")
                .addChoices(
                    { name: "Random", value: "random" },
                    { name: "Manual", value: "manual" }
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("players")
                .setDescription("Comma-separated player names or ids for manual mode")
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game || !game.started || game.lobby.isBotLobby) {
            return interaction.reply({
                content: "No started human game exists in this channel.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (game.phase !== "PLANNING") {
            return interaction.reply({
                content: "The game must be in planning before selecting an expedition.",
                flags: MessageFlags.Ephemeral
            });
        }
        if (!actionWindowIsOpen(game)) {
            return interaction.reply({
                content: "Wait for action time to begin.",
                flags: MessageFlags.Ephemeral
            });
        }

        const missionManager = new MissionManager(game);
        const mode = interaction.options.getString("mode", true);
        const requiredTeamSize = missionManager.getRequiredTeamSize();

        let selectedIds: string[] = [];

        if (mode === "random") {
            selectedIds = [...game.players].sort(() => Math.random() - 0.5).slice(0, requiredTeamSize).map(player => player.discordId);
        } else {
            const playerTokens = interaction.options.getString("players");

            if (!playerTokens) {
                return interaction.reply({
                    content: "Provide a comma-separated list of player names or ids.",
                    flags: MessageFlags.Ephemeral
                });
            }

            for (const token of parseTokens(playerTokens)) {
                const matchedPlayer = game.players.find((player: Player) =>
                    player.discordId.toLowerCase() === token.toLowerCase() ||
                    player.username.toLowerCase() === token.toLowerCase()
                );

                if (!matchedPlayer) {
                    return interaction.reply({
                        content: `No player matched \"${token}\".`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (!selectedIds.includes(matchedPlayer.discordId)) {
                    selectedIds.push(matchedPlayer.discordId);
                }
            }
        }

        if (selectedIds.length !== requiredTeamSize) {
            return interaction.reply({
                content: `The expedition must contain exactly ${requiredTeamSize} players.`,
                flags: MessageFlags.Ephemeral
            });
        }

        missionManager.setExpedition(selectedIds);
        if (game.timerSettings.actionTimeSeconds > 0) {
            await refreshMissionMessage(interaction, game);
            return interaction.reply({
                content: "Selected the expedition. It will be submitted when action time ends.",
                flags: MessageFlags.Ephemeral
            });
        }
        missionManager.beginVoting();
        scheduleMissionTimer(client, game);
        await refreshMissionMessage(interaction, game);

        return interaction.reply({
            content: "Selected the expedition and advanced to voting.",
            flags: MessageFlags.Ephemeral
        });
    }
};

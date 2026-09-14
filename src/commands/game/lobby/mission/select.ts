import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import MissionManager from "../../../../game/managers/MissionManager.js";
import type Player from "../../../../game/Player.js";
import { findActiveGame } from "../../../../game/services/GameAccess.js";
import MissionCoordinator from "../../../../game/services/MissionCoordinator.js";
import { refreshMissionMessage } from "../../../../utils/missionDebug.js";

function parseTokens(input: string) {
    return input
        .split(/[,\n;]/)
        .map((token) => token.trim())
        .filter(Boolean);
}

export default {
    data: new SlashCommandBuilder()
        .setName("select_mission_plan")
        .setDescription("Select the mission team")
        .addStringOption((option) =>
            option
                .setName("players")
                .setDescription("Comma-separated player names or IDs")
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

        if (game.phase !== "SELECTION") {
            return interaction.reply({
                content:
                    "The game must be in selection before selecting a team.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const missionManager = new MissionManager(game);
        const requiredTeamSize = missionManager.getRequiredTeamSize();
        const selectedIds: string[] = [];
        const playerTokens = interaction.options.getString("players", true);

        for (const token of parseTokens(playerTokens)) {
            const matchedPlayer = game.players.find(
                (player: Player) =>
                    player.discordId.toLowerCase() === token.toLowerCase() ||
                    player.username.toLowerCase() === token.toLowerCase(),
            );

            if (!matchedPlayer) {
                return interaction.reply({
                    content: `No player matched "${token}".`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (!selectedIds.includes(matchedPlayer.discordId)) {
                selectedIds.push(matchedPlayer.discordId);
            }
        }

        if (selectedIds.length !== requiredTeamSize) {
            return interaction.reply({
            content: `The mission plan must contain exactly ${requiredTeamSize} players.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        missionManager.setExpedition(selectedIds);
        if (game.timerSettings.skipTimerWhenReady) {
            new MissionCoordinator(client, game).beginApproval();
        }
        await refreshMissionMessage(interaction, game);

        return interaction.reply({
            content: game.timerSettings.skipTimerWhenReady
                ? "Mission plan selected; approval voting has started."
                : "Mission plan saved. You can revise it until the phase ends.",
            flags: MessageFlags.Ephemeral,
        });
    },
};

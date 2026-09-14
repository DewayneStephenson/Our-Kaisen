import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import MissionManager from "../../../../game/managers/MissionManager.js";
import { findActiveGame } from "../../../../game/services/GameAccess.js";
import { refreshMissionMessage } from "../../../../utils/missionDebug.js";

export default {
    data: new SlashCommandBuilder()
        .setName("mission")
        .setDescription("Submit your mission decision")
        .addStringOption((option) =>
            option
                .setName("decision")
                .setDescription("Choose whether the mission succeeds or fails")
                .addChoices(
                    { name: "Succeed", value: "pass" },
                    { name: "Fail", value: "fail" },
                )
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
        if (game.phase !== "MISSION") {
            return interaction.reply({
                content: "The game is not in the mission phase.",
                flags: MessageFlags.Ephemeral,
            });
        }
        if (!game.expedition.includes(interaction.user.id)) {
            return interaction.reply({
                content: "Only expedition members can decide the mission.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const manager = new MissionManager(game);
        const decision = interaction.options.getString("decision", true) as
            | "pass"
            | "fail";
        const result = manager.castMissionVote(interaction.user.id, decision);
        if (!result.success) {
            return interaction.reply({
                content:
                    result.reason === "sorcerer_cannot_fail"
                        ? "Sorcerers can only vote to succeed."
                        : "Could not record your decision.",
                flags: MessageFlags.Ephemeral,
            });
        }

        await refreshMissionMessage(interaction, game);
        return interaction.reply({
            content:
                "Mission decision recorded. A later submission replaces your earlier one.",
            flags: MessageFlags.Ephemeral,
        });
    },
};

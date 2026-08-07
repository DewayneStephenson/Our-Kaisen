import {
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";

import { EmbedCreator } from "../../../ui/EmbedCreator.js";

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Configure lobby timer settings")
        .addIntegerOption(option =>
            option.setName("mission_selection")
                .setDescription("Seconds for the leader to select an expedition")
                .setMinValue(5)
                .setMaxValue(300)
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName("voting")
                .setDescription("Seconds for approval voting")
                .setMinValue(5)
                .setMaxValue(300)
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName("mission")
                .setDescription("Seconds for mission decision")
                .setMinValue(5)
                .setMaxValue(300)
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.reply({
                content: "No lobby exists in this channel.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (lobby.host !== interaction.user.id) {
            return interaction.reply({
                content: "Only the lobby host can change settings.",
                flags: MessageFlags.Ephemeral
            });
        }

        const missionSelection = interaction.options.getInteger("mission_selection");
        const voting = interaction.options.getInteger("voting");
        const mission = interaction.options.getInteger("mission");

        if (missionSelection !== null) {
            lobby.timerSettings.missionSelectionSeconds = missionSelection;
        }

        if (voting !== null) {
            lobby.timerSettings.votingSeconds = voting;
        }

        if (mission !== null) {
            lobby.timerSettings.missionSeconds = mission;
        }

        const embed = EmbedCreator.lobby(lobby);

        if (lobby.message) {
            await lobby.message.edit({ embeds: [embed] });
        }

        return interaction.reply({
            content: "Updated lobby timer settings.",
            flags: MessageFlags.Ephemeral
        });
    }
};
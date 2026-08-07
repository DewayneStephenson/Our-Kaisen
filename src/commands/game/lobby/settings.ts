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
        )
        .addIntegerOption(option =>
            option.setName("sealing")
                .setDescription("Seconds for the Curse to choose a Sealing target")
                .setMinValue(5)
                .setMaxValue(300)
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName("mute_window")
                .setDescription("Seconds to mute at the start and end of planning/voting")
                .setMinValue(0)
                .setMaxValue(60)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("title")
                .setDescription("Optional title for the game channels")
                .setMaxLength(80)
                .setRequired(false)
        )
        .addBooleanOption(option => option
            .setName("phase_mute")
            .setDescription("Enable voice muting during protected phase windows")
            .setRequired(false)
        )
        .addBooleanOption(option => option
            .setName("phase_chat_lock")
            .setDescription("Prevent chat during protected phase windows")
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
        const sealing = interaction.options.getInteger("sealing");
        const muteWindow = interaction.options.getInteger("mute_window");
        const title = interaction.options.getString("title");
        const phaseMute = interaction.options.getBoolean("phase_mute");
        const phaseChatLock = interaction.options.getBoolean("phase_chat_lock");

        if (missionSelection !== null) {
            lobby.timerSettings.missionSelectionSeconds = missionSelection;
        }

        if (voting !== null) {
            lobby.timerSettings.votingSeconds = voting;
        }

        if (mission !== null) {
            lobby.timerSettings.missionSeconds = mission;
        }

        if (sealing !== null) {
            lobby.timerSettings.sealingSeconds = sealing;
        }

        if (muteWindow !== null) {
            lobby.timerSettings.voiceMuteWindowSeconds = muteWindow;
        }

        if (title !== null) {
            lobby.title = title.trim() || null;
        }

        if (phaseMute !== null) lobby.timerSettings.phaseMuteEnabled = phaseMute;
        if (phaseChatLock !== null) lobby.timerSettings.phaseChatLockEnabled = phaseChatLock;

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

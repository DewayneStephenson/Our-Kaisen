import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";

import { EmbedCreator } from "../../../ui/EmbedCreator.js";

export default {
    data: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Configure lobby timer settings")
        .addIntegerOption((option) =>
            option
                .setName("mission_selection")
                .setDescription(
                    "Seconds for the leader to create the mission plan",
                )
                .setMinValue(5)
                .setMaxValue(300)
                .setRequired(false),
        )
        .addIntegerOption((option) =>
            option
                .setName("voting")
                .setDescription("Seconds for approval voting")
                .setMinValue(5)
                .setMaxValue(300)
                .setRequired(false),
        )
        .addIntegerOption((option) =>
            option
                .setName("mission")
                .setDescription("Seconds for mission decision")
                .setMinValue(5)
                .setMaxValue(300)
                .setRequired(false),
        )
        .addIntegerOption((option) =>
            option
                .setName("sealing")
                .setDescription(
                    "Seconds for the Curse to choose a Sealing target",
                )
                .setMinValue(5)
                .setMaxValue(300)
                .setRequired(false),
        )
        .addIntegerOption((option) =>
            option
                .setName("action_time")
                .setDescription(
                    "Muted action time after discussion ends (0 keeps immediate phases)",
                )
                .setMinValue(0)
                .setMaxValue(60)
                .setRequired(false),
        )
        .addStringOption((option) =>
            option
                .setName("title")
                .setDescription("Optional title for the game channels")
                .setMaxLength(80)
                .setRequired(false),
        )
        .addBooleanOption((option) =>
            option
                .setName("phase_mute")
                .setDescription(
                    "Enable voice muting during protected phase windows",
                )
                .setRequired(false),
        )
        .addBooleanOption((option) =>
            option
                .setName("skip_when_ready")
                .setDescription(
                    "Advance immediately when a phase has all required actions",
                )
                .setRequired(false),
        )
        .addBooleanOption((option) =>
            option
                .setName("phase_chat_lock")
                .setDescription("Prevent chat during protected phase windows")
                .setRequired(false),
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.reply({
                content: "No lobby exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (lobby.host !== interaction.user.id) {
            return interaction.reply({
                content: "Only the lobby host can change settings.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const missionSelection =
            interaction.options.getInteger("mission_selection");
        const voting = interaction.options.getInteger("voting");
        const mission = interaction.options.getInteger("mission");
        const sealing = interaction.options.getInteger("sealing");
        const actionTime = interaction.options.getInteger("action_time");
        const title = interaction.options.getString("title");
        const phaseMute = interaction.options.getBoolean("phase_mute");
        const phaseChatLock = interaction.options.getBoolean("phase_chat_lock");
        const skipWhenReady = interaction.options.getBoolean("skip_when_ready");

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

        if (actionTime !== null) {
            lobby.timerSettings.actionTimeSeconds = actionTime;
        }

        if (title !== null) {
            lobby.title = title.trim() || null;
        }

        if (phaseMute !== null)
            lobby.timerSettings.phaseMuteEnabled = phaseMute;
        if (phaseChatLock !== null)
            lobby.timerSettings.phaseChatLockEnabled = phaseChatLock;
        if (skipWhenReady !== null)
            lobby.timerSettings.skipTimerWhenReady = skipWhenReady;

        const embed = EmbedCreator.lobby(lobby);

        if (lobby.message) {
            await lobby.message.edit({ embeds: [embed] });
        }

        return interaction.reply({
            content: "Updated lobby timer settings.",
            flags: MessageFlags.Ephemeral,
        });
    },
};

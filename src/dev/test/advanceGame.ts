import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import MissionManager from "../../game/managers/MissionManager.js";
import {
    publishRoundResult,
    refreshMissionMessage,
} from "../../utils/missionDebug.js";
import { scheduleMissionTimer } from "../../utils/missionTimers.js";

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("advance_game")
        .setDescription("Advance the bot game to the next phase"),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game?.started || !game.lobby.isBotLobby) {
            return interaction.reply({
                content: "No started bot game exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const missionManager = new MissionManager(game);

        if (game.phase === "PLANNING") {
            const requiredTeamSize = missionManager.getRequiredTeamSize();

            if (game.expedition.length !== requiredTeamSize) {
                return interaction.reply({
                    content: `The expedition must contain ${requiredTeamSize} players before advancing.`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            missionManager.beginVoting();
        } else if (game.phase === "VOTING") {
            if (!missionManager.allPlayersVoted()) {
                return interaction.reply({
                    content: "Not all approval votes have been cast yet.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (missionManager.approvalPassed()) {
                missionManager.beginMission();
            } else {
                missionManager.rotateLeader();
                missionManager.beginPlanning();
            }
        } else if (game.phase === "MISSION") {
            if (!missionManager.allExpeditionMembersVoted()) {
                return interaction.reply({
                    content:
                        "Not all expedition members have cast a mission vote yet.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            missionManager.resolveMission();
        } else if (game.phase === "SEALING") {
            return interaction.reply({
                content: "All missions are already complete.",
                flags: MessageFlags.Ephemeral,
            });
        } else {
            return interaction.reply({
                content: "Use /start_bot first to move the game into planning.",
                flags: MessageFlags.Ephemeral,
            });
        }

        scheduleMissionTimer(client, game);
        await refreshMissionMessage(interaction, game);
        await publishRoundResult(game);

        return interaction.reply({
            content: `Advanced game state to ${game.phase}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};

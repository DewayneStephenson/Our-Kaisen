import {
    MessageFlags,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";

import MissionManager from "../../../../game/managers/MissionManager.js";
import { scheduleMissionTimer } from "../../../../utils/missionTimers.js";
import { refreshMissionMessage } from "../../../../utils/missionDebug.js";

export default {
    data: new SlashCommandBuilder()
        .setName("advance_mission")
        .setDescription("Advance the human game mission phase"),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game || !game.started || game.lobby.isBotLobby) {
            return interaction.reply({
                content: "No started human game exists in this channel.",
                flags: MessageFlags.Ephemeral
            });
        }

        const missionManager = new MissionManager(game);

        if (game.phase === "START") {
            missionManager.beginPlanning();
        } else if (game.phase === "PLANNING") {
            if (game.expedition.length !== missionManager.getRequiredTeamSize()) {
                return interaction.reply({
                    content: `The expedition must contain ${missionManager.getRequiredTeamSize()} players before advancing.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            missionManager.beginVoting();
        } else if (game.phase === "VOTING") {
            if (!missionManager.allPlayersVoted()) {
                return interaction.reply({
                    content: "Not all approval votes have been cast yet.",
                    flags: MessageFlags.Ephemeral
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
                    content: "Not all expedition members have cast a mission vote yet.",
                    flags: MessageFlags.Ephemeral
                });
            }

            missionManager.resolveMission();
        } else {
            return interaction.reply({
                content: "This game is already complete or not ready to advance.",
                flags: MessageFlags.Ephemeral
            });
        }

        scheduleMissionTimer(client, game);
        await refreshMissionMessage(interaction, game);

        return interaction.reply({
            content: `Advanced game state to ${game.phase}.`,
            flags: MessageFlags.Ephemeral
        });
    }
};
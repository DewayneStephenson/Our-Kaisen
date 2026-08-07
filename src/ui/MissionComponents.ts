import {
    ActionRowBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import Game from "../game/Game.js";
import { getMissionTeamSizes } from "../game/managers/MissionManager.js";

export function buildPlanningComponents(game: Game) {
    const missionIndex = game.missionResults.findIndex(result => result === null);
    const requiredTeamSize = getMissionTeamSizes(game.players.length)[missionIndex] ?? 0;

    if (!requiredTeamSize) {
        return [];
    }

    const options = game.players.map(player => ({
        label: player.username,
        value: player.discordId,
        description: game.lobby.botNames.has(player.discordId)
            ? game.lobby.botNames.get(player.discordId) ?? player.username
            : undefined,
        default: game.expedition.includes(player.discordId)
    }));

    return [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("mission_planning_select")
                .setPlaceholder(`Select ${requiredTeamSize} players for the expedition`)
                .setMinValues(1)
                .setMaxValues(requiredTeamSize)
                .addOptions(options)
        )
    ];
}

export function buildVotingComponents() {
    return [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("mission_vote_select")
                .setPlaceholder("Vote to approve or reject the expedition")
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions([
                    { label: "Approve", value: "approve" },
                    { label: "Reject", value: "reject" }
                ])
        )
    ];
}

export function buildMissionComponents() {
    return [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("mission_decision_select")
                .setPlaceholder("Choose the mission outcome")
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions([
                    { label: "Pass", value: "pass" },
                    { label: "Fail", value: "fail" }
                ])
        )
    ];
}
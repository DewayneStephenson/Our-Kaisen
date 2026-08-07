import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} from "discord.js";
import type Game from "../game/Game.js";
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

export function buildMissionComponents(game: Game) {
    const decisionButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("mission_decision_pass")
                .setLabel("Succeed")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("mission_decision_fail")
                .setLabel("Fail (Curses only)")
                .setStyle(ButtonStyle.Danger)
        );
    const powerRows = game.players
        .filter(player => player.role?.power?.target && player.role.power.uses > 0)
        .slice(0, 4)
        .map(player => new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`mission_power_select:${player.discordId}`)
                .setPlaceholder(`${player.role.power?.PowerName ?? "Power"}: choose a target`)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(game.players
                    .filter(target => target.discordId !== player.discordId)
                    .map(target => ({ label: target.username, value: target.discordId })))
        ));

    return [decisionButtons, ...powerRows];
}

export function buildSealingComponents(game: Game) {
    if (game.winnerAlignment || !game.sealingAssassinId) {
        return [];
    }

    return [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("sealing_target_select")
                .setPlaceholder("Sealing: choose the Honored One")
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(game.players.map(player => ({ label: player.username, value: player.discordId })))
        )
    ];
}

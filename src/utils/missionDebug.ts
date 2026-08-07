import type { ChatInputCommandInteraction } from "discord.js";
import Game from "../game/Game.js";
import Player from "../game/Player.js";
import MissionManager from "../game/managers/MissionManager.js";
import { EmbedCreator } from "../ui/EmbedCreator.js";
import {
    buildMissionComponents,
    buildPlanningComponents,
    buildVotingComponents
} from "../ui/MissionComponents.js";

export function findPlayerByToken(game: Game, token: string): Player | null {
    const normalizedToken = token.trim().toLowerCase();

    return game.players.find((player) => {
        const botName = game.lobby.botNames.get(player.discordId) ?? player.username;
        const normalizedName = botName.trim().toLowerCase();
        const shortName = normalizedName.replace(/^bot\s+/, "");
        const numberMatch = normalizedName.match(/^bot\s+(\d+)$/);

        return (
            player.discordId.toLowerCase() === normalizedToken ||
            normalizedName === normalizedToken ||
            shortName === normalizedToken ||
            (numberMatch !== null && numberMatch[1] === normalizedToken)
        );
    }) || null;
}

export function pickRandomPlayers(players: Player[], count: number): Player[] {
    return [...players]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
}

export function buildMissionView(game: Game) {
    const components =
        game.phase === "PLANNING"
            ? buildPlanningComponents(game)
            : game.phase === "VOTING"
                ? buildVotingComponents()
                : game.phase === "MISSION"
                    ? buildMissionComponents()
                    : [];

    return {
        embeds: [EmbedCreator.mission(game)],
        components
    };
}

export async function updateMissionMessage(game: Game) {
    const view = buildMissionView(game);

    if (game.lobby.message) {
        await game.lobby.message.edit(view);
    }
}

export async function refreshMissionMessage(interaction: ChatInputCommandInteraction, game: Game) {
    const view = buildMissionView(game);

    if (game.lobby.message) {
        await game.lobby.message.edit(view);
        return;
    }

    if (interaction.channel?.isSendable()) {
        await interaction.channel.send(view);
    }
}
import type { ChatInputCommandInteraction } from "discord.js";
import type Game from "../game/Game.js";
import type Player from "../game/Player.js";
import { EmbedCreator } from "../ui/EmbedCreator.js";
import {
    buildMissionComponents,
    buildPlanningComponents,
    buildSealingComponents,
    buildVotingComponents,
} from "../ui/MissionComponents.js";
import {
    postGameLog,
    postGameResult,
    scheduleGameCleanup,
} from "./gameChannels.js";

function playerLogLabel(game: Game, player: Player) {
    const botName = game.lobby.botNames.get(player.discordId);
    return botName ?? `${player.username} (<@${player.discordId}>)`;
}

export function findPlayerByToken(game: Game, token: string): Player | null {
    const normalizedToken = token.trim().toLowerCase();

    return (
        game.players.find((player) => {
            const botName =
                game.lobby.botNames.get(player.discordId) ?? player.username;
            const normalizedName = botName.trim().toLowerCase();
            const shortName = normalizedName.replace(/^bot\s+/, "");
            const numberMatch = normalizedName.match(/^bot\s+(\d+)$/);

            return (
                player.discordId.toLowerCase() === normalizedToken ||
                normalizedName === normalizedToken ||
                shortName === normalizedToken ||
                (numberMatch !== null && numberMatch[1] === normalizedToken)
            );
        }) || null
    );
}

export function pickRandomPlayers(players: Player[], count: number): Player[] {
    return [...players].sort(() => Math.random() - 0.5).slice(0, count);
}

export function buildMissionView(game: Game) {
    const components =
        game.phase === "PLANNING"
            ? buildPlanningComponents(game)
            : game.phase === "VOTING"
              ? buildVotingComponents()
              : game.phase === "MISSION"
                ? buildMissionComponents(game)
                : game.phase === "SEALING"
                  ? buildSealingComponents(game)
                  : [];

    return {
        embeds: [EmbedCreator.mission(game)],
        components,
    };
}

export async function updateMissionMessage(game: Game) {
    const view = buildMissionView(game);

    if (game.lobby.message) {
        await game.lobby.message.edit(view);
    }
}

export async function refreshMissionMessage(
    interaction: ChatInputCommandInteraction,
    game: Game,
) {
    const view = buildMissionView(game);

    if (game.lobby.message) {
        await game.lobby.message.edit(view);
        return;
    }

    if (interaction.channel?.isSendable()) {
        await interaction.channel.send(view);
    }
}

export async function publishRoundResult(game: Game) {
    if (
        game.roundResultAnnounced ||
        !game.winnerAlignment ||
        !game.lobby.message?.channel.isSendable()
    ) {
        return;
    }

    await game.lobby.message.channel.send({
        embeds: [EmbedCreator.roundResult(game)],
    });
    const missionHistory = game.missionResults
        .map((result, index) => {
            const votes =
                game.missionVoteResults[index]
                    ?.map((vote) => (vote === "pass" ? "succeed" : "fail"))
                    .join(", ") ?? "none";
            return `Mission ${index + 1}: ${result === true ? "succeeded" : result === false ? "failed" : "not played"} — votes: ${votes}`;
        })
        .join("\n");
    await postGameLog(
        game,
        `🏁 **${game.winnerAlignment}s win.**\n\n**Final player log**\n${game.players
            .map(
                (player) =>
                    `${playerLogLabel(game, player)} — ${player.role.roleName}; visible teammates: ${player.getVisibleTeammates(game.players).join(", ") || "none"}`,
            )
            .join("\n")}\n\n**Mission history**\n${missionHistory}`,
    );
    await postGameResult(
        game,
        `🏁 **${game.winnerAlignment}s win.**\n${game.players
            .map(
                (player) =>
                    `${playerLogLabel(game, player)} — ${player.role.roleName}`,
            )
            .join("\n")}\n\n${missionHistory}`,
    );
    scheduleGameCleanup(game.lobby.message.client, game);
    game.roundResultAnnounced = true;
}

export async function publishPendingMissionReveals(game: Game) {
    if (
        !game.pendingMissionReveals.length ||
        !game.lobby.message?.channel.isSendable()
    ) {
        return;
    }

    const reveals = game.pendingMissionReveals.splice(0);
    await game.lobby.message.channel.send({ content: reveals.join("\n") });
}

import type { ChatInputCommandInteraction, Client } from "discord.js";
import Game from "../game/Game.js";
import Player from "../game/Player.js";
import GameRoleManager from "../game/managers/GameRoleManager.js";
import MissionManager from "../game/managers/MissionManager.js";
import RoleManager, { type RoleKey } from "../lobby/LobbyRoleManager.js";
import Lobby from "../lobby/Lobby.js";
import { EmbedCreator } from "../ui/EmbedCreator.js";
import { buildPlanningComponents } from "../ui/MissionComponents.js";
import { scheduleMissionTimer } from "./missionTimers.js";
import { createGameChannels, postGameLog } from "./gameChannels.js";
import type { KaisenRole } from "../types/game.js";
import * as logger from "./logger.js";

type StartGameResult = {
    success: boolean;
    message: string;
};

function createGameRoles(roleKeys: RoleKey[]): KaisenRole[] {
    return roleKeys.map((roleKey) => {
        const RoleClass = RoleManager.ROLES[roleKey]
            .class as new () => KaisenRole;
        return new RoleClass();
    });
}

export async function startGameSession(
    interaction: ChatInputCommandInteraction,
    client: Client,
    lobby: Lobby,
): Promise<StartGameResult> {
    const gameResult = client.gameRegistry.createGame(
        interaction.channelId,
        interaction.user.id,
        lobby,
    );

    if (!gameResult.success || !gameResult.game) {
        let reason = "Unexpected error.";

        switch (gameResult.reason) {
            case "game_exists":
                reason = "A game already exists, wait for the next one.";
                break;
            case "not_host":
                reason = "You are not the host of the lobby.";
                break;
            case "min_players":
                reason = `You need at least 5 players, this lobby contains ${lobby.players.length}.`;
                break;
        }

        return { success: false, message: reason };
    }

    const game = gameResult.game;
    const participantIds = [...lobby.players];
    const players = participantIds.map((playerId) => {
        const username = client.lobbyManager.getUsername(playerId, lobby);
        return new Player(playerId, username);
    });

    game.roles = createGameRoles(lobby.roles);

    const roleManager = new GameRoleManager(game.roles);
    const assignmentResult = roleManager.assignRoles(players);

    if (!assignmentResult.success) {
        client.gameRegistry.deleteGame(interaction.channelId);
        return {
            success: false,
            message: "Failed to assign roles to players.",
        };
    }

    game.players = players;
    game.started = true;
    game.phase = "PLANNING";

    const missionManager = new MissionManager(game);
    missionManager.beginPlanning();

    let channelResult;
    try {
        channelResult = await createGameChannels(interaction, game);
    } catch (error) {
        client.gameRegistry.deleteGame(game.channelId);
        return {
            success: false,
            message: `Could not create game channels: ${error instanceof Error ? error.message : String(error)}`,
        };
    }

    if (!channelResult.success) {
        client.gameRegistry.deleteGame(game.channelId);
        return { success: false, message: channelResult.message };
    }

    let dmFailures = 0;

    for (const player of players) {
        const roleName = player.role?.roleName ?? "unknown role";

        if (lobby.botNames.has(player.discordId)) {
            logger.info(
                `[${interaction.channelId}] Bot ${player.username} (${player.discordId}) assigned ${roleName}`,
            );
            continue;
        }

        try {
            const user = await interaction.client.users.fetch(player.discordId);
            await user.send({
                embeds: [EmbedCreator.playerDM(game, player.discordId)],
            });
        } catch (error) {
            dmFailures++;
            logger.error(
                `[${interaction.channelId}] Failed to DM ${player.username} (${player.discordId}) with ${roleName}: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    scheduleMissionTimer(client, game);

    if (lobby.message) {
        try {
            await lobby.message.edit({
                content: `**${game.name}** (Game ID: \`${game.id}\`) moved to <#${channelResult.gameChannel.id}>.`,
                embeds: [],
                components: [],
            });
        } catch (error) {
            logger.error(
                `[${interaction.channelId}] Failed to update lobby message: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    lobby.message = await channelResult.gameChannel.send({
        embeds: [EmbedCreator.mission(game)],
        components:
            game.timerSettings.actionTimeSeconds === 0
                ? buildPlanningComponents(game)
                : [],
    });
    await postGameLog(
        game,
        `🎮 **${lobby.title ?? "Kaisen Game"}** started. First expedition leader: <@${missionManager.getLeader()?.discordId}>.`,
    );

    client.lobbyManager.deleteLobby(interaction.channelId);

    const message =
        dmFailures > 0
            ? `Game started. ${dmFailures} player DM(s) failed.`
            : "Game started. Roles have been distributed.";

    return { success: true, message };
}

import type { Client } from "discord.js";
import type Lobby from "../lobby/Lobby.js";
import { clearPhaseChatLocks } from "../utils/missionChat.js";
import { clearPhaseVoiceMutes } from "../utils/missionVoice.js";
import Game from "./Game.js";

export function clearGameRuntime(game: Game, client?: Client) {
    game.phaseTimerVersion++;

    if (game.cleanupTimer) clearTimeout(game.cleanupTimer);
    if (game.phaseTimer) clearTimeout(game.phaseTimer);
    if (game.phaseWarningTimer) clearTimeout(game.phaseWarningTimer);
    for (const timer of game.voiceMuteTimers) clearTimeout(timer);
    for (const timer of game.chatLockTimers) clearTimeout(timer);

    game.cleanupTimer = null;
    game.phaseTimer = null;
    game.phaseWarningTimer = null;
    game.phaseTimerEndsAt = null;
    game.actionWindowActive = false;
    game.voiceMuteTimers = [];
    game.chatLockTimers = [];

    if (client) {
        clearPhaseVoiceMutes(client, game);
        clearPhaseChatLocks(client, game);
    }
}

export default class GameRegistry {
    private readonly games = new Map<string, Game>();

    createGame(channelId: string, userId: string, lobby: Lobby) {
        if (this.games.has(channelId)) {
            return { success: false, reason: "game_exists", game: null };
        }

        if (lobby.host !== userId) {
            return { success: false, reason: "not_host", game: null };
        }
        if (lobby.players.length < 5) {
            return { success: false, reason: "min_players", game: null };
        }

        const game = new Game(channelId, lobby);
        this.games.set(channelId, game);
        return { success: true, game };
    }

    getGame(channelId: string) {
        return (
            this.games.get(channelId) ??
            [...this.games.values()].find(
                (game) =>
                    game.lobbyChannelId === channelId ||
                    game.voiceChannelId === channelId,
            ) ??
            null
        );
    }

    moveGameToChannel(game: Game, channelId: string) {
        this.games.delete(game.channelId);
        game.channelId = channelId;
        this.games.set(channelId, game);
    }

    deleteGame(channelId: string, client?: Client) {
        const game = this.games.get(channelId);
        if (game) clearGameRuntime(game, client);
        return this.games.delete(channelId);
    }

    get size() {
        return this.games.size;
    }
}

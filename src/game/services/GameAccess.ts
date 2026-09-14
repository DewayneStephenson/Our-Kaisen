import type { Client } from "discord.js";
import type Game from "../Game.js";

export type GameMode = "any" | "player" | "automated";

export type GameAccessResult =
    | { success: true; game: Game }
    | { success: false; reason: "no_active_game" | "wrong_game_mode" };

export function findActiveGame(
    client: Client,
    channelId: string,
    mode: GameMode = "any",
): GameAccessResult {
    const game = client.gameRegistry.getGame(channelId);
    if (!game?.started) return { success: false, reason: "no_active_game" };

    const modeMatches =
        mode === "any" ||
        (mode === "automated" && game.lobby.isBotLobby) ||
        (mode === "player" && !game.lobby.isBotLobby);

    return modeMatches
        ? { success: true, game }
        : { success: false, reason: "wrong_game_mode" };
}

import type { Client } from "discord.js";
import type Game from "../game/Game.js";

async function setChatLocked(client: Client, game: Game, locked: boolean) {
    const channel = await client.channels.fetch(game.channelId);
    if (!channel?.isTextBased() || !("permissionOverwrites" in channel)) return;
    await channel.permissionOverwrites.edit(
        channel.guild.roles.everyone.id,
        {
            SendMessages: !locked,
        },
        { reason: "Kaisen mission phase" },
    );
}

export function clearPhaseChatLocks(client: Client, game: Game) {
    for (const timer of game.chatLockTimers) clearTimeout(timer);
    game.chatLockTimers = [];
    void setChatLocked(client, game, false).catch(() => undefined);
}

export function schedulePhaseChatLocks(
    client: Client,
    game: Game,
    phaseSeconds: number,
) {
    clearPhaseChatLocks(client, game);
    if (!game.timerSettings.phaseChatLockEnabled) {
        void setChatLocked(client, game, false);
        return;
    }

    const lock = (locked: boolean) =>
        void setChatLocked(client, game, locked).catch(() => undefined);
    if (game.phase === "MISSION") return lock(true);
    if (game.phase !== "SELECTION" && game.phase !== "VOTING")
        return lock(false);

    const window = Math.min(game.timerSettings.actionTimeSeconds, phaseSeconds);
    if (window <= 0) return lock(false);
    lock(true);
    if (window < phaseSeconds)
        game.chatLockTimers.push(setTimeout(() => lock(false), window * 1000));
    if (phaseSeconds > window * 2)
        game.chatLockTimers.push(
            setTimeout(() => lock(true), (phaseSeconds - window) * 1000),
        );
}

import type { Client } from "discord.js";
import type Game from "../game/Game.js";
import * as logger from "./logger.js";

async function setGamePlayersMuted(client: Client, game: Game, muted: boolean) {
    if (game.lobby.isBotLobby) {
        return;
    }

    const channel = await client.channels.fetch(game.channelId);

    if (!channel?.isTextBased() || !("guild" in channel)) {
        return;
    }

    await Promise.all(
        game.players.map(async (player) => {
            try {
                const member = await channel.guild.members.fetch(
                    player.discordId,
                );

                if (
                    member.voice.channelId &&
                    member.voice.serverMute !== muted
                ) {
                    await member.voice.setMute(muted, "Kaisen mission phase");
                }
            } catch (error) {
                logger.warn(
                    `[${game.channelId}] Could not ${muted ? "mute" : "unmute"} ${player.username}: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }),
    );
}

function queueMuteUpdate(client: Client, game: Game, muted: boolean) {
    game.voiceMuteOperation = game.voiceMuteOperation
        .then(() => setGamePlayersMuted(client, game, muted))
        .catch((error) =>
            logger.error(
                `[${game.channelId}] Voice mute update failed: ${error instanceof Error ? error.message : String(error)}`,
            ),
        );
}

export function clearPhaseVoiceMutes(client: Client, game: Game) {
    for (const timer of game.voiceMuteTimers) {
        clearTimeout(timer);
    }

    game.voiceMuteTimers = [];
    queueMuteUpdate(client, game, false);
}

export function schedulePhaseVoiceMutes(
    client: Client,
    game: Game,
    _phaseSeconds: number,
) {
    clearPhaseVoiceMutes(client, game);

    if (!game.timerSettings.phaseMuteEnabled) {
        return;
    }

    // This is called only once the action/focus period starts. The next phase
    // clears the mute, so no competing mute/unmute timers are needed.
    queueMuteUpdate(client, game, true);
}

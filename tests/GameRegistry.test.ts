import assert from "node:assert/strict";
import { describe, it } from "node:test";
import GameRegistry from "../src/game/GameRegistry.js";
import Lobby from "../src/lobby/Lobby.js";

function lobby(channel: string, host = "host", playerCount = 5) {
    const result = new Lobby(channel);
    result.host = host;
    result.players = Array.from({ length: playerCount }, (_, index) =>
        index === 0 ? host : `player-${index}`,
    );
    return result;
}

describe("GameRegistry", () => {
    it("allows only the host to create a game", () => {
        const registry = new GameRegistry();
        const channel = "host-check";
        const result = registry.createGame(
            channel,
            "not-host",
            lobby(channel),
        );
        assert.deepEqual(result, {
            success: false,
            reason: "not_host",
            game: null,
        });
        assert.equal(registry.getGame(channel), null);
    });

    it("requires at least five players", () => {
        const registry = new GameRegistry();
        const channel = "minimum-check";
        const result = registry.createGame(
            channel,
            "host",
            lobby(channel, "host", 4),
        );
        assert.equal(result.success, false);
        assert.equal(result.reason, "min_players");
    });

    it("creates, retrieves, moves, and deletes a game", () => {
        const registry = new GameRegistry();
        const original = "original-channel";
        const destination = "destination-channel";
        const result = registry.createGame(original, "host", lobby(original));
        assert.equal(result.success, true);
        assert.equal(registry.getGame(original), result.game);

        if (!result.game) assert.fail("Expected game to be created");
        registry.moveGameToChannel(result.game, destination);
        assert.equal(registry.getGame(original), result.game);
        assert.equal(registry.getGame(destination), result.game);
        assert.equal(result.game.channelId, destination);
        assert.equal(registry.deleteGame(destination), true);
        assert.equal(registry.getGame(destination), null);
        assert.equal(registry.size, 0);
    });

    it("rejects a second game in the same channel", () => {
        const registry = new GameRegistry();
        const channel = "duplicate-channel";
        const first = registry.createGame(channel, "host", lobby(channel));
        const second = registry.createGame(channel, "host", lobby(channel));
        assert.equal(first.success, true);
        assert.equal(second.success, false);
        assert.equal(second.reason, "game_exists");
    });

    it("clears all runtime timers and timing state when deleting a game", () => {
        const registry = new GameRegistry();
        const channel = "timer-channel";
        const result = registry.createGame(channel, "host", lobby(channel));
        if (!result.game) assert.fail("Expected game to be created");

        result.game.cleanupTimer = setTimeout(() => {}, 60_000);
        result.game.phaseTimer = setTimeout(() => {}, 60_000);
        result.game.phaseWarningTimer = setTimeout(() => {}, 60_000);
        result.game.voiceMuteTimers = [setTimeout(() => {}, 60_000)];
        result.game.chatLockTimers = [setTimeout(() => {}, 60_000)];
        result.game.phaseTimerEndsAt = Date.now() + 60_000;
        result.game.actionWindowActive = true;
        const timerVersion = result.game.phaseTimerVersion;

        assert.equal(registry.deleteGame(channel), true);
        assert.equal(registry.getGame(channel), null);
        assert.equal(result.game.cleanupTimer, null);
        assert.equal(result.game.phaseTimer, null);
        assert.equal(result.game.phaseWarningTimer, null);
        assert.deepEqual(result.game.voiceMuteTimers, []);
        assert.deepEqual(result.game.chatLockTimers, []);
        assert.equal(result.game.phaseTimerEndsAt, null);
        assert.equal(result.game.actionWindowActive, false);
        assert.equal(result.game.phaseTimerVersion, timerVersion + 1);
    });
});

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
    createGame,
    deleteGame,
    getGame,
    moveGameToChannel,
} from "../src/game/GameRegistry.js";
import Lobby from "../src/lobby/Lobby.js";

const usedChannels = new Set<string>();

function lobby(channel: string, host = "host", playerCount = 5) {
    const result = new Lobby(channel);
    result.host = host;
    result.players = Array.from({ length: playerCount }, (_, index) =>
        index === 0 ? host : `player-${index}`,
    );
    usedChannels.add(channel);
    return result;
}

afterEach(() => {
    for (const channel of usedChannels) deleteGame(channel);
    usedChannels.clear();
});

describe("GameRegistry", () => {
    it("allows only the host to create a game", () => {
        const channel = "host-check";
        const result = createGame(channel, "not-host", lobby(channel));
        assert.deepEqual(result, {
            success: false,
            reason: "not_host",
            game: null,
        });
        assert.equal(getGame(channel), null);
    });

    it("requires at least five players", () => {
        const channel = "minimum-check";
        const result = createGame(channel, "host", lobby(channel, "host", 4));
        assert.equal(result.success, false);
        assert.equal(result.reason, "min_players");
    });

    it("creates, retrieves, moves, and deletes a game", () => {
        const original = "original-channel";
        const destination = "destination-channel";
        usedChannels.add(destination);
        const result = createGame(original, "host", lobby(original));
        assert.equal(result.success, true);
        assert.equal(getGame(original), result.game);

        if (!result.game) assert.fail("Expected game to be created");
        moveGameToChannel(result.game, destination);
        assert.equal(getGame(original), null);
        assert.equal(getGame(destination), result.game);
        assert.equal(result.game.channelId, destination);
        assert.equal(deleteGame(destination), true);
        assert.equal(getGame(destination), null);
    });

    it("rejects a second game in the same channel", () => {
        const channel = "duplicate-channel";
        const first = createGame(channel, "host", lobby(channel));
        const second = createGame(channel, "host", lobby(channel));
        assert.equal(first.success, true);
        assert.equal(second.success, false);
        assert.equal(second.reason, "game_exists");
    });

    it("clears a pending cleanup timer when deleting a game", () => {
        const channel = "timer-channel";
        const result = createGame(channel, "host", lobby(channel));
        if (!result.game) assert.fail("Expected game to be created");

        result.game.cleanupTimer = setTimeout(() => {}, 60_000);
        assert.equal(deleteGame(channel), true);
        assert.equal(getGame(channel), null);
    });
});

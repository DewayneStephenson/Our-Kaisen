import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Client } from "discord.js";
import Game from "../src/game/Game.js";
import GameRegistry from "../src/game/GameRegistry.js";
import Player from "../src/game/Player.js";
import { findActiveGame } from "../src/game/services/GameAccess.js";
import MissionCoordinator from "../src/game/services/MissionCoordinator.js";
import Lobby from "../src/lobby/Lobby.js";
import type { KaisenRole } from "../src/types/game.js";

const role: KaisenRole = {
    roleName: "Grade 2 Sorcerer",
    alignment: "Sorcerer",
    canFail: false,
    calculateTeammates: () => [],
};

function fixture(automated = true) {
    const lobby = new Lobby("lobby");
    lobby.isBotLobby = automated;
    const game = new Game("game", lobby);
    game.started = true;
    game.players = Array.from({ length: 5 }, (_, index) => {
        const player = new Player(String(index), `Player ${index}`);
        player.role = role;
        return player;
    });
    game.timerSettings = {
        ...game.timerSettings,
        missionSelectionSeconds: 0,
        votingSeconds: 0,
        missionSeconds: 0,
        sealingSeconds: 0,
    };
    const registry = new GameRegistry();
    const client = {
        gameRegistry: registry,
        channels: { fetch: async () => null },
    } as unknown as Client;
    return { client, game };
}

describe("game access coordinator", () => {
    it("distinguishes automated and player-run games", () => {
        const { game } = fixture(true);
        const client = {
            gameRegistry: { getGame: () => game },
        } as unknown as Client;

        assert.equal(findActiveGame(client, "game", "automated").success, true);
        assert.deepEqual(findActiveGame(client, "game", "player"), {
            success: false,
            reason: "wrong_game_mode",
        });
    });
});

describe("mission coordinator", () => {
    it("owns transitions and replaces the previous phase timer", () => {
        const { client, game } = fixture();
        const coordinator = new MissionCoordinator(client, game);
        coordinator.manager.beginSelection();
        coordinator.manager.setExpedition(["0", "1"]);
        const oldTimer = setTimeout(() => {}, 60_000);
        game.phaseTimer = oldTimer;
        const oldVersion = game.phaseTimerVersion;

        assert.deepEqual(coordinator.beginApproval(), { success: true });
        assert.equal(game.phase, "VOTING");
        assert.equal(game.phaseTimer, null);
        assert.ok(game.phaseTimerVersion > oldVersion);

        for (const player of game.players) {
            coordinator.manager.castExpeditionVote(player.discordId, "approve");
        }
        const approval = coordinator.resolveApproval();
        assert.equal(approval.success, true);
        assert.equal(game.phase, "MISSION");
    });
});

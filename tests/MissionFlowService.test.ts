import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Game from "../src/game/Game.js";
import Player from "../src/game/Player.js";
import MissionManager from "../src/game/managers/MissionManager.js";
import { resolveExpeditionVote } from "../src/game/services/MissionFlowService.js";
import Lobby from "../src/lobby/Lobby.js";
import type { KaisenRole } from "../src/types/game.js";

const sorcerer: KaisenRole = {
    roleName: "Grade 2 Sorcerer",
    alignment: "Sorcerer",
    canFail: false,
    calculateTeammates: () => [],
};

function votingGame() {
    const game = new Game("channel", new Lobby("channel"));
    game.players = Array.from({ length: 5 }, (_, index) => {
        const player = new Player(String(index), `Player ${index}`);
        player.role = sorcerer;
        return player;
    });
    const manager = new MissionManager(game);
    manager.beginSelection();
    manager.setExpedition(["0", "1"]);
    manager.beginVoting();
    return { game, manager };
}

describe("MissionFlowService", () => {
    it("starts the mission when approval votes win", () => {
        const { game, manager } = votingGame();
        manager.castExpeditionVote("0", "approve");
        manager.castExpeditionVote("1", "approve");
        manager.castExpeditionVote("2", "reject");

        assert.deepEqual(resolveExpeditionVote(manager), {
            approvalPassed: true,
            nextPhase: "MISSION",
        });
        assert.equal(game.phase, "MISSION");
    });

    it("returns to selection and rotates the leader when approval fails", () => {
        const { game, manager } = votingGame();
        manager.castExpeditionVote("0", "approve");
        manager.castExpeditionVote("1", "reject");

        assert.deepEqual(resolveExpeditionVote(manager), {
            approvalPassed: false,
            nextPhase: "SELECTION",
        });
        assert.equal(game.phase, "SELECTION");
        assert.equal(game.leaderIndex, 1);
    });
});

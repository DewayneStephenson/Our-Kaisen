import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Player from "../src/game/Player.js";
import RoleManager from "../src/game/managers/GameRoleManager.js";
import PhaseManager from "../src/game/managers/PhaseManager.js";
import VoteManager from "../src/game/managers/VoteManager.js";
import type { KaisenRole } from "../src/types/game.js";

function role(name: string, alignment: "Sorcerer" | "Curse"): KaisenRole {
    return {
        roleName: name,
        alignment,
        canFail: alignment === "Curse",
        calculateTeammates: () => [],
    };
}

describe("VoteManager", () => {
    it("records votes and tallies each target", () => {
        const manager = new VoteManager({});
        manager.cast("one", "target-a");
        manager.cast("two", "target-a");
        manager.cast("three", "target-b");

        assert.deepEqual(manager.tally(), {
            success: true,
            data: { "target-a": 2, "target-b": 1 },
        });
    });

    it("replaces a voter's previous choice and can reset voting", () => {
        const manager = new VoteManager({ one: "target-a" });
        manager.cast("one", "target-b");
        assert.deepEqual(manager.tally().data, { "target-b": 1 });

        assert.deepEqual(manager.start(), { success: true });
        assert.deepEqual(manager.tally().data, {});
    });
});

describe("PhaseManager", () => {
    it("accepts the required phase and rejects a different phase", () => {
        const manager = new PhaseManager("PLANNING");
        assert.deepEqual(manager.require("PLANNING"), { success: true });
        assert.deepEqual(manager.require("MISSION"), {
            success: false,
            reason: "not_in_mission_phase",
        });
    });

    it("changes its current phase", () => {
        const manager = new PhaseManager("LOBBY");
        assert.deepEqual(manager.setPhase("VOTING"), { success: true });
        assert.equal(manager.phase, "VOTING");
    });
});

describe("GameRoleManager", () => {
    it("rejects assignment when player and role counts differ", () => {
        const manager = new RoleManager([role("Sorcerer", "Sorcerer")]);
        assert.deepEqual(manager.assignRoles([]), {
            success: false,
            reason: "role_player_count_mismatch",
        });
    });

    it("assigns every configured role without mutating the role list", () => {
        const roles = [
            role("Sorcerer", "Sorcerer"),
            role("Curse", "Curse"),
        ];
        const players = [new Player("one", "One"), new Player("two", "Two")];
        const manager = new RoleManager(roles);

        assert.deepEqual(manager.assignRoles(players), { success: true });
        assert.deepEqual(
            players.map((current) => current.role.roleName).sort(),
            ["Curse", "Sorcerer"],
        );
        assert.deepEqual(manager.roles, roles);
    });
});

describe("Player", () => {
    it("formats its display name and delegates teammate visibility", () => {
        const visibleRole = role("Seer", "Sorcerer");
        visibleRole.calculateTeammates = (_viewer, players) =>
            players.slice(1).map((current) => current.username);
        const one = new Player("one", "One");
        const two = new Player("two", "Two");
        one.role = visibleRole;

        assert.equal(one.display(), "One (one)");
        assert.deepEqual(one.getVisibleTeammates([one, two]), ["Two"]);
    });

    it("shows no teammates before a role is assigned", () => {
        assert.deepEqual(new Player("one", "One").getVisibleTeammates([]), []);
    });
});

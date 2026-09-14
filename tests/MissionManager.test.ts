import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Game from "../src/game/Game.js";
import Player from "../src/game/Player.js";
import MissionManager, {
    getMissionTeamSizes,
    getRequiredFails,
} from "../src/game/managers/MissionManager.js";
import Lobby from "../src/lobby/Lobby.js";
import type { KaisenRole } from "../src/types/game.js";

function role(
    roleName: string,
    alignment: "Sorcerer" | "Curse",
): KaisenRole {
    return {
        roleName,
        alignment,
        canFail: alignment === "Curse",
        calculateTeammates: () => [],
    };
}

function player(
    id: string,
    alignment: "Sorcerer" | "Curse" = "Sorcerer",
    roleName = alignment === "Sorcerer" ? "Grade 2 Sorcerer" : "Finger Bearer",
) {
    const result = new Player(id, `Player ${id}`);
    result.role = role(roleName, alignment);
    return result;
}

function createGame(players: Player[] = []) {
    const game = new Game("channel", new Lobby("channel"));
    game.players = players;
    return game;
}

describe("mission configuration", () => {
    it("returns official and improvised team sizes", () => {
        assert.deepEqual(getMissionTeamSizes(5), [2, 3, 2, 3, 3]);
        assert.deepEqual(getMissionTeamSizes(10), [3, 4, 4, 5, 5]);
        assert.deepEqual(getMissionTeamSizes(15), [5, 6, 7, 8, 8]);
    });

    it("uses the ten-player configuration for unsupported player counts", () => {
        assert.deepEqual(getMissionTeamSizes(4), [3, 4, 4, 5, 5]);
        assert.deepEqual(getMissionTeamSizes(16), [3, 4, 4, 5, 5]);
    });

    it("requires two failures on the fourth mission for seven players", () => {
        assert.equal(getRequiredFails(7, 4), 2);
        assert.equal(getRequiredFails(6, 4), 1);
    });
});

describe("MissionManager", () => {
    it("rejects invalid expedition plans without mutating game state", () => {
        const game = createGame([
            player("one"),
            player("two"),
            player("three"),
            player("four"),
            player("five"),
        ]);
        const manager = new MissionManager(game);

        assert.equal(manager.setExpedition(["one", "two"]).success, false);
        manager.beginSelection();
        assert.deepEqual(manager.setExpedition(["one"]), {
            success: false,
            reason: "invalid_team_size",
        });
        assert.deepEqual(manager.setExpedition(["one", "one"]), {
            success: false,
            reason: "duplicate_player",
        });
        assert.deepEqual(manager.setExpedition(["one", "outsider"]), {
            success: false,
            reason: "player_not_found",
        });
        assert.deepEqual(game.expedition, []);
    });

    it("rejects phase transitions when their prerequisites are not met", () => {
        const game = createGame([
            player("one"),
            player("two"),
            player("three"),
            player("four"),
            player("five"),
        ]);
        const manager = new MissionManager(game);

        assert.deepEqual(manager.beginVoting(), {
            success: false,
            reason: "not_selection",
        });
        manager.beginSelection();
        assert.deepEqual(manager.beginVoting(), {
            success: false,
            reason: "invalid_team_size",
        });
        assert.deepEqual(manager.beginMission(), {
            success: false,
            reason: "not_voting",
        });
        assert.deepEqual(manager.castMissionVote("one", "pass"), {
            success: false,
            reason: "not_mission",
        });
    });

    it("initializes selection and voting state", () => {
        const game = createGame([
            player("one"),
            player("two"),
            player("three"),
            player("four"),
            player("five"),
        ]);
        const manager = new MissionManager(game);
        game.expedition = ["one"];
        game.expeditionVotes = { one: "approve" };
        game.missionVotes = { one: "pass" };

        manager.beginSelection();
        assert.equal(game.phase, "SELECTION");
        assert.deepEqual(game.expedition, []);
        assert.deepEqual(game.expeditionVotes, {});
        assert.deepEqual(game.missionVotes, {});

        manager.setExpedition(["one", "two"]);
        manager.beginVoting();
        assert.equal(game.phase, "VOTING");
        assert.deepEqual(game.expedition, ["one", "two"]);
    });

    it("accepts expedition votes only from players during voting", () => {
        const game = createGame([
            player("one"),
            player("two"),
            player("three"),
            player("four"),
            player("five"),
        ]);
        const manager = new MissionManager(game);

        assert.deepEqual(manager.castExpeditionVote("one", "approve"), {
            success: false,
            reason: "not_voting",
        });

        manager.beginSelection();
        manager.setExpedition(["one", "two"]);
        manager.beginVoting();
        assert.deepEqual(manager.castExpeditionVote("outsider", "reject"), {
            success: false,
            reason: "not_in_game",
        });
        assert.deepEqual(manager.castExpeditionVote("one", "approve"), {
            success: true,
        });
        assert.deepEqual(manager.castExpeditionVote("two", "reject"), {
            success: true,
        });
        assert.deepEqual(manager.getExpeditionVoteCounts(), {
            approve: 1,
            reject: 1,
        });
        assert.equal(manager.allPlayersVoted(), false);
        manager.castExpeditionVote("three", "reject");
        manager.castExpeditionVote("four", "reject");
        manager.castExpeditionVote("five", "reject");
        assert.equal(manager.allPlayersVoted(), true);
        assert.equal(manager.approvalPassed(), false);
    });

    it("prevents Sorcerers and non-members from failing a mission", () => {
        const game = createGame([
            player("sorcerer"),
            player("curse", "Curse"),
            player("three"),
            player("four"),
            player("five"),
        ]);
        const manager = new MissionManager(game);
        manager.beginSelection();
        manager.setExpedition(["sorcerer", "curse"]);
        manager.beginVoting();
        manager.beginMission();

        assert.deepEqual(manager.castMissionVote("outsider", "pass"), {
            success: false,
            reason: "not_in_expedition",
        });
        assert.deepEqual(manager.castMissionVote("sorcerer", "fail"), {
            success: false,
            reason: "sorcerer_cannot_fail",
        });
        assert.deepEqual(manager.castMissionVote("curse", "fail"), {
            success: true,
        });
        assert.equal(manager.allExpeditionMembersVoted(), false);
        manager.castMissionVote("sorcerer", "pass");
        assert.equal(manager.allExpeditionMembersVoted(), true);
    });

    it("resolves a failed mission, stores its votes, and rotates the leader", () => {
        const game = createGame([
            player("one"),
            player("two", "Curse"),
            player("three"),
            player("four"),
            player("five"),
        ]);
        const manager = new MissionManager(game);
        manager.beginSelection();
        manager.setExpedition(["one", "two"]);
        manager.beginVoting();
        manager.beginMission();
        manager.castMissionVote("one", "pass");
        manager.castMissionVote("two", "fail");

        const result = manager.resolveMission();

        assert.equal(result.data.success, false);
        assert.equal(result.data.fails, 1);
        assert.equal(game.missionResults[0], false);
        assert.deepEqual(game.missionVoteHistory[0], {
            one: "pass",
            two: "fail",
        });
        assert.deepEqual(
            [...(game.missionVoteResults[0] ?? [])].sort(),
            ["fail", "pass"],
        );
        assert.equal(game.leaderIndex, 1);
        assert.equal(game.phase, "SELECTION");
        assert.equal(game.phaseTransitionInProgress, false);
    });

    it("moves to sealing after three successful missions", () => {
        const game = createGame([
            player("gojo", "Sorcerer", "Honored One"),
            player("kenny", "Curse", "Stitched Face"),
            player("three"),
            player("four"),
            player("five"),
        ]);
        game.missionResults = [true, true, null, null, null];
        const manager = new MissionManager(game);
        manager.beginSelection();
        manager.setExpedition(["gojo", "three"]);
        manager.beginVoting();
        manager.beginMission();
        manager.castMissionVote("gojo", "pass");
        manager.castMissionVote("three", "pass");

        manager.resolveMission();

        assert.equal(game.phase, "SEALING");
        assert.equal(game.sealingAssassinId, "kenny");
        assert.equal(game.winnerAlignment, null);
    });

    it("awards the Curse win when the assassin seals the Honored One", () => {
        const game = createGame([
            player("gojo", "Sorcerer", "Honored One"),
            player("kenny", "Curse", "Stitched Face"),
        ]);
        const manager = new MissionManager(game);
        manager.beginSealing();

        assert.deepEqual(manager.resolveSealingTarget("other", "gojo"), {
            success: false,
            reason: "not_assassin",
        });
        assert.deepEqual(manager.resolveSealingTarget("kenny", "gojo"), {
            success: true,
        });
        assert.equal(game.sealingTargetId, "gojo");
        assert.equal(game.winnerAlignment, "Curse");
    });

    it("awards the Sorcerers a sealing win on a wrong target or timeout", () => {
        const game = createGame([
            player("gojo", "Sorcerer", "Honored One"),
            player("other"),
            player("kenny", "Curse", "Stitched Face"),
        ]);
        const manager = new MissionManager(game);
        manager.beginSealing();
        manager.resolveSealingTarget("kenny", "other");
        assert.equal(game.winnerAlignment, "Sorcerer");

        const timeoutGame = createGame([
            player("gojo", "Sorcerer", "Honored One"),
            player("kenny", "Curse", "Stitched Face"),
        ]);
        const timeoutManager = new MissionManager(timeoutGame);
        timeoutManager.beginSealing();
        assert.deepEqual(timeoutManager.resolveSealingTimeout(), {
            success: true,
        });
        assert.equal(timeoutGame.winnerAlignment, "Sorcerer");
    });

    it("wraps leader rotation and safely handles an empty game", () => {
        const game = createGame([player("one"), player("two")]);
        const manager = new MissionManager(game);
        game.leaderIndex = 1;
        manager.rotateLeader();
        assert.equal(game.leaderIndex, 0);

        const emptyGame = createGame();
        new MissionManager(emptyGame).rotateLeader();
        assert.equal(emptyGame.leaderIndex, 0);
    });
});

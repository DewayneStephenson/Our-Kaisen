import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Lobby from "../src/lobby/Lobby.js";
import LobbyManager from "../src/lobby/LobbyManager.js";
import RoleManager from "../src/lobby/LobbyRoleManager.js";

describe("LobbyRoleManager", () => {
    it("creates the expected alignment mix for a five-player lobby", () => {
        const roles = RoleManager.DefaultMode(5);
        assert.equal(roles.length, 5);
        assert.equal(
            roles.filter((key) => RoleManager.ROLES[key].alignment === "Curse")
                .length,
            2,
        );
        assert.equal(roles.includes("gojo"), true);
    });

    it("adds and removes optional roles by replacing their alignment default", () => {
        const defaults = RoleManager.DefaultMode(5);
        const added = RoleManager.addRole(defaults, "yuta");
        assert.equal(added.success, true);
        assert.equal(added.newRoles?.includes("yuta"), true);
        assert.deepEqual(defaults, RoleManager.DefaultMode(5));

        const removed = RoleManager.removeRole(added.newRoles ?? [], "yuta");
        assert.equal(removed.success, true);
        assert.equal(removed.newRoles?.includes("yuta"), false);
        assert.equal(removed.newRoles?.includes("grade2"), true);
    });

    it("protects required roles and rejects duplicate optional roles", () => {
        const defaults = RoleManager.DefaultMode(5);
        assert.equal(RoleManager.removeRole(defaults, "gojo").reason, "required");
        const withYuta = RoleManager.addRole(defaults, "yuta").newRoles ?? [];
        assert.equal(RoleManager.addRole(withYuta, "yuta").reason, "dupe");
    });

    it("updates the role count when the lobby size changes", () => {
        const fivePlayers = RoleManager.DefaultMode(5);
        const sevenPlayers = RoleManager.updateRole(fivePlayers, 7);
        assert.equal(sevenPlayers.length, 7);
        assert.equal(RoleManager.updateRole(sevenPlayers, 5).length, 5);
    });
});

describe("LobbyManager", () => {
    it("creates one lobby per channel and assigns the creator as host", () => {
        const manager = new LobbyManager();
        const lobby = manager.createLobby("channel", "host", "Host");

        assert.equal(lobby?.host, "host");
        assert.deepEqual(lobby?.players, ["host"]);
        assert.equal(lobby?.humanNames.get("host"), "Host");
        assert.equal(manager.createLobby("channel", "other", "Other"), null);
    });

    it("adds unique players and transfers host when the host leaves", () => {
        const manager = new LobbyManager();
        manager.createLobby("channel", "host", "Host");
        manager.addPlayer("channel", "two", "Two");
        manager.addPlayer("channel", "two", "Duplicate");

        const lobby = manager.getLobby("channel");
        assert.deepEqual(lobby?.players, ["host", "two"]);
        manager.removePlayer("channel", "host");
        assert.equal(lobby?.host, "two");
        assert.equal(lobby?.humanNames.has("host"), false);
    });

    it("deletes a lobby after its final player leaves", () => {
        const manager = new LobbyManager();
        manager.createLobby("channel", "host", "Host");
        manager.removePlayer("channel", "host");
        assert.equal(manager.getLobby("channel"), undefined);
    });

    it("resolves bot, human, and unknown usernames", () => {
        const manager = new LobbyManager();
        const lobby = new Lobby("channel");
        lobby.botNames.set("bot", "Bot");
        lobby.humanNames.set("human", "Human");

        assert.equal(manager.getUsername("bot", lobby), "Bot");
        assert.equal(manager.getUsername("human", lobby), "Human");
        assert.equal(manager.getUsername("unknown", lobby), "<@unknown>");
    });

    it("renders lobby player and role information", () => {
        const manager = new LobbyManager();
        const lobby = manager.createLobby("channel", "host", "Host");
        if (!lobby) assert.fail("Expected lobby to be created");
        lobby.roles = ["gojo", "finger"];

        const embed = manager.buildEmbed("channel")?.toJSON();
        assert.equal(embed?.title, "Lobby");
        assert.match(embed?.fields?.[0]?.value ?? "", /<@host>/);
        assert.match(embed?.fields?.[1]?.value ?? "", /Honored One/);
        assert.equal(manager.buildEmbed("missing"), null);
    });
});

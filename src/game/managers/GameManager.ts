// GameManager.ts

import type Lobby from "../../lobby/Lobby.js";
import type LobbyManager from "../../lobby/LobbyManager.js";
import type Game from "../Game.js";
import RoleManager from "./GameRoleManager.js";
import MissionManager from "./MissionManager.js";
import PhaseManager from "./PhaseManager.js";
import PlayerManager from "./PlayerManager.js";
import VoteManager from "./VoteManager.js";

export default class GameManager {
    game: Game;
    players: PlayerManager;
    roles: RoleManager;
    phases: PhaseManager;
    votes: VoteManager;
    missions: MissionManager;

    constructor(game: Game, lobby: Lobby, lobbyManager: LobbyManager) {
        this.game = game;

        this.players = new PlayerManager(lobby, lobbyManager);
        this.roles = new RoleManager(game.roles);
        this.phases = new PhaseManager(game.phase);
        this.votes = new VoteManager(game.votes);
        this.missions = new MissionManager(game);
    }
    startGame() {
        const roleResult = this.roles.assignRoles(this.players.getAll());
        if (!roleResult.success) return roleResult;

        this.game.players = this.players.getAll();
        this.game.started = true;
        this.game.phase = "PLANNING";
        this.phases.setPhase("PLANNING");

        return { success: true };
    }

    startVoting() {
        const check = this.phases.require("PLANNING");
        if (!check.success) return check;

        this.votes.start();
        this.game.phase = "VOTING";
        this.phases.setPhase("VOTING");

        return { success: true };
    }

    startMission() {
        const check = this.phases.require("VOTING");
        if (!check.success) return check;

        this.missions.startMission();
        this.game.phase = "MISSION";
        this.phases.setPhase("MISSION");

        return { success: true };
    }

    resolveMission() {
        const check = this.phases.require("MISSION");
        if (!check.success) return check;

        const result = this.missions.resolve();
        const missionIndex = this.game.missionResults.indexOf(null);

        if (missionIndex !== -1) {
            this.game.missionResults[missionIndex] = result.data.success;
        }

        this.game.phase = "SEALING";
        this.phases.setPhase("SEALING");

        return result;
    }
}

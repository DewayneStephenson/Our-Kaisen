import type { Client } from "discord.js";
import type Game from "../Game.js";
import MissionManager from "../managers/MissionManager.js";
import { clearMissionTimer, scheduleMissionTimer } from "../../utils/missionTimers.js";
import { resolveExpeditionVote } from "./MissionFlowService.js";

export default class MissionCoordinator {
    readonly manager: MissionManager;

    constructor(
        private readonly client: Client,
        readonly game: Game,
    ) {
        this.manager = new MissionManager(game);
    }

    private scheduleNextPhase() {
        clearMissionTimer(this.game);
        if (!this.game.winnerAlignment) {
            scheduleMissionTimer(this.client, this.game);
        }
    }

    beginApproval() {
        const result = this.manager.beginVoting();
        if (result.success) this.scheduleNextPhase();
        return result;
    }

    resolveApproval(requireComplete = true) {
        if (requireComplete && !this.manager.allPlayersVoted()) {
            return { success: false as const, reason: "incomplete_votes" as const };
        }

        const outcome = resolveExpeditionVote(this.manager);
        this.scheduleNextPhase();
        return { success: true as const, outcome };
    }

    resolveMission(requireComplete = true) {
        if (requireComplete && !this.manager.allExpeditionMembersVoted()) {
            return { success: false as const, reason: "incomplete_votes" as const };
        }

        const mission = this.manager.resolveMission();
        this.scheduleNextPhase();
        return { success: true as const, mission };
    }

    resolveSealing(assassinId: string, targetId: string) {
        const result = this.manager.resolveSealingTarget(assassinId, targetId);
        if (result.success) this.scheduleNextPhase();
        return result;
    }

    restartCurrentPhaseTimer() {
        this.scheduleNextPhase();
    }
}

import type MissionManager from "../managers/MissionManager.js";

export interface ExpeditionVoteOutcome {
    approvalPassed: boolean;
    nextPhase: "MISSION" | "SELECTION";
}

export function resolveExpeditionVote(
    missionManager: MissionManager,
): ExpeditionVoteOutcome {
    const approvalPassed = missionManager.approvalPassed();

    if (approvalPassed) {
        missionManager.beginMission();
        return { approvalPassed, nextPhase: "MISSION" };
    }

    missionManager.rotateLeader();
    missionManager.beginSelection();
    return { approvalPassed, nextPhase: "SELECTION" };
}

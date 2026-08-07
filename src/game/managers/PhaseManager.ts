// PhaseManager.ts
import { GamePhase } from "../../types/game.js";

export default class PhaseManager {
    phase: GamePhase;

    constructor(initial: GamePhase) {
        this.phase = initial;
    }

    setPhase(phase: GamePhase) {
        this.phase = phase;
        return { success: true };
    }

    require(phase: GamePhase) {
        if (this.phase !== phase) {
            return { success: false, reason: `not_in_${phase.toLowerCase()}_phase` };
        }
        return { success: true };
    }
}

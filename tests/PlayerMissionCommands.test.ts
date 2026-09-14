import assert from "node:assert/strict";
import { describe, it } from "node:test";
import selectMissionPlan from "../src/commands/game/lobby/mission/select.js";
import voteMission from "../src/commands/game/lobby/mission/voteMission.js";

describe("player mission commands", () => {
    it("requires an explicit mission-team selection", () => {
        const command = selectMissionPlan.data.toJSON();
        assert.deepEqual(command.options?.map((option) => option.name), [
            "players",
        ]);
        assert.equal(command.options?.[0]?.required, true);
    });

    it("requires an explicit approval vote and offers no random choice", () => {
        const command = voteMission.data.toJSON();
        assert.deepEqual(command.options?.map((option) => option.name), ["vote"]);
        const vote = command.options?.[0];
        assert.ok(vote && "choices" in vote);
        assert.deepEqual(vote.choices?.map((choice) => choice.value), [
            "approve",
            "reject",
        ]);
    });
});

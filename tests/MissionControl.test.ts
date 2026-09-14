import assert from "node:assert/strict";
import { describe, it } from "node:test";
import missionControl from "../src/dev/test/missionControl.js";

describe("mission_control command", () => {
    it("exposes one automatically advancing action per mission phase", () => {
        const command = missionControl.data.toJSON();
        assert.equal(command.name, "mission_control");
        assert.deepEqual(
            command.options?.map((option) => option.name),
            ["selection", "approval", "mission", "sealing"],
        );
    });

    it("uses optional bot and choice overrides", () => {
        const command = missionControl.data.toJSON();
        const selection = command.options?.find(
            (option) => option.name === "selection",
        );
        const approval = command.options?.find(
            (option) => option.name === "approval",
        );
        const mission = command.options?.find(
            (option) => option.name === "mission",
        );

        assert.ok(selection && "options" in selection);
        assert.ok(approval && "options" in approval);
        assert.ok(mission && "options" in mission);
        assert.deepEqual(selection.options?.map((option) => option.name), [
            "bot",
        ]);
        assert.deepEqual(approval.options?.map((option) => option.name), [
            "bot",
            "choice",
        ]);
        assert.deepEqual(mission.options?.map((option) => option.name), [
            "bot",
            "choice",
        ]);
    });
});

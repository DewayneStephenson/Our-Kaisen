import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PermissionFlagsBits } from "discord.js";
import reloadCommand from "../src/dev/reload.js";

describe("reload command", () => {
    it("requires administrator permission", () => {
        assert.deepEqual(reloadCommand.permissions, [
            PermissionFlagsBits.Administrator,
        ]);
    });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Client } from "discord.js";
import { executeEventSafely } from "../src/utils/eventExecution.js";

describe("executeEventSafely", () => {
    it("catches asynchronous event-handler rejections", async () => {
        const failure = new Error("async failure");
        let reported: unknown;

        await executeEventSafely(
            {
                name: "test",
                async execute() {
                    await Promise.resolve();
                    throw failure;
                },
            },
            [],
            {} as Client,
            (error) => {
                reported = error;
            },
        );

        assert.equal(reported, failure);
    });
});

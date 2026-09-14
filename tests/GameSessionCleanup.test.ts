import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Client } from "discord.js";
import GameRegistry from "../src/game/GameRegistry.js";
import Lobby from "../src/lobby/Lobby.js";
import { destroyGameSession } from "../src/utils/gameChannels.js";

describe("destroyGameSession", () => {
    it("deletes owned Discord resources and removes the registered game", async () => {
        const lobby = new Lobby("lobby-channel");
        lobby.host = "host";
        lobby.isBotLobby = true;
        lobby.players = ["host", "two", "three", "four", "five"];
        const registry = new GameRegistry();
        const created = registry.createGame("game-channel", "host", lobby);
        if (!created.game) assert.fail("Expected game to be created");

        created.game.voiceChannelId = "voice-channel";
        created.game.guildId = "guild";
        created.game.participantRoleId = "participant-role";
        const deleted: string[] = [];
        const client = {
            gameRegistry: registry,
            channels: {
                async fetch(id: string) {
                    return {
                        async delete() {
                            deleted.push(id);
                        },
                    };
                },
            },
            guilds: {
                async fetch() {
                    return {
                        roles: {
                            async fetch(id: string) {
                                return {
                                    async delete() {
                                        deleted.push(id);
                                    },
                                };
                            },
                        },
                    };
                },
            },
        } as unknown as Client;

        await destroyGameSession(client, created.game);

        assert.equal(registry.getGame("game-channel"), null);
        assert.deepEqual(deleted, [
            "voice-channel",
            "participant-role",
            "game-channel",
        ]);
    });
});

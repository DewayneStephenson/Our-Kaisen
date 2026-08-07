export interface BotUser {
    id: string;
    name: string;
    isBot: boolean;
}
let botCounter = 1;

import { SnowflakeUtil } from "discord.js";

export function generateBotUser(): BotUser {
    const id = String(SnowflakeUtil.generate());

    const bot: BotUser = {
        id,
        name: `Bot ${botCounter}`,
        isBot: true,
    };

    botCounter++;
    return bot;
}

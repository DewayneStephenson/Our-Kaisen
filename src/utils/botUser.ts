import { SnowflakeUtil } from "discord.js";

export interface BotUser {
    id: string;
    name: string;
    isBot: boolean;
}

let botCounter = 1;

export function generateBotUser(): BotUser {
    const id = String(SnowflakeUtil.generate());

    const fake: BotUser = {
        id,
        name: `Bot ${botCounter}`,
        isBot: true
    };

    botCounter++;
    return fake;
}

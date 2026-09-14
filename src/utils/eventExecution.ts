import type { Client } from "discord.js";

export interface LoadedEvent {
    name: string;
    once?: boolean;
    execute(...args: unknown[]): unknown;
}

export async function executeEventSafely(
    event: LoadedEvent,
    args: unknown[],
    client: Client,
    onError: (error: unknown) => void,
) {
    try {
        await event.execute(...args, client);
    } catch (error) {
        onError(error);
    }
}

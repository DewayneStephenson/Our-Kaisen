import type { RepliableInteraction } from "discord.js";
import { DEFAULT_COOLDOWN_SECONDS, MS_PER_SECOND } from "../utils/constants.js";
import { sendErrorReply } from "../utils/sendErrorReply.js";

export async function handleCooldown(
    interaction: RepliableInteraction,
    command: { data: { name: string }; cooldown?: number },
): Promise<boolean> {
    const userId = interaction.user.id;
    const name = command.data.name;

    const cooldownAmount =
        (command.cooldown ?? DEFAULT_COOLDOWN_SECONDS) * MS_PER_SECOND;

    const timestamps =
        interaction.client.cooldowns.get(name) ?? new Map<string, number>();
    interaction.client.cooldowns.set(name, timestamps);

    const timestamp = timestamps.get(userId);
    if (timestamp !== undefined) {
        const expires = timestamp + cooldownAmount;

        if (Date.now() < expires) {
            const remaining = ((expires - Date.now()) / MS_PER_SECOND).toFixed(
                1,
            );
            await sendErrorReply(
                interaction,
                `Cooldown: ${remaining}s remaining.`,
            );
            return true;
        }
    }

    timestamps.set(userId, Date.now());
    return false;
}

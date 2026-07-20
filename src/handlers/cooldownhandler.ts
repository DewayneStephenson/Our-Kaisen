import { type RepliableInteraction } from "discord.js";
import { sendErrorReply } from "../utils/sendErrorReply.js";
import { DEFAULT_COOLDOWN_SECONDS, MS_PER_SECOND } from "../utils/constants.js";

export async function handleCooldown(
    interaction: RepliableInteraction,
    command: { data: { name: string }; cooldown?: number }
): Promise<boolean> {
    const userId = interaction.user.id;
    const name = command.data.name;

    const cooldownAmount =
        (command.cooldown ?? DEFAULT_COOLDOWN_SECONDS) * MS_PER_SECOND;

    if (!interaction.client.cooldowns.has(name)) {
        interaction.client.cooldowns.set(name, new Map<string, number>());
    }

    const timestamps = interaction.client.cooldowns.get(name)!;

    if (timestamps.has(userId)) {
        const expires = timestamps.get(userId)! + cooldownAmount;

        if (Date.now() < expires) {
            const remaining = ((expires - Date.now()) / MS_PER_SECOND).toFixed(1);
            await sendErrorReply(interaction, `Cooldown: ${remaining}s remaining.`);
            return true;
        }
    }

    timestamps.set(userId, Date.now());
    return false;
}

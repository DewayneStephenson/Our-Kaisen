import type {
    InteractionReplyOptions,
    InteractionResponse,
    Message,
    RepliableInteraction,
} from "discord.js";
import { MessageFlags } from "discord.js";
import * as logger from "./logger.js";

/**
 * Sends an error reply to an interaction.
 * Automatically handles deferred or already-replied interactions.
 */
export async function sendErrorReply(
    interaction: RepliableInteraction,
    message: string,
): Promise<Message<boolean> | InteractionResponse<boolean> | undefined> {
    try {
        const reply = {
            content: message,
            flags: MessageFlags.Ephemeral,
        } satisfies InteractionReplyOptions;

        if (interaction.replied || interaction.deferred) {
            return interaction.followUp(reply);
        }

        return interaction.reply(reply);
    } catch (err: any) {
        logger.error(`Failed to send error reply: ${err.message}`);
    }
}

export default sendErrorReply;

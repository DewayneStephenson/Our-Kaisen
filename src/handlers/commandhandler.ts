import type {
    ChatInputCommandInteraction,
    Interaction,
    PermissionResolvable,
} from "discord.js";
import * as logger from "../utils/logger.js";

export function getCommand(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return null;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        logger.error(
            `No command matching ${interaction.commandName} was found`,
        );
        return null;
    }

    logger.debug(`Command loaded: ${interaction.commandName}`);
    return command;
}

export function hasPermission(
    interaction: ChatInputCommandInteraction,
    command: { permissions?: PermissionResolvable[] },
): boolean {
    if (!command.permissions?.length) return true;

    if (!interaction.inGuild()) return false;

    const perms = interaction.memberPermissions;
    return command.permissions.every((permission) => perms?.has(permission));
}

import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";

import RoleManager, { type RoleKey } from "../../../lobby/LobbyRoleManager.js";
import { EmbedCreator } from "../../../ui/EmbedCreator.js";

export default {
    data: new SlashCommandBuilder()
        .setName("addrole")
        .setDescription("Adds a role to the lobby")
        .addStringOption((option) =>
            option
                .setName("role")
                .setDescription("Role to add")
                .setRequired(true),
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.reply({
                content: "A lobby has not been created.",
                flags: MessageFlags.Ephemeral,
            });
        }
        if (lobby.host !== interaction.user.id) {
            return interaction.reply({
                content: "You are not the host!",
                flags: MessageFlags.Ephemeral,
            });
        }
        const roleName = interaction.options.getString("role", true) as RoleKey;
        const result = RoleManager.addRole(lobby.roles, roleName);

        if (!result.success) {
            let reason: string;

            switch (result.reason) {
                case "notarole":
                    reason = `${roleName} is not a valid role.`;
                    break;
                case "required":
                    reason = `${roleName} is required, delete an optional role instead.`;
                    break;
                case "dupe":
                    reason = `${roleName} already exists in the lobby.`;
                    break;
                case "alignment":
                    reason = `Too many roles with ${roleName}'s alignment, delete an optional role.`;
                    break;
                default:
                    reason = "Unexpected error.";
            }

            return interaction.reply({
                content: reason,
                flags: MessageFlags.Ephemeral,
            });
        }

        lobby.roles = result.newRoles;

        const embed = EmbedCreator.lobby(lobby);

        if (lobby.message) {
            await lobby.message.edit({ embeds: [embed] });
            return interaction.reply({
                content: "Role added to the lobby.",
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.reply({ embeds: [embed] });
        const message = await interaction.fetchReply();
        lobby.message = message;
    },
};

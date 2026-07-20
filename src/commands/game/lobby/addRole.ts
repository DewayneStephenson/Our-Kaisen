import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";

import RoleManager, { RoleKey } from "../../../game/RoleManager.js";

export default {
    data: new SlashCommandBuilder()
        .setName("addrole")
        .setDescription("Adds a role to the lobby")
        .addStringOption(option =>
            option
                .setName("role")
                .setDescription("Role to add")
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.reply({
                content: "A lobby has not been created.",
                ephemeral: true
            });
        }

        const roleName = interaction.options.getString("role", true) as RoleKey;
        const result = RoleManager.addRole(lobby.roles, roleName);

        if (!result.success) {
            let reason;

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
                ephemeral: true
            });
        }

        lobby.roles = result.newRoles;

        const embed = client.lobbyManager.buildEmbed(interaction.channelId);
        const message = await interaction.reply({
            embeds: [embed],
            fetchReply: true
        });

        lobby.message = message;
    }
};

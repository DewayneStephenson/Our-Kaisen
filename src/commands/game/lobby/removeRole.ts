import {
    MessageFlags,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client} from "discord.js";

import {EmbedCreator} from "../../../ui/EmbedCreator.js"

import RoleManager, { type RoleKey } from "../../../lobby/LobbyRoleManager.js";

export default {
    data: new SlashCommandBuilder()
        .setName("removerole")
        .setDescription("Removes a role from the lobby")
        .addStringOption(option =>
            option
                .setName("role")
                .setDescription("Role to remove")
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.reply({
                content: "A lobby has not been created.",
                flags: MessageFlags.Ephemeral
            });
        }
        if (lobby.host !== interaction.user.id) {
            return interaction.reply({
                content: "You are not the host!",
                flags: MessageFlags.Ephemeral
            }); 
        }

        const roleName = interaction.options.getString("role", true) as RoleKey;
        const result = RoleManager.removeRole(lobby.roles, roleName);

        if (!result.success) {
            let reason: string;

            switch (result.reason) {
                case "notarole":
                    reason = `${roleName} is not a valid role.`;
                    break;
                case "required":
                    reason = `${roleName} is required, delete an optional role instead.`;
                    break;
                 case "not_in":
                    reason = `${roleName} is not in the lobby`;
                    break;
                default:
                    reason = "Unexpected error.";
            }

            return interaction.reply({
                content: reason,
                flags: MessageFlags.Ephemeral
            });
        }

        lobby.roles = result.newRoles;
		const embed = EmbedCreator.lobby(lobby)

		if (!embed) {
			return interaction.reply({
				content: "Failed to build lobby embed.",
				flags: MessageFlags.Ephemeral
			});
		}

		await interaction.reply({
			embeds: [embed]
		});

		const message = await interaction.fetchReply();

		lobby.message = message;

    }
};

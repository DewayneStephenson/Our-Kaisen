const { SlashCommandBuilder } = require('discord.js');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('removerole')
		.setDescription('Adds a role to the lobby')
		.addStringOption((option) =>
			option
				.setName('role')
				.setDescription('Role to remove')
				.setRequired(true)
		),

	async execute(interaction, client) {
		const lobby = client.lobbyManager.getLobby(interaction.channelId);

		if (!lobby) {
			return interaction.reply({ content: 'A lobby has not been created.', ephemeral: true });
		}
        const roleName = interaction.options.getString('role', true);
        const result = client.roleManager.removeRole(lobby.roles, roleName);

        if (!result.success) {
            let reason;

            switch(result.reason) {
                case "notarole":
                    reason = `${roleName} is not a valid role.`;
                    break;
                case "required":
                    reason = `${roleName} is required, delete an optional role instead`;
                    break;
                default: 
                    reason = `Unexpected error`;
            }
            return interaction.reply({ content: reason, ephemeral: true });   
        }
        lobby.roles = result.newRoles;

		const embed = client.lobbyManager.buildEmbed(interaction.channelId);
		const message = await interaction.reply({ embeds: [embed], fetchReply: true });

		lobby.message = message;
	},
};

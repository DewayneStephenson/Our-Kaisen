const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Join the lobby'),

    async execute(interaction, client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.reply({ content: 'No lobby exists here.', ephemeral: true });
        }

        client.lobbyManager.addPlayer(interaction.channelId, interaction.user.id);

        const embed = client.lobbyManager.buildEmbed(interaction.channelId);
        if (lobby.message) {
            await lobby.message.edit({ embeds: [embed] });
        }

        await interaction.reply({ content: 'You joined the lobby.', ephemeral: true });
    },
};

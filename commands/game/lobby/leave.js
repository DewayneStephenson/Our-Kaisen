const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leave the lobby'),

    async execute(interaction, client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.reply({ content: 'No lobby exists here.', ephemeral: true });
        }

        const room = client.lobbyManager.removePlayer(interaction.channelId, interaction.user.id);


          if (!room) {
            try { await lobby?.message.delete(); } catch {}
            return interaction.reply({content: 'Lobby deleted due to having no players'})
          }
        

            const embed = client.lobbyManager.buildEmbed(interaction.channelId);
            if (room.message) {
                await lobby.message.edit({ embeds: [embed] });
            }

            await interaction.reply({ content: 'You left the lobby.', ephemeral: true });
    },
};

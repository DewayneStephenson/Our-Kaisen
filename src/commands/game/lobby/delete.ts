import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";


export default {
    data: new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Destroy the lobby in this channel'),

    async execute(interaction: ChatInputCommandInteraction, client:Client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        // If no lobby exists in memory, delete the old message manually
        if (!lobby) {
            return interaction.reply({
                content: 'No active lobby exists. If an old lobby message is still visible, delete it manually.',
                ephemeral: true
            });
        }

        // Delete the embed message
        if (lobby.message) {
            try {
                await lobby.message.delete();
            } catch {}
        }

        // Remove from memory
        client.lobbyManager.lobbies.delete(interaction.channelId);

        return interaction.reply({
            content: 'Lobby destroyed.',
            ephemeral: true
        });
    },
};
 

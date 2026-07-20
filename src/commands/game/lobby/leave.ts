import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("leave")
        .setDescription("Leave the lobby"),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.reply({
                content: "No lobby exists here.",
                ephemeral: true
            });
        }

        const updatedLobby = client.lobbyManager.removePlayer(
            interaction.channelId,
            interaction.user.id
        );

        if (!updatedLobby) {
            try { await lobby.message?.delete(); } catch {}
            return interaction.reply({
                content: "Lobby deleted due to having no players.",
                ephemeral: true
            });
        }

        const embed = client.lobbyManager.buildEmbed(interaction.channelId);

        if (updatedLobby.message) {
            await updatedLobby.message.edit({ embeds: [embed] });
        }

        return interaction.reply({
            content: "You left the lobby.",
            ephemeral: true
        });
    }
};

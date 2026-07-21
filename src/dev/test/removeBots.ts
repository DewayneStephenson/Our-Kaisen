import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("remove_bots")
        .setDescription("Removes number of bots")
        .addIntegerOption(option =>
            option
                .setName("bots")
                .setDescription("Number of bots")
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const lobby = client.lobbyManager.getLobby(interaction.channelId);

        if (!lobby) {
            return interaction.reply({
                content: "No lobby exists here.",
                ephemeral: true
            });
        }
        if (!lobby.isBotLobby) {
            return interaction.reply({
            content: "Cannot use in a non-bot lobby.",
            ephemeral: true
            });
        }
        const bots = interaction.options.getInteger("bots", true);
        const updatedLobby = client.lobbyManager.removeBots(interaction.channelId,bots);

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
            content: "Succesfully removed bots.",
            ephemeral: true
        });
    }
};

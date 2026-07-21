import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("add_bots")
        .setDescription("Add a number of bots")
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
            content: "Bots cannot join a player lobby.",
            ephemeral: true
            });
        }
        
        const bots = interaction.options.getInteger("bots", true);
        client.lobbyManager.addBots(interaction.channelId, bots);

        const embed = client.lobbyManager.buildEmbed(interaction.channelId);

        if (lobby.message) {
            await lobby.message.edit({ embeds: [embed] });
        }

        return interaction.reply({
            content: "Successfully added bots.",
            ephemeral: true
        });
    }
};

import {
    PermissionFlagsBits,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";

import  {EmbedCreator} from "../../ui/EmbedCreator.js"

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("bot_lobby")
        .setDescription("Create a bot lobby")
        .addIntegerOption(option =>
            option
                .setName("bots")
                .setDescription("Number of bots")
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const bots = interaction.options.getInteger("bots", true);
        const lobby = client.lobbyManager.botLobby(interaction.channelId, interaction.user.id, bots);

        if (!lobby) {
            return interaction.reply({
                content: "A lobby already exists in this channel.",
                ephemeral: true
            });
        }

        const embed = EmbedCreator.lobby(lobby);
        const message = await interaction.reply({
            embeds: [embed],
            fetchReply: true
        });

        lobby.message = message;
    }
};

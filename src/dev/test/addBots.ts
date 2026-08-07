import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    PermissionFlagsBits
} from "discord.js";

import  {EmbedCreator} from "../../ui/EmbedCreator.js"

export default {
    permissions: [PermissionFlagsBits.Administrator],

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
                flags: MessageFlags.Ephemeral
            });
        }
        if (!lobby.isBotLobby) {
            return interaction.reply({
            content: "Bots cannot join a player lobby.",
            flags: MessageFlags.Ephemeral
            });
        }
        
        const bots = interaction.options.getInteger("bots", true);
        client.lobbyManager.addBots(interaction.channelId, bots);

        const embed = EmbedCreator.lobby(lobby);

        if (lobby.message) {
            await lobby.message.edit({ embeds: [embed] });
        }

        return interaction.reply({
            content: "Successfully added bots.",
            flags: MessageFlags.Ephemeral
        });
    }
};

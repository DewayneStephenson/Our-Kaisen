import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { EmbedCreator } from "../../../ui/EmbedCreator.js";

export default {
    data: new SlashCommandBuilder()
        .setName("leaders")
        .setDescription("Show the next five expedition leaders"),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game?.started) {
            return interaction.reply({
                content: "No active game exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

        return interaction.reply({
            embeds: [EmbedCreator.leaders(game)],
            flags: MessageFlags.Ephemeral,
        });
    },
};

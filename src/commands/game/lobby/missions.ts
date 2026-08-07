import {
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { EmbedCreator } from "../../../ui/EmbedCreator.js";

export default {
    data: new SlashCommandBuilder()
        .setName("missions")
        .setDescription("Show mission sizes, status, and revealed votes"),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game?.started) {
            return interaction.reply({
                content: "No active game exists in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

        return interaction.reply({
            embeds: [EmbedCreator.missions(game)],
            flags: MessageFlags.Ephemeral,
        });
    },
};

import {
    type ChatInputCommandInteraction,
    type Client,
    SlashCommandBuilder,
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong! and latency."),

    cooldown: 5,

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const latency = Math.round(client.ws.ping);
        await interaction.reply(`Pong! Latency: ${latency}ms`);
    },
};

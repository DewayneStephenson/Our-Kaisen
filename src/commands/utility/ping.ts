import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong! and latency."),
    
    cooldown: 5,

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const latency = Math.round(client.ws.ping);
        await interaction.reply(`Pong! Latency: ${latency}ms`);
    }
};

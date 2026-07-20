import { SlashCommandBuilder, type ChatInputCommandInteraction, type Client } from "discord.js";

export default {
    permissions: [], // Optional: ['Administrator', 'ManageMessages']
    cooldown: 3,     // Optional cooldown in seconds

    data: new SlashCommandBuilder()
        .setName("commandname")
        .setDescription("Brief description of what the command does"),

    /**
     * Execute the command
     * @param interaction - The Discord interaction
     * @param client - The bot client
     */
    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        await interaction.reply("Command executed successfully!");
    }
};

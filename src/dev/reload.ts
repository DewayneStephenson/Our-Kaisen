import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client
} from "discord.js";
import { pathToFileURL } from "node:url";

export default {
    data: new SlashCommandBuilder()
        .setName("reload")
        .setDescription("Reload a command")
        .addStringOption(option =>
            option
                .setName("command")
                .setDescription("Command name")
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const name = interaction.options.getString("command", true);
        const cmd = client.commands.get(name);

        if (!cmd?.filePath) {
            return interaction.reply(`Command \`${name}\` not found.`);
        }

        try {
            const moduleUrl = pathToFileURL(cmd.filePath);
            moduleUrl.searchParams.set("update", String(Date.now()));
            const imported = await import(moduleUrl.href);
            const newCmd = imported.default ?? imported;

            if (!newCmd.data || !newCmd.execute) {
                return interaction.reply(`Reloaded module for \`${name}\` is not a valid command.`);
            }

            newCmd.filePath = cmd.filePath;
            client.commands.set(name, newCmd);

            return interaction.reply(`Reloaded \`${name}\`.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return interaction.reply(`Error reloading \`${name}\`: ${message}`);
        }
    }
};

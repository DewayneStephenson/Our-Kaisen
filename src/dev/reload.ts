import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Client
} from "discord.js";
import { pathToFileURL } from "node:url";

export default {
    data: new SlashCommandBuilder()
        .setName("reload")
        .setDescription("Reload a command")
        .addStringOption(option =>
            option.setName("command")
                .setDescription("Command name")
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
       const name = interaction.options.getString("command");
       if (!name) {
            return interaction.reply("You must provide a command name.");
        }

        const cmd = client.commands.get(name);

        if (!cmd) {
            return interaction.reply(`Command \`${name}\` not found.`);
        }

        try {
            // ESM-safe cache busting
            const newPath = `${pathToFileURL(cmd.filePath).href}?update=${Date.now()}`;
            const imported = await import(newPath);

            const newCmd = imported.default;
            newCmd.filePath = cmd.filePath;

            client.commands.set(newCmd.data.name, newCmd);

            return interaction.reply(`Reloaded \`${name}\`.`);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return interaction.reply(`Error reloading \`${name}\`: ${error.message}`);
        }
    },
};

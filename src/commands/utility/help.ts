import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    SlashCommandBuilder,
    EmbedBuilder,
    type ChatInputCommandInteraction,
    type AutocompleteInteraction,
    type Client
} from "discord.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows all available commands")
        .addStringOption(option =>
            option
                .setName("category")
                .setDescription("Filter by command category")
                .setAutocomplete(true)
        ),

    async execute(interaction: ChatInputCommandInteraction | AutocompleteInteraction, client: Client) {
        const categoryFilter = interaction.isAutocomplete()
            ? interaction.options.getFocused()
            : interaction.options.getString("category");

        const commands = client.commands;
        const commandPaths = client.commandPaths;
        const commandsRoot = path.join(__dirname, "..", "..", "commands");

        function getCommandCategory(commandName: string) {
            const filePath = commandPaths.get(commandName);
            if (!filePath) return "other";

            const relativePath = path.relative(commandsRoot, filePath);
            const parts = relativePath.split(path.sep).filter(Boolean);
            return parts[0] || "other";
        }

        // Build category map
        const categories = new Map<string, string[]>();
        for (const [name] of commands) {
            const category = getCommandCategory(name);
            if (!categories.has(category)) categories.set(category, []);
            categories.get(category)!.push(name);
        }

        // Autocomplete mode
        if (interaction.isAutocomplete()) {
            const focused = interaction.options.getFocused();
            const choices = [...categories.keys()].filter(cat =>
                cat.toLowerCase().startsWith(focused.toLowerCase())
            );

            return interaction.respond(
                choices.slice(0, 25).map(cat => ({ name: cat, value: cat }))
            );
        }

        // Category filter mode
        if (categoryFilter && categories.has(categoryFilter)) {
            const cmds = categories.get(categoryFilter)!;

            const embed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle(`Commands — ${categoryFilter}`)
                .setDescription(cmds.map(cmd => `\`/${cmd}\``).join(", "))
                .setFooter({ text: `Total: ${cmds.length}` });

            return interaction.reply({ embeds: [embed] });
        }

        // Show all categories
        const embeds = [...categories.entries()].map(([category, cmds]) =>
            new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle(`${category} Commands`)
                .setDescription(cmds.map(cmd => `\`/${cmd}\``).join(", "))
                .setFooter({ text: `Total: ${cmds.length}` })
        );

        return interaction.reply({ embeds });
    }
};

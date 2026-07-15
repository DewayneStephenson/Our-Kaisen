const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload a command')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Command name')
                .setRequired(true)
        ),

    async execute(interaction) {
        const name = interaction.options.getString('command');
        const cmd = interaction.client.commands.get(name);

        if (!cmd) {
            return interaction.reply(`Command \`${name}\` not found.`);
        }

        try {
            delete require.cache[require.resolve(cmd.filePath)];

            const newCmd = require(cmd.filePath);
            newCmd.filePath = cmd.filePath;

            interaction.client.commands.set(newCmd.data.name, newCmd);

            return interaction.reply(`Reloaded \`${name}\`.`);
        } catch (err) {
            console.error(err);
            return interaction.reply(`Error reloading \`${name}\`: ${err.message}`);
        }
    },
};

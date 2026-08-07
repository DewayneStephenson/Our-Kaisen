import {
    type ChatInputCommandInteraction,
    type Client,
    GuildMember,
    SlashCommandBuilder,
} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("user")
        .setDescription("Provides information about the user."),

    async execute(interaction: ChatInputCommandInteraction, _client: Client) {
        const member = interaction.member;

        let joinedAt: string;

        if (member instanceof GuildMember) {
            joinedAt = member.joinedAt?.toLocaleDateString() ?? "unknown date";
        } else {
            joinedAt = "unknown date";
        }

        await interaction.reply(
            `This command was run by ${interaction.user.username}, who joined on ${joinedAt}.`,
        );
    },
};

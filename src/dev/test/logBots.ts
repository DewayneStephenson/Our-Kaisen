import {
    EmbedBuilder,
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    type Client,
    MessageFlags,
    PermissionFlagsBits
} from "discord.js";

import Player from "../../game/Player.js";
import Game from "../../game/Game.js";
import RoleManager from "../../lobby/LobbyRoleManager.js";
import * as logger from "../../utils/logger.js";

function resolveBotTarget(input: string, botName: string, botId: string): boolean {
    const normalizedInput = input.trim().toLowerCase();
    const normalizedName = botName.trim().toLowerCase();
    const botNumberMatch = normalizedName.match(/^bot\s+(\d+)$/);

    return (
        normalizedInput === botId.toLowerCase() ||
        normalizedInput === normalizedName ||
        normalizedInput === normalizedName.replace(/^bot\s+/, "") ||
        (botNumberMatch !== null && normalizedInput === botNumberMatch[1])
    );
}

function formatMissionStatus(result: boolean | null) {
    if (result === true) return "✅ succeed";
    if (result === false) return "❌ fail";
    return "❓ pending";
}

function chunk<T>(values: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < values.length; index += size) {
        chunks.push(values.slice(index, index + size));
    }

    return chunks;
}

function buildBotEmbed(game: Game, player: Player, allPlayers: Player[]) {
    const botName = game.lobby.botNames.get(player.discordId) ?? player.username;
    const role = player.role;
    const visiblePlayers = player.getVisibleTeammates(allPlayers);
    const isGojo = role?.roleName === RoleManager.ROLES.gojo.name;
    const teamLabel = isGojo ? "Enemies" : "Teammates";
    const emptyTeamLabel = isGojo ? "No visible enemies." : "No visible teammates.";
    const powerText = role?.power
        ? `${role.power.PowerName} (${role.power.uses} use${role.power.uses === 1 ? "" : "s"})`
        : "No power.";
    const voteTarget = game.votes[player.discordId]
        ? `<@${game.votes[player.discordId]}>`
        : "No vote cast.";
    const missionProgress = `${game.missionResults.filter(result => result !== null).length}/${game.missionCount} resolved`;
    const missionDecision = game.missionResults.length
        ? game.missionResults
            .map((result, index) => `${index + 1}. ${formatMissionStatus(result)}`)
            .join("\n")
        : "No mission decisions yet.";

    return new EmbedBuilder()
        .setTitle(`${botName} diagnostics`)
        .setColor(0x5865F2)
        .addFields(
            {
                name: "ID",
                value: player.discordId,
                inline: true
            },
            {
                name: "Role Name",
                value: role?.roleName ?? "Unknown role",
                inline: true
            },
            {
                name: "Power",
                value: powerText,
                inline: false
            },
            {
                name: teamLabel,
                value: visiblePlayers.length ? visiblePlayers.join("\n") : emptyTeamLabel,
                inline: false
            },
            {
                name: "Votes",
                value: voteTarget,
                inline: true
            },
            {
                name: "Missions In",
                value: missionProgress,
                inline: true
            },
            {
                name: "Missions Decision",
                value: missionDecision,
                inline: false
            }
        )
        .setFooter({ text: `Game phase: ${game.phase}` });
}

export default {
    permissions: [PermissionFlagsBits.Administrator],

    data: new SlashCommandBuilder()
        .setName("log_bots")
        .setDescription("Log bot roles and teammates from the active game")
        .addStringOption(option =>
            option
                .setName("target")
                .setDescription("Log every bot or a specific bot")
                .addChoices(
                    { name: "Every bot", value: "all" },
                    { name: "Specific bot", value: "specific" }
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("bot")
                .setDescription("Bot name, number, or Discord id when target is specific")
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const game = client.gameRegistry.getGame(interaction.channelId);

        if (!game || !game.started) {
            return interaction.reply({
                content: "No active game exists in this channel.",
                flags: MessageFlags.Ephemeral
            });
        }

        const target = interaction.options.getString("target", true);
        const botQuery = interaction.options.getString("bot");

        const players = game.players as Player[];
        const bots = players.filter((player: Player) => game.lobby.botNames.has(player.discordId));

        if (!bots.length) {
            return interaction.reply({
                content: "No bots were found in the active game.",
                flags: MessageFlags.Ephemeral
            });
        }

        let selectedBots = bots;

        if (target === "specific") {
            if (!botQuery) {
                return interaction.reply({
                    content: "Provide a bot name, number, or Discord id in the bot option.",
                    flags: MessageFlags.Ephemeral
                });
            }

            selectedBots = bots.filter((player: Player) => {
                const botName = game.lobby.botNames.get(player.discordId) ?? player.username;
                return resolveBotTarget(botQuery, botName, player.discordId);
            });

            if (!selectedBots.length) {
                return interaction.reply({
                    content: `No bot matched \"${botQuery}\".`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const embeds = selectedBots.map(player => buildBotEmbed(game, player, players));

        for (const player of selectedBots) {
            const botName = game.lobby.botNames.get(player.discordId) ?? player.username;
            const roleName = player.role?.roleName ?? "unknown role";
            const teammates = player.getVisibleTeammates(game.players);
            const teammateText = teammates.length ? teammates.join(", ") : "none";

            logger.info(
                `[${interaction.channelId}] ${botName} (${player.discordId}) has role ${roleName}; teammates: ${teammateText}`
            );
        }

        const [firstBatch, ...otherBatches] = chunk(embeds, 10);

        await interaction.reply({
            content: `Showing ${selectedBots.length} bot diagnostic embed(s).`,
            embeds: firstBatch,
            flags: MessageFlags.Ephemeral
        });

        for (const batch of otherBatches) {
            await interaction.followUp({
                embeds: batch,
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
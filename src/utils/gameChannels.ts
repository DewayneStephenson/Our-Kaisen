import {
    ChannelType,
    type ChatInputCommandInteraction,
    type Client,
    PermissionFlagsBits,
    type TextChannel,
    ThreadAutoArchiveDuration,
} from "discord.js";
import type Game from "../game/Game.js";
import * as logger from "./logger.js";

function channelName(title: string, suffix: string) {
    const slug =
        title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 85) || "kaisen-game";

    return `${slug}-${suffix}`.slice(0, 100);
}

export function gameIdentity(game: Game) {
    return `**${game.name}** • Game ID: \`${game.id}\``;
}

export async function createGameChannels(
    interaction: ChatInputCommandInteraction,
    game: Game,
) {
    if (!interaction.guild) {
        return {
            success: false as const,
            message: "Games must be started in a server.",
        };
    }

    await interaction.guild.channels.fetch();

    const title = game.name;
    const parentId =
        interaction.channel && "parentId" in interaction.channel
            ? interaction.channel.parentId
            : null;
    const botId = interaction.client.user?.id;
    const participantRole = await interaction.guild.roles.create({
        name: `kaisen-${game.id.toLowerCase()}`,
        reason: `Access role for Kaisen game ${game.id}`,
    });
    const readonlyOverwrites = [
        {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.SendMessages],
        },
        ...(botId
            ? [
                  {
                      id: botId,
                      allow: [
                          PermissionFlagsBits.ViewChannel,
                          PermissionFlagsBits.SendMessages,
                          PermissionFlagsBits.ManageChannels,
                      ],
                  },
              ]
            : []),
    ];
    const participantIds = new Set(
        game.players.map((player) => player.discordId),
    );
    if (game.lobby.isBotLobby && game.lobby.host)
        participantIds.add(game.lobby.host);
    const gameOverwrites = [
        {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
        },
        {
            id: participantRole.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
            ],
        },
        ...(botId
            ? [
                  {
                      id: botId,
                      allow: [
                          PermissionFlagsBits.ViewChannel,
                          PermissionFlagsBits.SendMessages,
                          PermissionFlagsBits.ManageChannels,
                      ],
                  },
              ]
            : []),
    ];

    const findOrCreateTextChannel = async (name: string, reason: string) => {
        const existing = interaction.guild?.channels.cache.find(
            (channel) =>
                channel.name === name && channel.type === ChannelType.GuildText,
        );

        if (existing) return existing as TextChannel;

        return interaction.guild?.channels.create({
            name,
            type: ChannelType.GuildText,
            parent: parentId ?? undefined,
            permissionOverwrites: readonlyOverwrites,
            reason,
        }) as Promise<TextChannel>;
    };

    const gameChannel = await interaction.guild.channels.create({
        name: channelName(title, `${game.id.toLowerCase()}-game`),
        type: ChannelType.GuildText,
        parent: parentId ?? undefined,
        permissionOverwrites: gameOverwrites,
        reason: "Kaisen game started",
    });
    await Promise.all(
        [...participantIds].map(async (id) => {
            try {
                const member = await interaction.guild?.members.fetch(id);
                await member?.roles.add(
                    participantRole,
                    `Kaisen game ${game.id} participant`,
                );
            } catch {
                // Bot-lobby placeholders are not guild members and do not receive a role.
            }
        }),
    );
    const logChannel = await findOrCreateTextChannel(
        "game-logs",
        "Kaisen game logs",
    );
    await logChannel.permissionOverwrites.edit(participantRole.id, {
        ViewChannel: false,
    });
    const resultsChannel = await findOrCreateTextChannel(
        "game-results",
        "Kaisen game results",
    );
    const logThread = await logChannel.threads.create({
        name: `${game.name} • ${game.id}`.slice(0, 100),
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        reason: `Kaisen game ${game.id} logs`,
    });
    const voiceChannelName = channelName(
        title,
        `${game.id.toLowerCase()}-voice`,
    );
    const existingVoiceChannel = interaction.guild.channels.cache.find(
        (channel) =>
            channel.name === voiceChannelName &&
            channel.type === ChannelType.GuildVoice,
    );
    const voiceChannel =
        existingVoiceChannel ??
        (await interaction.guild.channels.create({
            name: voiceChannelName,
            type: ChannelType.GuildVoice,
            parent: parentId ?? undefined,
            permissionOverwrites: gameOverwrites,
            reason: "Kaisen game voice channel",
        }));

    game.logChannelId = logChannel.id;
    game.guildId = interaction.guild.id;
    game.logThreadId = logThread.id;
    game.resultsChannelId = resultsChannel.id;
    game.voiceChannelId = voiceChannel.id;
    game.participantRoleId = participantRole.id;
    interaction.client.gameRegistry.moveGameToChannel(game, gameChannel.id);
    return {
        success: true as const,
        gameChannel: gameChannel as TextChannel,
        logChannel,
        logThread,
        resultsChannel,
    };
}

export async function postGameResult(game: Game, content: string) {
    if (!game.resultsChannelId) return;

    try {
        const channel = await game.lobby.message?.client.channels.fetch(
            game.resultsChannelId,
        );
        if (channel?.isSendable())
            await channel.send({
                content: `${gameIdentity(game)}\n${content}`,
            });
    } catch (error) {
        logger.error(
            `[${game.channelId}] Failed to post game result: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

export async function postGameLog(game: Game, content: string) {
    if (!game.logThreadId) return;

    try {
        const channel = await game.lobby.message?.client.channels.fetch(
            game.logThreadId,
        );

        if (channel?.isSendable()) {
            const namedContent = content.replace(
                /<@(\d+)>/g,
                (mention, playerId: string) => {
                    const botName = game.lobby.botNames.get(playerId);
                    if (botName) return botName;

                    const player = game.players.find(
                        (candidate) => candidate.discordId === playerId,
                    );
                    return player ? `${mention} (${player.username})` : mention;
                },
            );
            const timestampedContent = `${gameIdentity(game)}\n<t:${Math.floor(Date.now() / 1000)}:F>\n${namedContent}`;
            for (
                let index = 0;
                index < timestampedContent.length;
                index += 2_000
            ) {
                await channel.send({
                    content: timestampedContent.slice(index, index + 2_000),
                });
            }
        }
    } catch (error) {
        logger.error(
            `[${game.channelId}] Failed to write game log: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

export async function destroyGameSession(client: Client, game: Game) {
    // Remove the game first so no new interactions can find it while Discord
    // resources are being deleted. Registry cleanup also cancels every timer.
    client.gameRegistry.deleteGame(game.channelId, client);

    if (game.voiceChannelId) {
        try {
            const voiceChannel = await client.channels.fetch(
                game.voiceChannelId,
            );
            if (
                voiceChannel &&
                "delete" in voiceChannel &&
                typeof voiceChannel.delete === "function"
            ) {
                await voiceChannel.delete("Kaisen game finished");
            }
        } catch (error) {
            logger.error(
                `[${game.channelId}] Failed to delete game voice channel: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    if (game.guildId && game.participantRoleId) {
        try {
            const guild = await client.guilds.fetch(game.guildId);
            const role = await guild.roles.fetch(game.participantRoleId);
            await role?.delete("Kaisen game finished");
        } catch (error) {
            logger.error(
                `[${game.channelId}] Failed to delete participant role: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    // Delete the text channel last so commands can acknowledge the request
    // before the interaction's channel disappears.
    try {
        const channel = await client.channels.fetch(game.channelId);
        if (
            channel &&
            "delete" in channel &&
            typeof channel.delete === "function"
        ) {
            await channel.delete("Kaisen game finished");
        }
    } catch (error) {
        logger.error(
            `[${game.channelId}] Failed to delete game text channel: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

export function scheduleGameCleanup(client: Client, game: Game) {
    if (game.cleanupTimer) return;

    game.cleanupTimer = setTimeout(() => {
        void destroyGameSession(client, game);
    }, 60_000);
}

import { EmbedBuilder } from "discord.js";
import Lobby from "../lobby/Lobby.js";
import RoleManager from "../lobby/LobbyRoleManager.js";
import Game from "../game/Game.js";
import Player from "../game/Player.js";
import {
    getMissionTeamSizes,
    getRequiredFails
} from "../game/managers/MissionManager.js";




export class EmbedCreator {
    private static playerLabel(game: Game, playerId: string) {
        return game.lobby.botNames.get(playerId) ?? `<@${playerId}>`;
    }

    private static formatMissionStatus(result: boolean | null) {
        if (result === true) return "✅ succeed";
        if (result === false) return "❌ fail";
        return "❓ hasn\'t happened yet";
    }

    private static formatPhase(phase: Game["phase"]) {
        return phase.charAt(0) + phase.slice(1).toLowerCase();
    }

    static lobby(lobby: Lobby) {
        const players = lobby.players.map(id =>
            lobby.botNames.get(id)
                ?? `<@${id}>`
        );
        const timerText = [
            `Mission selection: ${lobby.timerSettings.missionSelectionSeconds}s`,
            `Voting: ${lobby.timerSettings.votingSeconds}s`,
            `Mission decision: ${lobby.timerSettings.missionSeconds}s`,
            `Sealing: ${lobby.timerSettings.sealingSeconds}s`,
            `Action time: ${lobby.timerSettings.actionTimeSeconds}s`,
            `Phase voice mute: ${lobby.timerSettings.phaseMuteEnabled ? "enabled" : "disabled"}`,
            `Phase chat lock: ${lobby.timerSettings.phaseChatLockEnabled ? "enabled" : "disabled"}`
        ].join("\n");

        return new EmbedBuilder()
            .setTitle("Lobby")
            .setColor(0x5865F2)
            .addFields(
                {
                name: "Host",
                    value: `<@${lobby.host}>`,
                    inline: true
                },
                {
                    name: "Game Title",
                    value: lobby.title ?? "Automatically generated when the game starts.",
                    inline: false
                },
                {
                name: `Players (${lobby.players.length})`,
                value: players.length
                    ? players.join("\n")
                    : "No players yet."
                },
                {
                    name: "Roles",
                    value: lobby.roles.length > 0
                        ? lobby.roles.map(r => RoleManager.ROLES[r].name).join(", ")
                        : "No roles selected."
                },
                {
                    name: "Timers",
                    value: timerText,
                    inline: false
                }
            )
            .setFooter({ text: "Use /join to enter the lobby" });
    }
    static game(game: Game) {
        const missions = game.missionResults
            .map((result, index) => `${index + 1}. ${EmbedCreator.formatMissionStatus(result)}`)
            .join("\n");

        return new EmbedBuilder()
            .setTitle("Game")
            .setColor(0x5865F2)
            .addFields(
                {
                name: `Players (${game.players.length})`,
                value: game.players.length
                    ? game.players
                    .map(player => EmbedCreator.playerLabel(game, player.discordId))
                    .join("\n")
                    : "No players yet."
                },
                {
                    name: "Roles",
                    value: game.lobby.roles.length > 0
                        ? game.lobby.roles.map(role => RoleManager.ROLES[role].name).join(", ")
                        : "No roles selected."
                },
                {
                    name: "Phase",
                    value: EmbedCreator.formatPhase(game.phase),
                    inline: true
                },
                {
                    name: `Missions (${game.missionResults.filter(result => result !== null).length}/${game.missionCount})`,
                    value: missions || "No missions yet."
                }
            )
            .setFooter({ text: "Game in progress" });
    }

    static mission(game: Game) {
        const missionIndex = game.missionResults.findIndex(result => result === null);
        const missionNumber = missionIndex === -1 ? game.missionCount : missionIndex + 1;
        const teamSizes = getMissionTeamSizes(game.players.length);
        const requiredTeamSize = teamSizes[missionIndex] ?? teamSizes[teamSizes.length - 1] ?? 0;
        const requiredFails = getRequiredFails(game.players.length, missionNumber);
        const leader = game.players[0];
        const expedition = game.expedition.length
            ? game.expedition.map(id => EmbedCreator.playerLabel(game, id)).join("\n")
            : "No expedition selected yet.";
        const approvalVotes = Object.keys(game.expeditionVotes).length
            ? Object.entries(game.expeditionVotes)
                .map(([voterId, vote]) => `${EmbedCreator.playerLabel(game, voterId)}: ${vote === "approve" ? "Approve" : "Reject"}`)
                .join("\n")
            : "No approval votes yet.";
        const missionVotes = game.phase === "MISSION"
            ? `${Object.keys(game.missionVotes).length}/${game.expedition.length} submitted`
            : "No mission vote in progress.";
        const timerText = [
            `Mission selection: ${game.timerSettings.missionSelectionSeconds}s`,
            `Voting: ${game.timerSettings.votingSeconds}s`,
            `Mission decision: ${game.timerSettings.missionSeconds}s`,
            `Sealing: ${game.timerSettings.sealingSeconds}s`,
            `Action time: ${game.timerSettings.actionTimeSeconds}s`,
            `Phase voice mute: ${game.timerSettings.phaseMuteEnabled ? "enabled" : "disabled"}`,
            `Phase chat lock: ${game.timerSettings.phaseChatLockEnabled ? "enabled" : "disabled"}`
        ].join("\n");
        const phaseTimerText = game.phaseTimerEndsAt
            ? `<t:${Math.ceil(game.phaseTimerEndsAt / 1000)}:R> (ends <t:${Math.ceil(game.phaseTimerEndsAt / 1000)}:t>)`
            : "No active phase timer.";
        const missions = game.missionResults
            .map((result, index) => {
                const votes = game.missionVoteResults[index];
                const voteText = votes?.length
                    ? votes.map(vote => vote === "pass" ? "✅ Succeed" : "❌ Fail").join(", ")
                    : "No votes revealed.";

                return `${index + 1}. ${EmbedCreator.formatMissionStatus(result)}\nVotes: ${voteText}`;
            })
            .join("\n");

        return new EmbedBuilder()
            .setTitle("Mission Control")
            .setColor(0x5865F2)
            .addFields(
                {
                    name: "Mission Leader",
                    value: leader ? EmbedCreator.playerLabel(game, leader.discordId) : "No leader.",
                    inline: true
                },
                {
                    name: "Mission",
                    value: `${missionNumber}/${game.missionCount}`,
                    inline: true
                },
                {
                    name: "Team Size",
                    value: `${requiredTeamSize} player${requiredTeamSize === 1 ? "" : "s"}`,
                    inline: true
                },
                {
                    name: "Expedition",
                    value: expedition,
                    inline: false
                },
                {
                    name: "Approval Votes",
                    value: approvalVotes,
                    inline: false
                },
                {
                    name: "Mission Votes",
                    value: missionVotes,
                    inline: false
                },
                {
                    name: "Required Fails",
                    value: String(requiredFails),
                    inline: true
                },
                {
                    name: "Timers",
                    value: timerText,
                    inline: false
                },
                {
                    name: "Phase Timer",
                    value: phaseTimerText,
                    inline: false
                },
                {
                    name: "Mission History",
                    value: missions || "No missions yet.",
                    inline: false
                }
            )
            .setFooter({ text: `Phase: ${game.phase}` });
    }

    static missionResult(
        missionNumber: number,
        success: boolean,
        fails: number,
        requiredFails: number,
        votes: Array<"pass" | "fail">
    ) {
        return new EmbedBuilder()
            .setTitle(`Mission ${missionNumber} ${success ? "Succeeded" : "Failed"}`)
            .setColor(success ? 0x57F287 : 0xED4245)
            .setDescription(success
                ? "The sorcerers completed the mission."
                : "The curses sabotaged the mission.")
            .addFields(
                {
                    name: "Anonymous Votes",
                    value: votes.map(vote => vote === "pass" ? "✅ Succeed" : "❌ Fail").join("\n"),
                    inline: false
                },
                {
                    name: "Fails",
                    value: `${fails}/${requiredFails} required to fail`,
                    inline: true
                }
            );
    }

    static missions(game: Game) {
        const sizes = getMissionTeamSizes(game.players.length);

        return new EmbedBuilder()
            .setTitle("Mission Status")
            .setColor(0x5865F2)
            .setDescription(game.missionResults.map((result, index) => {
                const votes = game.missionVoteResults[index];
                const voteText = votes?.length
                    ? ` Votes: ${votes.map(vote => vote === "pass" ? "✅" : "❌").join(" ")}`
                    : "";
                return `Mission ${index + 1} — team of ${sizes[index] ?? 0}: ${EmbedCreator.formatMissionStatus(result)}.${voteText}`;
            }).join("\n"))
            .setFooter({ text: `Current phase: ${EmbedCreator.formatPhase(game.phase)}` });
    }

    static leaders(game: Game) {
        const nextLeaders = Array.from({ length: Math.min(5, game.players.length) }, (_, index) => {
            const player = game.players[index];
            return `${index + 1}. ${EmbedCreator.playerLabel(game, player.discordId)}`;
        });

        return new EmbedBuilder()
            .setTitle("Upcoming Expedition Leaders")
            .setColor(0x5865F2)
            .setDescription(nextLeaders.join("\n") || "No players are available.");
    }

    static roundResult(game: Game) {
        const winners = game.players
            .filter(player => player.role.alignment === game.winnerAlignment)
            .map(player => `${EmbedCreator.playerLabel(game, player.discordId)} — ${player.role.roleName}`)
            .join("\n") || "None";
        const losers = game.players
            .filter(player => player.role.alignment !== game.winnerAlignment)
            .map(player => `${EmbedCreator.playerLabel(game, player.discordId)} — ${player.role.roleName}`)
            .join("\n") || "None";
        const assassin = game.players.find(player => player.discordId === game.sealingAssassinId);
        const target = game.players.find(player => player.discordId === game.sealingTargetId);
        const sealingText = assassin && target
            ? `${EmbedCreator.playerLabel(game, assassin.discordId)} selected ${EmbedCreator.playerLabel(game, target.discordId)}.`
            : "The curses won three missions.";

        return new EmbedBuilder()
            .setTitle(`${game.winnerAlignment}s Win!`)
            .setColor(game.winnerAlignment === "Sorcerer" ? 0x57F287 : 0xED4245)
            .setDescription(sealingText)
            .addFields(
                { name: "Winners", value: winners, inline: false },
                { name: "Losers", value: losers, inline: false }
            )
            .setFooter({ text: "All roles are now revealed." });
    }

    static player(game: Game, userID: string) {
        return this.playerDM(game, userID);
    }

    static playerDM(game: Game, userID: string) {
        const player = game.players.find((currentPlayer: Player) => currentPlayer.discordId === userID);

        if (!player) {
            return new EmbedBuilder()
                .setTitle("Player Info")
                .setColor(0x5865F2)
                .setDescription("Player not found.");
        }

        const role = player.role;
        const teammates = player.getVisibleTeammates(game.players);
        const teamLabel = role.roleName === RoleManager.ROLES.gojo.name
            ? "Enemies"
            : "Teammates";
        const emptyLabel = role.roleName === RoleManager.ROLES.gojo.name
            ? "No visible enemies."
            : "No visible teammates.";

        return new EmbedBuilder()
            .setTitle(`${player.username}'s Info`)
            .setColor(0x5865F2)
            .addFields(
                {
                    name: "Role",
                    value: role.roleName,
                    inline: true
                },
                {
                    name: "Alignment",
                    value: role.alignment,
                    inline: true
                },
                {
                    name: "Description",
                    value: role.description || "No description available.",
                    inline: false
                },
                {
                    name: teamLabel,
                    value: teammates.length
                        ? teammates.join("\n")
                        : emptyLabel,
                    inline: false
                }
            )
            .setFooter({ text: "Keep this private" });
    }

}

const { EmbedBuilder } = require('discord.js');
const Lobby = require('./Lobby');
const RoleManager = require('./RoleManager')

class LobbyManager {
	constructor() {
		this.lobbies = new Map();
	}

	createLobby(channelId, userID) {
    if (this.lobbies.has(channelId)) return null;

    const lobby = new Lobby(channelId);

    lobby.players.push(userID);

    lobby.roles = RoleManager.DefaultMode(lobby.players.length);

    this.lobbies.set(channelId, lobby);
    return lobby;
}


	getLobby(channelId) {
		return this.lobbies.get(channelId);
	}

	deleteLobby(channelId) {
		return this.lobbies.delete(channelId);
	}

	buildEmbed(channelId) {
		const lobby = this.getLobby(channelId);
		if (!lobby) return null;

		return new EmbedBuilder()
			.setTitle('Lobby')
			.addFields(
				{
					name: `Players (${lobby.players.length})`,
					value: lobby.players.length ? lobby.players.map((id) => `<@${id}>`).join('\n') : 'Empty Lobby',
				},
				{
					name: 'Roles',
					value: lobby.roles.length ? lobby.roles
					.filter(r => r)
					.map(r => r.name)
					.join(', ') : 'Default Mode',

				},
			);
	}

	addPlayer(channelId, userId) {
		const lobby = this.getLobby(channelId);
		if (!lobby) return null;

		if (!lobby.players.includes(userId)) {
			lobby.players.push(userId);
		}
		return lobby;
	}
	removePlayer(channelId, userId) {
		const lobby = this.getLobby(channelId);
		if (!lobby) return null;

		if (lobby.players.includes(userId)) {
			lobby.players = lobby.players.filter(id => id !== userId);
			
		}
		if (lobby.players.length === 0) {
			this.deleteLobby(channelId);
		}
		return lobby;
	}
}

module.exports = LobbyManager;

/**
 * Sends an error reply to an interaction
 * Automatically handles deferred/replied interactions
 * @async
 * @param {Interaction} interaction - The Discord interaction to reply to
 * @param {string} message - The error message to send
 * @returns {Promise<Message>} The sent message
 */
async function sendErrorReply(interaction, message) {
	const reply = { content: message, ephemeral: true };
	return interaction.replied || interaction.deferred
		? interaction.followUp(reply)
		: interaction.reply(reply);
}

module.exports = { sendErrorReply };

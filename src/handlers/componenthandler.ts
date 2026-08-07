import type { Client, StringSelectMenuInteraction } from "discord.js";
import { handleMissionInteraction } from "./missionComponentHandler.js";

export default {
    async handle(interaction: StringSelectMenuInteraction, client: Client) {
        return handleMissionInteraction(interaction, client);
    },
};

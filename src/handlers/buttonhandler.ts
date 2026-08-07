import type { ButtonInteraction, Client } from "discord.js";
import { handleMissionButton } from "./missionComponentHandler.js";

export default {
    async handle(interaction: ButtonInteraction, client: Client) {
        return handleMissionButton(interaction, client);
    }
};

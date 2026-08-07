// Player.ts
import { KaisenRole } from "../types/game.js";

export default class Player {
    discordId: string;
    username: string;
    role!: KaisenRole;

    constructor(id: string, name: string) {
        this.discordId = id;
        this.username = name;
        // role assigned later
    }

    getVisibleTeammates(allPlayers: Player[]): string[] {
        if (!this.role) return [];
        return this.role.calculateTeammates(this, allPlayers);
    }

    display(): string {
        return `${this.username} (${this.discordId})`;
    }
}

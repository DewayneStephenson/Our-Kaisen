// RoleManager.ts
import type { KaisenRole } from "../../types/game.js";
import type Player from "../Player.js";

export default class RoleManager {
    roles: KaisenRole[];

    constructor(roles: KaisenRole[]) {
        this.roles = roles;
    }

    assignRoles(players: Player[]) {
        if (players.length !== this.roles.length) {
            return { success: false, reason: "role_player_count_mismatch" };
        }

        const shuffled = [...this.roles].sort(() => Math.random() - 0.5);

        players.forEach((p, i) => {
            p.role = shuffled[i];
        });

        return { success: true };
    }
}

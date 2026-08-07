// RoleManager.ts
import { KaisenRole} from "../../types/game.js";
import Player from "../Player.js"


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

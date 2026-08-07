import { KaisenRole,Power } from "../types/game.js";
import Player from "./Player.js"
import LobbyRoleManager from "../lobby/LobbyRoleManager.js"

export class FingerBearer implements KaisenRole {
    roleName = LobbyRoleManager.ROLES.finger.name;
    alignment = LobbyRoleManager.ROLES.finger.alignment;
    calculateTeammates(viewer: Player, allPlayers: Player[]): string[] {
    if (!viewer.role) return []; 

    const CurseNotToji = (p: Player) => 
        p.role && 
        p.role.alignment === "Curse" && 
        p.role.roleName !== LobbyRoleManager.ROLES.toji.name;

    const teammates = allPlayers.filter(
        p => CurseNotToji(p) && p.discordId !== viewer.discordId
    );

    return teammates.map(p => p.username);
}

    canFail = true;
    
}
export class StitchedFace implements KaisenRole {
    roleName = LobbyRoleManager.ROLES.kenny.name;
    alignment = LobbyRoleManager.ROLES.kenny.alignment;
   calculateTeammates(viewer: Player, allPlayers: Player[]): string[] {
    if (!viewer.role) return []; // TS safe

    const CurseNotToji = (p: Player) => 
        p.role && 
        p.role.alignment === "Curse" && 
        p.role.roleName !== LobbyRoleManager.ROLES.toji.name;

    const teammates = allPlayers.filter(
        p => CurseNotToji(p) && p.discordId !== viewer.discordId
    );

    return teammates.map(p => p.username);
}

    canFail = true;
    
}
export class CursedSorcerer implements KaisenRole {
    roleName = LobbyRoleManager.ROLES.geto.name;
    alignment = LobbyRoleManager.ROLES.geto.alignment;
    calculateTeammates(viewer: Player, allPlayers: Player[]): string[] {
    if (!viewer.role) return []; // TS safe

    const CurseNotToji = (p: Player) => 
        p.role && 
        p.role.alignment === "Curse" && 
        p.role.roleName !== LobbyRoleManager.ROLES.toji.name;

    const teammates = allPlayers.filter(
        p => CurseNotToji(p) && p.discordId !== viewer.discordId
    );

    return teammates.map(p => p.username);
}
    canFail = true;
    
}
export class FlyHead implements KaisenRole {
    roleName = LobbyRoleManager.ROLES.fly.name;
    alignment = LobbyRoleManager.ROLES.fly.alignment;
     calculateTeammates(viewer: Player, allPlayers: Player[]): string[] {
    if (!viewer.role) return []; // TS safe

    const CurseNotToji = (p: Player) => 
        p.role && 
        p.role.alignment === "Curse" && 
        p.role.roleName !== LobbyRoleManager.ROLES.toji.name;

    const teammates = allPlayers.filter(
        p => CurseNotToji(p) && p.discordId !== viewer.discordId
    );

    return teammates.map(p => p.username);
}
    canFail = true;
    missionFails? = 1;
    
}

export class Energyless implements KaisenRole {
    roleName = LobbyRoleManager.ROLES.toji.name;
    alignment = LobbyRoleManager.ROLES.toji.alignment;
    calculateTeammates(viewer: Player, allPlayers: Player[]): string[] { return [];} 
    canFail = true;
    
}
export class Grade2 implements KaisenRole {
    roleName = LobbyRoleManager.ROLES.grade2.name;
    alignment = LobbyRoleManager.ROLES.grade2.alignment;
    calculateTeammates(viewer: Player, allPlayers: Player[]): string[] { return []};
    canFail = false;
    
}
export class Grade4 implements KaisenRole {
    roleName = LobbyRoleManager.ROLES.grade4.name;
    alignment = LobbyRoleManager.ROLES.grade4.alignment;
    calculateTeammates(viewer: Player, allPlayers: Player[]): string[] { return []};    
    canFail = false;
    
}
export class CursedChild implements KaisenRole {
    roleName = LobbyRoleManager.ROLES.yuta.name;
    alignment = LobbyRoleManager.ROLES.yuta.alignment;

    calculateTeammates(viewer: Player, allPlayers: Player[]): string[] {  
        if (!viewer.role) return [];

        const isGojoOrKenny = (p: Player) =>
            p.role!.roleName === LobbyRoleManager.ROLES.gojo.name ||
            p.role!.roleName === LobbyRoleManager.ROLES.kenny.name;

        const teammates = allPlayers.filter(
            p => isGojoOrKenny(p) &&
            p.discordId !== viewer.discordId
        );

        return teammates.map(p => p.username);
    }

    canFail = false;
}

export class NailAndHammer implements KaisenRole {
    roleName = LobbyRoleManager.ROLES.nobara.name;
    alignment = LobbyRoleManager.ROLES.nobara.alignment;
    calculateTeammates(viewer: Player, allPlayers: Player[]): string[] { return []};
    canFail = false;
    power: Power = {
        PowerName: "Resonance",
        uses: 1,
        target(actor: Player, target: Player) {
            if (target.role.alignment === "Curse") {
                return `${actor.username} detects ${target.username} is a Curse.`;
            }

            return `${actor.username} confirms ${target.username} is a Sorcerer.`;
        }

    }   
}
export class HonoredOne implements KaisenRole {
    roleName = LobbyRoleManager.ROLES.gojo.name;
    alignment = LobbyRoleManager.ROLES.gojo.alignment;
    calculateTeammates(viewer: Player,allPlayers: Player[]): string[] {
     const CurseNotKenny = (p: Player) => 
        p.role.alignment === "Curse" && 
        p.role.roleName !== LobbyRoleManager.ROLES.kenny.name;
    const Grade4 = (p: Player) => 
        p.role.roleName === LobbyRoleManager.ROLES.grade4.name;
    const teammates = allPlayers.filter(
        p => (CurseNotKenny(p) || Grade4(p)) &&
        p.discordId !== viewer.discordId);
        return teammates.map(p => p.username);

    }
    canFail = false;
}

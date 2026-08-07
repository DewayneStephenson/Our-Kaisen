import * as RoleClasses from "../game/GameRole.js"; 
import { KaisenRole } from "../types/game.js";

export const ROLES = {
    gojo: {
        key: "gojo",
        name: "Honored One",
        alignment: "Sorcerer",
        required: true,
        class: RoleClasses.HonoredOne
    },
    yuta: {
        key: "yuta",
        name: "Cursed Child",
        alignment: "Sorcerer",
        required: false,
        class: RoleClasses.CursedChild
    },
    nobara: {
        key: "nobara",
        name: "Nail and Hammer",
        alignment: "Sorcerer",
        required: false,
        class: RoleClasses.NailAndHammer
    },
    grade2: {
        key: "grade2",
        name: "Grade 2 Sorcerer",
        alignment: "Sorcerer",
        required: true,
        class: RoleClasses.Grade2
    },
    grade4: {
        key: "grade4",
        name: "Grade 4 Sorcerer",
        alignment: "Sorcerer",
        required: false,
        class: RoleClasses.Grade4
    },
    kenny: {
        key: "kenny",
        name: "Stitched Face",
        alignment: "Curse",
        required: false,
        class: RoleClasses.StitchedFace
    },
    geto: {
        key: "geto",
        name: "Cursed Sorcerer",
        alignment: "Curse",
        required: false,
        class: RoleClasses.CursedSorcerer
    },
    finger: {
        key: "finger",
        name: "Finger Bearer",
        alignment: "Curse",
        required: true,
        class: RoleClasses.FingerBearer
    },
    fly: {
        key: "fly",
        name: "Fly Head",
        alignment: "Curse",
        required: false,
        class: RoleClasses.FlyHead
    },
    toji: {
        key: "toji",
        name: "Energyless",
        alignment: "Curse",
        required: false,
        class: RoleClasses.Energyless
    }
} as const;

export type RoleKey = keyof typeof ROLES;

function DefaultMode(playerCount: number): RoleKey[] {
    const roles: RoleKey[] = [];

    const curseCount =
        playerCount <= 6 ? 2 :
        playerCount <= 9 ? 3 :
        playerCount <= 12 ? 4 :
        5;

    // required curses
    for (let i = 0; i < curseCount; i++) {
        roles.push("finger");
    }

    if (playerCount <= 4) {
        roles.push("grade2", "grade2");
        roles.push("gojo");
        return roles;
    }

    const sorcererCount = playerCount - curseCount - 1;

    for (let i = 0; i < sorcererCount; i++) {
        roles.push("grade2");
    }

    roles.push("gojo");
    return roles;
}

      
// Note: You do not need to create a new array although i like it for preference sake
function addRole(currentRoles: RoleKey[], roleName: RoleKey) {
    const role = ROLES[roleName];

    if (role.required)
        return { success: false, reason: "required", currentRoles };

    if (currentRoles.includes(roleName))
        return { success: false, reason: "dupe", currentRoles };

    let index = -1;

    if (role.alignment === "Sorcerer") {
        index = currentRoles.findIndex(r => ROLES[r].name === "Grade 2 Sorcerer");
    }

    if (role.alignment === "Curse") {
        index = currentRoles.findIndex(r => ROLES[r].name === "Finger Bearer");
    }

    if (index === -1)
        return { success: false, reason: "alignment", currentRoles };

    const newRoles = [...currentRoles];
    newRoles[index] = roleName;

    return { success: true, reason: "success", newRoles };
}

function removeRole(currentRoles: RoleKey[], roleName: RoleKey) {
    const role = ROLES[roleName];

    if (role.required)
        return { success: false, reason: "required", currentRoles };

    const index = currentRoles.findIndex(r => r === roleName);
    if (index === -1)
        return { success: false, reason: "not_in", currentRoles };

    const newRoles = [...currentRoles];

    const replacement = role.alignment === "Sorcerer" ? "grade2" : "finger";
    newRoles.splice(index, 1, replacement);

    return { success: true, reason: "success", newRoles };
}

function updateRole(currentRoles: RoleKey[], players: number): RoleKey[] {
    const currentSorcerers = currentRoles.filter(r => ROLES[r].alignment === "Sorcerer");
    const currentCurses = currentRoles.filter(r => ROLES[r].alignment === "Curse");

    const defaultConfig = DefaultMode(players);
    const defaultSorcerers = defaultConfig.filter(r => ROLES[r].alignment === "Sorcerer");
    const defaultCurses = defaultConfig.filter(r => ROLES[r].alignment === "Curse");

    let sorcererDiff = defaultSorcerers.length - currentSorcerers.length;
    let curseDiff = defaultCurses.length - currentCurses.length;

    if (curseDiff > 0) {
        currentCurses.push(...Array(curseDiff).fill("finger"));
    }

    if (sorcererDiff > 0) {
        currentSorcerers.splice(currentSorcerers.length - 1, 0, ...Array(sorcererDiff).fill("grade2"));
    }

    while (curseDiff < 0) {
        const idx = currentCurses.findIndex(r => ROLES[r].name === "Finger Bearer");
        currentCurses.splice(idx === -1 ? 0 : idx, 1);
        curseDiff++;
    }

    while (sorcererDiff < 0) {
        const idx = currentSorcerers.findIndex(r => ROLES[r].name === "Grade 2 Sorcerer");
        currentSorcerers.splice(idx === -1 ? 0 : idx, 1);
        sorcererDiff++;
    }

    return [...currentCurses, ...currentSorcerers];
    /*
Gojo, grade_2,grade_2,finger,finger +1 = Gojo, grade_2,grade_2,grade_2,finger,finger
Gojo, grade_2,grade_2,finger,finger +2 = Gojo, grade_2,grade_2,grade_2,finger,finger,finger
Gojo, grade_2,grade_2,grade_2,finger,finger,finger -2 = Gojo,grade_2,grade_2,finger,finger
Gojo, grade_2,grade_2,yuta,toji,finger,finger -2 = Gojo, grade_2,yuta,toji,finger
Gojo, nobara,grade_4,yuta,toji,geto,fly -2 = Gojo, nobaru,yuta,toji,geto (it doesnt matter which non-required role gets removed)
*/
}
export default { ROLES, DefaultMode, addRole, removeRole, updateRole};


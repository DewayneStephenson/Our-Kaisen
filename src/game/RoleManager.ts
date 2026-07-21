import Role from "./Role.js";

const ROLES = {
        gojo: new Role("Honored One", "Sorcerer", {
            required: true,
            sees: ["Curse"]
        }),
        yuta: new Role("Cursed Child", "Sorcerer", {
            sees: ["Honored One"]
        }),
        grade2: new Role("Grade 2 Sorcerer", "Sorcerer", {
            required: true
        }),
        grade4: new Role("Grade 4 Sorcerer", "Sorcerer", {
            appearsAs: "Curse"
        }),
        kenny: new Role("Stitched Face", "Curse", {
            hiddenFrom: ["Honored One"]
        }),
        geto: new Role("Cursed Sorcerer", "Curse", {
            appearsAs: "Curse"
        }),
        finger: new Role("Finger Bearer", "Curse", {
            required: true
        }),
        fly: new Role("Fly Head", "Curse", {}),
        toji: new Role("Stitched Face", "Curse", {
            hiddenFrom: ["Curse"]
        })
} as const;

export type RoleKey = keyof typeof ROLES;

function DefaultMode(playerCount: number): Role[] {
        const roles: Role[] = [];

        roles.push(ROLES.gojo);

        if (playerCount <= 4) {
        roles.push(ROLES.grade2, ROLES.grade2);
        }

        let curseCount: number;

        if (playerCount <= 6) curseCount = 2;
        else if (playerCount <= 10) curseCount = 3;
        else if (playerCount <= 12) curseCount = 4;
        else if (playerCount <= 14) curseCount = 5;
        else curseCount = 6;

        for (let i = 0; i < curseCount; i++) {
        roles.push(ROLES.finger);
        }

        const sorcererCount = playerCount - curseCount - 1;

        for (let i = 0; i < sorcererCount; i++) {
        roles.push(ROLES.grade2);
        }

        return roles;
}

function addRole(currentRoles: Role[], roleName: RoleKey) {
    const role = ROLES[roleName];

        if (role.required)
            return { success: false, reason: "required", currentRoles };

        if (currentRoles.includes(role))
            return { success: false, reason: "dupe", currentRoles };

        let index = -1;

        if (role.alignment === "Sorcerer") {
            index = currentRoles.findIndex(r => r.name === "Grade 2 Sorcerer");
        }

        if (role.alignment === "Curse") {
            index = currentRoles.findIndex(r => r.name === "Finger Bearer");
        }

        if (index === -1)
            return { success: false, reason: "alignment", currentRoles };

        const newRoles = [...currentRoles];
        newRoles[index] = role;

        return { success: true, reason: "success", newRoles };
}

function removeRole(currentRoles: Role[], roleName: RoleKey) {
    const role = ROLES[roleName];

        if (role.required)
            return { success: false, reason: "required", currentRoles };

        const newRoles = currentRoles.filter(r => r.name !== role.name);

        return { success: true, reason: "success", newRoles };
}

function visibility(_viewer: Role, _target: Role): null {
        // 1. HiddenFrom: viewer cannot see target at all
        

        // 2. AppearsAs: target disguises themselves

        // 3. Sees: viewer sees special alignment
        

        // 4. Default: show real alignment
        return null;
}

export default { ROLES, DefaultMode, addRole, removeRole, visibility };

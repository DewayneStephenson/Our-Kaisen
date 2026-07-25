import Role from "./Role.js";
// roles right now all reference the same object, change if you add mutable states to the role
const ROLES = {
        gojo: new Role("Honored One", "Sorcerer", {
            required: true,
            sees: ["Curse"]
        }),
        yuta: new Role("Cursed Child", "Sorcerer", {
            sees: ["Honored One"]
        }),
        nobara: new Role("Nail and Hammer", "Sorcerer", {}),
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
        
        toji: new Role("Energyless", "Curse", {
            hiddenFrom: ["Curse"]
        })
} as const;
export type RoleKey = keyof typeof ROLES;

function DefaultMode(playerCount: number): Role[] {
        const roles: Role[] = [];

        const curseCount = 
        playerCount <= 6 ? 2:
        playerCount <= 9 ? 3:
        playerCount <=12 ? 4:
        5;

        for (let i = 0; i < curseCount; i++) {
        roles.push(ROLES.finger);
        }
        
    
        if (playerCount <= 4) {
            roles.push(
            ROLES.grade2,
            ROLES.grade2)
            roles.push(ROLES.gojo);
            return roles;
        }
        const sorcererCount = playerCount - curseCount - 1;
       
        for (let i = 0; i < sorcererCount; i++) {
        roles.push(ROLES.grade2);
        }
        roles.push(ROLES.gojo);
        return roles;
}
// Note: You do not need to create a new array although i like it for preference sake
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

        const index = currentRoles.findIndex(r => r.name === role.name); 
        if (index === -1) 
            return {success: false, reason: "not_in", currentRoles}
        
        const newRoles = [...currentRoles];
        
        const replacement = role.alignment == "Sorcerer" ? ROLES.grade2 : ROLES.finger;
        newRoles.splice(index,1,replacement)
       
        return { success: true, reason: "success", newRoles };
}
function updateRole(currentRoles: Role[], players: number) {
    const currentSorcerers = currentRoles.filter(r => r.alignment == "Sorcerer");
    const currentCurses = currentRoles.filter(r => r.alignment == "Curse");
    
    const defaultConfig = DefaultMode(players)
    const defaultSorcerers = defaultConfig.filter(r => r.alignment == "Sorcerer");
    const defaultCurses = defaultConfig.filter(r => r.alignment == "Curse");

    let sorcererDiff = defaultSorcerers.length - currentSorcerers.length;
    let curseDiff = defaultCurses.length - currentCurses.length;
    
    // add roles
     if (curseDiff > 0) {
        const add = Array(curseDiff).fill(ROLES.finger)
        currentCurses.splice(currentCurses.length,0,...add)
    } 
     if (sorcererDiff > 0) {
        const add = Array(sorcererDiff).fill(ROLES.grade2)
        currentSorcerers.splice(currentSorcerers.length-1,0,...add)

    }
    // remove roles based off tier (Finger Bearer then any other curse role)
    while (curseDiff < 0) {
        const remove_index = currentCurses.findIndex(r => r.name === "Finger Bearer")
        const final_index = remove_index === -1 ? 0: remove_index;
        currentCurses.splice(final_index,1);
        curseDiff++;
    }
        // remove roles based off tier (Grade 2 then any other sorcerer role excluding gojo)
     while (sorcererDiff < 0) {
        // the
        const remove_index = currentSorcerers.findIndex(r => r.name === "Grade 2 Sorcerer")
        const final_index = remove_index === -1 ? 0+ defaultSorcerers.length - 1: remove_index;
        currentSorcerers.splice(final_index,1);
        sorcererDiff++;
    }
    return [...currentCurses,...currentSorcerers];


/*
Gojo, grade_2,grade_2,finger,finger +1 = Gojo, grade_2,grade_2,grade_2,finger,finger
Gojo, grade_2,grade_2,finger,finger +2 = Gojo, grade_2,grade_2,grade_2,finger,finger,finger
Gojo, grade_2,grade_2,grade_2,finger,finger,finger -2 = Gojo,grade_2,grade_2,finger,finger
Gojo, grade_2,grade_2,yuta,toji,finger,finger -2 = Gojo, grade_2,yuta,toji,finger
Gojo, nobara,grade_4,yuta,toji,geto,fly -2 = Gojo, nobaru,yuta,toji,geto (it doesnt matter which non-required role gets removed)
*/
}
function visibility(_viewer: Role, _target: Role): null {
        // 1. HiddenFrom: viewer cannot see target at all
        

        // 2. AppearsAs: target disguises themselves

        // 3. Sees: viewer sees special alignment
        

        // 4. Default: show real alignment
        return null;
}

export default { ROLES, DefaultMode, addRole, removeRole, updateRole, visibility };


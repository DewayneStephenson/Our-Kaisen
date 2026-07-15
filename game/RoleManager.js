const Role = require('./Role')
// Role goes name, alignment, then options (default is {} which sets
// required as true, sees = [], hidden from = [] and appearsAs = null
class RoleManager {
    static ROLES = {
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
        // Honored One must focus on them using the Six Eyes
        grade4: new Role("Grade 4 Sorcerer", "Sorcerer", {
            appearsAs: ["Curse"]
        }),

        kenny: new Role("Stitched Face", "Curse",{
            hiddenFrom: ["Honored One"]
        }),
        //Appears to Cursed Child as the Honored One 
        geto: new Role("Cursed Sorcerer", "Curse",{
             appearsAs: ["Curse"]
        }),

        FingerBearer: new Role("Finger Bearer", "Curse", {
            required: true
        }),
        // can only fail a mission once
        fly: new Role("Fly Head", "Curse", {}),
        
        toji: new Role("Stitched Face", "Curse",{
            hiddenFrom: ["Curse"]
        }),
        
    }
    static DEFAULT_ROLES = [
        "Honored One",
        "Grade 2 Sorcerer",
        "Finger Bearer"
    ];
    static DefaultMode(playerCount) {
        const roles = [];

        roles.push(this.ROLES.gojo);
        if (playerCount <=4) roles.push(this.ROLES.grade2,this.ROLES.grade2) 
        let curseCount;
       
        if (playerCount <= 6) curseCount = 2;
        else if (playerCount <= 10) curseCount = 3;
        else if (playerCount <= 12) curseCount = 4;
        else if (playerCount <= 14) curseCount = 5;
        else curseCount = 6;
        for (let i = 0; i < curseCount;i++) {
            roles.push(this.ROLES.FingerBearer)
        }
        
        let sorcererCount = playerCount - curseCount - 1
        for (let i = 0; i < sorcererCount;i++) {
            roles.push(this.ROLES.grade2)
        }
        return roles;
    }
    /**
     * 
     * @param {string[]} currentRoles 
     * @param {string} roleName 
     * @returns 
     * @returns {string[]} currentRoles
     * 
     */
   static addRole(currentRoles, roleName) {
    const role = this.ROLES[roleName];
    if (!role) return {success: false, reason: "notarole", currentRoles};
    if (role.required) return {success: false, reason: "required", currentRoles};
    if (currentRoles.includes(role)) return {success: false, reason: "dupe", currentRoles};

    // Find a role with the same alignment to replace
    let index = -1
    if (role.alignment === "Sorcerer") {index = currentRoles.findIndex(r => r.name === "Grade 2 Sorcerer");}
    if (role.alignment === "Curse") {index = currentRoles.findIndex(r => r.name === "Finger Bearer");}
    if (index === -1) return {success: false, reason: "alignment", currentRoles};

    const newRoles = [...currentRoles];
    newRoles[index] = role;

    return {success: true, reason:"success", newRoles };
}


   static removeRole(currentRoles, roleName) {
    roleName = roleName.trim().toLowerCase();
    const role = this.ROLES[roleName];
    if (!role) return {success: false, reason: "notarole", currentRoles};
    if (role.required) return {success: false, reason: "required", currentRoles};

    const newRoles = [...currentRoles];

    for (let i = 0; i < newRoles.length; i++) {
        if (newRoles[i].name === roleName) {
            const replacement = role.alignment === "Sorcerer"
                ? this.ROLES["Grade 2 Sorcerer"]
                : this.ROLES["Finger Bearer"];

            newRoles[i] = replacement;
        }
    }



    return {success: true, reason:"success", newRoles };
}

    
    static visibility() {
        return;
    }
}
module.exports = RoleManager;

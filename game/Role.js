class Role {
    constructor(name, alignment, {
        required = false,
        sees = [],
        hiddenFrom = [],
        appearsAs = null
    } = {}) { // lines 3-7 are options: default is {}, otherwise set depending on role
        this.name = name;
        this.alignment = alignment;
        this.required = required;
        this.sees = sees;
        this.hiddenFrom = hiddenFrom;
        this.appearsAs = appearsAs;
    }
}

module.exports = Role;

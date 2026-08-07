export default class LobbyRole {
    key: string;
    name: string;
    alignment: "Sorcerer" | "Curse";
    required: boolean;
    class: new (
        ...args: any[]
    ) => any; // constructor reference

    constructor(
        key: string,
        name: string,
        alignment: "Sorcerer" | "Curse",
        {
            required = false,
            class: roleClass,
        }: { required?: boolean; class?: any } = {},
    ) {
        this.key = key;
        this.name = name;
        this.alignment = alignment;
        this.required = required;
        this.class = roleClass;
    }
}

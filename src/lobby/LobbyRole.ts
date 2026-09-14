import type { KaisenRole } from "../types/game.js";

export default class LobbyRole {
    key: string;
    name: string;
    alignment: "Sorcerer" | "Curse";
    required: boolean;
    class?: new () => KaisenRole;

    constructor(
        key: string,
        name: string,
        alignment: "Sorcerer" | "Curse",
        {
            required = false,
            class: roleClass,
        }: { required?: boolean; class?: new () => KaisenRole } = {},
    ) {
        this.key = key;
        this.name = name;
        this.alignment = alignment;
        this.required = required;
        this.class = roleClass;
    }
}

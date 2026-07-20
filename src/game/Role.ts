export interface RoleOptions {
    required?: boolean;
    sees?: string[];
    hiddenFrom?: string[];
    appearsAs?: string | null;
}

export default class Role {
    name: string;
    alignment: string;
    required: boolean;
    sees: string[];
    hiddenFrom: string[];
    appearsAs: string | null;

    constructor(
        name: string,
        alignment: string,
        {
            required = false,
            sees = [],
            hiddenFrom = [],
            appearsAs = null
        }: RoleOptions = {}
    ) {
        this.name = name;
        this.alignment = alignment;
        this.required = required;
        this.sees = sees;
        this.hiddenFrom = hiddenFrom;
        this.appearsAs = appearsAs;
    }
}

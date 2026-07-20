import RoleManager from "../game/RoleManager";

declare module 'discord.js' {
    interface Client {
        commands: Map<string, any>;
        cooldowns: Map<string, Map<string, number>>;
        handlers: {
            commandHandler?: any;
            cooldownHandler?: any;
            buttonHandler?: any;
            menuHandler?: any;
            modalHandler?: any;
            autocompleteHandler?: any;
        };
        getUptime: () => string;
        
        roleManager: typeof RoleManager;
    }
}

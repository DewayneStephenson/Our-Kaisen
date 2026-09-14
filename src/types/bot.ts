import type {
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Client,
    ModalSubmitInteraction,
    PermissionResolvable,
    StringSelectMenuInteraction,
} from "discord.js";

export interface BotCommand {
    data: { name: string; toJSON?: () => unknown };
    cooldown?: number;
    permissions?: PermissionResolvable[];
    filePath?: string;
    execute(
        interaction: ChatInputCommandInteraction | AutocompleteInteraction,
        client: Client,
    ): unknown;
}

export interface HandlerRegistry {
    commandHandler?: {
        getCommand(interaction: ChatInputCommandInteraction): BotCommand | null;
        hasPermission(
            interaction: ChatInputCommandInteraction,
            command: BotCommand,
        ): boolean;
    };
    cooldownHandler?: {
        handleCooldown(
            interaction: ChatInputCommandInteraction,
            command: BotCommand,
        ): Promise<boolean>;
    };
    buttonHandler?: {
        handle(interaction: ButtonInteraction, client: Client): unknown;
    };
    componentHandler?: {
        handle(interaction: StringSelectMenuInteraction, client: Client): unknown;
    };
    modalHandler?: {
        handle(interaction: ModalSubmitInteraction, client: Client): unknown;
    };
    autocompleteHandler?: {
        handle(interaction: AutocompleteInteraction, client: Client): unknown;
    };
}

// Default configuration constants

export const NODE_ENV = process.env.NODE_ENV || "production";

// Cooldown settings
export const DEFAULT_COOLDOWN_SECONDS = 3;
export const MS_PER_SECOND = 1000;

export const DEFAULT_TIMER_SETTINGS = {
    missionSelectionSeconds: 30,
    votingSeconds: 60,
    missionSeconds: 30,
    sealingSeconds: 30,
    actionTimeSeconds: 5,
    phaseMuteEnabled: true,
    phaseChatLockEnabled: true,
    skipTimerWhenReady: false,
} as const;

// Discord intents
export const DEFAULT_INTENTS = ["Guilds"];

// Logging
export const LOG_LEVELS = {
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG",
} as const;

// Messages
export const MESSAGES = {
    BOT_NOT_CONFIGURED: "Bot is not properly configured.",
    ERROR_EXECUTING_COMMAND: "There was an error while executing this command.",
    MISSING_PERMISSIONS: "You do not have permission to use this command.",
} as const;

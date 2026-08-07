import { LOG_LEVELS, NODE_ENV } from "./constants.js";

function log(level: string, message: string) {
    // Skip debug logs in production
    if (level === LOG_LEVELS.DEBUG && NODE_ENV === "production") {
        return;
    }

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
}

export const error = (message: string) => log(LOG_LEVELS.ERROR, message);
export const warn = (message: string) => log(LOG_LEVELS.WARN, message);
export const info = (message: string) => log(LOG_LEVELS.INFO, message);
export const debug = (message: string) => log(LOG_LEVELS.DEBUG, message);

export default {
    error,
    warn,
    info,
    debug,
};

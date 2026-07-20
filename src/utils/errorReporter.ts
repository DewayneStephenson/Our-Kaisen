import * as logger from './logger.js';

/**
 * Centralized error reporter for handling and logging errors.
 * Can be extended to send errors to external services (Sentry, etc.)
 */
export const errorReporter = {
    /**
     * Reports an error with context
     * @param error - The error object
     * @param context - Context description (e.g., 'command execution', 'event handler')
     * @param metadata - Additional metadata (user ID, command name, etc.)
     */
    report(error: Error, context: string, metadata: Record<string, any> = {}) {
        const contextStr = context ? ` in ${context}` : '';
        const metadataStr =
            Object.keys(metadata).length > 0 ? ` | ${JSON.stringify(metadata)}` : '';

        logger.error(`Error${contextStr}: ${error.message}${metadataStr}`);
        logger.debug(error.stack ?? 'No stack trace available');

        // TODO: Extend this to send to external error tracking service
        // Example: Sentry.captureException(error, { contexts: { metadata } });
    },

    /**
     * Reports a warning
     * @param message - Warning message
     * @param metadata - Additional context
     */
    warn(message: string, metadata: Record<string, any> = {}) {
        const metadataStr =
            Object.keys(metadata).length > 0 ? ` | ${JSON.stringify(metadata)}` : '';
        logger.warn(`${message}${metadataStr}`);
    }
};

export default errorReporter;

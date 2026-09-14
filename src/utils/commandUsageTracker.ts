/**
 * Command usage tracking for analytics
 * Tracks which commands are used most frequently and persists to JSON file
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import logger from "./logger.js";
import { errorMessage } from "./errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATS_FILE = path.join(__dirname, "commandStats.json");

export interface CommandStat {
    count: number;
    lastUsed: Date | null;
    users: Set<string>;
}

export interface SerializedCommandStat {
    count: number;
    lastUsed: string | null;
    users: string[];
}

export default class CommandUsageTracker {
    private stats: Map<string, CommandStat>;

    constructor() {
        this.stats = new Map();
        this.loadStats();
    }

    /**
     * Load stats from JSON file
     */
    private loadStats(): void {
        try {
            if (fs.existsSync(STATS_FILE)) {
                const raw = fs.readFileSync(STATS_FILE, "utf8");
                const parsed: Record<string, SerializedCommandStat> =
                    JSON.parse(raw);

                for (const [command, stat] of Object.entries(parsed)) {
                    this.stats.set(command, {
                        count: stat.count ?? 0,
                        lastUsed: stat.lastUsed
                            ? new Date(stat.lastUsed)
                            : null,
                        users: new Set(stat.users ?? []),
                    });
                }

                logger.debug(
                    `Loaded ${this.stats.size} tracked commands from file`,
                );
            }
        } catch (error) {
            logger.warn(`Failed to load command stats: ${errorMessage(error)}`);
        }
    }

    /**
     * Save stats to JSON file (async, non-blocking)
     */
    private saveStats(): void {
        setImmediate(() => {
            try {
                const data: Record<string, SerializedCommandStat> = {};

                for (const [command, stat] of this.stats.entries()) {
                    data[command] = {
                        count: stat.count,
                        lastUsed: stat.lastUsed
                            ? stat.lastUsed.toISOString()
                            : null,
                        users: Array.from(stat.users),
                    };
                }

                fs.writeFileSync(
                    STATS_FILE,
                    JSON.stringify(data, null, 2),
                    "utf8",
                );
            } catch (error) {
                logger.warn(`Failed to save command stats: ${errorMessage(error)}`);
            }
        });
    }

    /**
     * Track a command execution
     */
    track(commandName: string, userId: string): void {
        let stat = this.stats.get(commandName);
        if (!stat) {
            stat = {
                count: 0,
                lastUsed: null,
                users: new Set(),
            };
            this.stats.set(commandName, stat);
        }

        stat.count++;
        stat.lastUsed = new Date();
        stat.users.add(userId);

        this.saveStats();
    }

    /**
     * Get stats for a specific command
     */
    getStats(commandName: string): CommandStat | null {
        return this.stats.get(commandName) ?? null;
    }

    /**
     * Get top N most used commands
     */
    getTopCommands(limit = 10): Array<{
        name: string;
        executions: number;
        users: number;
        lastUsed: Date | null;
    }> {
        return [...this.stats.entries()]
            .map(([name, stat]) => ({
                name,
                executions: stat.count,
                users: stat.users.size,
                lastUsed: stat.lastUsed,
            }))
            .sort((a, b) => b.executions - a.executions)
            .slice(0, limit);
    }

    /**
     * Get all statistics
     */
    getAllStats(): Record<
        string,
        { executions: number; users: number; lastUsed: Date | null }
    > {
        const result: Record<
            string,
            { executions: number; users: number; lastUsed: Date | null }
        > = {};

        for (const [name, stat] of this.stats.entries()) {
            result[name] = {
                executions: stat.count,
                users: stat.users.size,
                lastUsed: stat.lastUsed,
            };
        }

        return result;
    }

    /**
     * Log statistics summary
     */
    logSummary(): void {
        const topCommands = this.getTopCommands();
        const totalCommands = this.stats.size;
        const totalExecutions = [...this.stats.values()].reduce(
            (sum, stat) => sum + stat.count,
            0,
        );

        logger.info(`=== Command Usage Stats ===`);
        logger.info(`Total commands tracked: ${totalCommands}`);
        logger.info(`Total executions: ${totalExecutions}`);

        if (topCommands.length > 0) {
            logger.info("Top 5 commands:");
            topCommands.slice(0, 5).forEach((cmd, i) => {
                logger.info(
                    `  ${i + 1}. /${cmd.name} - ${cmd.executions} uses (${cmd.users} unique users)`,
                );
            });
        }
    }
}

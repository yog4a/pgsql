// Types
// ===========================================================

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Class
// ===========================================================

/**
 * Simple and extensible logger utility.
 *
 * Supports standard logging methods (`info`, `warn`, `error`, `debug`)
 * with consistent formatting, message prefixing, and error safety.
 */
export class Logger {
    /**
     * Creates a new Logger instance.
     * @param prefix - Text to prepend to all log messages.
     */
    constructor(
        private readonly prefix: string,
    ) {}

    // ===========================================================
    // Public methods
    // ===========================================================

    /** Logs informational messages */
    public info(...args: any[]): void {
        this.process('info', ...args);
    }

    /** Logs warning messages */
    public warn(...args: any[]): void {
        this.process('warn', ...args);
    }

    /** Logs error messages */
    public error(...args: any[]): void {
        this.process('error', ...args);
    }

    /** Logs debug messages */
    public debug(...args: any[]): void {
        this.process('debug', ...args);
    }

    /** Re-throws an error with prefix */
    public throw(message: string): void {
        throw new Error(`${this.prefix} ${message}`);
    }

    /** Creates a new logger and cumulate the prefix (example: 'parent:child1:child2') */
    public child(prefix: string): Logger {
        return new Logger(`${this.prefix}${prefix}`);
    }

    // ===========================================================
    // Private methods
    // ===========================================================

    /** Logs a message to the console */
    private process(mode: LogLevel, ...args: any[]): void {
        const prefix = mode === 'debug' ? `${this.prefix} 🔸` : this.prefix;
        
        try {
            console[mode](prefix, ...args);
        } catch {
            try {
                console[mode](prefix, 'cannot log');
            } catch {} // Ignore si console aussi échoue
        }
    }
}

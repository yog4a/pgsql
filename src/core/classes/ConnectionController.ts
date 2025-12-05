import { Gate, Logger } from 'src/classes/index.js';
import { Client, Pool, type DatabaseError } from 'pg';

// Class
// ===========================================================

export class ConnectionController {
    /** The connection test timeout (in milliseconds) */
    private readonly testTimeoutMs: number = 10_000;
    /** Class Connection Gate */
    public readonly connection: Gate;

    /**
     * Connection class constructor.
     * @param logger - The logger instance.
     * @param debug - Whether to enable debug mode.
     */
    constructor(
        private readonly logger: Logger,
        private readonly debug: boolean = false,
    ) {
        this.connection = new Gate();
    }

    // Public

    /**
     * Tests the connection to the database with a client instance.
     * @param instance - The client instance.
     */
    public async testClient(instance: Client): Promise<void> {
        try {
            // Test the connection with a client/pool instance
            await this.testConnection(instance); 
            if (this.debug) {
                this.logger.info(`Client tested successfully`);
            }
            return;
        }
        catch (error) {
            // Log the error
            this.logger.error(`failed to test connection:`,
                (error as DatabaseError)?.message,
                (error as DatabaseError)?.code,
            );
            throw error; // Re-throw original error
        }
    }

    /**
     * Tests the connection to the database with a pool instance.
     * @param instance - The pool instance.
     */
    public async testPool(instance: Pool): Promise<void> {
        try {
            // Test the connection with a client/pool instance
            await this.testConnection(instance); 
            if (this.debug) {
                this.logger.info(`Pool tested successfully`);
            }
            return;
        }
        catch (error) {
            // Log the error
            this.logger.error(`failed to test connection:`,
                (error as DatabaseError)?.message,
                (error as DatabaseError)?.code,
            );
            throw error; // Re-throw original error
        }
    }

    // Private

    /**
     * Tests the connection to the database with a client/pool instance.
     * @param instance - The client/pool instance.
     * @param signal - The abort signal.
     */
    private async testConnection(instance: Client | Pool): Promise<void> {
        let timer: NodeJS.Timeout;
        
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(
                () => reject(new Error("Connection test timed out")), 
                this.testTimeoutMs
            );
        });
    
        try {
            const query = instance.query("SELECT 1");
            const result = await Promise.race([query, timeout]);
            if (!result?.rows?.length) {
                throw new Error("Connection test query failed");
            }
        } finally {
            clearTimeout(timer!);
        }
    }
}

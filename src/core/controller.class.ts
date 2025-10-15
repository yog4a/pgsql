import { Gate, Logger } from 'src/classes/index.js';
import { Client, Pool } from 'pg';

// Types
// ===========================================================

type ClientType = 'client' | 'pool';

// Class
// ===========================================================

export class Controller {
    /** Class Logger Instance */
    protected readonly logger: Logger;
    /** Class Connection Gate */
    protected readonly connection: Gate;
    /** Connection flag */
    private isConnecting: boolean = false;
    /** Reconnect flag */
    private isReconnecting: boolean = false;
    /**
     * Connector class constructor.
     * @param type - The type of client/pool.
     * @param database - The database name.
     * @param debug - Whether to enable debug mode.
     */
    constructor(
        clientType: ClientType,
        databaseName: string,
        protected readonly debug: boolean = false,
    ) {
        // Initialize classes
        this.connection = new Gate();
        this.logger = new Logger(`[pgsql][${clientType}][${databaseName}]`);
    }

    // Public

    protected async connect(instance: Client | Pool): Promise<void> {
        if (this.isConnecting || this.isReconnecting) {
            if (this.debug) {
                this.logger.info('Connection already in progress!');
            }
            return;
        }

        this.isConnecting = true;           // Set the isConnecting flag to true
        this.isReconnecting = false;        // Set the isReconnecting flag to false
        this.connection.close();            // Close the connection (stop processing requests)

        try {
            // Test the connection with a client/pool instance
            await this.testConnection(instance); 
            if (this.debug) {
                this.logger.info(`Connected successfully`);
            }
            this.connection.open();
        } 
        catch (error) {
            this.logger.error(`failed to connect:`,
                (error as Error).message,
                (error as any).errno,
            );
            throw error;
        } 
        finally {
            this.isConnecting = false;      // Set the isConnecting flag to false
        }
    }

    protected async reconnect(instance: Client | Pool, maxAttempts: number = -1): Promise<void> {
        if (this.isConnecting || this.isReconnecting) {
            if (this.debug) {
                this.logger.info('Reconnect already in progress!');
            }
            return;
        }

        this.isConnecting = false;           // Set the isConnecting flag to false
        this.isReconnecting = true;          // Set the isReconnecting flag to true
        this.connection.close();             // Close the connection (stop processing requests)

        try {
            let attempt = 0;
            while (maxAttempts <= 0 || attempt < maxAttempts) {
                attempt++;
                try {
                    // Test the connection with a client/pool instance, and open the connection
                    await this.testConnection(instance); 
                    if (this.debug) {
                        this.logger.info(`Reconnected successfully after ${attempt} attempt(s)`);
                    }
                    this.connection.open();
                    return;
                } 
                catch (error) {
                    this.logger.error(`attempt ${attempt} failed to reconnect:`,
                        (error as Error).message,
                        (error as any).errno,
                    );
                }
                const jitter = Math.random() * 500;
                const backoff = Math.min(2 ** attempt * 1000, 30_000);
                await new Promise(r => setTimeout(r, backoff + jitter));
            }
            throw new Error(`Reconnect failed after ${maxAttempts} attempts`);
        } finally {
            this.isReconnecting = false;      // Set the isReconnecting flag to false
        }
    }

    // Private

    private async testConnection(instance: Client | Pool): Promise<void> {
        // Verify connection with test query
        const result = await instance.query('SELECT 1');
    
        if (!result?.rows?.length) {
            throw new Error(`Connection test query failed`);
        }
    }
}

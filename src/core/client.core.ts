import { Client, ClientConfig, type DatabaseError } from 'pg';
import { ConnectionController } from './classes/ConnectionController.js';
import { ConnectionEvents } from './classes/ConnectionEvents.js';
import { Logger } from 'src/classes/index.js';

// Types
// ===========================================================

export namespace IClient {
    /**
     * Configuration required for creating a PostgreSQL connection.
     */
    export interface Config extends ClientConfig {
        /** Database host address */
        host: NonNullable<ClientConfig['host']>;
        /** Database name */
        database: NonNullable<ClientConfig['database']>;
        /** Database user */
        user: NonNullable<ClientConfig['user']>;
        /** Database password */
        password: NonNullable<ClientConfig['password']>;
        /** Database port */
        port: NonNullable<ClientConfig['port']>;
    };
    /**
     * Additional options for client behavior and debugging.
     */
    export interface Options {
        /** Enable debug logging for client operations */
        debug?: boolean;
    };
};

// Class
// ===========================================================

export class CoreClient {
    /** Class Logger Instance */
    protected readonly logger: Logger;
    /** Class Connection Controller */
    protected readonly connectionController: ConnectionController;
    /** Class Connection Events */
    protected readonly connectionEvents: ConnectionEvents;
    /** Setup running */
    private isCreating: boolean = false;
    /** The PostgreSQL client instance */
    private client: Client | null = null;

    /**
     * Client class constructor.
     * @param config - PostgreSQL client configuration.
     * @param options - Additional client options.
     */
    constructor(
        protected readonly config: IClient.Config,
        protected readonly options: IClient.Options,
    ) {
        const { host, database, user, password, port } = config;

        if (!host || !database || !user || !password || !port) {
            const required = ['host', 'database', 'user', 'password', 'port'].join(', ');
            throw new Error(`Need minimum required database configuration: ${required}`);
        }

        // Initialize logger
        this.logger = new Logger(`[pgsql][client][${database}]`);

        // Initialize connection controller
        this.connectionController = new ConnectionController(this.logger, options.debug);

        // Initialize client events
        this.connectionEvents = new ConnectionEvents();

        // Initialize client
        this.setup();
    }

    // Public

    public async getClient(): Promise<Client> {
        await this.connectionController.connection.enter();

        if (!this.client) {
            throw new Error('Client is not initialized');
        }

        return this.client;
    }

    public async disconnect(): Promise<void> {
        // Enter the connection
        await this.connectionController.connection.enter();

        // Destroy the client
        await this.destroyClient();

        // Reset the connection
        this.connectionController.connection.close();
    }

    // Private

    private async setup(): Promise<void> {
        if (this.isCreating) {
            if (this.options.debug) {
                this.logger.info('Client is already being setup');
            }
            return;
        }

        this.isCreating = true;
        this.connectionController.connection.close();

        if (this.client) {
            try {
                await this.verifyClient();
                this.isCreating = false;
                this.connectionController.connection.open();
                return;
            } 
            catch (error) {
                if (this.options.debug) {
                    this.logger.info('Existing client verification failed, recreating...');
                }
            }
            this.connectionEvents.disconnect();
        }

        try {
            let attempt = 0;

            while (true) {
                attempt++;
                try {
                    await this.destroyClient();
                    await this.createClient();
                    await this.verifyClient();

                    if (this.options.debug) {
                        this.logger.info(`successfully setup client`);
                    }
                    this.connectionController.connection.open();
                    this.connectionEvents.connect();
                    break;
                }
                catch (error) {
                    // Log the error
                    this.logger.error(`attempt ${attempt} failed to create client:`,
                        (error as DatabaseError).message,
                    );
                }
                // Add a random jitter and backoff to prevent thundering herd
                const jitter = Math.random() * 500;              // 0–0.5s
                const backoff = Math.min(attempt, 10) * 1000;     // 1s ... 10s
                await new Promise(r => setTimeout(r, backoff + jitter));
            }
        }
        finally {
            this.isCreating = false;
        }
    }

    private async createClient(): Promise<void> {
        this.client = new Client(this.config);

        // Set up event listeners for client error events
        this.client.on('error', (err: Error) => {
            this.logger.error(`Client error: ${err.message} (${(err as DatabaseError)?.code})`);
            if (this.isCreating === false) {
                this.setup();
            }
        });

        // Set up event listeners for client connection end events
        this.client.on('end', () => {
            this.logger.warn('Client connection closed');
        });

        // Connect to the database
        await this.client.connect();
    }

    private async destroyClient(): Promise<void> {
        if (!this.client) { return; }

        try {
            // Remove all listeners
            this.client.removeAllListeners();
            if (this.options.debug) {
                this.logger.info(`successfully removed all listeners`);
            }
        } catch (error) {
            this.logger.warn(`failed to remove all listeners:`, 
                (error as Error).message
            );
        }
        try {
            // Close the client (drains the client)
            await this.client.end();
            if (this.options.debug) {
                this.logger.info(`successfully closed client`);
            }
        } catch (error) {
            this.logger.warn(`failed to close client:`, 
                (error as Error).message
            );
        }

        // Reset the client
        this.client = null;
    }

    private async verifyClient(): Promise<void> {
        if (!this.client) {
            throw new Error('Client is not initialized');
        }

        // Test the connection with a client instance (throws if failed)
        await this.connectionController.testClient(this.client);
    }
}

import { Client, type ClientConfig, type DatabaseError } from 'pg';
import { ConnectionController } from './classes/ConnectionController.js';
import { ConnectionEvents } from './classes/ConnectionEvents.js';
import { Logger } from 'src/classes/index.js';
import { waitWithBackoff } from 'src/utils/wait.utils.js';

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
    /** Class Connection Controller */
    protected readonly connectionController: ConnectionController;
    /** Class Connection Events */
    protected readonly connectionEvents: ConnectionEvents;
    /** Class Logger Instance */
    protected readonly logger: Logger;
    /** True when reconnection is in progress */
    private _isReconnecting: boolean = false;
    /** True when client is being destroyed */
    private _isDestroying: boolean = false;
    /** True when client is intentionally shutting down */
    private _isShuttingDown: boolean = false;
    /** The PostgreSQL client instance */
    private _client: Client | null = null;

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
        this.initialize().catch((error) => {
            setImmediate(() => { throw error; });
        });
    }

    // ===========================================================
    // Public methods
    // ===========================================================

    public async getClient(): Promise<Client> {
        await this.connectionController.connection.enterOrWait();
    
        if (!this._client) {
            // Retry si reconnect en cours
            if (this._isReconnecting) {
                await this.connectionController.connection.enterOrWait();
            }
            
            if (!this._client) {
                throw new Error('Client is not initialized or not connected');
            }
        }
    
        return this._client;
    }

    public async disconnect(): Promise<void> {
        this._isShuttingDown = true;

        // Reject pending waiters immediately
        this.connectionController.connection.close(
            new Error('Client disconnected')
        );

        // Destroy the client
        await this.destroyClient();
    }

    // ===========================================================
    // Private methods - Initialization
    // ===========================================================

    private async initialize(): Promise<void> {
        try {
            await this.createClient();
            await this.verifyClient();

            if (this.options.debug) {
                this.logger.info('client initialized');
            }

            this.connectionController.connection.open();
            this.connectionEvents.connect();
        } 
        catch (error) {
            this.logger.error('failed to initialize client:', (error as Error).message);
            throw error;
        }
    }

    // ===========================================================
    // Private methods - Reconnection
    // ===========================================================

    private async reconnect(): Promise<void> {
        if (this._isReconnecting || this._isShuttingDown) {
            return;
        }

        this._isReconnecting = true;
        this.connectionController.connection.close();

        let attempt = 0;

        while (!this._isShuttingDown) {
            attempt++;
            try {
                await this.destroyClient();
                await this.createClient();
                await this.verifyClient();

                if (this.options.debug) {
                    this.logger.info('client reconnected');
                }

                this.connectionController.connection.open();
                this.connectionEvents.reconnect();
                this._isReconnecting = false;
                return;
            } 
            catch (error) {
                this.logger.error(
                    `reconnect attempt ${attempt} failed:`,
                    (error as Error).message
                );
            }

            await waitWithBackoff(attempt, { maxJitterMs: 500, maxDelayMs: 10_000 });
        }

        this._isReconnecting = false;
    }

    // ===========================================================
    // Private methods - Client management
    // ===========================================================

    private async createClient(): Promise<void> {
        if (this._client) {
            throw new Error('Client is already initialized');
        }

        // Create the client instance
        this._client = new Client(this.config);

        // Set up event listeners for client error events
        this._client.on('error', (err: Error) => {
            const dbErr = err as DatabaseError;
            this.logger.error(
                `Client error: ${err.message} (${dbErr?.code || 'N/A'})`
            );
            if (!this._isReconnecting && !this._isShuttingDown) {
                void this.verifyOrReconnect();
            }
        });

        // Set up event listeners for client end events
        this._client.on('end', () => {
            this.logger.warn(
                'Client connection closed'
            );
            if (!this._isReconnecting && !this._isShuttingDown) {
                void this.reconnect();
            }
        });

        // Forward notifications to upper class
        this._client.on('notification', (msg) => {
            this.connectionEvents.notification(msg);
        });

        // Connect to the database
        await this._client.connect();
    }

    private async destroyClient(): Promise<void> {
        if (!this._client || this._isDestroying) {
            return;
        }

        this._isDestroying = true;

        try {
            this._client.removeAllListeners();
            await this._client.end();

            if (this.options.debug) {
                this.logger.info('client destroyed');
            }
        } 
        catch (error) {
            this.logger.warn('destroy failed:', (error as Error).message);
        } 
        finally {
            this._client = null;
            this._isDestroying = false;
        }
    }

    private async verifyClient(): Promise<void> {
        if (!this._client) {
            throw new Error('Client is not initialized');
        }

        // Test the connection with a client instance (throws if failed)
        await this.connectionController.testClient(this._client);
    }

    private verifyOrReconnect(): void {
        if (!this._client) {
            void this.reconnect();
            return;
        }
    
        // Test the connection with a client instance (throws if failed)
        void this.connectionController.testClient(this._client)
            .then(() => {
                if (this.options.debug) {
                    this.logger.info('client still alive');
                }
            })
            .catch((error) => {
                this.logger.warn('client dead, reconnecting:', (error as Error).message);
                void this.reconnect();
            });
    }
}

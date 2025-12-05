import { Pool, PoolConfig, type PoolClient, type DatabaseError } from 'pg';
import { ConnectionController } from './classes/ConnectionController.js';
import { ConnectionEvents } from './classes/ConnectionEvents.js';
import { Logger } from 'src/classes/index.js';

// Types
// ===========================================================

export namespace IPool {
    /**
     * Configuration options required for creating a PostgreSQL connection pool.
     * All fields are required and non-nullable.
     */
    export interface Config extends PoolConfig {
        /** Database host address */
        host: NonNullable<PoolConfig['host']>;
        /** Database name */
        database: NonNullable<PoolConfig['database']>;
        /** Database user */
        user: NonNullable<PoolConfig['user']>;
        /** Database password */
        password: NonNullable<PoolConfig['password']>;
        /** Database port */
        port: NonNullable<PoolConfig['port']>;
        /** Maximum number of clients in the pool */
        max: NonNullable<PoolConfig['max']>;
        /** Minimum number of clients in the pool */
        min: NonNullable<PoolConfig['min']>;
    };
    /**
     * Additional options for pool behavior and debugging.
     */
    export interface Options {
        /** Enable debug logging for pool operations */
        debug?: boolean;
    };
};

// Class
// ===========================================================

export class CorePool {
    /** Class Logger Instance */
    protected readonly logger: Logger;
    /** Class Connection Controller */
    protected readonly connectionController: ConnectionController;
    /** Class Connection Events */
    protected readonly connectionEvents: ConnectionEvents;
    /** Setup running */
    private setupRunning: boolean = false;
    /** The PostgreSQL pool instance */
    private pool: Pool | null = null;

    /**
     * Pool class constructor.
     * @param config - PostgreSQL pool configuration.
     * @param options - Additional pool options.
     */
    constructor(
        protected readonly config: IPool.Config,
        protected readonly options: IPool.Options,
    ) {
        const { host, database, user, password, port, max, min } = config;

        if (!host || !database || !user || !password || !port) {
            const required = ['host', 'database', 'user', 'password', 'port'].join(', ');
            throw new Error(`Need minimum required database configuration: ${required}`);
        }
        
        if (max === undefined || max === null || Number.isNaN(max) || !Number.isInteger(max) || max < 2) {
            throw new Error(`Max clients (${max}) in pool must be at least 2!`);
        }

        if (min === undefined || min === null || Number.isNaN(min) || !Number.isInteger(min) || min < 0) {
            throw new Error(`Min clients (${min}) in pool must be at least 0!`);
        }

        if (min > max) {
            throw new Error(`Min clients (${min}) cannot exceed max (${max})!`);
        }

        // Set default connection timeout to avoid app hanging indefinitely when PG is unreachable
        if (config.connectionTimeoutMillis === undefined || config.connectionTimeoutMillis === null) {
            // Default is 0 (wait forever, not recommended in production)
            config.connectionTimeoutMillis = 5_000; // 5 seconds
        }

        // Set idle timeout (how long idle clients stay alive in pool)
        if (config.idleTimeoutMillis === undefined || config.idleTimeoutMillis === null) {
            // Default is 10s; set to 60s for this pool
            config.idleTimeoutMillis = 60_000; // 60 seconds
        }

        // Forces connection rotation, helps avoid stale connections if infra/network resets (default: 0 = disabled)
        if (config.maxLifetimeSeconds === undefined || config.maxLifetimeSeconds === null) {
            // Default is 0 (disabled) 
            config.maxLifetimeSeconds = 600; // default: 10 minutes
        }

        // Initialize logger
        this.logger = new Logger(`[pgsql][pool][${database}]`);

        // Initialize connection controller
        this.connectionController = new ConnectionController(this.logger, options.debug);

        // Initialize connection events
        this.connectionEvents = new ConnectionEvents();

        // Initialize pool
        this.setup();
    }

    // Public
    
    public metrics() {
        if (!this.pool) {
            return null;
        }
        return {
            /** Total number of clients existing within the pool */
            total: this.pool.totalCount,
            /** Number of clients which are not checked out but are currently idle in the pool */
            idle: this.pool.idleCount,
            /** Number of clients which are checked out and in use */
            active: this.pool.totalCount - this.pool.idleCount,
            /** Number of queued requests waiting on a client when all clients are checked out */
            waiting: this.pool.waitingCount,
        }
    }

    public async getClient(): Promise<PoolClient> {
        await this.connectionController.connection.enter();

        if (!this.pool) {
            throw new Error('Pool is not initialized');
        }

        // Get a client from the pool
        const client = await this.pool.connect();
        return client;
    }

    public async disconnect(): Promise<void> {
        // Enter the connection
        await this.connectionController.connection.enter();

        // Destroy the pool
        await this.destroyPool();

        // Reset the connection
        this.connectionController.connection.close();
    }

    // Private

    private async setup(): Promise<void> {
        if (this.setupRunning) {
            if (this.options.debug) {
                this.logger.info('Pool is already being setup');
            }
            return;
        }

        this.setupRunning = true;
        this.connectionController.connection.close();

        try {
            let attempt = 0;

            while (true) {
                attempt++;
                try {
                    await this.createPool();
                    await this.verifyPool();

                    if (this.options.debug) {
                        this.logger.info(`successfully setup pool`);
                    }

                    this.connectionController.connection.open();
                    this.connectionEvents.connect();
                    
                    break;
                }
                catch (error) {
                    // Log the error
                    this.logger.error(`attempt ${attempt} failed to create pool:`,
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
            this.setupRunning = false;
        }
    }

    private async createPool(): Promise<void> {
        if (this.pool) { return; }

        // Create the pool instance
        this.pool = new Pool(this.config);

        // Set up event listeners for pool error events
        if (this.pool.listenerCount('error') === 0) {
            this.pool.on('error', (err: Error, client: PoolClient) => {
                this.logger.error(`Pool error: ${err.message} (${(err as DatabaseError)?.code})`, err, client);
            });
        }

        // Set up event listeners for pool connection lifecycle events
        if (this.pool.listenerCount('connect') === 0) {
            this.pool.on('connect', (client: PoolClient) => {
                if (client.listenerCount('error') === 0) {
                    client.on('error', (err: Error) => {
                        this.logger.error(`Client error: ${err.message} (${(err as DatabaseError)?.code})`, err, client);
                    });
                }
                if (this.options.debug) {
                    this.logger.info('New client connection established');
                }
            });
        }

        // Set up event listeners for pool client removal events
        if (this.pool.listenerCount('remove') === 0) {
            this.pool.on('remove', (client: PoolClient) => {
                client.removeAllListeners();
                if (this.options.debug) {
                    this.logger.info('Client closed and removed from pool');
                }
            });
        }

        // Set up event listeners for connection lifecycle events (debug)
        if (this.options.debug) {
            if (this.pool.listenerCount('acquire') === 0) {
                this.pool.on('acquire', (client: PoolClient) => {
                    this.logger.info('Client acquired from pool');
                });
            }
            if (this.pool.listenerCount('release') === 0) {
                this.pool.on('release', (err: Error, client: PoolClient) => {
                    this.logger.info('Client released back to pool');
                });
            }
        }
    }

    private async destroyPool(): Promise<void> {
        if (!this.pool) { return; }

        try {
            // Remove all listeners
            this.pool.removeAllListeners();
            if (this.options.debug) {
                this.logger.info(`successfully removed all listeners`);
            }
        } catch (error) {
            this.logger.warn(`failed to remove all listeners:`, 
                (error as Error).message
            );
        }
        try {
            // Close the pool (drains the pool)
            await this.pool.end();
            if (this.options.debug) {
                this.logger.info(`successfully closed pool`);
            }
        } catch (error) {
            this.logger.warn(`failed to close pool:`, 
                (error as Error).message
            );
        }

        // Reset the pool
        this.pool = null;
    }

    private async verifyPool(): Promise<void> {
        if (!this.pool) {
            throw new Error('Pool is not initialized');
        }

        // Test the connection with a pool instance (throws if failed)
        await this.connectionController.testPool(this.pool);
    }
}

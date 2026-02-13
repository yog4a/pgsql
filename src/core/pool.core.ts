import { Pool, type PoolConfig, type PoolClient, type DatabaseError } from 'pg';
import { ConnectionController } from './classes/ConnectionController.js';
import { ConnectionEvents } from './classes/ConnectionEvents.js';
import { Logger } from 'src/classes/index.js';
import { waitWithBackoff } from 'src/utils/wait.utils.js';

// Types
// ===========================================================

export namespace IPool {
    /**
     * Configuration options required for creating a PostgreSQL connection pool.
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
    /** Class Connection Controller */
    protected readonly connectionController: ConnectionController;
    /** Class Connection Events */
    protected readonly connectionEvents: ConnectionEvents;
    /** Class Logger Instance */
    protected readonly logger: Logger;
    /** True when reconnection is in progress */
    private _isReconnecting: boolean = false;
    /** True when pool is being destroyed */
    private _isDestroying: boolean = false;
    /** True when pool is intentionally shutting down */
    private _isShuttingDown: boolean = false;
    /** The PostgreSQL pool instance */
    private _pool: Pool | null = null;

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
        
        if (!Number.isInteger(max) || max < 2) {
            throw new Error(`Max clients (${max}) in pool must be at least 2!`);
        }

        if (!Number.isInteger(min) || min < 0) {
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
            // Default is 10s; set to 60s to avoid too many client rotations
            config.idleTimeoutMillis = 60_000; // 60 seconds
        }

        // Forces connection rotation, helps avoid stale connections if infra/network resets (default: 0 = disabled)
        if (config.maxLifetimeSeconds === undefined || config.maxLifetimeSeconds === null) {
            // Default is 0 (disabled) 
            config.maxLifetimeSeconds = 600; // 10 minutes
        }

        // Initialize logger
        this.logger = new Logger(`[pgsql][pool][${database}]`);

        // Initialize connection controller
        this.connectionController = new ConnectionController(this.logger, options.debug);

        // Initialize connection events
        this.connectionEvents = new ConnectionEvents();

        // Initialize pool
        this.initialize().catch((error) => {
            setImmediate(() => { throw error; });
        });
    }

    // ===========================================================
    // Public methods
    // ===========================================================

    public metrics() {
        if (!this._pool) {
            return null;
        }
        return {
            /** Total number of clients existing within the pool */
            total: this._pool.totalCount,
            /** Number of clients which are not checked out but are currently idle in the pool */
            idle: this._pool.idleCount,
            /** Number of clients which are checked out and in use */
            active: this._pool.totalCount - this._pool.idleCount,
            /** Number of queued requests waiting on a client when all clients are checked out */
            waiting: this._pool.waitingCount,
        }
    }

    public async getClient(): Promise<PoolClient> {
        if (this._isShuttingDown) {
            throw new Error('Pool is shutting down');
        }

        await this.connectionController.connection.enterOrWait();

        if (this._isShuttingDown) {
            throw new Error('Pool is shutting down');
        }

        if (!this._pool) {
            throw new Error('Pool is not initialized');
        }

        // Get a client from the pool
        const client = await this._pool.connect();
        return client;
    }

    public async disconnect(): Promise<void> {
        this._isShuttingDown = true;

        const reason = new Error('Pool disconnected');

        // Emit lifecycle event for explicit shutdown.
        this.connectionEvents.disconnect(reason);

        // Reject pending waiters
        this.connectionController.connection.close(
            reason
        );

        // Destroy the pool
        await this.destroyPool();
    }

    // ===========================================================
    // Private methods - Initialization
    // ===========================================================

    private async initialize(): Promise<void> {
        try {
            await this.createPool();
            await this.verifyPool();

            if (this.options.debug) {
                this.logger.info('pool initialized');
            }

            this.connectionController.connection.open();
            this.connectionEvents.connect();
        } 
        catch (error) {
            this.logger.error('failed to initialize pool:', (error as Error).message);
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
        this.connectionEvents.disconnect('Pool connection lost, reconnecting');

        let attempt = 0;

        while (!this._isShuttingDown) {
            attempt++;
            try {
                await this.destroyPool();
                await this.createPool();
                await this.verifyPool();

                if (this.options.debug) {
                    this.logger.info('pool reconnected');
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
    // Private methods - Pool management
    // ===========================================================

    private async createPool(): Promise<void> {
        if (this._pool) {
            throw new Error('Pool is already initialized');
        }

        // Create the pool instance
        this._pool = new Pool(this.config);

        // Set up event listeners for pool error events
        this._pool.on('error', (err: Error, client: PoolClient) => {
            const dbErr = err as DatabaseError;
            this.logger.error(
                `Pool error: ${err.message} (${dbErr?.code || 'N/A'})`, err, client
            );
            if (!this._isReconnecting && !this._isShuttingDown) {
                void this.verifyOrReconnect();
            }
        });

        // Set up event listeners for pool connection lifecycle events
        this._pool.on('connect', (client: PoolClient) => {
            if (client.listenerCount('error') === 0) {
                client.on('error', (err: Error) => {
                    const dbErr = err as DatabaseError;
                    this.logger.error(
                        `Client error: ${err.message} (${dbErr?.code || 'N/A'})`, err, client
                    );
                });
            }
            if (this.options.debug) {
                this.logger.info('New client connection established');
            }
        });

        // Set up event listeners for pool client removal events
        this._pool.on('remove', (client: PoolClient) => {
            client.removeAllListeners();
            if (this.options.debug) {
                this.logger.info('Client closed and removed from pool');
            }
        });

        // Set up event listeners for connection lifecycle events (debug)
        if (this.options.debug) {
            this._pool.on('acquire', (client: PoolClient) => {
                this.logger.info('Client acquired from pool');
            });
            this._pool.on('release', (err: Error, client: PoolClient) => {
                this.logger.info('Client released back to pool');
            });
        }
    }

    private async destroyPool(): Promise<void> {
        if (!this._pool || this._isDestroying) {
            return;
        }

        this._isDestroying = true;

        try {
            this._pool.removeAllListeners();
            await this._pool.end();

            if (this.options.debug) {
                this.logger.info('pool destroyed');
            }
        } 
        catch (error) {
            this.logger.warn('destroy failed:', (error as Error).message);
        } 
        finally {
            this._pool = null;
            this._isDestroying = false;
        }
    }

    private async verifyPool(): Promise<void> {
        if (!this._pool) {
            throw new Error('Pool is not initialized');
        }

        // Test the connection with a pool instance (throws if failed)
        await this.connectionController.testPool(this._pool);
    }

    private verifyOrReconnect(): void {
        if (!this._pool) {
            void this.reconnect();
            return;
        }

        void this.connectionController.testPool(this._pool)
            .then(() => {
                if (this.options.debug) {
                    this.logger.info('pool still alive');
                }
            })
            .catch((error) => {
                this.logger.warn('pool dead, reconnecting:', (error as Error).message);
                void this.reconnect();
            });
    }
}

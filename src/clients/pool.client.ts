import { Pool, PoolConfig, PoolClient, QueryResult, DatabaseError } from 'pg';
import { Controller } from './core/controller.class.js';
import { queryModule } from './modules/query.module.js';
import { transactionModule } from './modules/transaction.module.js';

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
    };
    /**
     * Additional options for pool behavior and debugging.
     */
    export interface Options {
        /** Enable debug logging for pool operations */
        debug?: boolean;
        /** Automatically attempt to reconnect on connection loss */
        reconnect?: boolean;
        /** Maximum number of connection attempts before giving up */
        maxAttempts?: number;
    };
};

// Class
// ===========================================================

export class PoolClientClass extends Controller {
    /** The query module */
    private queryModule: ReturnType<typeof queryModule>;
    /** The transaction module */
    private transactionModule: ReturnType<typeof transactionModule>;
    /** The pool instance */
    private pool: Pool | null = null;
    /** Error timeout ID */
    private errorTimeoutId: NodeJS.Timeout | null = null;
    /** Error debounce period (in milliseconds) */
    private errorDebounceMs: number = 1_000;
    /**
     * Pool class constructor.
     * @param config - The pool configuration object.
     * @param options - Additional pool options.
     */
    constructor(
        public readonly config: IPool.Config,
        public readonly options: IPool.Options,
    ) {
        const { host, database, user, password, port, max } = config;

        if (!host || !database || !user || !password || !port) {
            const required = ['host', 'database', 'user', 'password', 'port'].join(', ');
            throw new Error(`Need minimum required database configuration: ${required}`);
        }

        if (Number.isNaN(port) || !Number.isInteger(port)) {
            throw new Error(`Port (${port}) must be an integer!`);
        }
        
        if (!max || Number.isNaN(max) || !Number.isInteger(max) || max < 2) {
            throw new Error(`Max clients (${max}) in pool must be at least 2!`);
        }

        // Forces connection rotation, helps avoid stale connections if infra/network resets (default: 0 = disabled)
        if (config.maxLifetimeSeconds === undefined || config.maxLifetimeSeconds === null) {
            config.maxLifetimeSeconds = 600;
        }

        // Initialize base
        super('pool', database, options.debug ?? false);

        // Initialize extensions
        this.queryModule = queryModule.call(this);
        this.transactionModule = transactionModule.call(this);

        this.setupPool();
    }

    // Modules

    public async query(query: string, values?: unknown[]): Promise<QueryResult> {
        return this.queryModule.query(query, values);
    }

    public async transaction(queries: { query: string, values?: unknown[] }[]): Promise<QueryResult[]> {
        return this.transactionModule.transaction(queries);
    }

    // Public
    
    public metrics() {
        return {
            active: this.pool!.idleCount,
            idle: this.pool!.idleCount,
            waiting: this.pool!.waitingCount,
        }
    }

    public async getPoolClient() {
        await this.connection.enterOrWait();

        // Get a client from the pool
        const client = await this.pool!.connect();

        // Set up event listeners for connection lifecycle events
        if (client.listenerCount('error') === 0) {
            client.on('error', (err: Error) => {
                this.logger.error(`Client error: ${err.message} (${(err as DatabaseError)?.code})`);
                this.triggerError();
            });
        }

        return client;
    }

    public async disconnect(): Promise<void> {
        if (this.pool) {
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
        }

        // Reset the pool
        this.pool = null;
    }

    // Private

    private setupPool(): void {
        this.pool = new Pool(this.config);

        // Set up event listeners for pool error events
        if (this.pool.listenerCount('error') === 0) {
            this.pool.on('error', (err: Error, client: PoolClient) => {
                this.logger.error(`Pool error: ${err.message} (${(err as DatabaseError)?.code})`, err, client);
                this.triggerError();
            });
        }

        // Set up event listeners for pool connection lifecycle events
        if (this.pool.listenerCount('connect') === 0) {
            this.pool.on('connect', (client: PoolClient) => {
                if (client.listenerCount('error') === 0) {
                    client.on('error', (err: Error) => {
                        this.logger.error(`Client error: ${err.message} (${(err as DatabaseError)?.code})`, err, client);
                        this.triggerError();
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
            if (this.pool.listenerCount('release') === 0) {
                this.pool.on('release', (err: Error, client: PoolClient) => {
                    this.logger.info('Client released back to pool');
                });
            }
            if (this.pool.listenerCount('acquire') === 0) {
                this.pool.on('acquire', (client: PoolClient) => {
                    this.logger.info('Client acquired from pool');
                });
            }
        }

        // Connect to the database
        this.connect(this.pool!);
    }

    private async triggerError(): Promise<void> {
        // Close the connection (stop processing requests immediately)
        this.connection.close();

        // Wait for no error during the debounce period
        if (this.errorTimeoutId) {
            clearTimeout(this.errorTimeoutId);
        }

        // Schedule the actual error handling with a timeout
        this.errorTimeoutId = setTimeout(async () => {
            try {
                await this.reconnect(this.pool!);
            } finally {
                // Clear the timeout ID when done
                this.errorTimeoutId = null;
            }
        }, this.errorDebounceMs);
    }
}

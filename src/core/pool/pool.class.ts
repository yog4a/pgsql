import { Pool as PgPool, PoolClient, QueryResult, DatabaseError } from 'pg';
import { IPool } from './pool.types.js';
import { Controller } from 'src/core/base.class.js';
import { testConnection } from 'src/core/utils.js';

// Extensions
// ===========================================================

import { createQueryHandler } from 'src/extensions/createQueryHandler.js';
import { createTransactionHandler } from 'src/extensions/createTransactionHandler.js';

// Class
// ===========================================================

export class Pool extends Controller {
    /** Query handler */
    private _queryHandler: ReturnType<typeof createQueryHandler>;
    /** Transaction handler */
    private _transactionHandler: ReturnType<typeof createTransactionHandler>;
    /** The pool instance */
    private _pool: PgPool | null = null;
    /** Whether the pool is active */
    private _isActive: boolean = true;
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
        
        if (max !== undefined  && max !== null && max < 3) {
            throw new Error('Max clients in pool must be at least 3!');
        }

        // Forces connection rotation, helps avoid stale connections if infra/network resets (default: 0 = disabled)
        if (config.maxLifetimeSeconds === undefined || config.maxLifetimeSeconds === null) {
            config.maxLifetimeSeconds = 600;
        }

        // Initialize base
        super({ type: 'pool', database });

        // Initialize properties
        this.config = config;

        // Initialize options
        this.options = {
            debug: options.debug ?? false,
            reconnect: options.reconnect ?? false,
        };

        // Initialize query handler
        this._queryHandler = createQueryHandler.call(this, {
            maxAttempts: options.maxAttempts ?? 1,
            gracePeriodMs: options.gracePeriodMs ?? 10_000,
        });

        // Initialize transaction handler
        this._transactionHandler = createTransactionHandler.call(this, {
            maxAttempts: options.maxAttempts ?? 1,
            gracePeriodMs: options.gracePeriodMs ?? 10_000,
        });

        // Initialize extensions
        this.connect();
    }

    // Public

    public metrics() {
        return {
            active: this._pool!.idleCount,
            idle: this._pool!.idleCount,
            waiting: this._pool!.waitingCount,
        }
    }

    public async query(query: string, values?: unknown[]): Promise<QueryResult> {
        return this._queryHandler.query(query, values);
    }

    public async transaction(queries: { query: string, values?: unknown[] }[]): Promise<QueryResult[]> {
        return this._transactionHandler.transaction(queries);
    }

    public async shutdown(): Promise<void> {
        this._isActive = false;
        await this._queryHandler.shutdown();
        await this._transactionHandler.shutdown();
        await this.disconnect();
    }

    public async getPool(): Promise<PgPool> {
        await this.connection.enterOrWait();
        return this._pool!;
    }

    public async getPoolClient(): Promise<{ client: PoolClient, query: (query: string, values?: unknown[]) => Promise<QueryResult>, release: (err?: Error | boolean) => void }> {
        await this.connection.enterOrWait();

        // Get a client from the pool
        const client = await this._pool!.connect();

        // Set up event listeners for connection lifecycle events
        if (client.listenerCount('error') === 0) {
            client.on('error', (err: Error) => {
                this.logger.error(`Client error: ${err.message} (${(err as DatabaseError)?.code})`);
                this.triggerError();
            });
        }

        return {
            client,
            release: (destroy: boolean) => client.release(destroy),
        };

    }

    // Public

    private async connect(): Promise<void> {
        if (this._pool) {
            return; // Already connected
        }

        // Set up the pool
        this.setupPool();

        // Verify connection with test query
        const timestamp = await testConnection(this._pool!);

        // Open connection
        this.connection.open();

        // Log the connection and stop connection loop
        if (this.options.debug) {
            this.logger.info(`successfully connected at ${timestamp}`);
        }
    }

    private async disconnect(): Promise<void> {
        if (this._pool) {
            try {
                // Remove all listeners
                if (this._pool) {
                    this._pool.removeAllListeners();
                }
                this.logger.info(`successfully removed all listeners`);
    
            } catch (error) {
                this.logger.warn(`failed to remove all listeners:`, 
                    (error as Error).message
                );
            }
            try {
                // Close the pool
                await this._pool.end();
                this.logger.info(`successfully disconnected`);
    
            } catch (error) {
                this.logger.warn(`failed to disconnect:`, 
                    (error as Error).message
                );
            }
        }
    }

    private async reconnect(): Promise<void> {
        // Only reconnect if the pool is active
        if (this._isActive) {
            await this._reconnect(
                () => this.connect(),
                () => this.disconnect()
            );
        }
    }

    // Private

    private setupPool(): void {
        this._pool = new PgPool(this.config);

        // Set up event listeners for pool error events
        if (this._pool.listenerCount('error') === 0) {
            this._pool.on('error', (err: Error, client: PoolClient) => {
                this.logger.error(`Pool error: ${err.message} (${(err as DatabaseError)?.code})`);
                this.triggerError();
            });
        }

        // Set up event listeners for pool connection lifecycle events
        if (this._pool.listenerCount('connect') === 0) {
            this._pool.on('connect', (client: PoolClient) => {
                if (client.listenerCount('error') === 0) {
                    client.on('error', (err: Error) => {
                        this.logger.error(`Client error: ${err.message} (${(err as DatabaseError)?.code})`);
                        this.triggerError();
                    });
                }
                if (this.options.debug) {
                    this.logger.info('New client connection established');
                }
            });
        }

        // Set up event listeners for pool client removal events
        if (this._pool.listenerCount('remove') === 0) {
            this._pool.on('remove', (client: PoolClient) => {
                client.removeAllListeners();
                if (this.options.debug) {
                    this.logger.info('Client closed and removed from pool');
                }
            });
        }

        // Set up event listeners for connection lifecycle events (debug)
        if (this.options.debug) {
            if (this._pool.listenerCount('release') === 0) {
                this._pool.on('release', (err: Error, client: PoolClient) => {
                    this.logger.info('Client released back to pool');
                });
            }
            if (this._pool.listenerCount('acquire') === 0) {
                this._pool.on('acquire', (client: PoolClient) => {
                    this.logger.info('Client acquired from pool');
                });
            }
        }
    }

    private triggerError(): void {
        this._onError(async () => {
            try {
                // Try to execute a test query to see if the connection is still valid
                await testConnection(this._pool!);

                // Success, the connection is still valid
                this.connection.open();

            } catch (error) {
                // Log the error
                this.logger.error('connection test failed:',
                    (error as Error).message
                );

                // Error, disconnect and reconnect
                setImmediate(() => this.reconnect());
            }
        });
    }
}

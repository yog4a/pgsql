import { type QueryResult } from 'pg';
import { CorePool, type IPool } from 'src/core/pool.core.js';
import { queryModule } from 'src/modules/query.module.js';
import { transactionModule } from 'src/modules/transaction.module.js';

/**
 * Additional options for pool behavior and debugging.
 */
export interface PoolOptions extends IPool.Options {
    /** Maximum number of attempts to retry a query */
    maxAttempts?: number;
};

// Class
// ===========================================================

export class Pool extends CorePool {
    /** The query module */
    protected readonly queryModule: ReturnType<typeof queryModule>;
    /** Class Transaction Module */
    protected readonly transactionModule: ReturnType<typeof transactionModule>;

    /**
     * Pool class constructor.
     * @param config - The pool configuration object.
     * @param options - Additional pool options.
     */
    constructor(config: IPool.Config, options: PoolOptions) {
        super(config, options);

        // Initialize extensions
        this.queryModule = queryModule({ maxAttempts: options.maxAttempts ?? 2 });
        this.transactionModule = transactionModule({ maxAttempts: options.maxAttempts ?? 2 });
    }

    // Public

    public async query(query: string, values?: unknown[]): Promise<QueryResult> {
        return await this.queryModule.queryWithRetry({ query, values }, {
            getClient: () => this.getClient(),
            onError: (err: string) => this.logger.error(err),
        });
    }

    public async transaction(queries: { query: string, values?: unknown[] }[]): Promise<QueryResult[]> {
        return await this.transactionModule.transactionWithRetry(queries, {
            getClient: () => this.getClient(),
            onError: (err: string) => this.logger.error(err),
        });
    }

    public async shutdown(): Promise<void> {
        await this.queryModule.shutdown((message) => this.logger.info(message));
        await this.transactionModule.shutdown((message) => this.logger.info(message));
        await this.disconnect();
    }
}

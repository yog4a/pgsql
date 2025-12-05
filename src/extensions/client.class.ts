import { type QueryResult } from 'pg';
import { CoreClient, type IClient } from 'src/core/client.core.js';
import { queryModule } from 'src/modules/query.module.js';
import { transactionModule } from 'src/modules/transaction.module.js';

/**
 * Additional options for client behavior and debugging.
 */
export interface ClientOptions extends IClient.Options {
    /** Maximum number of attempts to retry a query */
    maxAttempts?: number;
};

/**
 * PostgreSQL client class.
 */
export class Client extends CoreClient {
    /** Class Query Module */
    protected readonly queryModule: ReturnType<typeof queryModule>;
    /** Class Transaction Module */
    protected readonly transactionModule: ReturnType<typeof transactionModule>;

    /**
     * Client class constructor.
     * @param config - The client configuration object.
     * @param options - Additional client options.
     */
    constructor(config: IClient.Config, options: ClientOptions) {
        super(config, options);

        // Initialize query module
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

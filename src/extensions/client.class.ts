import { type QueryResult } from 'pg';
import { CoreClient, type IClient } from 'src/core/client.core.js';
import { queryModule } from 'src/modules/query.module.js';
import { transactionModule } from 'src/modules/transaction.module.js';

// Types
// ===========================================================

/**
 * Additional options for client behavior and debugging.
 */
export interface ClientOptions extends IClient.Options {
    /** Maximum number of attempts to retry a query */
    maxAttempts?: number;
};

// Class
// ===========================================================

/**
 * This class creates a client handler for the database.
 * It will handle the retry logic for the queries and the shutdown logic.
 */
export class Client extends CoreClient {
    /** The query module */
    protected readonly queryModule: ReturnType<typeof queryModule>;
    /** The transaction module */
    protected readonly transactionModule: ReturnType<typeof transactionModule>;
    /** True when client is shutting down */
    private isShuttingDown: boolean = false;

    /**
     * Client class constructor.
     * @param config - The client configuration object.
     * @param options - Additional client options.
     */
    constructor(config: IClient.Config, options: ClientOptions) {
        super(config, options);

        // Initialize options
        const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 2));

        // Initialize extensions
        this.queryModule = queryModule({ maxAttempts });
        this.transactionModule = transactionModule({ maxAttempts });
    }

    // ===========================================================
    // Public methods
    // ===========================================================

    public async query(query: string, values?: unknown[]): Promise<QueryResult> {
        this.ensureNotShuttingDown();

        return await this.queryModule.queryWithRetry(
            { query, values },
            {
                getClient: this.getClient.bind(this),
                onError: this.handleModuleError.bind(this),
            }
        );
    }

    public async transaction(queries: { query: string, values?: unknown[] }[]): Promise<QueryResult[]> {
        this.ensureNotShuttingDown();

        return await this.transactionModule.transactionWithRetry(
            queries,
            {
                getClient: this.getClient.bind(this),
                onError: this.handleModuleError.bind(this),
            }
        );
    }

    public async shutdown(): Promise<void> {
        if (this.isShuttingDown) {
            this.logger.warn('client already shutdown');  
            return;
        }

        this.isShuttingDown = true;

        // Shutdown modules with error handling
        const shutdownErrors: Error[] = [];

        try {
            await this.queryModule.shutdown((msg) => this.logger.info(msg));
        } catch (error) {
            shutdownErrors.push(error as Error);
            this.logger.error('query module shutdown failed:', (error as Error).message);
        }

        try {
            await this.transactionModule.shutdown((msg) => this.logger.info(msg));
        } catch (error) {
            shutdownErrors.push(error as Error);
            this.logger.error('transaction module shutdown failed:', (error as Error).message);
        }

        try {
            await this.disconnect();
        } catch (error) {
            shutdownErrors.push(error as Error);
            this.logger.error('client disconnect failed:', (error as Error).message);
        }

        if (shutdownErrors.length > 0) {
            throw new Error(
                `Shutdown completed with ${shutdownErrors.length} error(s)`
            );
        }

        this.logger.info('client shutdown complete');
    }

    // ===========================================================
    // Private methods
    // ===========================================================

    private ensureNotShuttingDown(): void {
        if (this.isShuttingDown) {
            throw new Error('Client is shutting down');
        }
    }

    private handleModuleError(err: string): void {
        this.logger.error(err);
    }
}

import type { QueryResult, DatabaseError, ClientBase, PoolClient } from 'pg';
import { isRetriableError } from 'src/utils/error.utils.js';
import { waitWithBackoff } from 'src/utils/retry.utils.js';

/**
 * The options for the query.
 */
type QueryOptions = {
    getClient: () => Promise<ClientBase | PoolClient>;
    onError: (err: string) => void;
};

/**
 * This module creates a query handler for the database client.
 * It will handle the retry logic for the queries and the shutdown logic.
 */
export function queryModule(options: { maxAttempts: number }) {
    const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 1));
    let activeRequests = 0;

    // Functions

    async function queryWithRetry(params: { query: string; values?: unknown[] }, options: QueryOptions): Promise<QueryResult> {
        activeRequests++;
        try {
            let attempt = 0;
            while (true) {
                attempt++;
                const client = await options.getClient();
                try {
                    const result = await client.query(params.query, params.values);
                    return result;
                } 
                catch (err) {
                    if (attempt >= maxAttempts || !isRetriableError(err)) {
                        throw err;
                    }
                    options.onError(
                        `Transient error on attempt ${attempt}/${maxAttempts}: ${(err as Error).message} (code: ${(err as DatabaseError).code})`
                    );
                    await waitWithBackoff(attempt, { maxDelay: 15_000 });
                } 
                finally {
                    if ('release' in client && typeof client.release === 'function') {
                        client.release();
                    }
                }
            }
        } finally {
            activeRequests--;
        }
    }

    async function shutdown(onLog: (message: string) => void): Promise<void> {
        let countRunning = 0;

        // Wait for all current requests to finish
        while (activeRequests > 0) {
            if (activeRequests !== countRunning) {
                onLog(`waiting for ${activeRequests} queries to finish...`);
                countRunning = activeRequests;
            }
            await new Promise(res => setTimeout(res, 1_000));
        }
    }

    function getActiveRequests(): number {
        return activeRequests;
    }

    return {
        queryWithRetry,
        shutdown,
        getActiveRequests,
    };
}
import type { QueryResult, DatabaseError, ClientBase, PoolClient } from 'pg';
import { isRetriableError } from 'src/utils/error.utils.js';
import { waitWithBackoff } from 'src/utils/wait.utils.js';

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
    let isShuttingDown = false;

    // Functions

    async function queryWithRetry(params: { query: string; values?: unknown[] }, options: QueryOptions): Promise<QueryResult> {
        if (isShuttingDown) {
            throw new Error('Query module is shutting down');
        }

        activeRequests++;

        try {
            let lastError: Error | null = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                let client: ClientBase | PoolClient | null = null;

                try {
                    client = await options.getClient();
                    const result = await client.query(params.query, params.values);
                    return result;
                } catch (err) {
                    lastError = err as Error;
                    const isLastAttempt = attempt >= maxAttempts;
                    const canRetry = isRetriableError(err);

                    if (isLastAttempt || !canRetry) {
                        throw err;
                    }

                    const dbErr = err as DatabaseError;
                    options.onError(
                        `Transient error on attempt ${attempt}/${maxAttempts}: ${lastError.message} (code: ${dbErr?.code || 'N/A'})`
                    );

                    await waitWithBackoff(attempt, { maxDelayMs: 15_000, maxJitterMs: 500 });
                } finally {
                    if (client && 'release' in client && typeof client.release === 'function') {
                        try {
                            client.release();
                        } catch (releaseError) {
                            options.onError(
                                `Failed to release client: ${(releaseError as Error).message}`
                            );
                        }
                    }
                }
            }

            // Fallback (should never reach here)
            throw lastError || new Error('Query failed after all retry attempts');
        } 
        finally {
            activeRequests--;
        }
    }

    async function shutdown(onLog: (message: string) => void, timeoutMs: number = 30_000): Promise<void> {
        isShuttingDown = true;

        const startTime = Date.now();
        let lastCount = -1;

        while (activeRequests > 0) {
            if (activeRequests !== lastCount) {
                onLog(`waiting for ${activeRequests} queries to finish...`);
                lastCount = activeRequests;
            }

            // Check timeout
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(
                    `Shutdown timeout: ${activeRequests} queries still active after ${timeoutMs}ms`
                );
            }

            await new Promise(res => setTimeout(res, 1_000));
        }

        onLog('all queries completed');
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
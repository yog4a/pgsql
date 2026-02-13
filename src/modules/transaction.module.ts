import type { QueryResult, DatabaseError, ClientBase, PoolClient } from 'pg';
import { isRetriableError } from 'src/utils/error.utils.js';
import { waitWithBackoff } from 'src/utils/wait.utils.js';

/*
 * The query to be executed in the transaction.
 */
type TransactionQuery = { query: string; values?: unknown[] };

/**
 * The options for the transaction.
 */
type TransactionOptions = {
    getClient: () => Promise<ClientBase | PoolClient>;
    onError: (err: string) => void;
};

/**
 * This module creates a transaction handler for the database client.
 * It will handle the retry logic for the transactions and the shutdown logic.
 */
export function transactionModule(options: { maxAttempts: number }) {
    const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 1));

    let activeRequests = 0;
    let isShuttingDown = false;

    // Private

    async function transactionWithRetry(queries: TransactionQuery[], options: TransactionOptions): Promise<QueryResult[]> {
        if (isShuttingDown) {
            throw new Error('Transaction module is shutting down');
        }

        activeRequests++;

        try {
            let lastError: Error | null = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                let client: ClientBase | PoolClient | null = null;
                let inTransaction = false;

                try {
                    const results: QueryResult[] = [];
                    client = await options.getClient();

                    await client.query('BEGIN');
                    inTransaction = true;

                    for (const { query, values } of queries) {
                        results.push(
                            await client.query(query, values)
                        );
                    }

                    await client.query('COMMIT');
                    inTransaction = false;

                    return results;
                } 
                catch (err) {
                    lastError = err as Error;

                    // Rollback if in transaction
                    if (inTransaction && client) {
                        try {
                            await client.query('ROLLBACK');
                        } catch (rollbackErr) {
                            options.onError(
                                `ROLLBACK failed: ${(rollbackErr as Error).message}`
                            );
                        }
                    }

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
                } 
                finally {
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
            throw lastError || new Error('Transaction failed after all retry attempts');
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
                onLog(`waiting for ${activeRequests} transactions to finish...`);
                lastCount = activeRequests;
            }

            if (Date.now() - startTime > timeoutMs) {
                throw new Error(
                    `Shutdown timeout: ${activeRequests} transactions still active after ${timeoutMs}ms`
                );
            }

            await new Promise(res => setTimeout(res, 1_000));
        }

        onLog('all transactions completed');
    }

    function getActiveRequests(): number {
        return activeRequests;
    }

    return {
        transactionWithRetry,
        shutdown,
        getActiveRequests,
    };
}
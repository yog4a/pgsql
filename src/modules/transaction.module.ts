import type { QueryResult, DatabaseError, ClientBase, PoolClient } from 'pg';
import { isRetriableError } from 'src/utils/error.utils.js';
import { waitWithBackoff } from 'src/utils/retry.utils.js';

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

    // Private

    async function transactionWithRetry(queries: TransactionQuery[], options: TransactionOptions): Promise<QueryResult[]> {
        activeRequests++;
        try {
            let attempt = 0;

            while (true) {
                attempt++;
                try {
                    const results: QueryResult[] = [];
                    const client = await options.getClient();
                    try {
                        await client.query('BEGIN');
                        for (const { query, values } of queries) {
                            results.push(
                                await client.query(query, values)
                            );
                        }
                        await client.query('COMMIT');
                        return results;
                    } 
                    catch (queryErr) {
                        await client.query('ROLLBACK').catch((rollbackErr) => {
                            options.onError(`ROLLBACK failed: ${rollbackErr.message}`);
                        });
                        throw queryErr;
                    } 
                    finally {
                        if ('release' in client && typeof client.release === 'function') {
                            client.release();
                        }
                    }
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
        transactionWithRetry,
        shutdown,
        getActiveRequests,
    };
}
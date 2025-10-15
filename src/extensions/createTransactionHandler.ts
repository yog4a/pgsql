import { type QueryResult } from 'pg';
import { Pool } from 'src/core/pool/pool.class.js';

/**
 * This extension creates a transaction handler for the pool.
 * It will handle the retry logic for the transactions and the shutdown logic.
 */

export function createTransactionHandler(this: Pool) {
    const maxAttempts = this.options.maxAttempts ?? 2;
    const gracePeriodMs = this.options.gracePeriodMs ?? 10_000;

    let activeRequests = 0;

    // Private

    const executeWithRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
        let attempt = 0;

        while (true) {
            try {
                return await fn();
            } catch (err) {
                attempt++;
                if (attempt >= maxAttempts) {
                    throw err;
                }
                const delay = Math.min(1_000 * attempt, 15_000);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    // Public

    const transaction = async (queries: { query: string, values?: unknown[] }[]): Promise<QueryResult[]> => {
        activeRequests++;
        try {
            return await executeWithRetry<QueryResult[]>(async () => {
                const results: QueryResult[] = [];
                const poolClient = await this.getPoolClient();
                try {
                    await poolClient.query('BEGIN');
                    for (const { query, values } of queries) {
                        const q = query.trim().endsWith(';') ? query.trim() : `${query.trim()};`;
                        results.push(await poolClient.query(q, values));
                    }
                    await poolClient.query('COMMIT');
                    return results;

                } catch (error) {
                    await poolClient.query('ROLLBACK').catch(() => {});
                    throw error;

                } finally {
                    poolClient.release();
                }
            });
        } finally {
            activeRequests--;
        }
    }

    const shutdown = async (): Promise<void> => {
        // Keep checking until we're sure no new requests have started during grace period
        while (true) {
            let countRunning = 0;

            // Wait for all current requests to finish
            while (activeRequests > 0) {
                if (activeRequests !== countRunning) {
                    this.logger.info(`waiting for ${activeRequests} queries to finish...`);
                    countRunning = activeRequests;
                }
                await new Promise(res => setTimeout(res, 1_000));
            }

            // When requestsRunning reaches 0, wait for grace period
            this.logger.info(`all queries completed. starting grace period...`);
            await new Promise(res => setTimeout(res, gracePeriodMs));
            
            // After grace period, check if new requests started,
            // If still 0, we can safely exit
            if (activeRequests === 0) {
                break;
            }
            
            // Otherwise, new requests came in during grace period, so loop again
            this.logger.info(`new requests detected during grace period. continuing...`);
        }

        // Log
        this.logger.info(`no more requests to process. shutdown complete.`);
    }

    return {
        transaction,
        shutdown,
    };
}
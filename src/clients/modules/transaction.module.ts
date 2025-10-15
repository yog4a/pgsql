import { type QueryResult } from 'pg';
import { PoolClientClass } from 'src/clients/pool.client.js';

/*
 * The query to be executed in the transaction.
 */
type TransactionQuery = { query: string; values?: unknown[] };

/**
 * This extension creates a transaction handler for the pool.
 * It will handle the retry logic for the transactions and the shutdown logic.
 */
export function transactionModule(this: PoolClientClass) {
    const maxAttempts = this.options.maxAttempts ?? 2;
    let activeRequests = 0;

    // Private

    const executeWithRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
        let attempt = 0;

        while (true) {
            attempt++;
            try {
                return await fn();
            } catch (err) {
                if (attempt > maxAttempts || !isRetriableError(err)) {
                    throw err;
                }
                this.logger.warn(
                    `Transient error on attempt ${attempt}/${maxAttempts}: ${(err as Error).message}`
                );
                const backoff = Math.min(1_000 * attempt, 15_000);
                const jitter = Math.random() * 500;
                await new Promise(res => setTimeout(res, backoff + jitter));
            }
        }
    }

    const isRetriableError = (err: unknown): boolean => {
        const dbErr = err as any;
        const code = dbErr.code as string | undefined;
        const errno = dbErr.errno as string | undefined;

        // Transient Postgres error codes
        const retriableCodes = ['57P01', '57P02', '57P03', '40001', '40P01'];

        // Node.js network errors
        const retriableErrnos = ['ECONNRESET', 'ETIMEDOUT', 'EPIPE'];

        return (
            (code !== undefined && retriableCodes.includes(code)) ||
            (errno !== undefined && retriableErrnos.includes(errno))
        );
    }

    // Public

    const transaction = async (queries: TransactionQuery[]): Promise<QueryResult[]> => {
        activeRequests++;
        try {
            return await executeWithRetry<QueryResult[]>(async () => {
                const results: QueryResult[] = [];
                const poolClient = await this.getPoolClient();
                try {
                    await poolClient.query('BEGIN');
                    for (const { query, values } of queries) {
                        results.push(await poolClient.query(query, values));
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
        let countRunning = 0;

        // Wait for all current requests to finish
        while (activeRequests > 0) {
            if (activeRequests !== countRunning) {
                if (this.debug) {
                    this.logger.info(`waiting for ${activeRequests} queries to finish...`);
                }
                countRunning = activeRequests;
            }
            await new Promise(res => setTimeout(res, 1_000));
        }
    }

    return {
        transaction,
        shutdown,
    };
}
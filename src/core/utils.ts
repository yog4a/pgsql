import { Client, Pool } from 'pg';

// Class
// ===========================================================

export const autoRetry = async <T>(fn: () => Promise<T>, maxAttempts: number = -1): Promise<T> => {
    let attempt = 0;

    while (maxAttempts <= 0 || attempt < maxAttempts) {
        attempt++;
        try {
            return await fn();
        } catch (err) {
            if (maxAttempts > 0 && attempt >= maxAttempts) {
                throw err;
            }
            const delay = Math.min(1_000 * attempt, 15_000);
            await new Promise(res => setTimeout(res, delay));
        }
    }

    // Should never reach here (avoid typescript return error)
    throw new Error('Max attempts reached!');
}

/**
 * Tests the connection to the database.
 * @param instance - The instance to test the connection to.
 * @returns The timestamp of the connection.
 * @throws An error if the connection test query fails.
 */
export const testConnection = async (instance: Client | Pool): Promise<string> => {
    // Verify connection with test query
    const result = await instance.query('SELECT NOW() as timestamp');
    const timestamp = result.rows?.[0]?.timestamp;

    if (!timestamp) {
        // If the connection is not successful, throw an error
        throw new Error('Connection test query failed - no timestamp returned');
    }

    return timestamp;
}

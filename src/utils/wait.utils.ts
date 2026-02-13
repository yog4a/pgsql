/**
 * Waits with exponential backoff and random jitter.
 *
 * Exponential backoff helps avoid overwhelming a server by spacing out retries at increasing intervals.
 * Jitter introduces randomness to the wait time, reducing the chance that many clients retry at the same moment
 * ("thundering herd" problem). The jitter here is a random value from 0 up to the specified maxJitterMs.
 *
 * @param attempt - The current attempt number (starts at 1).
 * @param options - The options for the backoff.
 * @param options.maxJitterMs - The maximum jitter in milliseconds (randomly adds between 0 and this value to the delay).
 * @param options.maxDelayMs - The maximum exponential backoff delay in milliseconds.
 */
export async function waitWithBackoff(
    attempt: number,
    options: { maxJitterMs: number, maxDelayMs: number }
): Promise<void> {
    // Jitter is a random value between 0 and maxJitterMs, to avoid synchronized retries.
    const jitter = Math.random() * options.maxJitterMs;
    // Backoff increases with each attempt, up to maxDelayMs.
    const backoff = Math.min(1_000 * attempt, options.maxDelayMs);
    // Wait for the combined backoff plus jitter period before resolving.
    await new Promise(res => setTimeout(res, backoff + jitter));
}

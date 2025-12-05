/**
 * Waits with exponential backoff and jitter, based on the attempt.
 * @param attempt - The current attempt number (starts at 1).
 */
export async function waitWithBackoff(attempt: number, options: { maxDelay: number }): Promise<void> {
    const backoff = Math.min(1_000 * attempt, options.maxDelay);
    const jitter = Math.random() * 500;
    await new Promise(res => setTimeout(res, backoff + jitter));
}

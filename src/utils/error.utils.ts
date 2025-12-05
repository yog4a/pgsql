// Constants (PostgreSQL retriable SQLSTATE classes)
// ===========================================================

// Class 08 — connection exceptions
const pgConnectionErrors = new Set([
    '08000', '08003', '08006', '08001', '08004', '08007', '08P01'
]);

// Class 40 — transaction rollback
const pgTxnRollbackErrors = new Set([
    '40000', '40001', '40002', '40003', '40P01'
]);

// Lock not available (transient)
const pgLockErrors = new Set([
    '55P03'
]);

// Operator intervention (shutdown, cancel)
const pgInterventionErrors = new Set([
    '57000', '57014', '57P01', '57P02', '57P03', '57P04', '57P05'
]);

// Resource issues (may be transient depending on environment)
const pgResourceErrors = new Set([
    '53000', '53100', '53200', '53300', '53400'
]);

// Constants (Node.js network/system errors)
// ===========================================================

const retriableNetworkCodes = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ECONNABORTED',
    'ETIMEDOUT',
    'EPIPE',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'EAI_AGAIN',
]);

// Utils
// ===========================================================

/**
 * Determines if a database or network error is retriable.
 *
 * A retriable error is one where retrying the same operation later
 * *might* succeed (transient issue, concurrency conflict, network blip).
 */
export const isRetriableError = (err: unknown): boolean => {
    if (!err || typeof err !== 'object') {
        return false;
    }

    const e = err as { code?: unknown };
    const code = typeof e.code === 'string' ? e.code.toUpperCase() : undefined;

    // Evaluate
    if (code) {
        if (
            pgConnectionErrors.has(code) ||
            pgTxnRollbackErrors.has(code) ||
            pgLockErrors.has(code) ||
            pgInterventionErrors.has(code) ||
            pgResourceErrors.has(code) ||
            retriableNetworkCodes.has(code)
        ) {
            return true;
        }
    }

    return false;
};
// Constants (PostgreSQL retriable SQLSTATE classes)
// ===========================================================

// Class 08 — Connection exceptions
const PG_CONNECTION_ERRORS = new Set([
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
    '08001', // sqlclient_unable_to_establish_sqlconnection
    '08004', // sqlserver_rejected_establishment_of_sqlconnection
    '08007', // transaction_resolution_unknown
    '08P01', // protocol_violation
]);

// Class 25 — Invalid transaction state
const PG_INVALID_TRANSACTION_STATE = new Set([
    '25000', // invalid_transaction_state
    '25001', // active_sql_transaction
    '25P01', // no_active_sql_transaction
    '25P02', // in_failed_sql_transaction
]);

// Class 40 — Transaction rollback
const PG_TRANSACTION_ROLLBACK_ERRORS = new Set([
    '40000', // transaction_rollback
    '40001', // serialization_failure
    '40002', // transaction_integrity_constraint_violation
    '40003', // statement_completion_unknown
    '40P01', // deadlock_detected
]);

// Class 55 — Object not in prerequisite state
const PG_LOCK_ERRORS = new Set([
    '55P03', // lock_not_available
]);

// Class 57 — Operator intervention
const PG_OPERATOR_INTERVENTION_ERRORS = new Set([
    '57000', // operator_intervention
    '57014', // query_canceled
    '57P01', // admin_shutdown
    '57P02', // crash_shutdown
    '57P03', // cannot_connect_now
    '57P04', // database_dropped
    '57P05', // idle_session_timeout
]);

// Class 53 — Insufficient resources
const PG_RESOURCE_ERRORS = new Set([
    '53000', // insufficient_resources
    '53100', // disk_full
    '53200', // out_of_memory
    '53300', // too_many_connections
    '53400', // configuration_limit_exceeded
]);

// Node.js network/system errors
// ===========================================================

const RETRIABLE_NETWORK_CODES = new Set([
    'ECONNRESET',    // Connection reset by peer
    'ECONNREFUSED',  // Connection refused
    'ECONNABORTED',  // Connection aborted
    'ETIMEDOUT',     // Connection timed out
    'EPIPE',         // Broken pipe
    'EHOSTUNREACH',  // Host is unreachable
    'ENETUNREACH',   // Network is unreachable
    'EAI_AGAIN',     // Temporary DNS failure
]);

// Combine all retriable error codes for fast lookup
// ===========================================================

const ALL_RETRIABLE_CODES = new Set([
    ...PG_CONNECTION_ERRORS,
    ...PG_INVALID_TRANSACTION_STATE,
    ...PG_TRANSACTION_ROLLBACK_ERRORS,
    ...PG_LOCK_ERRORS,
    ...PG_OPERATOR_INTERVENTION_ERRORS,
    ...PG_RESOURCE_ERRORS,
    ...RETRIABLE_NETWORK_CODES,
]);

// Utils
// ===========================================================

/**
 * Determines if a database or network error is retriable.
 *
 * A retriable error is one where retrying the same operation later
 * might succeed (transient issue, concurrency conflict, network blip).
 */
export const isRetriableError = (err: unknown): boolean => {
    if (!err || typeof err !== 'object') {
        return false;
    }

    const e = err as { code?: unknown };
    
    if (typeof e.code !== 'string') {
        return false;
    }

    return ALL_RETRIABLE_CODES.has(e.code.toUpperCase());
};
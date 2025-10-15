import type { PoolConfig, QueryResult } from 'pg';

// Types
// ===========================================================

export namespace IPool {
    /**
     * Configuration options required for creating a PostgreSQL connection pool.
     * All fields are required and non-nullable.
     */
    export interface Config extends PoolConfig {
        /** Database host address */
        host: NonNullable<PoolConfig['host']>;
        /** Database name */
        database: NonNullable<PoolConfig['database']>;
        /** Database user */
        user: NonNullable<PoolConfig['user']>;
        /** Database password */
        password: NonNullable<PoolConfig['password']>;
        /** Database port */
        port: NonNullable<PoolConfig['port']>;
        /** Maximum number of clients in the pool */
        max: NonNullable<PoolConfig['max']>;
    };
    /**
     * Additional options for pool behavior and debugging.
     */
    export interface Options {
        /** Enable debug logging for pool operations */
        debug?: boolean;
        /** Automatically attempt to reconnect on connection loss */
        reconnect?: boolean;
        /** Maximum number of connection attempts before giving up */
        maxAttempts?: number;
        /** Grace period (in milliseconds) to wait before retrying or shutting down */
        gracePeriodMs?: number;
    };
};

export type { PoolConfig, QueryResult };
import type { ClientConfig, QueryResult } from 'pg';

// Types
// ===========================================================

export interface IClient {
    config: ClientConfig & {
        host: NonNullable<ClientConfig['host']>;
        database: NonNullable<ClientConfig['database']>;
        user: NonNullable<ClientConfig['user']>;
        password: NonNullable<ClientConfig['password']>;
        port: NonNullable<ClientConfig['port']>;
    };
    options: {
        debug?: boolean;
        reconnect?: boolean;
    };
};

export type { ClientConfig, QueryResult };
import type { PoolConfig } from 'pg';

// Types
// ===========================================================

export interface IClientConfig {
    host: NonNullable<PoolConfig['host']>;
    database: NonNullable<PoolConfig['database']>;
    user: NonNullable<PoolConfig['user']>;
    password: NonNullable<PoolConfig['password']>;
    port: NonNullable<PoolConfig['port']>;
    connectionTimeoutMillis?: NonNullable<PoolConfig['connectionTimeoutMillis']>;
    ssl?: NonNullable<PoolConfig['ssl']>;
}

export interface IClientConfig {
    host: NonNullable<PoolConfig['host']>;
    database: NonNullable<PoolConfig['database']>;
    user: NonNullable<PoolConfig['user']>;
    password: NonNullable<PoolConfig['password']>;
    port: NonNullable<PoolConfig['port']>;
    connectionTimeoutMillis?: NonNullable<PoolConfig['connectionTimeoutMillis']>;
    ssl?: NonNullable<PoolConfig['ssl']>;
}

// Types
// ===========================================================

export interface MessagePayload {
    timestamp: number;
    data: Record<string, any>;
}

// Requester
// ===========================================================

export interface RequestPayload<T = any> {
    timestamp: number;
    data: Record<string, T>;
}

export interface ResponsePayload<T = any> {
    data: T;
    error?: {
        code: string;
        message: string;
    };
}


// Types
// ===========================================================

export interface ListenerOptions {
    reconnectDelayMs: number;
}
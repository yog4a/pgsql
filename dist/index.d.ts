import { Client as Client$1, Pool as Pool$1, Notification, ClientConfig, PoolConfig, PoolClient, ClientBase, QueryResult } from 'pg';

/**
 * Gate/controller for async readiness.
 *
 * - When closed, callers must wait.
 * - When opened, all current waiters are released.
 * - close() without a reason: just closes gate, waiters keep waiting.
 * - close(reason): rejects all current waiters.
 */
declare class Gate {
    /** Number of operations currently waiting at the gate */
    private _waiters;
    /** Tracks whether the gate is open (true) or closed (false) */
    private _isOpen;
    /** Shared promise that all current waiters are waiting on */
    private _pendingPromise;
    /** Function to resolve the pending promise when gate opens */
    private _pendingResolve;
    /** Function to reject the pending promise if gate closes with error */
    private _pendingReject;
    /**
     * Opens the gate and resolves any pending waiters.
     * @returns The number of waiters that were released (waited) at the gate
     */
    open(): number;
    /**
     * Closes the gate and resets any pending promises, requiring callers to wait again.
     * @param reason - The reason to reject pending promises (default: undefined)
     * @returns The number of operations that were released (waited) at the gate
     */
    close(reason?: Error): number;
    /**
     * Waits for the gate to be open before proceeding.
     * If the gate is already open, resolves immediately.
     * If the gate is closed, returns a promise that will resolve when the gate opens.
     * This allows code to wait at the "gate" until it's ready to proceed.
     * @returns A promise that resolves when the gate is open
     */
    enterOrWait(): Promise<void>;
    /**
     * Waits for the gate to be open before proceeding.
     * If the gate is already open, resolves immediately.
     * If the gate is closed, returns a promise that will resolve when the gate opens.
     * This allows code to wait at the "gate" until it's ready to proceed.
     * @returns A promise that resolves when the gate is open
     */
    enter(): Promise<void>;
    /**
     * Returns the current state of the gate.
     * @returns true if the gate is open, false if it is closed
     */
    isOpen(): boolean;
    /**
     * Returns the current state of the gate.
     * @returns true if the gate is closed, false if it is open
     */
    isClosed(): boolean;
    /**
     * Resets the gate to its initial state.
     * Clears the promise, resolve function, reject function, and waiting count.
     */
    private resetPromise;
}

/**
 * Simple and extensible logger utility.
 *
 * Supports standard logging methods (`info`, `warn`, `error`, `debug`)
 * with consistent formatting, message prefixing, and error safety.
 */
declare class Logger {
    private readonly prefix;
    /**
     * Creates a new Logger instance.
     * @param prefix - Text to prepend to all log messages.
     */
    constructor(prefix: string);
    /** Logs informational messages */
    info(...args: any[]): void;
    /** Logs warning messages */
    warn(...args: any[]): void;
    /** Logs error messages */
    error(...args: any[]): void;
    /** Logs debug messages */
    debug(...args: any[]): void;
    /** Re-throws an error with prefix */
    throw(message: string): void;
    /** Creates a new logger and cumulate the prefix (example: 'parent:child1:child2') */
    child(prefix: string): Logger;
    /** Logs a message to the console */
    private process;
}

declare class ConnectionController {
    private readonly logger;
    private readonly debug;
    /** The connection test timeout (in milliseconds) */
    private readonly TIMEOUT_MS;
    /** Class Connection Gate */
    readonly connection: Gate;
    /**
     * Connection class constructor.
     * @param logger - The logger instance.
     * @param debug - Whether to enable debug mode.
     */
    constructor(logger: Logger, debug?: boolean);
    /**
     * Tests the connection to the database with a client instance.
     * @param instance - The client instance.
     */
    testClient(instance: Client$1): Promise<void>;
    /**
     * Tests the connection to the database with a pool instance.
     * @param instance - The pool instance.
     */
    testPool(instance: Pool$1): Promise<void>;
    /**
     * Tests the connection to the database with a client/pool instance.
     * @param instance - The client/pool instance.
     * @param signal - The abort signal.
     */
    private testConnection;
}

declare class ConnectionEvents {
    private events;
    /**
     * ConnectionEvents class constructor.
     */
    constructor();
    /**
     * Emits the connect event.
     */
    connect(message?: string): void;
    /**
     * Emits the disconnect event.
     */
    disconnect(message?: string | Error): void;
    /**
     * Emits the reconnect event.
     */
    reconnect(message?: string | Error): void;
    /**
     * Emits the notification event.
     */
    notification(notif: Notification): void;
    /**
     * Adds a listener for the connect event.
     */
    onConnect(fn: (message?: string) => void): void;
    /**
     * Adds a listener for the disconnect event.
     */
    onDisconnect(fn: (message?: string | Error) => void): void;
    /**
     * Adds a listener for the reconnect event.
     */
    onReconnect(fn: (message?: string | Error) => void): void;
    /**
     * Adds a listener for the notification event.
     */
    onNotification(fn: (notif: Notification) => void): void;
}

declare namespace IClient {
    /**
     * Configuration required for creating a PostgreSQL connection.
     */
    interface Config extends ClientConfig {
        /** Database host address */
        host: NonNullable<ClientConfig['host']>;
        /** Database name */
        database: NonNullable<ClientConfig['database']>;
        /** Database user */
        user: NonNullable<ClientConfig['user']>;
        /** Database password */
        password: NonNullable<ClientConfig['password']>;
        /** Database port */
        port: NonNullable<ClientConfig['port']>;
    }
    /**
     * Additional options for client behavior and debugging.
     */
    interface Options {
        /** Enable debug logging for client operations */
        debug?: boolean;
    }
}
declare class CoreClient {
    protected readonly config: IClient.Config;
    protected readonly options: IClient.Options;
    /** Class Connection Controller */
    protected readonly connectionController: ConnectionController;
    /** Class Connection Events */
    protected readonly connectionEvents: ConnectionEvents;
    /** Class Logger Instance */
    protected readonly logger: Logger;
    /** True when reconnection is in progress */
    private _isReconnecting;
    /** True when client is being destroyed */
    private _isDestroying;
    /** True when client is intentionally shutting down */
    private _isShuttingDown;
    /** The PostgreSQL client instance */
    private _client;
    /**
     * Client class constructor.
     * @param config - PostgreSQL client configuration.
     * @param options - Additional client options.
     */
    constructor(config: IClient.Config, options: IClient.Options);
    getClient(): Promise<Client$1>;
    disconnect(): Promise<void>;
    private initialize;
    private reconnect;
    private createClient;
    private destroyClient;
    private verifyClient;
    private verifyOrReconnect;
}

declare namespace IPool {
    /**
     * Configuration options required for creating a PostgreSQL connection pool.
     */
    interface Config extends PoolConfig {
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
        /** Minimum number of clients in the pool */
        min: NonNullable<PoolConfig['min']>;
    }
    /**
     * Additional options for pool behavior and debugging.
     */
    interface Options {
        /** Enable debug logging for pool operations */
        debug?: boolean;
    }
}
declare class CorePool {
    protected readonly config: IPool.Config;
    protected readonly options: IPool.Options;
    /** Class Connection Controller */
    protected readonly connectionController: ConnectionController;
    /** Class Connection Events */
    protected readonly connectionEvents: ConnectionEvents;
    /** Class Logger Instance */
    protected readonly logger: Logger;
    /** True when reconnection is in progress */
    private _isReconnecting;
    /** True when pool is being destroyed */
    private _isDestroying;
    /** True when pool is intentionally shutting down */
    private _isShuttingDown;
    /** The PostgreSQL pool instance */
    private _pool;
    /**
     * Pool class constructor.
     * @param config - PostgreSQL pool configuration.
     * @param options - Additional pool options.
     */
    constructor(config: IPool.Config, options: IPool.Options);
    metrics(): {
        /** Total number of clients existing within the pool */
        total: number;
        /** Number of clients which are not checked out but are currently idle in the pool */
        idle: number;
        /** Number of clients which are checked out and in use */
        active: number;
        /** Number of queued requests waiting on a client when all clients are checked out */
        waiting: number;
    } | null;
    getClient(): Promise<PoolClient>;
    disconnect(): Promise<void>;
    private initialize;
    private reconnect;
    private createPool;
    private destroyPool;
    private verifyPool;
    private verifyOrReconnect;
}

/**
 * The options for the query.
 */
type QueryOptions = {
    getClient: () => Promise<ClientBase | PoolClient>;
    onError: (err: string) => void;
};
/**
 * This module creates a query handler for the database client.
 * It will handle the retry logic for the queries and the shutdown logic.
 */
declare function queryModule(options: {
    maxAttempts: number;
}): {
    queryWithRetry: (params: {
        query: string;
        values?: unknown[];
    }, options: QueryOptions) => Promise<QueryResult>;
    shutdown: (onLog: (message: string) => void, timeoutMs?: number) => Promise<void>;
    getActiveRequests: () => number;
};

type TransactionQuery = {
    query: string;
    values?: unknown[];
};
/**
 * The options for the transaction.
 */
type TransactionOptions = {
    getClient: () => Promise<ClientBase | PoolClient>;
    onError: (err: string) => void;
};
/**
 * This module creates a transaction handler for the database client.
 * It will handle the retry logic for the transactions and the shutdown logic.
 */
declare function transactionModule(options: {
    maxAttempts: number;
}): {
    transactionWithRetry: (queries: TransactionQuery[], options: TransactionOptions) => Promise<QueryResult[]>;
    shutdown: (onLog: (message: string) => void, timeoutMs?: number) => Promise<void>;
    getActiveRequests: () => number;
};

/**
 * Additional options for client behavior and debugging.
 */
interface ClientOptions extends IClient.Options {
    /** Maximum number of attempts to retry a query */
    maxAttempts?: number;
}
/**
 * This class creates a client handler for the database.
 * It will handle the retry logic for the queries and the shutdown logic.
 */
declare class Client extends CoreClient {
    /** The query module */
    protected readonly queryModule: ReturnType<typeof queryModule>;
    /** The transaction module */
    protected readonly transactionModule: ReturnType<typeof transactionModule>;
    /** True when client is shutting down */
    private isShuttingDown;
    /**
     * Client class constructor.
     * @param config - The client configuration object.
     * @param options - Additional client options.
     */
    constructor(config: IClient.Config, options: ClientOptions);
    query(query: string, values?: unknown[]): Promise<QueryResult>;
    transaction(queries: {
        query: string;
        values?: unknown[];
    }[]): Promise<QueryResult[]>;
    shutdown(): Promise<void>;
    private ensureNotShuttingDown;
    private handleModuleError;
}

/**
 * Additional options for pool behavior and debugging.
 */
interface PoolOptions extends IPool.Options {
    /** Maximum number of attempts to retry a query */
    maxAttempts?: number;
}
/**
 * This class creates a pool handler for the database.
 * It will handle the retry logic for the queries and the shutdown logic.
 */
declare class Pool extends CorePool {
    /** The query module */
    protected readonly queryModule: ReturnType<typeof queryModule>;
    /** The transaction module */
    protected readonly transactionModule: ReturnType<typeof transactionModule>;
    /** True when pool is shutting down */
    private isShuttingDown;
    /**
     * Pool class constructor.
     * @param config - The pool configuration object.
     * @param options - Additional pool options.
     */
    constructor(config: IPool.Config, options: PoolOptions);
    query(query: string, values?: unknown[]): Promise<QueryResult>;
    transaction(queries: {
        query: string;
        values?: unknown[];
    }[]): Promise<QueryResult[]>;
    shutdown(): Promise<void>;
    private ensureNotShuttingDown;
    private handleModuleError;
}

/**
 * Additional options for client behavior and debugging.
 */
interface ClientListenOptions extends IClient.Options {
    /** Maximum number of attempts to retry a query */
    maxAttempts?: number;
}
/**
 * The events for a channel.
 */
interface ChannelEvents {
    channel: string;
    onConnect: () => void;
    onDisconnect: () => void;
    onData: (data: unknown) => void;
    onError: (error: Error) => void;
}
/**
 * This class creates a notification handler for the database.
 * It will automatically recreate listeners on connection errors.
 */
declare class NotificationClient extends CoreClient {
    /** The channels map */
    private readonly channels;
    /** The query module */
    protected readonly queryModule: ReturnType<typeof queryModule>;
    /** True when client is shutting down */
    private isShuttingDown;
    /**
     * NotificationClient class constructor.
     * @param config - The client configuration object.
     * @param options - Additional client options.
     */
    constructor(config: IClient.Config, options: ClientListenOptions);
    query(query: string, values?: unknown[]): Promise<QueryResult>;
    listen(channel: string, events: Omit<ChannelEvents, 'channel'>): Promise<void>;
    unlisten(channel: string): Promise<void>;
    shutdown(): Promise<void>;
    disconnect(): Promise<void>;
    getChannels(): string[];
    private handleReconnect;
    private handleDisconnect;
    private handleNotification;
    private ensureNotShutdown;
    private handleModuleError;
}

export { type ChannelEvents, Client, type ClientListenOptions, type ClientOptions, CoreClient, CorePool, IClient, IPool, NotificationClient, Pool, type PoolOptions };

import type { QueryResult, Notification } from 'pg';
import { CoreClient, type IClient } from 'src/core/client.core.js';
import { queryModule } from 'src/modules/query.module.js';
import { transactionModule } from 'src/modules/transaction.module.js';

/**
 * Additional options for client behavior and debugging.
 */
export interface ClientListenOptions extends IClient.Options {
    /** Maximum number of attempts to retry a query */
    maxAttempts?: number;
};

/**
 * The events for a channel.
 */
export interface ChannelEvents {
    channel: string;
    onConnect: () => void;
    onDisconnect: () => void;
    onData: (messages: string[]) => void;
    onError: (error: Error) => void;
}

/**
 * This module creates a listen handler for the database pool.
 * Automatically recreates listeners on connection errors.
 */
export class ListenClient extends CoreClient {
    /** The channels map */
    private channels: Map<string, Omit<ChannelEvents, 'channel'>>;
    /** The query module */
    protected readonly queryModule: ReturnType<typeof queryModule>;
    /** The transaction module */
    protected readonly transactionModule: ReturnType<typeof transactionModule>;

    /**
     * ListenClient class constructor.
     * @param config - The client configuration object.
     * @param options - Additional client options.
     */
    constructor(config: IClient.Config, options: ClientListenOptions) {
        super(config, options);

        // Initialize channels
        this.channels = new Map();

        // Initialize modules
        this.queryModule = queryModule({ maxAttempts: options.maxAttempts ?? 2 });
        this.transactionModule = transactionModule({ maxAttempts: options.maxAttempts ?? 2 });
        
        // Hook into client events for auto-reconnect
        this.connectionEvents.onConnect(() => this.onClientConnect());
        this.connectionEvents.onDisconnect(() => this.onClientDisconnect());
    }

    // Public

    public async query(query: string, values?: unknown[]): Promise<QueryResult> {
        return await this.queryModule.queryWithRetry({ query, values }, {
            getClient: () => this.getClient(),
            onError: (err: string) => this.logger.error(err),
        });
    }

    public async transaction(queries: { query: string, values?: unknown[] }[]): Promise<QueryResult[]> {
        return await this.transactionModule.transactionWithRetry(queries, {
            getClient: () => this.getClient(),
            onError: (err: string) => this.logger.error(err),
        });
    }

    public async shutdown(): Promise<void> {
        await this.queryModule.shutdown((message) => this.logger.info(message));
        await this.transactionModule.shutdown((message) => this.logger.info(message));
        await this.disconnect();
    }

    /**
     * Subscribe to a PostgreSQL NOTIFY channel.
     * Will automatically re-subscribe on reconnection.
     */
    public async listen(channel: string, events: Omit<ChannelEvents, 'channel'>): Promise<void> {
        if (this.channels.has(channel)) {
            throw new Error(`Already listening to channel: ${channel}`);
        }

        this.channels.set(channel, events);
        const client = await this.getClient();

        try {
            // Attach notification handler if not already
            if (client.listenerCount('notification') === 0) {
                client.on('notification', 
                    (notif: Notification) => this.onNotification(notif)
                );
            }

            // Execute LISTEN command
            await client.query(`LISTEN "${channel}"`);
            events.onConnect();

            if (this.options.debug) {
                this.logger.info(`Subscribed to channel "${channel}"`);
            }
        } 
        catch (error) {
            this.channels.delete(channel);
            throw error;
        }
    }

    /**
     * Unsubscribe from a PostgreSQL NOTIFY channel.
     */
    public async unlisten(channel: string): Promise<void> {
        const events = this.channels.get(channel);

        if (!events) {
            throw new Error(`Not listening to channel: ${channel}`);
        }

        this.channels.delete(channel);

        try {
            const client = await this.getClient();
            await client.query(`UNLISTEN "${channel}"`);

            events.onDisconnect();

            if (this.options.debug) {
                this.logger.info(`Unsubscribed from channel "${channel}"`);
            }
        } 
        catch (error) {
            this.logger.warn(`Failed to UNLISTEN "${channel}":`, (error as Error).message);
        }
    }

    /**
     * Disconnect and clean up all listeners.
     */
    public override async disconnect(): Promise<void> {
        for (const [, events] of this.channels) {
            events.onDisconnect();
        }
        this.channels.clear();
        await super.disconnect();
    }

    // Private - Client event handlers

    private async onClientConnect(): Promise<void> {
        if (this.channels.size === 0) return;

        try {
            const client = await this.getClient();

            // Attach notification handler
            if (client.listenerCount('notification') === 0) {
                client.on('notification', 
                    (notif: Notification) => this.onNotification(notif)
                );
            }

            // Re-subscribe to all channels
            for (const [channel, events] of this.channels) {
                try {
                    await client.query(`LISTEN "${channel}"`);
                    events.onConnect();

                    if (this.options.debug) {
                        this.logger.info(`Re-subscribed to channel "${channel}"`);
                    }
                } 
                catch (error) {
                    this.logger.error(`Failed to re-subscribe to "${channel}":`, (error as Error).message);
                    events.onError(error as Error);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to re-subscribe channels:`, (error as Error).message);
        }
    }

    private onClientDisconnect(): void {
        for (const [channel, events] of this.channels) {
            try {
                events.onDisconnect();
            }
            catch (error) {
                this.logger.error(`Failed to disconnect from channel "${channel}":`, (error as Error).message);
                events.onError(error as Error);
            }
        }
    }

    // Private - Notification handler

    private onNotification(notif: Notification): void {
        if (!notif.payload) return;

        const events = this.channels.get(notif.channel);

        if (events) {
            try {
                try {
                    const data = JSON.parse(notif.payload);
                    events.onData(data);
                } catch {
                    events.onData([notif.payload]);
                }
            } catch (error) {
                events.onError(error as Error);
            }
        }
    }
}

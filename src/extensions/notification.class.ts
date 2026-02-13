import type { Notification, QueryResult } from 'pg';
import { CoreClient, type IClient } from 'src/core/client.core.js';
import { queryModule } from 'src/modules/query.module.js';

// Types
// ===========================================================

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
    onData: (data: unknown) => void;
    onError: (error: Error) => void;
};

// Class
// ===========================================================

/**
 * This class creates a notification handler for the database.
 * It will automatically recreate listeners on connection errors.
 */
export class NotificationClient extends CoreClient {
    /** The channels map */
    private readonly channels: Map<string, Omit<ChannelEvents, 'channel'>>;
    /** The query module */
    protected readonly queryModule: ReturnType<typeof queryModule>;
    /** True when client is shutting down */
    private isShuttingDown: boolean = false;

    /**
     * NotificationClient class constructor.
     * @param config - The client configuration object.
     * @param options - Additional client options.
     */
    constructor(config: IClient.Config, options: ClientListenOptions) {
        super(config, options);

        // Initialize channels
        this.channels = new Map();

        // Initialize options
        const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 2));

        // Initialize modules
        this.queryModule = queryModule({ maxAttempts });

        // Hook into client events for auto-reconnect
        this.connectionEvents.onReconnect(() => this.handleReconnect());
        this.connectionEvents.onDisconnect(() => this.handleDisconnect());
        this.connectionEvents.onNotification((msg) => this.handleNotification(msg));
    }

    // ===========================================================
    // Public methods
    // ===========================================================

    public async query(query: string, values?: unknown[]): Promise<QueryResult> {
        this.ensureNotShutdown();

        return await this.queryModule.queryWithRetry(
            { query, values },
            {
                getClient: this.getClient.bind(this),
                onError: this.handleModuleError.bind(this),
            }
        );
    }

    public async listen(channel: string, events: Omit<ChannelEvents, 'channel'>): Promise<void> {
        this.ensureNotShutdown();

        if (this.channels.has(channel)) {
            throw new Error(`Already listening to channel: ${channel}`);
        }

        this.channels.set(channel, events);

        try {
            const client = await this.getClient();
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

    public async shutdown(): Promise<void> {
        if (this.isShuttingDown) {
            this.logger.warn('client already shutdown');
            return;
        }

        this.isShuttingDown = true;

        // Shutdown modules with error handling
        const shutdownErrors: Error[] = [];

        try {
            await this.queryModule.shutdown((msg) => this.logger.info(msg));
        } catch (error) {
            shutdownErrors.push(error as Error);
            this.logger.error('query module shutdown failed:', (error as Error).message);
        }

        try {
            await this.disconnect();
        } catch (error) {
            shutdownErrors.push(error as Error);
            this.logger.error('client disconnect failed:', (error as Error).message);
        }

        if (shutdownErrors.length > 0) {
            throw new Error(
                `Shutdown completed with ${shutdownErrors.length} error(s)`
            );
        }

        this.logger.info('client shutdown complete');
    }

    public override async disconnect(): Promise<void> {
        await super.disconnect();
        this.channels.clear();
    }

    public getChannels(): string[] {
        return Array.from(this.channels.keys());
    }

    // ===========================================================
    // Private methods - Event handlers
    // ===========================================================

    private async handleReconnect(): Promise<void> {
        if (this.channels.size === 0) return;

        try {
            const client = await this.getClient();

            // Re-subscribe to all channels
            for (const [channel, events] of this.channels) {
                try {
                    await client.query(`LISTEN "${channel}"`);
                    events.onConnect();

                    if (this.options.debug) {
                        this.logger.info(`re-subscribed to channel "${channel}"`);
                    }
                } 
                catch (error) {
                    this.logger.error(
                        `failed to re-subscribe to "${channel}":`,
                        (error as Error).message
                    );
                    events.onError(error as Error);
                }
            }
        } 
        catch (error) {
            this.logger.error('failed to re-subscribe channels:', (error as Error).message);
        }
    }

    private handleDisconnect(): void {
        for (const [channel, events] of this.channels) {
            try {
                events.onDisconnect();
            } catch (error) {
                this.logger.error(
                    `error in onDisconnect for channel "${channel}":`,
                    (error as Error).message
                );
            }
        }
    }

    private handleNotification(notif: Notification): void {
        if (!notif.payload) return;

        const events = this.channels.get(notif.channel);

        if (!events) {
            return;
        }
        try {
            // Try to parse as JSON, fallback to raw string
            let data: unknown;
            try {
                data = JSON.parse(notif.payload);
            } catch {
                data = notif.payload;
            }

            events.onData(data);
        } 
        catch (error) {
            events.onError(error as Error);
        }
    }

    private ensureNotShutdown(): void {
        if (this.isShuttingDown) {
            throw new Error('Client is shutting down');
        }
    }

    private handleModuleError(err: string): void {
        this.logger.error(err);
    }
}

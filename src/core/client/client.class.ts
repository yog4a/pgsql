import type { IClient } from './client.types.js';
import { Client as PgClient, Notification, DatabaseError } from 'pg';
import { Controller } from 'src/core/base.class.js';
import { testConnection } from 'src/core/utils.js';
import { createListeners } from 'src/extensions/client/createListeners.js';

// Class
// ===========================================================

export class Client extends Controller {
    private readonly config: IClient['config'];
    private readonly options: IClient['options'];
    private readonly listeners: ReturnType<typeof createListeners>;

    private _client: PgClient | null = null;
    private _isActive: boolean = true;

    // Constructor

    constructor({ config, options }: IClient) {
        const { host, database, user, password, port } = config;

        if (!host || !database || !user || !password || !port) {
            const required = ['host', 'database', 'user', 'password', 'port'].join(', ');
            throw new Error(`Need minimum required database configuration: ${required}`);
        }

        // Initialize base
        super({ type: 'client', database });

        // Initialize properties
        this.config = config;
        this.options = {
            debug: options.debug ?? false,
            reconnect: options.reconnect ?? false,
        };

        // Initialize extensions
        this.listeners = createListeners.call(this);
        this._connect(() => this.connect());
    }

    // Public

    public async getClient(): Promise<PgClient> {
        if (this.connection.isOpen() !== true) {
            await this.connection.enterOrWait();
        }
        return this._client!;
    }

    public async shutdown(): Promise<void> {
        this._isActive = false;
        await this.disconnect();
        await this.listeners.cleanup();
    }

    public async listen(channel: string, callback: (messages: string[]) => void): Promise<void> {
        await this.listeners.listen(channel, callback);
    }

    public async unlisten(channel: string): Promise<void> {
        await this.listeners.unlisten(channel);
    }

    // Private

    private async connect(): Promise<void> {
        // Set up the client
        if (!this._client) {
            this._client = new PgClient(this.config);
            this.setupClientEvents();
        }

        // Connect client to the database
        await this._client.connect();

        // Verify connection with test query
        const timestamp = await testConnection(this._client);

        // Log the connection and stop connection loop
        this.logger.info(`successfully connected at ${timestamp}`);
    }

    private async disconnect(): Promise<void> {
        if (this._client) {
            try {
                // Remove all listeners
                this._client.removeAllListeners();
                this.logger.info(`successfully removed all listeners`);
    
            } catch (error) {
                this.logger.warn(`failed to remove all listeners:`, 
                    (error as Error).message
                );
            }
            try {
                // Close the client
                await this._client.end();
                this.logger.info(`successfully disconnected`);
    
            } catch (error) {
                this.logger.warn(`failed to disconnect:`, 
                    (error as Error).message
                );
            }
        }

        // Reset the client
        this._client = null;
    }

    private async reconnect(): Promise<void> {
        // Only reconnect if the client is active
        if (this._isActive) {
            await this._reconnect(
                () => this.connect(),
                () => this.disconnect()
            );
        }
    }

    // Setup

    private setupClientEvents(): void {
        const client = this._client!;

        // Setup listeners
        this.listeners.setup();

        // On notification event
        client.on('notification', (message: Notification) => {
            this.listeners.onNotification(message);
        });

        // On connection end
        client.on('end', () => {
            this.logger.info('Connection closed!');
        });

        // On client error
        client.on('error', (err: Error) => {
            this.logger.error(`${err.message} (${(err as DatabaseError)?.code})`);
            this.triggerError();
        });

        // Set up event listeners for connection lifecycle events (debug)
        if (this.options.debug) {
            client.on('drain', () => {
                this.logger.debug('Client drained')
            });
        }
    }

    private async triggerError(): Promise<void> {
        // Schedule the actual error handling with a timeout
        this._onError(async () => {
            try {
                // Try to execute a test query to see if the connection is still valid
                await testConnection(this._client!);

                // Success, the connection is still valid
                this.connection.open();

            } catch (error) {
                // Log the error
                this.logger.error('connection test failed:',
                    (error as Error).message
                );

                // Error, disconnect and reconnect
                setImmediate(() => this.reconnect());
            }
        });
    }
}

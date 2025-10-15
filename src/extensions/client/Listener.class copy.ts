import { type Notification } from 'pg';
import { Client } from 'src/core/index.js';
import { autoRetry } from 'src/core/utils.js';

// Class
// ===========================================================

type Callback = { onData: (messages: string[]) => void };

export class Listener {
    private readonly client: Client;
    private readonly channels: Record<string, Callback> = {};

    // Constructor

    constructor(client: Client) {
        this.client = client;
        this.setupClientNotifications();

        this.client.on('connected', () => {
            this.setupClientListeners();
        });
    }

    // Public

    public async listen(channelName: string, handler: (messages: string[]) => void): Promise<void> {
        // Check if the channel is already listening
        if (channelName in this.channels) {
            this.client.logger.throw(
                `listener already exists for channel: ${channelName}`
            );
        }

        // Add the channel to the map
        this.channels[channelName] = { onData: handler };

        // Auto-retry on error
        await autoRetry(async () => {
            try {
                // Wait for client to be ready
                const client = await this.client.getClient();
    
                // Subscribe to the channel
                await client.query(`LISTEN ${channelName}`);

                // Log the listen
                this.client.logger.info(`started listening channel "${channelName}"`);
    
            } catch (error) {
                // Re-throw error
                this.client.logger.throw(`failed to listen channel "${channelName}": ` 
                    + (error as Error).message
                );
            }
        });
    }

    public async unlisten(channelName: string) {
        if (channelName in this.channels) {
            try {
                // Wait for client
                const client = await this.client.getClient();
    
                // Unsubscribe from the channel
                await client.query(`UNLISTEN ${channelName}`);

                // Remove the channel from the map
                delete this.channels[channelName];

                // Log the unlisten
                this.client.logger.info(`stopped listening channel "${channelName}"`);

            } catch (error) {
                // Re-throw error
                this.client.logger.throw(`failed to unlisten channel "${channelName}": ` 
                    + (error as Error).message
                );
            }
        } else {
            this.client.logger.throw(
                `no listener found for channel: ${channelName}`
            );
        }
    }

    public async cleanup() {
        if (Object.keys(this.channels).length === 0) {
            return;
        }

        // Auto-retry on error
        await autoRetry(async () => {
            try {
                // Wait for client
                const client = await this.client.getClient();
    
                // Unsubscribe from all channels
                for (const channel of Object.keys(this.channels)) {
                    await client.query(`UNLISTEN ${channel}`);
                    delete this.channels[channel];
                }

                // Log the cleanup
                this.client.logger.info(`cleaned up all channels`);

            } catch (error) {
                // Re-throw error
                this.client.logger.throw(`failed to cleanup channels: ` 
                    + (error as Error).message
                );
            }
        });
    }

    // Private

    private async setupClientNotifications() {
        try {
            // Wait for client
            const client = await this.client.getClient();

            // On notification event
            client.on('notification', (msg: Notification) => {
                if (!msg.payload) {
                    return;
                }

                // Get the channel
                const channel = this.channels[msg.channel];

                // If the channel is found, parse the message and call the handler
                if (channel) {
                    try {
                        const data = JSON.parse(msg.payload);
                        channel.onData(data);
                    } catch (error) {
                        channel.onData([msg.payload]);
                    }
                }
            });
        } catch (error) {
            this.client.logger.throw(`failed to setup client notifications: ` 
                + (error as Error).message
            );
        }
    }

    private async setupClientListeners() {
        try {
            // Wait for client
            const client = await this.client.getClient();

            // On notification event
            for (const channel of Object.keys(this.channels)) {
                await client.query(`LISTEN ${channel}`);
                this.client.logger.info(`started listening channel "${channel}"`);
            }

        } catch (error) {
            this.client.logger.throw(`failed to setup client listeners: ` 
                + (error as Error).message
            );
        }
    }
}
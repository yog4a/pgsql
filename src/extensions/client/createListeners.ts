import { type Notification } from 'pg';
import { Client } from 'src/core/index.js';
import { autoRetry } from 'src/core/utils.js';

type Callback = { onData: (messages: string[]) => void };

export function createListeners(this: Client) {
    const channels: Record<string, Callback> = {};

    // Private

    const onNotification = async (notif: Notification) => {
        try {
            if (!notif.payload) return;

            const channel = channels[notif.channel];
            if (channel) {
                try {
                    const data = JSON.parse(notif.payload);
                    channel.onData(data);
                } catch (error) {
                    channel.onData([notif.payload]);
                }
            }
        } catch (error) {
            //this.logger.throw(`failed to setup client notifications: ${(error as Error).message}`);
        }
    };

    const setup = async () => {
        if (Object.keys(channels).length === 0) return;

        try {
            // Get the client
            const pgClient = await this.getClient();

            // Listen to all channels
            for (const channel of Object.keys(channels)) {
                await pgClient.query(`LISTEN ${channel}`);
                this.logger.info(`started listening channel "${channel}"`);
            }

        } catch (error) {
            this.logger.error(`failed to setup channels:`,
                (error as Error).message
            );
        }
    };

    const cleanup = async () => {
        if (Object.keys(channels).length === 0) return;

        try {
            // Get the client
            const pgClient = await this.getClient();

            // Unlisten from all channels
            for (const channel of Object.keys(channels)) {
                await pgClient.query(`UNLISTEN ${channel}`);
                delete channels[channel];
                this.logger.info(`stopped listening channel "${channel}"`);
            }

        } catch (error) {
            this.logger.error(`failed to cleanup channels:`,
                (error as Error).message
            );
        }
    };

    // Public

    const listen = async (channelName: string, handler: (messages: string[]) => void): Promise<void> => {
        if (channelName in channels) {
            this.logger.throw(`listener already exists for channel: ${channelName}`);
        }

        channels[channelName] = { onData: handler };

        await autoRetry(async () => {
            try {
                const pgClient = await this.getClient();
                await pgClient.query(`LISTEN ${channelName}`);
                this.logger.info(`started listening channel "${channelName}"`);

            } catch (error) {
                this.logger.throw(`failed to listen channel "${channelName}": ${(error as Error).message}`);
            }
        });
    };

    const unlisten = async (channelName: string) => {
        if (channelName in channels) {
            try {
                const pgClient = await this.getClient();
                await pgClient.query(`UNLISTEN ${channelName}`);
                delete channels[channelName];
                this.logger.info(`stopped listening channel "${channelName}"`);
            } catch (error) {
                this.logger.throw(`failed to unlisten channel "${channelName}": ${(error as Error).message}`);
            }
        } else {
            this.logger.throw(`no listener found for channel: ${channelName}`);
        }
    };

    return {
        listen,
        unlisten,
        cleanup,
        onNotification,
        setup
    };
};

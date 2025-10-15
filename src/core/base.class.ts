import { EventEmitter } from 'events';
import { Gate, Logger } from 'src/classes/index.js';

// Types
// ===========================================================

type ClientType = 'client' | 'pool';
type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'disconnected';

// Class
// ===========================================================

export class Controller {
    protected readonly logger: Logger;
    protected readonly emitter: EventEmitter;
    protected readonly connection: Gate;

    private _status: ConnectionStatus = 'idle'; 
    private _errorTimeoutId: NodeJS.Timeout | null = null;
    private _errorDebounceMs: number = 1_000;

    // Constructor

    constructor({ type, database }: { type: ClientType, database: string }) {
        this.logger = new Logger(`[pgsql][${type}][${database}]`);
        this.emitter = new EventEmitter();
        this.connection = new Gate();
    }

    // Public

    protected async _connect(fn: () => Promise<void>): Promise<void> {
        if (this._status !== 'idle' && this._status !== 'disconnected') {
            throw new Error(`Cannot connect while in status: ${this._status}`);
        }

        this._status = 'connecting';
        let attempt = 0;
        
        try {
            // Put all requests on hold
            this.stopRequests();

            while (true) {
                attempt++;
                try {
                    // Connect client to the database
                    await fn();
                    break;
    
                } catch (error) {
                    this.logger.error(`failed to connect:`,
                        (error as Error).message,
                        (error as any).errno,

                    );
                }
    
                // Wait before retrying connection
                const backoff = Math.min(attempt * 1_000, 15_000);
                await new Promise(resolve => setTimeout(resolve, backoff));
            }
            
            this._status = 'connected';

            // Set the status to "connected" and resolve all pending promises
            this.startRequests();

        } catch (err) {
            this._status = 'disconnected';
            throw err;
        }
    }

    protected async _disconnect(fn: () => Promise<void>): Promise<void> {
        if (this._status !== 'connected') {
            throw new Error(`Cannot disconnect while in status: ${this._status}`);
        }

        this._status = 'disconnecting';

        try {
            // Put all requests on hold
            this.stopRequests();

            // Disconnect the client
            await fn();

            // Set the status to "disconnected"
        } finally {
            this._status = 'disconnected';
        }
    }

    protected async _reconnect(connectFn: () => Promise<void>, disconnectFn: () => Promise<void>): Promise<void> {
        if (this._status === 'connecting' || this._status === 'disconnecting') {
            throw new Error(`Cannot reconnect while in status: ${this._status}`);
        }

        if (this._status === 'connected') {
            await this._disconnect(disconnectFn);
        }

        await this._connect(connectFn);
    }

    protected async _onError(fn: () => Promise<void>): Promise<void> {
        // Wait for no error during the debounce period
        if (this._errorTimeoutId) {
            clearTimeout(this._errorTimeoutId);
        } else {
            // Stop processing queries
            this.stopRequests();
        }

        // Schedule the actual error handling with a timeout
        this._errorTimeoutId = setTimeout(() => {
            fn().finally(() => {
                // Clear the timeout ID when done and reconnect
                this._errorTimeoutId = null;
            });
        }, this._errorDebounceMs);
    }

    // Private

    private startRequests(): void {
        // Open the connection (allow requests to be processed)
        if (this.connection.isOpen() !== true) {
            this.connection.open();
        }
    }

    private stopRequests(): void {
        // Close the connection (stop processing requests)
        if (this.connection.isOpen() !== false) {
            this.connection.close();
        }
    }
}

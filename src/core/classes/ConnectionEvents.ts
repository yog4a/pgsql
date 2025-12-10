import { EventEmitter } from 'events';

// Class
// ===========================================================

export class ConnectionEvents {
    private events: EventEmitter;

    /**
     * ConnectionEvents class constructor.
     */
    constructor() {
        this.events = new EventEmitter();
    }

    /**
     * Emits the connect event.
     */
    connect(): void {
        this.events.emit('connect');
    }

    /**
     * Emits the disconnect event.
     */
    disconnect(): void {
        this.events.emit('disconnect');
    }

    /**
     * Emits the reconnect event.
     */
    reconnect(): void {
        this.events.emit('reconnect');
    }
    
    /**
     * Adds a listener for the connect event.
     */
    onConnect(fn: () => void): void {
        if (this.events.listenerCount('connect') > 0) {
            this.events.removeAllListeners('connect');
        }
        this.events.on('connect', fn);
    }

    /**
     * Adds a listener for the disconnect event.
     */
    onDisconnect(fn: () => void): void {
        if (this.events.listenerCount('disconnect') > 0) {
            this.events.removeAllListeners('disconnect');
        }
        this.events.on('disconnect', fn);
    }

    /**
     * Adds a listener for the reconnect event.
     */
    onReconnect(fn: () => void): void {
        if (this.events.listenerCount('reconnect') > 0) {
            this.events.removeAllListeners('reconnect');
        }
        this.events.on('reconnect', fn);
    }
}

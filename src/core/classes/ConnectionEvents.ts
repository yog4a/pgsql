import { EventEmitter } from 'events';
import { type Notification } from 'pg';

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
    connect(message?: string): void {
        this.events.emit('connect', message);
    }

    /**
     * Emits the disconnect event.
     */
    disconnect(message?: string | Error): void {
        this.events.emit('disconnect', message);
    }

    /**
     * Emits the reconnect event.
     */
    reconnect(message?: string | Error): void {
        this.events.emit('reconnect', message);
    }

    /**
     * Emits the notification event.
     */
    notification(notif: Notification): void {
        this.events.emit('notification', notif);
    }
    
    /**
     * Adds a listener for the connect event.
     */
    onConnect(fn: (message?: string) => void): void {
        if (this.events.listenerCount('connect') > 0) {
            this.events.removeAllListeners('connect');
        }
        this.events.on('connect', fn);
    }

    /**
     * Adds a listener for the disconnect event.
     */
    onDisconnect(fn: (message?: string | Error) => void): void {
        if (this.events.listenerCount('disconnect') > 0) {
            this.events.removeAllListeners('disconnect');
        }
        this.events.on('disconnect', fn);
    }

    /**
     * Adds a listener for the reconnect event.
     */
    onReconnect(fn: (message?: string | Error) => void): void {
        if (this.events.listenerCount('reconnect') > 0) {
            this.events.removeAllListeners('reconnect');
        }
        this.events.on('reconnect', fn);
    }

    /**
     * Adds a listener for the notification event.
     */
    onNotification(fn: (notif: Notification) => void): void {
        if (this.events.listenerCount('notification') > 0) {
            this.events.removeAllListeners('notification');
        }
        this.events.on('notification', fn);
    }
}

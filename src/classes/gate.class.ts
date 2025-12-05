/**
 * Gate/controller for async readiness.
 *
 * - When closed, callers must wait.
 * - When opened, all current waiters are released.
 * - close() without a reason: just closes gate, waiters keep waiting.
 * - close(reason): rejects all current waiters.
 */
export class Gate {
    /** Number of operations currently waiting at the gate */
    private _waiters: number = 0;
    /** Tracks whether the gate is open (true) or closed (false) */
    private _isOpen: boolean = false;
    /** Shared promise that all current waiters are waiting on */
    private _pendingPromise: Promise<void> | null = null;
    /** Function to resolve the pending promise when gate opens */
    private _pendingResolve: (() => void) | null = null;
    /** Function to reject the pending promise if gate closes with error */
    private _pendingReject: ((reason?: any) => void) | null = null;

    // Public methods

    /**
     * Opens the gate and resolves any pending waiters.
     * @returns The number of waiters that were released (waited) at the gate
     */
    public open(): number {
        if (this._isOpen) {
            return 0;
        }

        this._isOpen = true;

        const released = this._waiters;
        const resolver = this._pendingResolve;

        this.resetPromise();
        resolver?.();

        return released;
    }

    /**
     * Closes the gate and resets any pending promises, requiring callers to wait again.
     * @param reason - The reason to reject pending promises (default: undefined)
     * @returns The number of operations that were released (waited) at the gate
     */
    public close(reason?: Error): number {
        if (!this._isOpen && !this._pendingPromise) {
            return 0;
        }
        
        this._isOpen = false;

        if (!reason) {
            return this._waiters;
        }

        const rejected = this._waiters;
        const reject = this._pendingReject;

        this.resetPromise();
        reject?.(reason);

        return rejected;
    }

    /**
     * Waits for the gate to be open before proceeding.
     * If the gate is already open, resolves immediately.
     * If the gate is closed, returns a promise that will resolve when the gate opens.
     * This allows code to wait at the "gate" until it's ready to proceed.
     * @returns A promise that resolves when the gate is open
     */
    public enterOrWait(): Promise<void> {
        if (this._isOpen) {
            return Promise.resolve();
        }

        if (!this._pendingPromise) {
            this._pendingPromise = new Promise<void>((resolve, reject) => {
                this._pendingResolve = resolve;
                this._pendingReject = reject;
            });
        }

        this._waiters++;
        return this._pendingPromise;
    }

    /**
     * Waits for the gate to be open before proceeding.
     * If the gate is already open, resolves immediately.
     * If the gate is closed, returns a promise that will resolve when the gate opens.
     * This allows code to wait at the "gate" until it's ready to proceed.
     * @returns A promise that resolves when the gate is open
     */
    public enter(): Promise<void> {
        if (this._isOpen) {
            return Promise.resolve();
        }

        if (!this._pendingPromise) {
            this._pendingPromise = new Promise<void>((resolve, reject) => {
                this._pendingResolve = resolve;
                this._pendingReject = reject;
            });
        }

        this._waiters++;
        return this._pendingPromise;
    }

    /**
     * Returns the current state of the gate.
     * @returns true if the gate is open, false if it is closed
     */
    public isOpen(): boolean {
        return this._isOpen;
    }

    /**
     * Returns the current state of the gate.
     * @returns true if the gate is closed, false if it is open
     */
    public isClosed(): boolean {
        return !this._isOpen;
    }
    
    // Private methods

    /**
     * Resets the gate to its initial state.
     * Clears the promise, resolve function, reject function, and waiting count.
     */
    private resetPromise(): void {
        this._pendingPromise = null;    // Clear the promise
        this._pendingResolve = null;    // Clear the resolve function
        this._pendingReject = null;     // Clear the reject function
        this._waiters = 0;              // Reset when promise settles (resolve OR reject)
    }
}

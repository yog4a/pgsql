"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Client: () => Client2,
  CoreClient: () => CoreClient,
  CorePool: () => CorePool,
  IClient: () => IClient,
  IPool: () => IPool,
  NotificationClient: () => NotificationClient,
  Pool: () => Pool2
});
module.exports = __toCommonJS(index_exports);

// src/core/client.core.ts
var import_pg = require("pg");

// src/classes/gate.class.ts
var Gate = class {
  static {
    __name(this, "Gate");
  }
  /** Number of operations currently waiting at the gate */
  _waiters = 0;
  /** Tracks whether the gate is open (true) or closed (false) */
  _isOpen = false;
  /** Shared promise that all current waiters are waiting on */
  _pendingPromise = null;
  /** Function to resolve the pending promise when gate opens */
  _pendingResolve = null;
  /** Function to reject the pending promise if gate closes with error */
  _pendingReject = null;
  // Public methods
  /**
   * Opens the gate and resolves any pending waiters.
   * @returns The number of waiters that were released (waited) at the gate
   */
  open() {
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
  close(reason) {
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
  enterOrWait() {
    if (this._isOpen) {
      return Promise.resolve();
    }
    if (!this._pendingPromise) {
      this._pendingPromise = new Promise((resolve, reject) => {
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
  enter() {
    if (this._isOpen) {
      return Promise.resolve();
    }
    if (!this._pendingPromise) {
      this._pendingPromise = new Promise((resolve, reject) => {
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
  isOpen() {
    return this._isOpen;
  }
  /**
   * Returns the current state of the gate.
   * @returns true if the gate is closed, false if it is open
   */
  isClosed() {
    return !this._isOpen;
  }
  // Private methods
  /**
   * Resets the gate to its initial state.
   * Clears the promise, resolve function, reject function, and waiting count.
   */
  resetPromise() {
    this._pendingPromise = null;
    this._pendingResolve = null;
    this._pendingReject = null;
    this._waiters = 0;
  }
};

// src/classes/logger.class.ts
var Logger = class _Logger {
  /**
   * Creates a new Logger instance.
   * @param prefix - Text to prepend to all log messages.
   */
  constructor(prefix) {
    this.prefix = prefix;
  }
  static {
    __name(this, "Logger");
  }
  // ===========================================================
  // Public methods
  // ===========================================================
  /** Logs informational messages */
  info(...args) {
    this.process("info", ...args);
  }
  /** Logs warning messages */
  warn(...args) {
    this.process("warn", ...args);
  }
  /** Logs error messages */
  error(...args) {
    this.process("error", ...args);
  }
  /** Logs debug messages */
  debug(...args) {
    this.process("debug", ...args);
  }
  /** Re-throws an error with prefix */
  throw(message) {
    throw new Error(`${this.prefix} ${message}`);
  }
  /** Creates a new logger and cumulate the prefix (example: 'parent:child1:child2') */
  child(prefix) {
    return new _Logger(`${this.prefix}${prefix}`);
  }
  // ===========================================================
  // Private methods
  // ===========================================================
  /** Logs a message to the console */
  process(mode, ...args) {
    const prefix = mode === "debug" ? `${this.prefix} \u{1F538}` : this.prefix;
    try {
      console[mode](prefix, ...args);
    } catch {
      try {
        console[mode](prefix, "cannot log");
      } catch {
      }
    }
  }
};

// src/core/classes/ConnectionController.ts
var ConnectionController = class {
  /**
   * Connection class constructor.
   * @param logger - The logger instance.
   * @param debug - Whether to enable debug mode.
   */
  constructor(logger, debug = false) {
    this.logger = logger;
    this.debug = debug;
    this.connection = new Gate();
  }
  static {
    __name(this, "ConnectionController");
  }
  /** The connection test timeout (in milliseconds) */
  TIMEOUT_MS = 1e4;
  /** Class Connection Gate */
  connection;
  // Public
  /**
   * Tests the connection to the database with a client instance.
   * @param instance - The client instance.
   */
  async testClient(instance) {
    try {
      await this.testConnection(instance);
      if (this.debug) {
        this.logger.info(`Client tested successfully`);
      }
      return;
    } catch (error) {
      this.logger.error(
        `failed to test connection:`,
        error?.message,
        error?.code
      );
      throw error;
    }
  }
  /**
   * Tests the connection to the database with a pool instance.
   * @param instance - The pool instance.
   */
  async testPool(instance) {
    try {
      await this.testConnection(instance);
      if (this.debug) {
        this.logger.info(`Pool tested successfully`);
      }
      return;
    } catch (error) {
      this.logger.error(
        `failed to test connection:`,
        error?.message,
        error?.code
      );
      throw error;
    }
  }
  // Private
  /**
   * Tests the connection to the database with a client/pool instance.
   * @param instance - The client/pool instance.
   * @param signal - The abort signal.
   */
  async testConnection(instance) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Connection test timed out")),
        this.TIMEOUT_MS
      );
    });
    try {
      const query = instance.query("SELECT 1");
      const result = await Promise.race([query, timeout]);
      if (!result?.rows?.length) {
        throw new Error("Connection test query failed");
      }
    } finally {
      clearTimeout(timer);
    }
  }
};

// src/core/classes/ConnectionEvents.ts
var import_events = require("events");
var ConnectionEvents = class {
  static {
    __name(this, "ConnectionEvents");
  }
  events;
  /**
   * ConnectionEvents class constructor.
   */
  constructor() {
    this.events = new import_events.EventEmitter();
  }
  /**
   * Emits the connect event.
   */
  connect(message) {
    this.events.emit("connect", message);
  }
  /**
   * Emits the disconnect event.
   */
  disconnect(message) {
    this.events.emit("disconnect", message);
  }
  /**
   * Emits the reconnect event.
   */
  reconnect(message) {
    this.events.emit("reconnect", message);
  }
  /**
   * Emits the notification event.
   */
  notification(notif) {
    this.events.emit("notification", notif);
  }
  /**
   * Adds a listener for the connect event.
   */
  onConnect(fn) {
    if (this.events.listenerCount("connect") > 0) {
      this.events.removeAllListeners("connect");
    }
    this.events.on("connect", fn);
  }
  /**
   * Adds a listener for the disconnect event.
   */
  onDisconnect(fn) {
    if (this.events.listenerCount("disconnect") > 0) {
      this.events.removeAllListeners("disconnect");
    }
    this.events.on("disconnect", fn);
  }
  /**
   * Adds a listener for the reconnect event.
   */
  onReconnect(fn) {
    if (this.events.listenerCount("reconnect") > 0) {
      this.events.removeAllListeners("reconnect");
    }
    this.events.on("reconnect", fn);
  }
  /**
   * Adds a listener for the notification event.
   */
  onNotification(fn) {
    if (this.events.listenerCount("notification") > 0) {
      this.events.removeAllListeners("notification");
    }
    this.events.on("notification", fn);
  }
};

// src/utils/wait.utils.ts
async function waitWithBackoff(attempt, options) {
  const jitter = Math.random() * options.maxJitterMs;
  const exp = Math.max(0, attempt - 1);
  const backoff = Math.min(1e3 * 2 ** exp, options.maxDelayMs);
  await new Promise((res) => setTimeout(res, backoff + jitter));
}
__name(waitWithBackoff, "waitWithBackoff");

// src/core/client.core.ts
var IClient;
((IClient2) => {
  ;
  ;
})(IClient || (IClient = {}));
var CoreClient = class {
  /**
   * Client class constructor.
   * @param config - PostgreSQL client configuration.
   * @param options - Additional client options.
   */
  constructor(config, options) {
    this.config = config;
    this.options = options;
    const { host, database, user, password, port } = config;
    if (!host || !database || !user || !password || !port) {
      const required = ["host", "database", "user", "password", "port"].join(", ");
      throw new Error(`Need minimum required database configuration: ${required}`);
    }
    this.logger = new Logger(`[pgsql][client][${database}]`);
    this.connectionController = new ConnectionController(this.logger, options.debug);
    this.connectionEvents = new ConnectionEvents();
    this.initialize().catch((error) => {
      setImmediate(() => {
        throw error;
      });
    });
  }
  static {
    __name(this, "CoreClient");
  }
  /** Class Connection Controller */
  connectionController;
  /** Class Connection Events */
  connectionEvents;
  /** Class Logger Instance */
  logger;
  /** True when reconnection is in progress */
  _isReconnecting = false;
  /** True when client is being destroyed */
  _isDestroying = false;
  /** True when client is intentionally shutting down */
  _isShuttingDown = false;
  /** The PostgreSQL client instance */
  _client = null;
  // ===========================================================
  // Public methods
  // ===========================================================
  async getClient() {
    if (this._isShuttingDown) {
      throw new Error("Client is shutting down");
    }
    await this.connectionController.connection.enterOrWait();
    if (this._isShuttingDown) {
      throw new Error("Client is shutting down");
    }
    if (!this._client) {
      if (this._isReconnecting) {
        await this.connectionController.connection.enterOrWait();
      }
      if (!this._client) {
        throw new Error("Client is not initialized or not connected");
      }
    }
    return this._client;
  }
  async disconnect() {
    this._isShuttingDown = true;
    const reason = new Error("Client disconnected");
    this.connectionEvents.disconnect(reason);
    this.connectionController.connection.close(
      reason
    );
    await this.destroyClient();
  }
  // ===========================================================
  // Private methods - Initialization
  // ===========================================================
  async initialize() {
    try {
      await this.createClient();
      await this.verifyClient();
      if (this.options.debug) {
        this.logger.info("client initialized");
      }
      this.connectionController.connection.open();
      this.connectionEvents.connect();
    } catch (error) {
      this.logger.error("failed to initialize client:", error.message);
      throw error;
    }
  }
  // ===========================================================
  // Private methods - Reconnection
  // ===========================================================
  async reconnect() {
    if (this._isReconnecting || this._isShuttingDown) {
      return;
    }
    this._isReconnecting = true;
    this.connectionController.connection.close();
    this.connectionEvents.disconnect("Client connection lost, reconnecting");
    let attempt = 0;
    while (!this._isShuttingDown) {
      attempt++;
      try {
        await this.destroyClient();
        await this.createClient();
        await this.verifyClient();
        if (this.options.debug) {
          this.logger.info("client reconnected");
        }
        this.connectionController.connection.open();
        this.connectionEvents.reconnect();
        this._isReconnecting = false;
        return;
      } catch (error) {
        this.logger.error(
          `reconnect attempt ${attempt} failed:`,
          error.message
        );
      }
      await waitWithBackoff(attempt, { maxJitterMs: 500, maxDelayMs: 1e4 });
    }
    this._isReconnecting = false;
  }
  // ===========================================================
  // Private methods - Client management
  // ===========================================================
  async createClient() {
    if (this._client) {
      throw new Error("Client is already initialized");
    }
    this._client = new import_pg.Client(this.config);
    this._client.on("error", (err) => {
      const dbErr = err;
      this.logger.error(
        `Client error: ${err.message} (${dbErr?.code || "N/A"})`
      );
      if (!this._isReconnecting && !this._isShuttingDown) {
        void this.verifyOrReconnect();
      }
    });
    this._client.on("end", () => {
      this.logger.warn(
        "Client connection closed"
      );
      if (!this._isReconnecting && !this._isShuttingDown) {
        void this.reconnect();
      }
    });
    this._client.on("notification", (msg) => {
      this.connectionEvents.notification(msg);
    });
    await this._client.connect();
  }
  async destroyClient() {
    if (!this._client || this._isDestroying) {
      return;
    }
    this._isDestroying = true;
    try {
      this._client.removeAllListeners();
      await this._client.end();
      if (this.options.debug) {
        this.logger.info("client destroyed");
      }
    } catch (error) {
      this.logger.warn("destroy failed:", error.message);
    } finally {
      this._client = null;
      this._isDestroying = false;
    }
  }
  async verifyClient() {
    if (!this._client) {
      throw new Error("Client is not initialized");
    }
    await this.connectionController.testClient(this._client);
  }
  verifyOrReconnect() {
    if (!this._client) {
      void this.reconnect();
      return;
    }
    void this.connectionController.testClient(this._client).then(() => {
      if (this.options.debug) {
        this.logger.info("client still alive");
      }
    }).catch((error) => {
      this.logger.warn("client dead, reconnecting:", error.message);
      void this.reconnect();
    });
  }
};

// src/core/pool.core.ts
var import_pg2 = require("pg");
var IPool;
((IPool2) => {
  ;
  ;
})(IPool || (IPool = {}));
var CorePool = class {
  /**
   * Pool class constructor.
   * @param config - PostgreSQL pool configuration.
   * @param options - Additional pool options.
   */
  constructor(config, options) {
    this.config = config;
    this.options = options;
    const { host, database, user, password, port, max, min } = config;
    if (!host || !database || !user || !password || !port) {
      const required = ["host", "database", "user", "password", "port"].join(", ");
      throw new Error(`Need minimum required database configuration: ${required}`);
    }
    if (!Number.isInteger(max) || max < 2) {
      throw new Error(`Max clients (${max}) in pool must be at least 2!`);
    }
    if (!Number.isInteger(min) || min < 0) {
      throw new Error(`Min clients (${min}) in pool must be at least 0!`);
    }
    if (min > max) {
      throw new Error(`Min clients (${min}) cannot exceed max (${max})!`);
    }
    if (config.connectionTimeoutMillis === void 0 || config.connectionTimeoutMillis === null) {
      config.connectionTimeoutMillis = 5e3;
    }
    if (config.idleTimeoutMillis === void 0 || config.idleTimeoutMillis === null) {
      config.idleTimeoutMillis = 6e4;
    }
    if (config.maxLifetimeSeconds === void 0 || config.maxLifetimeSeconds === null) {
      config.maxLifetimeSeconds = 600;
    }
    this.logger = new Logger(`[pgsql][pool][${database}]`);
    this.connectionController = new ConnectionController(this.logger, options.debug);
    this.connectionEvents = new ConnectionEvents();
    this.initialize().catch((error) => {
      setImmediate(() => {
        throw error;
      });
    });
  }
  static {
    __name(this, "CorePool");
  }
  /** Class Connection Controller */
  connectionController;
  /** Class Connection Events */
  connectionEvents;
  /** Class Logger Instance */
  logger;
  /** True when reconnection is in progress */
  _isReconnecting = false;
  /** True when pool is being destroyed */
  _isDestroying = false;
  /** True when pool is intentionally shutting down */
  _isShuttingDown = false;
  /** The PostgreSQL pool instance */
  _pool = null;
  // ===========================================================
  // Public methods
  // ===========================================================
  metrics() {
    if (!this._pool) {
      return null;
    }
    return {
      /** Total number of clients existing within the pool */
      total: this._pool.totalCount,
      /** Number of clients which are not checked out but are currently idle in the pool */
      idle: this._pool.idleCount,
      /** Number of clients which are checked out and in use */
      active: this._pool.totalCount - this._pool.idleCount,
      /** Number of queued requests waiting on a client when all clients are checked out */
      waiting: this._pool.waitingCount
    };
  }
  async getClient() {
    if (this._isShuttingDown) {
      throw new Error("Pool is shutting down");
    }
    await this.connectionController.connection.enterOrWait();
    if (this._isShuttingDown) {
      throw new Error("Pool is shutting down");
    }
    if (!this._pool) {
      throw new Error("Pool is not initialized");
    }
    const client = await this._pool.connect();
    return client;
  }
  async disconnect() {
    this._isShuttingDown = true;
    const reason = new Error("Pool disconnected");
    this.connectionEvents.disconnect(reason);
    this.connectionController.connection.close(
      reason
    );
    await this.destroyPool();
  }
  // ===========================================================
  // Private methods - Initialization
  // ===========================================================
  async initialize() {
    try {
      await this.createPool();
      await this.verifyPool();
      if (this.options.debug) {
        this.logger.info("pool initialized");
      }
      this.connectionController.connection.open();
      this.connectionEvents.connect();
    } catch (error) {
      this.logger.error("failed to initialize pool:", error.message);
      throw error;
    }
  }
  // ===========================================================
  // Private methods - Reconnection
  // ===========================================================
  async reconnect() {
    if (this._isReconnecting || this._isShuttingDown) {
      return;
    }
    this._isReconnecting = true;
    this.connectionController.connection.close();
    this.connectionEvents.disconnect("Pool connection lost, reconnecting");
    let attempt = 0;
    while (!this._isShuttingDown) {
      attempt++;
      try {
        await this.destroyPool();
        await this.createPool();
        await this.verifyPool();
        if (this.options.debug) {
          this.logger.info("pool reconnected");
        }
        this.connectionController.connection.open();
        this.connectionEvents.reconnect();
        this._isReconnecting = false;
        return;
      } catch (error) {
        this.logger.error(
          `reconnect attempt ${attempt} failed:`,
          error.message
        );
      }
      await waitWithBackoff(attempt, { maxJitterMs: 500, maxDelayMs: 1e4 });
    }
    this._isReconnecting = false;
  }
  // ===========================================================
  // Private methods - Pool management
  // ===========================================================
  async createPool() {
    if (this._pool) {
      throw new Error("Pool is already initialized");
    }
    this._pool = new import_pg2.Pool(this.config);
    this._pool.on("error", (err, client) => {
      const dbErr = err;
      this.logger.error(
        `Pool error: ${err.message} (${dbErr?.code || "N/A"})`,
        err,
        client
      );
      if (!this._isReconnecting && !this._isShuttingDown) {
        void this.verifyOrReconnect();
      }
    });
    this._pool.on("connect", (client) => {
      if (client.listenerCount("error") === 0) {
        client.on("error", (err) => {
          const dbErr = err;
          this.logger.error(
            `Client error: ${err.message} (${dbErr?.code || "N/A"})`,
            err,
            client
          );
        });
      }
      if (this.options.debug) {
        this.logger.info("New client connection established");
      }
    });
    this._pool.on("remove", (client) => {
      client.removeAllListeners();
      if (this.options.debug) {
        this.logger.info("Client closed and removed from pool");
      }
    });
    if (this.options.debug) {
      this._pool.on("acquire", (client) => {
        this.logger.info("Client acquired from pool");
      });
      this._pool.on("release", (err, client) => {
        this.logger.info("Client released back to pool");
      });
    }
  }
  async destroyPool() {
    if (!this._pool || this._isDestroying) {
      return;
    }
    this._isDestroying = true;
    try {
      this._pool.removeAllListeners();
      await this._pool.end();
      if (this.options.debug) {
        this.logger.info("pool destroyed");
      }
    } catch (error) {
      this.logger.warn("destroy failed:", error.message);
    } finally {
      this._pool = null;
      this._isDestroying = false;
    }
  }
  async verifyPool() {
    if (!this._pool) {
      throw new Error("Pool is not initialized");
    }
    await this.connectionController.testPool(this._pool);
  }
  verifyOrReconnect() {
    if (!this._pool) {
      void this.reconnect();
      return;
    }
    void this.connectionController.testPool(this._pool).then(() => {
      if (this.options.debug) {
        this.logger.info("pool still alive");
      }
    }).catch((error) => {
      this.logger.warn("pool dead, reconnecting:", error.message);
      void this.reconnect();
    });
  }
};

// src/utils/error.utils.ts
var PG_CONNECTION_ERRORS = /* @__PURE__ */ new Set([
  "08000",
  // connection_exception
  "08003",
  // connection_does_not_exist
  "08006",
  // connection_failure
  "08001",
  // sqlclient_unable_to_establish_sqlconnection
  "08004",
  // sqlserver_rejected_establishment_of_sqlconnection
  "08007",
  // transaction_resolution_unknown
  "08P01"
  // protocol_violation
]);
var PG_INVALID_TRANSACTION_STATE = /* @__PURE__ */ new Set([
  "25000",
  // invalid_transaction_state
  "25001",
  // active_sql_transaction
  "25P01",
  // no_active_sql_transaction
  "25P02"
  // in_failed_sql_transaction
]);
var PG_TRANSACTION_ROLLBACK_ERRORS = /* @__PURE__ */ new Set([
  "40000",
  // transaction_rollback
  "40001",
  // serialization_failure
  "40002",
  // transaction_integrity_constraint_violation
  "40003",
  // statement_completion_unknown
  "40P01"
  // deadlock_detected
]);
var PG_LOCK_ERRORS = /* @__PURE__ */ new Set([
  "55P03"
  // lock_not_available
]);
var PG_OPERATOR_INTERVENTION_ERRORS = /* @__PURE__ */ new Set([
  "57000",
  // operator_intervention
  "57014",
  // query_canceled
  "57P01",
  // admin_shutdown
  "57P02",
  // crash_shutdown
  "57P03",
  // cannot_connect_now
  "57P04",
  // database_dropped
  "57P05"
  // idle_session_timeout
]);
var PG_RESOURCE_ERRORS = /* @__PURE__ */ new Set([
  "53000",
  // insufficient_resources
  "53100",
  // disk_full
  "53200",
  // out_of_memory
  "53300",
  // too_many_connections
  "53400"
  // configuration_limit_exceeded
]);
var RETRIABLE_NETWORK_CODES = /* @__PURE__ */ new Set([
  "ECONNRESET",
  // Connection reset by peer
  "ECONNREFUSED",
  // Connection refused
  "ECONNABORTED",
  // Connection aborted
  "ETIMEDOUT",
  // Connection timed out
  "EPIPE",
  // Broken pipe
  "EHOSTUNREACH",
  // Host is unreachable
  "ENETUNREACH",
  // Network is unreachable
  "EAI_AGAIN"
  // Temporary DNS failure
]);
var ALL_RETRIABLE_CODES = /* @__PURE__ */ new Set([
  ...PG_CONNECTION_ERRORS,
  ...PG_INVALID_TRANSACTION_STATE,
  ...PG_TRANSACTION_ROLLBACK_ERRORS,
  ...PG_LOCK_ERRORS,
  ...PG_OPERATOR_INTERVENTION_ERRORS,
  ...PG_RESOURCE_ERRORS,
  ...RETRIABLE_NETWORK_CODES
]);
var isRetriableError = /* @__PURE__ */ __name((err) => {
  if (!err || typeof err !== "object") {
    return false;
  }
  const e = err;
  if (typeof e.code !== "string") {
    return false;
  }
  return ALL_RETRIABLE_CODES.has(e.code.toUpperCase());
}, "isRetriableError");

// src/modules/query.module.ts
function queryModule(options) {
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 1));
  let activeRequests = 0;
  let isShuttingDown = false;
  async function queryWithRetry(params, options2) {
    if (isShuttingDown) {
      throw new Error("Query module is shutting down");
    }
    activeRequests++;
    try {
      let lastError = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let client = null;
        try {
          client = await options2.getClient();
          const result = await client.query(params.query, params.values);
          return result;
        } catch (err) {
          lastError = err;
          const isLastAttempt = attempt >= maxAttempts;
          const canRetry = isRetriableError(err);
          if (isLastAttempt || !canRetry) {
            throw err;
          }
          const dbErr = err;
          options2.onError(
            `Transient error on attempt ${attempt}/${maxAttempts}: ${lastError.message} (code: ${dbErr?.code || "N/A"})`
          );
          await waitWithBackoff(attempt, { maxDelayMs: 15e3, maxJitterMs: 500 });
        } finally {
          if (client && "release" in client && typeof client.release === "function") {
            try {
              client.release();
            } catch (releaseError) {
              options2.onError(
                `Failed to release client: ${releaseError.message}`
              );
            }
          }
        }
      }
      throw lastError || new Error("Query failed after all retry attempts");
    } finally {
      activeRequests--;
    }
  }
  __name(queryWithRetry, "queryWithRetry");
  async function shutdown(onLog, timeoutMs = 3e4) {
    isShuttingDown = true;
    const startTime = Date.now();
    let lastCount = -1;
    while (activeRequests > 0) {
      if (activeRequests !== lastCount) {
        onLog(`waiting for ${activeRequests} queries to finish...`);
        lastCount = activeRequests;
      }
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Shutdown timeout: ${activeRequests} queries still active after ${timeoutMs}ms`
        );
      }
      await new Promise((res) => setTimeout(res, 1e3));
    }
    onLog("all queries completed");
  }
  __name(shutdown, "shutdown");
  function getActiveRequests() {
    return activeRequests;
  }
  __name(getActiveRequests, "getActiveRequests");
  return {
    queryWithRetry,
    shutdown,
    getActiveRequests
  };
}
__name(queryModule, "queryModule");

// src/modules/transaction.module.ts
function transactionModule(options) {
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 1));
  let activeRequests = 0;
  let isShuttingDown = false;
  async function transactionWithRetry(queries, options2) {
    if (isShuttingDown) {
      throw new Error("Transaction module is shutting down");
    }
    activeRequests++;
    try {
      let lastError = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let client = null;
        let inTransaction = false;
        try {
          const results = [];
          client = await options2.getClient();
          await client.query("BEGIN");
          inTransaction = true;
          for (const { query, values } of queries) {
            results.push(
              await client.query(query, values)
            );
          }
          await client.query("COMMIT");
          inTransaction = false;
          return results;
        } catch (err) {
          lastError = err;
          if (inTransaction && client) {
            try {
              await client.query("ROLLBACK");
            } catch (rollbackErr) {
              options2.onError(
                `ROLLBACK failed: ${rollbackErr.message}`
              );
            }
          }
          const isLastAttempt = attempt >= maxAttempts;
          const canRetry = isRetriableError(err);
          if (isLastAttempt || !canRetry) {
            throw err;
          }
          const dbErr = err;
          options2.onError(
            `Transient error on attempt ${attempt}/${maxAttempts}: ${lastError.message} (code: ${dbErr?.code || "N/A"})`
          );
          await waitWithBackoff(attempt, { maxDelayMs: 15e3, maxJitterMs: 500 });
        } finally {
          if (client && "release" in client && typeof client.release === "function") {
            try {
              client.release();
            } catch (releaseError) {
              options2.onError(
                `Failed to release client: ${releaseError.message}`
              );
            }
          }
        }
      }
      throw lastError || new Error("Transaction failed after all retry attempts");
    } finally {
      activeRequests--;
    }
  }
  __name(transactionWithRetry, "transactionWithRetry");
  async function shutdown(onLog, timeoutMs = 3e4) {
    isShuttingDown = true;
    const startTime = Date.now();
    let lastCount = -1;
    while (activeRequests > 0) {
      if (activeRequests !== lastCount) {
        onLog(`waiting for ${activeRequests} transactions to finish...`);
        lastCount = activeRequests;
      }
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Shutdown timeout: ${activeRequests} transactions still active after ${timeoutMs}ms`
        );
      }
      await new Promise((res) => setTimeout(res, 1e3));
    }
    onLog("all transactions completed");
  }
  __name(shutdown, "shutdown");
  function getActiveRequests() {
    return activeRequests;
  }
  __name(getActiveRequests, "getActiveRequests");
  return {
    transactionWithRetry,
    shutdown,
    getActiveRequests
  };
}
__name(transactionModule, "transactionModule");

// src/extensions/client.class.ts
var Client2 = class extends CoreClient {
  static {
    __name(this, "Client");
  }
  /** The query module */
  queryModule;
  /** The transaction module */
  transactionModule;
  /** True when client is shutting down */
  isShuttingDown = false;
  /**
   * Client class constructor.
   * @param config - The client configuration object.
   * @param options - Additional client options.
   */
  constructor(config, options) {
    super(config, options);
    const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 2));
    this.queryModule = queryModule({ maxAttempts });
    this.transactionModule = transactionModule({ maxAttempts });
  }
  // ===========================================================
  // Public methods
  // ===========================================================
  async query(query, values) {
    this.ensureNotShuttingDown();
    return await this.queryModule.queryWithRetry(
      { query, values },
      {
        getClient: this.getClient.bind(this),
        onError: this.handleModuleError.bind(this)
      }
    );
  }
  async transaction(queries) {
    this.ensureNotShuttingDown();
    return await this.transactionModule.transactionWithRetry(
      queries,
      {
        getClient: this.getClient.bind(this),
        onError: this.handleModuleError.bind(this)
      }
    );
  }
  async shutdown() {
    if (this.isShuttingDown) {
      this.logger.warn("client already shutdown");
      return;
    }
    this.isShuttingDown = true;
    const shutdownErrors = [];
    try {
      await this.queryModule.shutdown((msg) => this.logger.info(msg));
    } catch (error) {
      shutdownErrors.push(error);
      this.logger.error("query module shutdown failed:", error.message);
    }
    try {
      await this.transactionModule.shutdown((msg) => this.logger.info(msg));
    } catch (error) {
      shutdownErrors.push(error);
      this.logger.error("transaction module shutdown failed:", error.message);
    }
    try {
      await this.disconnect();
    } catch (error) {
      shutdownErrors.push(error);
      this.logger.error("client disconnect failed:", error.message);
    }
    if (shutdownErrors.length > 0) {
      throw new Error(
        `Shutdown completed with ${shutdownErrors.length} error(s)`
      );
    }
    this.logger.info("client shutdown complete");
  }
  // ===========================================================
  // Private methods
  // ===========================================================
  ensureNotShuttingDown() {
    if (this.isShuttingDown) {
      throw new Error("Client is shutting down");
    }
  }
  handleModuleError(err) {
    this.logger.error(err);
  }
};

// src/extensions/pool.class.ts
var Pool2 = class extends CorePool {
  static {
    __name(this, "Pool");
  }
  /** The query module */
  queryModule;
  /** The transaction module */
  transactionModule;
  /** True when pool is shutting down */
  isShuttingDown = false;
  /**
   * Pool class constructor.
   * @param config - The pool configuration object.
   * @param options - Additional pool options.
   */
  constructor(config, options) {
    super(config, options);
    const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 2));
    this.queryModule = queryModule({ maxAttempts });
    this.transactionModule = transactionModule({ maxAttempts });
  }
  // ===========================================================
  // Public methods
  // ===========================================================
  async query(query, values) {
    this.ensureNotShuttingDown();
    return await this.queryModule.queryWithRetry(
      { query, values },
      {
        getClient: this.getClient.bind(this),
        onError: this.handleModuleError.bind(this)
      }
    );
  }
  async transaction(queries) {
    this.ensureNotShuttingDown();
    return await this.transactionModule.transactionWithRetry(
      queries,
      {
        getClient: this.getClient.bind(this),
        onError: this.handleModuleError.bind(this)
      }
    );
  }
  async shutdown() {
    if (this.isShuttingDown) {
      this.logger.warn("pool already shutdown");
      return;
    }
    this.isShuttingDown = true;
    const shutdownErrors = [];
    try {
      await this.queryModule.shutdown((msg) => this.logger.info(msg));
    } catch (error) {
      shutdownErrors.push(error);
      this.logger.error("query module shutdown failed:", error.message);
    }
    try {
      await this.transactionModule.shutdown((msg) => this.logger.info(msg));
    } catch (error) {
      shutdownErrors.push(error);
      this.logger.error("transaction module shutdown failed:", error.message);
    }
    try {
      await this.disconnect();
    } catch (error) {
      shutdownErrors.push(error);
      this.logger.error("pool disconnect failed:", error.message);
    }
    if (shutdownErrors.length > 0) {
      throw new Error(
        `Shutdown completed with ${shutdownErrors.length} error(s)`
      );
    }
    this.logger.info("pool shutdown complete");
  }
  // ===========================================================
  // Private methods
  // ===========================================================
  ensureNotShuttingDown() {
    if (this.isShuttingDown) {
      throw new Error("Pool is shutting down");
    }
  }
  handleModuleError(err) {
    this.logger.error(err);
  }
};

// src/extensions/notification.class.ts
var NotificationClient = class extends CoreClient {
  static {
    __name(this, "NotificationClient");
  }
  /** The channels map */
  channels;
  /** True when client is shutting down */
  isShuttingDown = false;
  /**
   * NotificationClient class constructor.
   * @param config - The client configuration object.
   * @param options - Additional client options.
   */
  constructor(config, options) {
    super(config, options);
    this.channels = /* @__PURE__ */ new Map();
    this.connectionEvents.onReconnect(() => this.handleReconnect());
    this.connectionEvents.onDisconnect(() => this.handleDisconnect());
    this.connectionEvents.onNotification((msg) => this.handleNotification(msg));
  }
  // ===========================================================
  // Public methods
  // ===========================================================
  async listen(channel, events) {
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
    } catch (error) {
      this.channels.delete(channel);
      throw error;
    }
  }
  async unlisten(channel) {
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
    } catch (error) {
      this.logger.warn(`Failed to UNLISTEN "${channel}":`, error.message);
    }
  }
  async shutdown() {
    if (this.isShuttingDown) {
      this.logger.warn("client already shutdown");
      return;
    }
    this.isShuttingDown = true;
    try {
      await this.disconnect();
    } catch (error) {
      this.logger.error("client disconnect failed:", error.message);
      throw error;
    }
    this.logger.info("client shutdown complete");
  }
  async disconnect() {
    await super.disconnect();
    this.channels.clear();
  }
  getActiveChannels() {
    return Array.from(this.channels.keys());
  }
  getChannelCount() {
    return this.channels.size;
  }
  // ===========================================================
  // Private methods - Event handlers
  // ===========================================================
  async handleReconnect() {
    if (this.channels.size === 0) return;
    try {
      const client = await this.getClient();
      for (const [channel, events] of this.channels) {
        try {
          await client.query(`LISTEN "${channel}"`);
          events.onConnect();
          if (this.options.debug) {
            this.logger.info(`re-subscribed to channel "${channel}"`);
          }
        } catch (error) {
          this.logger.error(
            `failed to re-subscribe to "${channel}":`,
            error.message
          );
          events.onError(error);
        }
      }
    } catch (error) {
      this.logger.error("failed to re-subscribe channels:", error.message);
    }
  }
  handleDisconnect() {
    for (const [channel, events] of this.channels) {
      try {
        events.onDisconnect();
      } catch (error) {
        this.logger.error(
          `error in onDisconnect for channel "${channel}":`,
          error.message
        );
      }
    }
  }
  handleNotification(notif) {
    if (!notif.payload) return;
    const events = this.channels.get(notif.channel);
    if (!events) {
      return;
    }
    try {
      let data;
      try {
        data = JSON.parse(notif.payload);
      } catch {
        data = notif.payload;
      }
      events.onData(data);
    } catch (error) {
      events.onError(error);
    }
  }
  ensureNotShutdown() {
    if (this.isShuttingDown) {
      throw new Error("Client is shutting down");
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Client,
  CoreClient,
  CorePool,
  IClient,
  IPool,
  NotificationClient,
  Pool
});

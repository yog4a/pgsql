var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/core/client.core.ts
import { Client } from "pg";

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
  // Public methods
  /** Logs informational messages */
  info(...args) {
    try {
      console.info(this.prefix, ...args);
    } catch (error) {
      console.info(this.prefix, "cannot log");
    }
  }
  /** Logs warning messages */
  warn(...args) {
    try {
      console.warn(this.prefix, ...args);
    } catch (error) {
      console.warn(this.prefix, "cannot log");
    }
  }
  /** Logs error messages */
  error(...args) {
    try {
      console.error(this.prefix, ...args);
    } catch (error) {
      console.error(this.prefix, "cannot log");
    }
  }
  /** Logs debug messages */
  debug(...args) {
    try {
      console.debug(this.prefix, "\u{1F538}", ...args);
    } catch (error) {
      console.debug(this.prefix, "\u{1F538}", "cannot log");
    }
  }
  /** Re-throws an error with prefix */
  throw(message) {
    throw new Error(`${this.prefix} ${message}`);
  }
  /** Creates a new logger with a suffix */
  child(prefix) {
    return new _Logger(`${this.prefix}${prefix}`);
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
  testTimeoutMs = 1e4;
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
        this.testTimeoutMs
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
import { EventEmitter } from "events";
var ConnectionEvents = class {
  static {
    __name(this, "ConnectionEvents");
  }
  events;
  /**
   * ConnectionEvents class constructor.
   */
  constructor() {
    this.events = new EventEmitter();
  }
  /**
   * Emits the connect event.
   */
  connect() {
    this.events.emit("connect");
  }
  /**
   * Emits the disconnect event.
   */
  disconnect() {
    this.events.emit("disconnect");
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
};

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
    this.setup();
  }
  static {
    __name(this, "CoreClient");
  }
  /** Class Logger Instance */
  logger;
  /** Class Connection Controller */
  connectionController;
  /** Class Connection Events */
  connectionEvents;
  /** Setup running */
  isCreating = false;
  /** The PostgreSQL client instance */
  client = null;
  // Public
  async getClient() {
    await this.connectionController.connection.enter();
    if (!this.client) {
      throw new Error("Client is not initialized");
    }
    return this.client;
  }
  async disconnect() {
    await this.connectionController.connection.enter();
    await this.destroyClient();
    this.connectionController.connection.close();
  }
  // Private
  async setup() {
    if (this.isCreating) {
      if (this.options.debug) {
        this.logger.info("Client is already being setup");
      }
      return;
    }
    this.isCreating = true;
    this.connectionController.connection.close();
    if (this.client) {
      try {
        await this.verifyClient();
        this.isCreating = false;
        this.connectionController.connection.open();
        return;
      } catch (error) {
        if (this.options.debug) {
          this.logger.info("Existing client verification failed, recreating...");
        }
      }
      this.connectionEvents.disconnect();
    }
    try {
      let attempt = 0;
      while (true) {
        attempt++;
        try {
          await this.destroyClient();
          await this.createClient();
          await this.verifyClient();
          if (this.options.debug) {
            this.logger.info(`successfully setup client`);
          }
          this.connectionController.connection.open();
          this.connectionEvents.connect();
          break;
        } catch (error) {
          this.logger.error(
            `attempt ${attempt} failed to create client:`,
            error.message
          );
        }
        const jitter = Math.random() * 500;
        const backoff = Math.min(attempt, 10) * 1e3;
        await new Promise((r) => setTimeout(r, backoff + jitter));
      }
    } finally {
      this.isCreating = false;
    }
  }
  async createClient() {
    this.client = new Client(this.config);
    this.client.on("error", (err) => {
      this.logger.error(`Client error: ${err.message} (${err?.code})`);
      if (this.isCreating === false) {
        this.setup();
      }
    });
    this.client.on("end", () => {
      this.logger.warn("Client connection closed");
    });
    await this.client.connect();
  }
  async destroyClient() {
    if (!this.client) {
      return;
    }
    try {
      this.client.removeAllListeners();
      if (this.options.debug) {
        this.logger.info(`successfully removed all listeners`);
      }
    } catch (error) {
      this.logger.warn(
        `failed to remove all listeners:`,
        error.message
      );
    }
    try {
      await this.client.end();
      if (this.options.debug) {
        this.logger.info(`successfully closed client`);
      }
    } catch (error) {
      this.logger.warn(
        `failed to close client:`,
        error.message
      );
    }
    this.client = null;
  }
  async verifyClient() {
    if (!this.client) {
      throw new Error("Client is not initialized");
    }
    await this.connectionController.testClient(this.client);
  }
};

// src/core/pool.core.ts
import { Pool } from "pg";
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
    if (max === void 0 || max === null || Number.isNaN(max) || !Number.isInteger(max) || max < 2) {
      throw new Error(`Max clients (${max}) in pool must be at least 2!`);
    }
    if (min === void 0 || min === null || Number.isNaN(min) || !Number.isInteger(min) || min < 0) {
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
    this.setup();
  }
  static {
    __name(this, "CorePool");
  }
  /** Class Logger Instance */
  logger;
  /** Class Connection Controller */
  connectionController;
  /** Class Connection Events */
  connectionEvents;
  /** Setup running */
  setupRunning = false;
  /** The PostgreSQL pool instance */
  pool = null;
  // Public
  metrics() {
    if (!this.pool) {
      return null;
    }
    return {
      /** Total number of clients existing within the pool */
      total: this.pool.totalCount,
      /** Number of clients which are not checked out but are currently idle in the pool */
      idle: this.pool.idleCount,
      /** Number of clients which are checked out and in use */
      active: this.pool.totalCount - this.pool.idleCount,
      /** Number of queued requests waiting on a client when all clients are checked out */
      waiting: this.pool.waitingCount
    };
  }
  async getClient() {
    await this.connectionController.connection.enter();
    if (!this.pool) {
      throw new Error("Pool is not initialized");
    }
    const client = await this.pool.connect();
    return client;
  }
  async disconnect() {
    await this.connectionController.connection.enter();
    await this.destroyPool();
    this.connectionController.connection.close();
  }
  // Private
  async setup() {
    if (this.setupRunning) {
      if (this.options.debug) {
        this.logger.info("Pool is already being setup");
      }
      return;
    }
    this.setupRunning = true;
    this.connectionController.connection.close();
    try {
      let attempt = 0;
      while (true) {
        attempt++;
        try {
          await this.createPool();
          await this.verifyPool();
          if (this.options.debug) {
            this.logger.info(`successfully setup pool`);
          }
          this.connectionController.connection.open();
          this.connectionEvents.connect();
          break;
        } catch (error) {
          this.logger.error(
            `attempt ${attempt} failed to create pool:`,
            error.message
          );
        }
        const jitter = Math.random() * 500;
        const backoff = Math.min(attempt, 10) * 1e3;
        await new Promise((r) => setTimeout(r, backoff + jitter));
      }
    } finally {
      this.setupRunning = false;
    }
  }
  async createPool() {
    if (this.pool) {
      return;
    }
    this.pool = new Pool(this.config);
    if (this.pool.listenerCount("error") === 0) {
      this.pool.on("error", (err, client) => {
        this.logger.error(`Pool error: ${err.message} (${err?.code})`, err, client);
      });
    }
    if (this.pool.listenerCount("connect") === 0) {
      this.pool.on("connect", (client) => {
        if (client.listenerCount("error") === 0) {
          client.on("error", (err) => {
            this.logger.error(`Client error: ${err.message} (${err?.code})`, err, client);
          });
        }
        if (this.options.debug) {
          this.logger.info("New client connection established");
        }
      });
    }
    if (this.pool.listenerCount("remove") === 0) {
      this.pool.on("remove", (client) => {
        client.removeAllListeners();
        if (this.options.debug) {
          this.logger.info("Client closed and removed from pool");
        }
      });
    }
    if (this.options.debug) {
      if (this.pool.listenerCount("acquire") === 0) {
        this.pool.on("acquire", (client) => {
          this.logger.info("Client acquired from pool");
        });
      }
      if (this.pool.listenerCount("release") === 0) {
        this.pool.on("release", (err, client) => {
          this.logger.info("Client released back to pool");
        });
      }
    }
  }
  async destroyPool() {
    if (!this.pool) {
      return;
    }
    try {
      this.pool.removeAllListeners();
      if (this.options.debug) {
        this.logger.info(`successfully removed all listeners`);
      }
    } catch (error) {
      this.logger.warn(
        `failed to remove all listeners:`,
        error.message
      );
    }
    try {
      await this.pool.end();
      if (this.options.debug) {
        this.logger.info(`successfully closed pool`);
      }
    } catch (error) {
      this.logger.warn(
        `failed to close pool:`,
        error.message
      );
    }
    this.pool = null;
  }
  async verifyPool() {
    if (!this.pool) {
      throw new Error("Pool is not initialized");
    }
    await this.connectionController.testPool(this.pool);
  }
};

// src/utils/error.utils.ts
var pgConnectionErrors = /* @__PURE__ */ new Set([
  "08000",
  "08003",
  "08006",
  "08001",
  "08004",
  "08007",
  "08P01"
]);
var pgTxnRollbackErrors = /* @__PURE__ */ new Set([
  "40000",
  "40001",
  "40002",
  "40003",
  "40P01"
]);
var pgLockErrors = /* @__PURE__ */ new Set([
  "55P03"
]);
var pgInterventionErrors = /* @__PURE__ */ new Set([
  "57000",
  "57014",
  "57P01",
  "57P02",
  "57P03",
  "57P04",
  "57P05"
]);
var pgResourceErrors = /* @__PURE__ */ new Set([
  "53000",
  "53100",
  "53200",
  "53300",
  "53400"
]);
var retriableNetworkCodes = /* @__PURE__ */ new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN"
]);
var isRetriableError = /* @__PURE__ */ __name((err) => {
  if (!err || typeof err !== "object") {
    return false;
  }
  const e = err;
  const code = typeof e.code === "string" ? e.code.toUpperCase() : void 0;
  if (code) {
    if (pgConnectionErrors.has(code) || pgTxnRollbackErrors.has(code) || pgLockErrors.has(code) || pgInterventionErrors.has(code) || pgResourceErrors.has(code) || retriableNetworkCodes.has(code)) {
      return true;
    }
  }
  return false;
}, "isRetriableError");

// src/utils/retry.utils.ts
async function waitWithBackoff(attempt, options) {
  const backoff = Math.min(1e3 * attempt, options.maxDelay);
  const jitter = Math.random() * 500;
  await new Promise((res) => setTimeout(res, backoff + jitter));
}
__name(waitWithBackoff, "waitWithBackoff");

// src/modules/query.module.ts
function queryModule(options) {
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 1));
  let activeRequests = 0;
  async function queryWithRetry(params, options2) {
    activeRequests++;
    try {
      let attempt = 0;
      while (true) {
        attempt++;
        const client = await options2.getClient();
        try {
          const result = await client.query(params.query, params.values);
          return result;
        } catch (err) {
          if (attempt >= maxAttempts || !isRetriableError(err)) {
            throw err;
          }
          options2.onError(
            `Transient error on attempt ${attempt}/${maxAttempts}: ${err.message} (code: ${err.code})`
          );
          await waitWithBackoff(attempt, { maxDelay: 15e3 });
        } finally {
          if ("release" in client && typeof client.release === "function") {
            client.release();
          }
        }
      }
    } finally {
      activeRequests--;
    }
  }
  __name(queryWithRetry, "queryWithRetry");
  async function shutdown(onLog) {
    let countRunning = 0;
    while (activeRequests > 0) {
      if (activeRequests !== countRunning) {
        onLog(`waiting for ${activeRequests} queries to finish...`);
        countRunning = activeRequests;
      }
      await new Promise((res) => setTimeout(res, 1e3));
    }
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
  async function transactionWithRetry(queries, options2) {
    activeRequests++;
    try {
      let attempt = 0;
      while (true) {
        attempt++;
        try {
          const results = [];
          const client = await options2.getClient();
          try {
            await client.query("BEGIN");
            for (const { query, values } of queries) {
              results.push(
                await client.query(query, values)
              );
            }
            await client.query("COMMIT");
            return results;
          } catch (queryErr) {
            await client.query("ROLLBACK").catch((rollbackErr) => {
              options2.onError(`ROLLBACK failed: ${rollbackErr.message}`);
            });
            throw queryErr;
          } finally {
            if ("release" in client && typeof client.release === "function") {
              client.release();
            }
          }
        } catch (err) {
          if (attempt >= maxAttempts || !isRetriableError(err)) {
            throw err;
          }
          options2.onError(
            `Transient error on attempt ${attempt}/${maxAttempts}: ${err.message} (code: ${err.code})`
          );
          await waitWithBackoff(attempt, { maxDelay: 15e3 });
        }
      }
    } finally {
      activeRequests--;
    }
  }
  __name(transactionWithRetry, "transactionWithRetry");
  async function shutdown(onLog) {
    let countRunning = 0;
    while (activeRequests > 0) {
      if (activeRequests !== countRunning) {
        onLog(`waiting for ${activeRequests} queries to finish...`);
        countRunning = activeRequests;
      }
      await new Promise((res) => setTimeout(res, 1e3));
    }
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
  /** Class Query Module */
  queryModule;
  /** Class Transaction Module */
  transactionModule;
  /**
   * Client class constructor.
   * @param config - The client configuration object.
   * @param options - Additional client options.
   */
  constructor(config, options) {
    super(config, options);
    this.queryModule = queryModule({ maxAttempts: options.maxAttempts ?? 2 });
    this.transactionModule = transactionModule({ maxAttempts: options.maxAttempts ?? 2 });
  }
  // Public
  async query(query, values) {
    return await this.queryModule.queryWithRetry({ query, values }, {
      getClient: /* @__PURE__ */ __name(() => this.getClient(), "getClient"),
      onError: /* @__PURE__ */ __name((err) => this.logger.error(err), "onError")
    });
  }
  async transaction(queries) {
    return await this.transactionModule.transactionWithRetry(queries, {
      getClient: /* @__PURE__ */ __name(() => this.getClient(), "getClient"),
      onError: /* @__PURE__ */ __name((err) => this.logger.error(err), "onError")
    });
  }
  async shutdown() {
    await this.queryModule.shutdown((message) => this.logger.info(message));
    await this.transactionModule.shutdown((message) => this.logger.info(message));
    await this.disconnect();
  }
};

// src/extensions/pool.class.ts
var Pool2 = class extends CorePool {
  static {
    __name(this, "Pool");
  }
  /** The query module */
  queryModule;
  /** Class Transaction Module */
  transactionModule;
  /**
   * Pool class constructor.
   * @param config - The pool configuration object.
   * @param options - Additional pool options.
   */
  constructor(config, options) {
    super(config, options);
    this.queryModule = queryModule({ maxAttempts: options.maxAttempts ?? 2 });
    this.transactionModule = transactionModule({ maxAttempts: options.maxAttempts ?? 2 });
  }
  // Public
  async query(query, values) {
    return await this.queryModule.queryWithRetry({ query, values }, {
      getClient: /* @__PURE__ */ __name(() => this.getClient(), "getClient"),
      onError: /* @__PURE__ */ __name((err) => this.logger.error(err), "onError")
    });
  }
  async transaction(queries) {
    return await this.transactionModule.transactionWithRetry(queries, {
      getClient: /* @__PURE__ */ __name(() => this.getClient(), "getClient"),
      onError: /* @__PURE__ */ __name((err) => this.logger.error(err), "onError")
    });
  }
  async shutdown() {
    await this.queryModule.shutdown((message) => this.logger.info(message));
    await this.transactionModule.shutdown((message) => this.logger.info(message));
    await this.disconnect();
  }
};

// src/extensions/listen.class.ts
var ListenClient = class extends CoreClient {
  static {
    __name(this, "ListenClient");
  }
  /** The channels map */
  channels;
  /** The query module */
  queryModule;
  /** The transaction module */
  transactionModule;
  /**
   * ListenClient class constructor.
   * @param config - The client configuration object.
   * @param options - Additional client options.
   */
  constructor(config, options) {
    super(config, options);
    this.channels = /* @__PURE__ */ new Map();
    this.queryModule = queryModule({ maxAttempts: options.maxAttempts ?? 2 });
    this.transactionModule = transactionModule({ maxAttempts: options.maxAttempts ?? 2 });
    this.connectionEvents.onConnect(() => this.onClientConnect());
    this.connectionEvents.onDisconnect(() => this.onClientDisconnect());
  }
  // Public
  async query(query, values) {
    return await this.queryModule.queryWithRetry({ query, values }, {
      getClient: /* @__PURE__ */ __name(() => this.getClient(), "getClient"),
      onError: /* @__PURE__ */ __name((err) => this.logger.error(err), "onError")
    });
  }
  async transaction(queries) {
    return await this.transactionModule.transactionWithRetry(queries, {
      getClient: /* @__PURE__ */ __name(() => this.getClient(), "getClient"),
      onError: /* @__PURE__ */ __name((err) => this.logger.error(err), "onError")
    });
  }
  async shutdown() {
    await this.queryModule.shutdown((message) => this.logger.info(message));
    await this.transactionModule.shutdown((message) => this.logger.info(message));
    await this.disconnect();
  }
  /**
   * Subscribe to a PostgreSQL NOTIFY channel.
   * Will automatically re-subscribe on reconnection.
   */
  async listen(channel, events) {
    if (this.channels.has(channel)) {
      throw new Error(`Already listening to channel: ${channel}`);
    }
    this.channels.set(channel, events);
    const client = await this.getClient();
    try {
      if (client.listenerCount("notification") === 0) {
        client.on(
          "notification",
          (notif) => this.onNotification(notif)
        );
      }
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
  /**
   * Unsubscribe from a PostgreSQL NOTIFY channel.
   */
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
  /**
   * Disconnect and clean up all listeners.
   */
  async disconnect() {
    for (const [, events] of this.channels) {
      events.onDisconnect();
    }
    this.channels.clear();
    await super.disconnect();
  }
  // Private - Client event handlers
  async onClientConnect() {
    if (this.channels.size === 0) return;
    try {
      const client = await this.getClient();
      if (client.listenerCount("notification") === 0) {
        client.on(
          "notification",
          (notif) => this.onNotification(notif)
        );
      }
      for (const [channel, events] of this.channels) {
        try {
          await client.query(`LISTEN "${channel}"`);
          events.onConnect();
          if (this.options.debug) {
            this.logger.info(`Re-subscribed to channel "${channel}"`);
          }
        } catch (error) {
          this.logger.error(`Failed to re-subscribe to "${channel}":`, error.message);
          events.onError(error);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to re-subscribe channels:`, error.message);
    }
  }
  onClientDisconnect() {
    for (const [, events] of this.channels) {
      try {
        events.onDisconnect();
      } catch {
      }
    }
  }
  // Private - Notification handler
  onNotification(notif) {
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
        events.onError(error);
      }
    }
  }
};
export {
  Client2 as Client,
  CoreClient,
  CorePool,
  IClient,
  IPool,
  ListenClient,
  Pool2 as Pool
};

# Yog4a | pgsql

A personal encapsulation module for [Pgsql](https://node-postgres.com), providing enhanced functionality.

## What This Package Is

`@yog4a/pgsql` is a higher-level wrapper around `pg` that adds:

- Strong startup validation for required config.
- Connection gating: queries wait until the DB connection is ready.
- Auto-reconnect after runtime connection failures.
- Retry logic for query and transaction operations.
- Graceful shutdown helpers.
- PostgreSQL `LISTEN/NOTIFY` helper client.

It exports three main clients:

- `Pool`: connection pool (`pg.Pool`) wrapper.
- `Client`: single PostgreSQL client (`pg.Client`) wrapper.
- `NotificationClient`: dedicated `LISTEN/NOTIFY` client with auto-resubscribe on reconnect.

## Install

```bash
npm install github:yog4a/pgsql#vX.Y.Z
```

## Basic Usage

### 1) Single Client

```ts
import { Client } from '@yog4a/pgsql';

const db = new Client(
  {
    host: '127.0.0.1',
    port: 5432,
    database: 'app',
    user: 'postgres',
    password: 'postgres',
  },
  {
    debug: false,
    maxAttempts: 3,
  }
);

const rows = await db.query('SELECT NOW()');
console.log(rows.rows);

await db.shutdown();
```

### 2) Pool

```ts
import { Pool } from '@yog4a/pgsql';

const db = new Pool(
  {
    host: '127.0.0.1',
    port: 5432,
    database: 'app',
    user: 'postgres',
    password: 'postgres',
    min: 0,
    max: 10,
  },
  {
    debug: false,
    maxAttempts: 3,
  }
);

const result = await db.query('SELECT * FROM users WHERE id = $1', [1]);
console.log(result.rows[0]);

console.log(db.metrics());

await db.shutdown();
```

### 3) Transactions

`Client` and `Pool` both expose `transaction(...)`:

```ts
await db.transaction([
  { query: 'INSERT INTO wallets(id, balance) VALUES($1, $2)', values: [1, 100] },
  { query: 'UPDATE wallets SET balance = balance - 50 WHERE id = $1', values: [1] },
]);
```

## Notifications (`LISTEN/NOTIFY`)

```ts
import { NotificationClient } from '@yog4a/pgsql';

const notify = new NotificationClient(
  {
    host: '127.0.0.1',
    port: 5432,
    database: 'app',
    user: 'postgres',
    password: 'postgres',
  },
  { debug: true }
);

await notify.listen('orders', {
  onConnect: () => console.log('orders channel connected'),
  onDisconnect: () => console.log('orders channel disconnected'),
  onData: (payload) => console.log('payload:', payload),
  onError: (err) => console.error('channel error:', err.message),
});

// In SQL: NOTIFY orders, '{"id":123,"status":"paid"}';
// onData receives parsed JSON when payload is valid JSON,
// otherwise it receives the raw string payload.

await notify.unlisten('orders');
await notify.shutdown();
```

## Connection Behavior

### Startup

- Initial connection is attempted during client construction.
- If initial connection fails, initialization throws and the process should fail fast.

### Runtime reconnect

- After a successful startup, runtime connection loss triggers auto-reconnect.
- Reconnect retries use backoff + jitter.
- During reconnect, `getClient()` waits behind an internal gate until connection is restored.

### Lifecycle events (internal)

The core emits connection lifecycle events:

- `connect`
- `disconnect`
- `reconnect`
- `notification` (for `NotificationClient`)

## Config Requirements

### Required for all clients

- `host`
- `port`
- `database`
- `user`
- `password`

### Pool-specific

- `min` (integer, `>= 0`)
- `max` (integer, `>= 2`)
- Also sets sensible defaults if missing:
  - `connectionTimeoutMillis = 5000`
  - `idleTimeoutMillis = 60000`
  - `maxLifetimeSeconds = 600`

## Retry and Shutdown

### Retry

- `query()` and `transaction()` retries are controlled by `maxAttempts`.
- Retries happen only for transient/retriable errors.

### Shutdown

Use `shutdown()` (recommended) instead of `disconnect()` directly for `Client` and `Pool`:

- Waits for active query/transaction work to finish (with timeout inside modules).
- Then disconnects underlying client/pool.

## Utilities

Type conversion helpers are exported from:

```ts
import { byteaToHex, stringToBigInt, convertPgValue } from '@yog4a/pgsql/utils';
```

## License

This project is licensed under **CC BY-NC 4.0** (non-commercial use).

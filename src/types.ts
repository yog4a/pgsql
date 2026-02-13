// ===========================================================
// PostgreSQL Types for node-postgres (pg) — pragmatic TS aliases
// Notes:
// - Avoid naming collisions with TS/JS globals (Boolean, JSON, Record, Array, BigInt, etc.)
// - node-postgres defaults: int8/numeric => string; timestamps => string (unless custom parsers)
// ===========================================================

// ===========================================================
// Numeric Types
// ===========================================================

/** SMALLINT: -32768 to 32767 */
export type PgSmallInt = number;

/** INTEGER: -2147483648 to 2147483647 */
export type PgInteger = number;

/** BIGINT (int8): -9223372036854775808 to 9223372036854775807
 * pg default: string (unless you override parser)
 */
export type PgBigInt = string | bigint;

/** DECIMAL/NUMERIC: arbitrary precision
 * pg default: string (unless you override parser)
 */
export type PgDecimal = string | number;
export type PgNumeric = PgDecimal;

/** REAL: 6 decimal digits precision */
export type PgReal = number;

/** DOUBLE PRECISION: 15 decimal digits precision */
export type PgDoublePrecision = number;

/** FLOAT (alias of double precision in PostgreSQL) */
export type PgFloat = number;

/** SMALLSERIAL: auto-incrementing */
export type PgSmallSerial = number;

/** SERIAL: auto-incrementing */
export type PgSerial = number;

/** BIGSERIAL: auto-incrementing
 * pg default: string (unless you override parser)
 */
export type PgBigSerial = string | bigint;

/** MONEY: currency amount (locale formatted) */
export type PgMoney = string;

// ===========================================================
// Character Types
// ===========================================================

/** VARCHAR(n): variable-length with limit */
export type PgVarChar<N extends number = number> = string;

/** CHAR(n): fixed-length, blank padded */
export type PgChar<N extends number = number> = string;

/** TEXT: variable unlimited length */
export type PgText = string;

/** NAME: internal name type */
export type PgName = string;

/** CITEXT: case-insensitive text (extension) */
export type PgCitext = string;

/** XML: XML data */
export type PgXml = string;

// ===========================================================
// Binary Types
// ===========================================================

/** BYTEA: binary data */
export type PgBytea = Buffer | Uint8Array;

/** HEX: hexadecimal string representation */
export type PgHex = `0x${string}` | `\\x${string}`;

// ===========================================================
// Date/Time Types
// ===========================================================

/** DATE: calendar date (year, month, day)
 * pg default: string (often), can be Date if parser overridden
 */
export type PgDate = string | Date;

/** TIME: time of day (no time zone) - pg default: string */
export type PgTime = string;

/** TIME WITH TIME ZONE (TIMETZ) - pg default: string */
export type PgTimeTz = string;
export type PgTimeWithTimeZone = PgTimeTz;

/** TIMESTAMP: date and time (no time zone)
 * pg default: string, can be Date if parser overridden
 */
export type PgTimestamp = string | Date;

/** TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ)
 * pg default: string, can be Date if parser overridden
 */
export type PgTimestamptz = string | Date;
export type PgTimestampWithTimeZone = PgTimestamptz;

/** INTERVAL: time span
 * pg default: string unless you install/enable interval parsers
 */
export type PgInterval =
  | string
  | {
      years?: number;
      months?: number;
      days?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
    };

// ===========================================================
// Boolean Type
// ===========================================================

/** BOOLEAN: true/false */
export type PgBoolean = boolean;

// ===========================================================
// Enumerated Types
// ===========================================================

/** ENUM: user-defined enumerated type */
export type PgEnum<T extends string = string> = T;

// ===========================================================
// Geometric Types
// ===========================================================

/** POINT: (x,y) */
export type PgPoint = string | { x: number; y: number };

/** LINE: infinite line (Ax + By + C = 0) */
export type PgLine = string | { a: number; b: number; c: number };

/** LSEG: line segment */
export type PgLineSegment =
  | string
  | { x1: number; y1: number; x2: number; y2: number };

/** BOX: rectangular box */
export type PgBox = string | { x1: number; y1: number; x2: number; y2: number };

/** PATH: geometric path (open or closed) */
export type PgPath = string | Array<{ x: number; y: number }>;

/** POLYGON: closed geometric path */
export type PgPolygon = string | Array<{ x: number; y: number }>;

/** CIRCLE: circle */
export type PgCircle = string | { x: number; y: number; r: number };

// ===========================================================
// Network Address Types
// ===========================================================

/** CIDR: IPv4 or IPv6 network */
export type PgCidr = string;

/** INET: IPv4 or IPv6 host and network */
export type PgInet = string;

/** MACADDR: MAC address */
export type PgMacaddr = string;

/** MACADDR8: MAC address (EUI-64 format) */
export type PgMacaddr8 = string;

// ===========================================================
// Bit String Types
// ===========================================================

/** BIT(n): fixed-length bit string */
export type PgBit<N extends number = number> = string;

/** BIT VARYING(n) / VARBIT: variable-length bit string */
export type PgVarbit<N extends number = number> = string;
export type PgBitVarying<N extends number = number> = PgVarbit<N>;

// ===========================================================
// Text Search Types
// ===========================================================

/** TSVECTOR: text search document */
export type PgTsVector = string;

/** TSQUERY: text search query */
export type PgTsQuery = string;

/** REGCONFIG: text search configuration */
export type PgRegConfig = string;

/** REGDICTIONARY: text search dictionary */
export type PgRegDictionary = string;

// ===========================================================
// UUID Type
// ===========================================================

/** UUID: universally unique identifier */
export type PgUuid = string;

// ===========================================================
// JSON Types
// ===========================================================

/** JSON: parsed JSON value (pg returns JS value by default) */
export type PgJson = unknown;

/** JSONB: parsed JSONB value (pg returns JS value by default) */
export type PgJsonb = unknown;

// ===========================================================
// Array Types
// ===========================================================

/** Array of any PostgreSQL type (parsed) */
export type PgArray<T> = T[];

/** Pragmatic: arrays can be raw strings if you don't parse them */
export type PgMaybeParsedArray<T> = T[] | string;

// ===========================================================
// Composite Types
// ===========================================================

/** User-defined composite type */
export type PgComposite<T extends { [key: string]: unknown } = { [key: string]: unknown }> = T;

// ===========================================================
// Range Types
// ===========================================================

export type PgRangeBounds = '[]' | '[)' | '(]' | '()';

export type PgInt4Range =
  | string
  | { lower: number; upper: number; bounds?: PgRangeBounds };

export type PgInt8Range =
  | string
  | { lower: PgBigInt; upper: PgBigInt; bounds?: PgRangeBounds };

export type PgNumRange =
  | string
  | { lower: PgNumeric; upper: PgNumeric; bounds?: PgRangeBounds };

export type PgTsRange =
  | string
  | { lower: PgTimestamp; upper: PgTimestamp; bounds?: PgRangeBounds };

export type PgTstzRange =
  | string
  | { lower: PgTimestamptz; upper: PgTimestamptz; bounds?: PgRangeBounds };

export type PgDateRange =
  | string
  | { lower: PgDate; upper: PgDate; bounds?: PgRangeBounds };

/** Generic range */
export type PgAnyRange =
  | string
  | { lower: unknown; upper: unknown; bounds?: PgRangeBounds };

// ===========================================================
// Key-Value / Extensions
// ===========================================================

/** HSTORE (extension) */
export type PgHstore = string | { [key: string]: string | null };

/** LTREE (extension) */
export type PgLtree = string;

// ===========================================================
// Domain Types
// ===========================================================

/** User-defined domain type */
export type PgDomain<T = unknown> = T;

// ===========================================================
// Object Identifier & Reg* Types
// ===========================================================

/** OID: object identifier */
export type PgOid = number;

export type PgRegProc = string;
export type PgRegProcedure = string;
export type PgRegOper = string;
export type PgRegOperator = string;
export type PgRegClass = string;
export type PgRegType = string;
export type PgRegRole = string;
export type PgRegNamespace = string;

// ===========================================================
// System / Internal Types
// ===========================================================

/** pg_lsn: PostgreSQL Log Sequence Number */
export type PgLsn = string;

/** xid: transaction id */
export type PgXid = number;

/** xid8: 64-bit transaction id (pg default: string) */
export type PgXid8 = string | bigint;

/** cid: command identifier */
export type PgCid = number;

/** txid_snapshot / pg_snapshot */
export type PgTxidSnapshot = string;
export type PgSnapshot = string;

// ===========================================================
// Pseudo-Types (for completeness)
// ===========================================================

export type PgAny = any;
export type PgAnyElement = any;
export type PgAnyArray = any[];
export type PgAnyNonArray = any;
export type PgAnyEnum = string;

export type PgVoid = void;

/** TRIGGER / EVENT_TRIGGER used as function return types in SQL */
export type PgTrigger = never;
export type PgEventTrigger = never;

/** RECORD: composite type (variable structure) */
export type PgRecord = { [key: string]: unknown };

export type PgUnknown = unknown;

// ===========================================================
// Utility Types
// ===========================================================

/** Nullable version of any type */
export type PgNullable<T> = T | null;

/** PostgreSQL scalar-ish value you may see from pg */
export type PgScalar =
  | string
  | number
  | bigint
  | boolean
  | null
  | Buffer
  | Uint8Array
  | Date;

/** PostgreSQL value (any valid type) */
export type PgValue =
  | PgScalar
  | PgScalar[]
  | { [key: string]: unknown };

/** PostgreSQL row (object with any fields) */
export type PgRow = { [key: string]: PgValue };

/** Default-ish node-postgres output (no custom parsers) */
export type PgDefaultScalar = string | number | boolean | null | Buffer;
export type PgDefaultValue =
  | PgDefaultScalar
  | PgDefaultScalar[]
  | { [key: string]: unknown };

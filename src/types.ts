// ===========================================================
// Numeric Types
// ===========================================================

/** SMALLINT: -32768 to 32767 */
export type SmallInt = number;

/** INTEGER: -2147483648 to 2147483647 */
export type Integer = number;

/** BIGINT: -9223372036854775808 to 9223372036854775807 */
export type BigInt = bigint | string;

/** DECIMAL/NUMERIC: arbitrary precision */
export type Decimal = string | number;
export type Numeric = Decimal;

/** REAL: 6 decimal digits precision */
export type Real = number;

/** DOUBLE PRECISION: 15 decimal digits precision */
export type DoublePrecision = number;

/** SMALLSERIAL: auto-incrementing 1 to 32767 */
export type SmallSerial = number;

/** SERIAL: auto-incrementing 1 to 2147483647 */
export type Serial = number;

/** BIGSERIAL: auto-incrementing 1 to 9223372036854775807 */
export type BigSerial = bigint | string;

/** MONEY: currency amount */
export type Money = string;

// ===========================================================
// Character Types
// ===========================================================

/** VARCHAR(n): variable-length with limit */
export type VarChar<N extends number = number> = string;

/** CHAR(n): fixed-length, blank padded */
export type Char<N extends number = number> = string;

/** TEXT: variable unlimited length */
export type Text = string;

// ===========================================================
// Binary Types
// ===========================================================

/** BYTEA: binary data */
export type Bytea = Buffer | Uint8Array;

/** HEX: hexadecimal string representation */
export type Hex = `0x${string}`;

// ===========================================================
// Date/Time Types
// ===========================================================

/** DATE: calendar date (year, month, day) */
export type DateType = Date | string;

/** TIME: time of day (no time zone) */
export type Time = string | Date;

/** TIME WITH TIME ZONE */
export type TimeWithTimeZone = string | Date;

/** TIMESTAMP: date and time (no time zone) */
export type Timestamp = Date | string;

/** TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ) */
export type TimestampWithTimeZone = Date | string;
export type Timestamptz = TimestampWithTimeZone;

/** INTERVAL: time span */
export type Interval = string | {
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
export type Boolean = boolean;

// ===========================================================
// Enumerated Types
// ===========================================================

/** ENUM: user-defined enumerated type */
export type Enum<T extends string = string> = T;

// ===========================================================
// Geometric Types
// ===========================================================

/** POINT: (x,y) */
export type Point = string | { x: number; y: number };

/** LINE: infinite line */
export type Line = string | { a: number; b: number; c: number };

/** LSEG: line segment */
export type LineSegment = string | { x1: number; y1: number; x2: number; y2: number };

/** BOX: rectangular box */
export type Box = string | { x1: number; y1: number; x2: number; y2: number };

/** PATH: geometric path (open or closed) */
export type Path = string | Array<{ x: number; y: number }>;

/** POLYGON: closed geometric path */
export type Polygon = string | Array<{ x: number; y: number }>;

/** CIRCLE: circle */
export type Circle = string | { x: number; y: number; r: number };

// ===========================================================
// Network Address Types
// ===========================================================

/** CIDR: IPv4 or IPv6 network */
export type CIDR = string;

/** INET: IPv4 or IPv6 host and network */
export type INET = string;

/** MACADDR: MAC address */
export type MacAddr = string;

/** MACADDR8: MAC address (EUI-64 format) */
export type MacAddr8 = string;

// ===========================================================
// Bit String Types
// ===========================================================

/** BIT(n): fixed-length bit string */
export type Bit<N extends number = number> = string;

/** BIT VARYING(n): variable-length bit string */
export type BitVarying<N extends number = number> = string;

// ===========================================================
// Text Search Types
// ===========================================================

/** TSVECTOR: text search document */
export type TSVector = string;

/** TSQUERY: text search query */
export type TSQuery = string;

// ===========================================================
// UUID Type
// ===========================================================

/** UUID: universally unique identifier */
export type UUID = string;

// ===========================================================
// XML Type
// ===========================================================

/** XML: XML data */
export type XML = string;

// ===========================================================
// JSON Types
// ===========================================================

/** JSON: text-based JSON data */
export type JSON = string | object | any[];

/** JSONB: binary JSON data (recommended) */
export type JSONB = object | any[] | string | number | boolean | null;

// ===========================================================
// Array Types
// ===========================================================

/** Array of any PostgreSQL type */
export type Array<T> = T[];

// ===========================================================
// Composite Types
// ===========================================================

/** User-defined composite type */
export type Composite<T extends { [key: string]: unknown } = { [key: string]: unknown }> = T;

// ===========================================================
// Range Types
// ===========================================================

/** INT4RANGE: range of integers */
export type Int4Range = string | { lower: number; upper: number; bounds?: '[]' | '[)' | '(]' | '()' };

/** INT8RANGE: range of bigints */
export type Int8Range = string | { lower: bigint; upper: bigint; bounds?: '[]' | '[)' | '(]' | '()' };

/** NUMRANGE: range of numerics */
export type NumRange = string | { lower: number; upper: number; bounds?: '[]' | '[)' | '(]' | '()' };

/** TSRANGE: range of timestamps */
export type TSRange = string | { lower: Date; upper: Date; bounds?: '[]' | '[)' | '(]' | '()' };

/** TSTZRANGE: range of timestamps with time zone */
export type TSTZRange = string | { lower: Date; upper: Date; bounds?: '[]' | '[)' | '(]' | '()' };

/** DATERANGE: range of dates */
export type DateRange = string | { lower: Date; upper: Date; bounds?: '[]' | '[)' | '(]' | '()' };

// ===========================================================
// Domain Types
// ===========================================================

/** User-defined domain type */
export type Domain<T = any> = T;

// ===========================================================
// Object Identifier Types
// ===========================================================

/** OID: object identifier */
export type OID = number;

/** REGPROC: function name */
export type RegProc = string;

/** REGPROCEDURE: function with argument types */
export type RegProcedure = string;

/** REGOPER: operator name */
export type RegOper = string;

/** REGOPERATOR: operator with argument types */
export type RegOperator = string;

/** REGCLASS: relation name */
export type RegClass = string;

/** REGTYPE: data type name */
export type RegType = string;

/** REGROLE: role name */
export type RegRole = string;

/** REGNAMESPACE: namespace name */
export type RegNamespace = string;

/** REGCONFIG: text search configuration */
export type RegConfig = string;

/** REGDICTIONARY: text search dictionary */
export type RegDictionary = string;

// ===========================================================
// pg_lsn Type
// ===========================================================

/** pg_lsn: PostgreSQL Log Sequence Number */
export type PgLSN = string;

// ===========================================================
// Pseudo-Types (for completeness)
// ===========================================================

/** ANY: any type */
export type Any = any;

/** ANYELEMENT: any element type */
export type AnyElement = any;

/** ANYARRAY: any array type */
export type AnyArray = any[];

/** ANYNONARRAY: any non-array type */
export type AnyNonArray = any;

/** ANYENUM: any enum type */
export type AnyEnum = string;

/** ANYRANGE: any range type */
export type AnyRange = string | object;

/** VOID: no value */
export type Void = void;

/** TRIGGER: trigger function */
export type Trigger = never;

/** EVENT_TRIGGER: event trigger function */
export type EventTrigger = never;

/** RECORD: composite type (variable structure) */
export type Record = object;

/** UNKNOWN: unknown type */
export type Unknown = unknown;

// ===========================================================
// Utility Types
// ===========================================================

/** Nullable version of any type */
export type Nullable<T> = T | null;

/** PostgreSQL value (any valid type) */
export type PgValue = 
    | string
    | number
    | bigint
    | boolean
    | Date
    | Buffer
    | Uint8Array
    | object
    | any[]
    | null;

/** PostgreSQL row (object with any fields) */
export type PgRow = { [key: string]: PgValue };
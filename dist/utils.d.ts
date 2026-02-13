/** BYTEA: binary data */
type PgBytea = Buffer | Uint8Array;
/** HEX: hexadecimal string representation */
type PgHex = `0x${string}` | `\\x${string}`;

declare const byteaToHex: (bytea: PgBytea) => PgHex;
declare const hexToBytea: (hex: PgHex | string) => PgBytea;
declare const stringToBytea: (str: string) => PgBytea;
declare const byteaToString: (bytea: PgBytea) => string;
declare const base64ToBytea: (base64: string) => PgBytea;
declare const byteaToBase64: (bytea: PgBytea) => string;
declare const stringToBigInt: (value: string) => bigint;
declare const bigIntToString: (value: bigint) => string;
declare const stringToDecimal: (value: string) => number;
declare const decimalToString: (value: number, precision?: number) => string;
declare const stringToDate: (value: string) => Date;
declare const dateToString: (value: Date) => string;
declare const stringToTimestamp: (value: string) => Date;
declare const timestampToString: (value: Date) => string;
declare const stringToTimestamptz: (value: string) => Date;
declare const timestamptzToString: (value: Date) => string;
declare const stringToTime: (value: string) => Date;
declare const timeToString: (value: Date) => string;
declare const stringToInterval: (value: string) => {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
};
declare const intervalToString: (interval: {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
}) => string;
declare const stringToBoolean: (value: string | boolean) => boolean;
declare const booleanToString: (value: boolean) => string;
declare const stringToJSON: <T = any>(value: string) => T;
declare const jsonToString: (value: any) => string;
declare const stringToJSONB: <T = any>(value: string) => T;
declare const jsonbToString: (value: any) => string;
declare const stringToArray: <T = string>(value: string, parser?: (item: string) => T) => T[];
declare const arrayToString: <T>(value: T[]) => string;
declare const stringToUUID: (value: string) => string;
declare const uuidToString: (value: string) => string;
declare const stringToCIDR: (value: string) => string;
declare const cidrToString: (value: string) => string;
declare const stringToINET: (value: string) => string;
declare const inetToString: (value: string) => string;
declare const stringToMacAddr: (value: string) => string;
declare const macAddrToString: (value: string) => string;
declare const stringToPoint: (value: string) => {
    x: number;
    y: number;
};
declare const pointToString: (value: {
    x: number;
    y: number;
}) => string;
declare const stringToBox: (value: string) => {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};
declare const boxToString: (value: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}) => string;
declare const stringToCircle: (value: string) => {
    x: number;
    y: number;
    r: number;
};
declare const circleToString: (value: {
    x: number;
    y: number;
    r: number;
}) => string;
declare const stringToInt4Range: (value: string) => {
    lower: number;
    upper: number;
    bounds: "[]" | "[)" | "(]" | "()";
};
declare const int4RangeToString: (value: {
    lower: number;
    upper: number;
    bounds?: "[]" | "[)" | "(]" | "()";
}) => string;
declare const stringToDateRange: (value: string) => {
    lower: Date;
    upper: Date;
    bounds: "[]" | "[)" | "(]" | "()";
};
declare const dateRangeToString: (value: {
    lower: Date;
    upper: Date;
    bounds?: "[]" | "[)" | "(]" | "()";
}) => string;
declare const stringToBit: (value: string) => string;
declare const bitToString: (value: string) => string;
declare const stringToTSVector: (value: string) => string;
declare const tsvectorToString: (value: string) => string;
declare const stringToTSQuery: (value: string) => string;
declare const tsqueryToString: (value: string) => string;
declare const stringToXML: (value: string) => string;
declare const xmlToString: (value: string) => string;
declare const stringToOID: (value: string) => number;
declare const oidToString: (value: number) => string;
declare const convertPgValue: (value: any, type: string) => any;

export { arrayToString, base64ToBytea, bigIntToString, bitToString, booleanToString, boxToString, byteaToBase64, byteaToHex, byteaToString, cidrToString, circleToString, convertPgValue, dateRangeToString, dateToString, decimalToString, hexToBytea, inetToString, int4RangeToString, intervalToString, jsonToString, jsonbToString, macAddrToString, oidToString, pointToString, stringToArray, stringToBigInt, stringToBit, stringToBoolean, stringToBox, stringToBytea, stringToCIDR, stringToCircle, stringToDate, stringToDateRange, stringToDecimal, stringToINET, stringToInt4Range, stringToInterval, stringToJSON, stringToJSONB, stringToMacAddr, stringToOID, stringToPoint, stringToTSQuery, stringToTSVector, stringToTime, stringToTimestamp, stringToTimestamptz, stringToUUID, stringToXML, timeToString, timestampToString, timestamptzToString, tsqueryToString, tsvectorToString, uuidToString, xmlToString };

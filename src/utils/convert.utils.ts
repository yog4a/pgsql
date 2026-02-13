import type { PgBytea, PgHex } from 'src/types.js';

// ===========================================================
// Binary conversions
// ===========================================================

export const byteaToHex = (bytea: PgBytea): PgHex => {
    const hex = Buffer.from(bytea).toString('hex');
    return `0x${hex}`;
};

export const hexToBytea = (hex: PgHex | string): PgBytea => {
    let clean = hex;
    if (/^0x/i.test(clean)) {
        clean = clean.slice(2);
    } else if (/^\\x/i.test(clean)) {
        clean = clean.slice(2);
    }
    return Buffer.from(clean, 'hex');
};

export const stringToBytea = (str: string): PgBytea => {
    return Buffer.from(str, 'utf8');
};

export const byteaToString = (bytea: PgBytea): string => {
    return Buffer.from(bytea).toString('utf8');
};

export const base64ToBytea = (base64: string): PgBytea => {
    return Buffer.from(base64, 'base64');
};

export const byteaToBase64 = (bytea: PgBytea): string => {
    return Buffer.from(bytea).toString('base64');
};

// ===========================================================
// Numeric conversions
// ===========================================================

export const stringToBigInt = (value: string): bigint => {
    return BigInt(value);
};

export const bigIntToString = (value: bigint): string => {
    return value.toString();
};

export const stringToDecimal = (value: string): number => {
    return parseFloat(value);
};

export const decimalToString = (value: number, precision?: number): string => {
    return precision !== undefined 
        ? value.toFixed(precision)
        : value.toString();
};

// ===========================================================
// Date/Time conversions
// ===========================================================

export const stringToDate = (value: string): Date => {
    return new Date(value);
};

export const dateToString = (value: Date): string => {
    return value.toISOString();
};

export const stringToTimestamp = (value: string): Date => {
    return new Date(value);
};

export const timestampToString = (value: Date): string => {
    return value.toISOString();
};

export const stringToTimestamptz = (value: string): Date => {
    return new Date(value);
};

export const timestamptzToString = (value: Date): string => {
    return value.toISOString();
};

export const stringToTime = (value: string): Date => {
    // PostgreSQL returns "HH:MM:SS" or "HH:MM:SS.mmm"
    const today = new Date().toISOString().split('T')[0];
    return new Date(`${today}T${value}Z`);
};

export const timeToString = (value: Date): string => {
    return value.toISOString().split('T')[1]?.split('Z')[0] ?? '';
};

export const stringToInterval = (value: string): {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
} => {
    // PostgreSQL returns "1 year 2 mons 3 days 04:05:06"
    const result: any = {};
    
    const yearMatch = value.match(/(\d+)\s+years?/);
    const monthMatch = value.match(/(\d+)\s+mons?/);
    const dayMatch = value.match(/(\d+)\s+days?/);
    const timeMatch = value.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
    
    if (yearMatch && yearMatch[1]) result.years = parseInt(yearMatch[1]);
    if (monthMatch && monthMatch[1]) result.months = parseInt(monthMatch[1]);
    if (dayMatch && dayMatch[1]) result.days = parseInt(dayMatch[1]);
    if (timeMatch) {
        result.hours = parseInt(timeMatch[1] ?? '0');
        result.minutes = parseInt(timeMatch[2] ?? '0');
        result.seconds = parseFloat(timeMatch[3] ?? '0');
    }
    
    return result;
};

export const intervalToString = (interval: {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
}): string => {
    const parts: string[] = [];
    
    if (interval.years) parts.push(`${interval.years} years`);
    if (interval.months) parts.push(`${interval.months} mons`);
    if (interval.days) parts.push(`${interval.days} days`);
    
    const hours = interval.hours || 0;
    const minutes = interval.minutes || 0;
    const seconds = interval.seconds || 0;
    
    if (hours || minutes || seconds) {
        const h = hours.toString().padStart(2, '0');
        const m = minutes.toString().padStart(2, '0');
        const s = seconds.toString().padStart(2, '0');
        parts.push(`${h}:${m}:${s}`);
    }
    
    return parts.join(' ');
};

// ===========================================================
// Boolean conversions
// ===========================================================

export const stringToBoolean = (value: string | boolean): boolean => {
    if (typeof value === 'boolean') return value;
    return value === 't' || value === 'true' || value === '1';
};

export const booleanToString = (value: boolean): string => {
    return value ? 't' : 'f';
};

// ===========================================================
// JSON conversions
// ===========================================================

export const stringToJSON = <T = any>(value: string): T => {
    return JSON.parse(value);
};

export const jsonToString = (value: any): string => {
    return JSON.stringify(value);
};

export const stringToJSONB = <T = any>(value: string): T => {
    return JSON.parse(value);
};

export const jsonbToString = (value: any): string => {
    return JSON.stringify(value);
};

// ===========================================================
// Array conversions
// ===========================================================

export const stringToArray = <T = string>(value: string, parser?: (item: string) => T): T[] => {
    // PostgreSQL returns "{1,2,3}" or "{a,b,c}"
    const cleaned = value.replace(/^\{|\}$/g, '');
    
    if (!cleaned) return [];
    
    const items = cleaned.split(',');
    
    return parser 
        ? items.map(item => parser(item.trim()))
        : items.map(item => item.trim()) as T[];
};

export const arrayToString = <T>(value: T[]): string => {
    return `{${value.join(',')}}`;
};

// ===========================================================
// UUID conversions
// ===========================================================

export const stringToUUID = (value: string): string => {
    return value.toLowerCase();
};

export const uuidToString = (value: string): string => {
    return value.toLowerCase();
};

// ===========================================================
// Network address conversions
// ===========================================================

export const stringToCIDR = (value: string): string => {
    return value;
};

export const cidrToString = (value: string): string => {
    return value;
};

export const stringToINET = (value: string): string => {
    return value;
};

export const inetToString = (value: string): string => {
    return value;
};

export const stringToMacAddr = (value: string): string => {
    return value.toLowerCase();
};

export const macAddrToString = (value: string): string => {
    return value.toLowerCase();
};

// ===========================================================
// Geometric conversions
// ===========================================================

export const stringToPoint = (value: string): { x: number; y: number } => {
    // PostgreSQL returns "(x,y)"
    const match = value.match(/\(([^,]+),([^)]+)\)/);
    if (!match) throw new Error(`Invalid point format: ${value}`);
    
    return {
        x: parseFloat(match[1] ?? '0'),
        y: parseFloat(match[2] ?? '0'),
    };
};

export const pointToString = (value: { x: number; y: number }): string => {
    return `(${value.x},${value.y})`;
};

export const stringToBox = (value: string): {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
} => {
    // PostgreSQL returns "((x1,y1),(x2,y2))"
    const match = value.match(/\(\(([^,]+),([^)]+)\),\(([^,]+),([^)]+)\)\)/);
    if (!match) throw new Error(`Invalid box format: ${value}`);
    
    return {
        x1: parseFloat(match[1] ?? '0'),
        y1: parseFloat(match[2] ?? '0'),
        x2: parseFloat(match[3] ?? '0'),
        y2: parseFloat(match[4] ?? '0'),
    };
};

export const boxToString = (value: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}): string => {
    return `((${value.x1},${value.y1}),(${value.x2},${value.y2}))`;
};

export const stringToCircle = (value: string): { x: number; y: number; r: number } => {
    // PostgreSQL returns "<(x,y),r>"
    const match = value.match(/<\(([^,]+),([^)]+)\),([^>]+)>/);
    if (!match) throw new Error(`Invalid circle format: ${value}`);
    
    return {
        x: parseFloat(match[1] ?? '0'),
        y: parseFloat(match[2] ?? '0'),
        r: parseFloat(match[3] ?? '0'),
    };
};

export const circleToString = (value: { x: number; y: number; r: number }): string => {
    return `<(${value.x},${value.y}),${value.r}>`;
};

// ===========================================================
// Range conversions
// ===========================================================

export const stringToInt4Range = (value: string): {
    lower: number;
    upper: number;
    bounds: '[]' | '[)' | '(]' | '()';
} => {
    // PostgreSQL returns "[1,10)" or "(1,10]"
    const lowerBound = value[0] as '[' | '(';
    const upperBound = value[value.length - 1] as ']' | ')';
    const bounds = `${lowerBound}${upperBound}` as '[]' | '[)' | '(]' | '()';
    
    const content = value.slice(1, -1);
    const [lower, upper] = content.split(',').map(v => parseInt(v.trim()));
    
    return { lower: lower ?? 0, upper: upper ?? 0, bounds };
};

export const int4RangeToString = (value: {
    lower: number;
    upper: number;
    bounds?: '[]' | '[)' | '(]' | '()';
}): string => {
    const bounds = value.bounds || '[)';
    const lowerBound = bounds[0];
    const upperBound = bounds[1];
    
    return `${lowerBound}${value.lower},${value.upper}${upperBound}`;
};

export const stringToDateRange = (value: string): {
    lower: Date;
    upper: Date;
    bounds: '[]' | '[)' | '(]' | '()';
} => {
    const lowerBound = value[0] as '[' | '(';
    const upperBound = value[value.length - 1] as ']' | ')';
    const bounds = `${lowerBound}${upperBound}` as '[]' | '[)' | '(]' | '()';
    
    const content = value.slice(1, -1);
    const [lower, upper] = content.split(',').map(v => new Date(v.trim()));
    
    return { lower: lower ?? new Date(), upper: upper ?? new Date(), bounds };
};

export const dateRangeToString = (value: {
    lower: Date;
    upper: Date;
    bounds?: '[]' | '[)' | '(]' | '()';
}): string => {
    const bounds = value.bounds || '[)';
    const lowerBound = bounds[0];
    const upperBound = bounds[1];
    
    return `${lowerBound}${value.lower.toISOString()},${value.upper.toISOString()}${upperBound}`;
};

// ===========================================================
// Bit string conversions
// ===========================================================

export const stringToBit = (value: string): string => {
    return value;
};

export const bitToString = (value: string): string => {
    return value;
};

// ===========================================================
// Text search conversions
// ===========================================================

export const stringToTSVector = (value: string): string => {
    return value;
};

export const tsvectorToString = (value: string): string => {
    return value;
};

export const stringToTSQuery = (value: string): string => {
    return value;
};

export const tsqueryToString = (value: string): string => {
    return value;
};

// ===========================================================
// XML conversions
// ===========================================================

export const stringToXML = (value: string): string => {
    return value;
};

export const xmlToString = (value: string): string => {
    return value;
};

// ===========================================================
// OID conversions
// ===========================================================

export const stringToOID = (value: string): number => {
    return parseInt(value);
};

export const oidToString = (value: number): string => {
    return value.toString();
};

// ===========================================================
// Helper: Auto-convert PostgreSQL result
// ===========================================================

export const convertPgValue = (value: any, type: string): any => {
    if (value === null || value === undefined) return value;
    
    switch (type.toLowerCase()) {
        case 'bigint':
        case 'int8':
            return stringToBigInt(value);
        
        case 'boolean':
        case 'bool':
            return stringToBoolean(value);
        
        case 'bytea':
            return hexToBytea(value);
        
        case 'date':
            return stringToDate(value);
        
        case 'timestamp':
        case 'timestamptz':
            return stringToTimestamp(value);
        
        case 'time':
        case 'timetz':
            return stringToTime(value);
        
        case 'interval':
            return stringToInterval(value);
        
        case 'json':
        case 'jsonb':
            return stringToJSON(value);
        
        case 'uuid':
            return stringToUUID(value);
        
        case 'point':
            return stringToPoint(value);
        
        case 'box':
            return stringToBox(value);
        
        case 'circle':
            return stringToCircle(value);
        
        case 'int4range':
            return stringToInt4Range(value);
        
        case 'daterange':
            return stringToDateRange(value);
        
        default:
            // Arrays
            if (type.startsWith('_')) {
                return stringToArray(value);
            }
            return value;
    }
};

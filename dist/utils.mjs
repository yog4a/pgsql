var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/utils/convert.utils.ts
var byteaToHex = /* @__PURE__ */ __name((bytea) => {
  const hex = Buffer.from(bytea).toString("hex");
  return `0x${hex}`;
}, "byteaToHex");
var hexToBytea = /* @__PURE__ */ __name((hex) => {
  let clean = hex;
  if (/^0x/i.test(clean)) {
    clean = clean.slice(2);
  } else if (/^\\x/i.test(clean)) {
    clean = clean.slice(2);
  }
  return Buffer.from(clean, "hex");
}, "hexToBytea");
var stringToBytea = /* @__PURE__ */ __name((str) => {
  return Buffer.from(str, "utf8");
}, "stringToBytea");
var byteaToString = /* @__PURE__ */ __name((bytea) => {
  return Buffer.from(bytea).toString("utf8");
}, "byteaToString");
var base64ToBytea = /* @__PURE__ */ __name((base64) => {
  return Buffer.from(base64, "base64");
}, "base64ToBytea");
var byteaToBase64 = /* @__PURE__ */ __name((bytea) => {
  return Buffer.from(bytea).toString("base64");
}, "byteaToBase64");
var stringToBigInt = /* @__PURE__ */ __name((value) => {
  return BigInt(value);
}, "stringToBigInt");
var bigIntToString = /* @__PURE__ */ __name((value) => {
  return value.toString();
}, "bigIntToString");
var stringToDecimal = /* @__PURE__ */ __name((value) => {
  return parseFloat(value);
}, "stringToDecimal");
var decimalToString = /* @__PURE__ */ __name((value, precision) => {
  return precision !== void 0 ? value.toFixed(precision) : value.toString();
}, "decimalToString");
var stringToDate = /* @__PURE__ */ __name((value) => {
  return new Date(value);
}, "stringToDate");
var dateToString = /* @__PURE__ */ __name((value) => {
  return value.toISOString();
}, "dateToString");
var stringToTimestamp = /* @__PURE__ */ __name((value) => {
  return new Date(value);
}, "stringToTimestamp");
var timestampToString = /* @__PURE__ */ __name((value) => {
  return value.toISOString();
}, "timestampToString");
var stringToTimestamptz = /* @__PURE__ */ __name((value) => {
  return new Date(value);
}, "stringToTimestamptz");
var timestamptzToString = /* @__PURE__ */ __name((value) => {
  return value.toISOString();
}, "timestamptzToString");
var stringToTime = /* @__PURE__ */ __name((value) => {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return /* @__PURE__ */ new Date(`${today}T${value}Z`);
}, "stringToTime");
var timeToString = /* @__PURE__ */ __name((value) => {
  return value.toISOString().split("T")[1]?.split("Z")[0] ?? "";
}, "timeToString");
var stringToInterval = /* @__PURE__ */ __name((value) => {
  const result = {};
  const yearMatch = value.match(/(\d+)\s+years?/);
  const monthMatch = value.match(/(\d+)\s+mons?/);
  const dayMatch = value.match(/(\d+)\s+days?/);
  const timeMatch = value.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (yearMatch && yearMatch[1]) result.years = parseInt(yearMatch[1]);
  if (monthMatch && monthMatch[1]) result.months = parseInt(monthMatch[1]);
  if (dayMatch && dayMatch[1]) result.days = parseInt(dayMatch[1]);
  if (timeMatch) {
    result.hours = parseInt(timeMatch[1] ?? "0");
    result.minutes = parseInt(timeMatch[2] ?? "0");
    result.seconds = parseFloat(timeMatch[3] ?? "0");
  }
  return result;
}, "stringToInterval");
var intervalToString = /* @__PURE__ */ __name((interval) => {
  const parts = [];
  if (interval.years) parts.push(`${interval.years} years`);
  if (interval.months) parts.push(`${interval.months} mons`);
  if (interval.days) parts.push(`${interval.days} days`);
  const hours = interval.hours || 0;
  const minutes = interval.minutes || 0;
  const seconds = interval.seconds || 0;
  if (hours || minutes || seconds) {
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    const s = seconds.toString().padStart(2, "0");
    parts.push(`${h}:${m}:${s}`);
  }
  return parts.join(" ");
}, "intervalToString");
var stringToBoolean = /* @__PURE__ */ __name((value) => {
  if (typeof value === "boolean") return value;
  return value === "t" || value === "true" || value === "1";
}, "stringToBoolean");
var booleanToString = /* @__PURE__ */ __name((value) => {
  return value ? "t" : "f";
}, "booleanToString");
var stringToJSON = /* @__PURE__ */ __name((value) => {
  return JSON.parse(value);
}, "stringToJSON");
var jsonToString = /* @__PURE__ */ __name((value) => {
  return JSON.stringify(value);
}, "jsonToString");
var stringToJSONB = /* @__PURE__ */ __name((value) => {
  return JSON.parse(value);
}, "stringToJSONB");
var jsonbToString = /* @__PURE__ */ __name((value) => {
  return JSON.stringify(value);
}, "jsonbToString");
var stringToArray = /* @__PURE__ */ __name((value, parser) => {
  const cleaned = value.replace(/^\{|\}$/g, "");
  if (!cleaned) return [];
  const items = cleaned.split(",");
  return parser ? items.map((item) => parser(item.trim())) : items.map((item) => item.trim());
}, "stringToArray");
var arrayToString = /* @__PURE__ */ __name((value) => {
  return `{${value.join(",")}}`;
}, "arrayToString");
var stringToUUID = /* @__PURE__ */ __name((value) => {
  return value.toLowerCase();
}, "stringToUUID");
var uuidToString = /* @__PURE__ */ __name((value) => {
  return value.toLowerCase();
}, "uuidToString");
var stringToCIDR = /* @__PURE__ */ __name((value) => {
  return value;
}, "stringToCIDR");
var cidrToString = /* @__PURE__ */ __name((value) => {
  return value;
}, "cidrToString");
var stringToINET = /* @__PURE__ */ __name((value) => {
  return value;
}, "stringToINET");
var inetToString = /* @__PURE__ */ __name((value) => {
  return value;
}, "inetToString");
var stringToMacAddr = /* @__PURE__ */ __name((value) => {
  return value.toLowerCase();
}, "stringToMacAddr");
var macAddrToString = /* @__PURE__ */ __name((value) => {
  return value.toLowerCase();
}, "macAddrToString");
var stringToPoint = /* @__PURE__ */ __name((value) => {
  const match = value.match(/\(([^,]+),([^)]+)\)/);
  if (!match) throw new Error(`Invalid point format: ${value}`);
  return {
    x: parseFloat(match[1] ?? "0"),
    y: parseFloat(match[2] ?? "0")
  };
}, "stringToPoint");
var pointToString = /* @__PURE__ */ __name((value) => {
  return `(${value.x},${value.y})`;
}, "pointToString");
var stringToBox = /* @__PURE__ */ __name((value) => {
  const match = value.match(/\(\(([^,]+),([^)]+)\),\(([^,]+),([^)]+)\)\)/);
  if (!match) throw new Error(`Invalid box format: ${value}`);
  return {
    x1: parseFloat(match[1] ?? "0"),
    y1: parseFloat(match[2] ?? "0"),
    x2: parseFloat(match[3] ?? "0"),
    y2: parseFloat(match[4] ?? "0")
  };
}, "stringToBox");
var boxToString = /* @__PURE__ */ __name((value) => {
  return `((${value.x1},${value.y1}),(${value.x2},${value.y2}))`;
}, "boxToString");
var stringToCircle = /* @__PURE__ */ __name((value) => {
  const match = value.match(/<\(([^,]+),([^)]+)\),([^>]+)>/);
  if (!match) throw new Error(`Invalid circle format: ${value}`);
  return {
    x: parseFloat(match[1] ?? "0"),
    y: parseFloat(match[2] ?? "0"),
    r: parseFloat(match[3] ?? "0")
  };
}, "stringToCircle");
var circleToString = /* @__PURE__ */ __name((value) => {
  return `<(${value.x},${value.y}),${value.r}>`;
}, "circleToString");
var stringToInt4Range = /* @__PURE__ */ __name((value) => {
  const lowerBound = value[0];
  const upperBound = value[value.length - 1];
  const bounds = `${lowerBound}${upperBound}`;
  const content = value.slice(1, -1);
  const [lower, upper] = content.split(",").map((v) => parseInt(v.trim()));
  return { lower: lower ?? 0, upper: upper ?? 0, bounds };
}, "stringToInt4Range");
var int4RangeToString = /* @__PURE__ */ __name((value) => {
  const bounds = value.bounds || "[)";
  const lowerBound = bounds[0];
  const upperBound = bounds[1];
  return `${lowerBound}${value.lower},${value.upper}${upperBound}`;
}, "int4RangeToString");
var stringToDateRange = /* @__PURE__ */ __name((value) => {
  const lowerBound = value[0];
  const upperBound = value[value.length - 1];
  const bounds = `${lowerBound}${upperBound}`;
  const content = value.slice(1, -1);
  const [lower, upper] = content.split(",").map((v) => new Date(v.trim()));
  return { lower: lower ?? /* @__PURE__ */ new Date(), upper: upper ?? /* @__PURE__ */ new Date(), bounds };
}, "stringToDateRange");
var dateRangeToString = /* @__PURE__ */ __name((value) => {
  const bounds = value.bounds || "[)";
  const lowerBound = bounds[0];
  const upperBound = bounds[1];
  return `${lowerBound}${value.lower.toISOString()},${value.upper.toISOString()}${upperBound}`;
}, "dateRangeToString");
var stringToBit = /* @__PURE__ */ __name((value) => {
  return value;
}, "stringToBit");
var bitToString = /* @__PURE__ */ __name((value) => {
  return value;
}, "bitToString");
var stringToTSVector = /* @__PURE__ */ __name((value) => {
  return value;
}, "stringToTSVector");
var tsvectorToString = /* @__PURE__ */ __name((value) => {
  return value;
}, "tsvectorToString");
var stringToTSQuery = /* @__PURE__ */ __name((value) => {
  return value;
}, "stringToTSQuery");
var tsqueryToString = /* @__PURE__ */ __name((value) => {
  return value;
}, "tsqueryToString");
var stringToXML = /* @__PURE__ */ __name((value) => {
  return value;
}, "stringToXML");
var xmlToString = /* @__PURE__ */ __name((value) => {
  return value;
}, "xmlToString");
var stringToOID = /* @__PURE__ */ __name((value) => {
  return parseInt(value);
}, "stringToOID");
var oidToString = /* @__PURE__ */ __name((value) => {
  return value.toString();
}, "oidToString");
var convertPgValue = /* @__PURE__ */ __name((value, type) => {
  if (value === null || value === void 0) return value;
  switch (type.toLowerCase()) {
    case "bigint":
    case "int8":
      return stringToBigInt(value);
    case "boolean":
    case "bool":
      return stringToBoolean(value);
    case "bytea":
      return hexToBytea(value);
    case "date":
      return stringToDate(value);
    case "timestamp":
    case "timestamptz":
      return stringToTimestamp(value);
    case "time":
    case "timetz":
      return stringToTime(value);
    case "interval":
      return stringToInterval(value);
    case "json":
    case "jsonb":
      return stringToJSON(value);
    case "uuid":
      return stringToUUID(value);
    case "point":
      return stringToPoint(value);
    case "box":
      return stringToBox(value);
    case "circle":
      return stringToCircle(value);
    case "int4range":
      return stringToInt4Range(value);
    case "daterange":
      return stringToDateRange(value);
    default:
      if (type.startsWith("_")) {
        return stringToArray(value);
      }
      return value;
  }
}, "convertPgValue");
export {
  arrayToString,
  base64ToBytea,
  bigIntToString,
  bitToString,
  booleanToString,
  boxToString,
  byteaToBase64,
  byteaToHex,
  byteaToString,
  cidrToString,
  circleToString,
  convertPgValue,
  dateRangeToString,
  dateToString,
  decimalToString,
  hexToBytea,
  inetToString,
  int4RangeToString,
  intervalToString,
  jsonToString,
  jsonbToString,
  macAddrToString,
  oidToString,
  pointToString,
  stringToArray,
  stringToBigInt,
  stringToBit,
  stringToBoolean,
  stringToBox,
  stringToBytea,
  stringToCIDR,
  stringToCircle,
  stringToDate,
  stringToDateRange,
  stringToDecimal,
  stringToINET,
  stringToInt4Range,
  stringToInterval,
  stringToJSON,
  stringToJSONB,
  stringToMacAddr,
  stringToOID,
  stringToPoint,
  stringToTSQuery,
  stringToTSVector,
  stringToTime,
  stringToTimestamp,
  stringToTimestamptz,
  stringToUUID,
  stringToXML,
  timeToString,
  timestampToString,
  timestamptzToString,
  tsqueryToString,
  tsvectorToString,
  uuidToString,
  xmlToString
};

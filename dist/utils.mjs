var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/utils/convert.utils.ts
var byteaToHex = /* @__PURE__ */ __name((bytea) => {
  const hex = Buffer.from(bytea).toString("hex");
  return `0x${hex}`;
}, "byteaToHex");
var hexToBytea = /* @__PURE__ */ __name((hex) => {
  const bytea = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(bytea, "hex");
}, "hexToBytea");
export {
  byteaToHex,
  hexToBytea
};

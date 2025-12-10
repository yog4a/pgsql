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

// src/utils.ts
var utils_exports = {};
__export(utils_exports, {
  byteaToHex: () => byteaToHex,
  hexToBytea: () => hexToBytea
});
module.exports = __toCommonJS(utils_exports);

// src/utils/convert.utils.ts
var byteaToHex = /* @__PURE__ */ __name((bytea) => {
  const hex = Buffer.from(bytea).toString("hex");
  return `0x${hex}`;
}, "byteaToHex");
var hexToBytea = /* @__PURE__ */ __name((hex) => {
  const bytea = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(bytea, "hex");
}, "hexToBytea");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  byteaToHex,
  hexToBytea
});

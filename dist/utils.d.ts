type Hex = `0x${string}`;
type Bytea = Buffer | Uint8Array;
declare const byteaToHex: (bytea: Bytea) => Hex;
declare const hexToBytea: (hex: Hex) => Bytea;

export { type Bytea, type Hex, byteaToHex, hexToBytea };

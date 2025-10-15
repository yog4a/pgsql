export type Hex = `0x${string}`;
export type Bytea = Buffer | Uint8Array;

// Utils
// ===========================================================

export const byteaToHex = (bytea: Bytea): Hex => {
    const hex = Buffer.from(bytea).toString('hex');
    return `0x${hex}`;
};

export const hexToBytea = (hex: Hex): Bytea => {
    const bytea = hex.startsWith('0x') ? hex.slice(2) : hex;
    return Buffer.from(bytea, 'hex');
};

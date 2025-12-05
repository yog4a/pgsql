import { EvmSwaps, EvmSwap } from '../src/packages/pg.js';

// Constants
// ===========================================================

export const dbEvmSwaps = new EvmSwaps({
    debug: true,
    reconnect: true,
    maxAttempts: 2,
    gracePeriodMs: 10_000,
});

dbEvmSwaps.insert({
    "chain_id": 1,
    "block_number": 22718117n,
    "block_timestamp": 1750089407n,
    "transaction_hash": "0xC6AB282024E9883BA191E10B98FC08A09DF4507EFE62557709A15958BD776530",
    "transaction_from": "0xC83B29F780143FCBC44737E6EA9FF43AE39B917C",
    "transaction_to": "0x51C72848C68A965F66FA7A88855F9F7784502A7F",
    "transaction_value": "0",
    "transaction_method": "0x122067ED",
    "transaction_nonce": 35418n,
    "transaction_fee": "0.01",
    "transaction_index": 5,
    "log_index": 12,
    "pool_address": "0x9A772018FBD77FCD2D25657E5C547BAFF3FD7D16",
    "base_address": "0x2260FAC5E5542A773AA44FBCFEDF7C193BC2C599",
    "quote_address": "0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48",
    "base_amount": "0.37439855",
    "quote_amount": "40225.60865",
    "price_usd": 107440.6101465938,
    "swap_type": "SELL"
});


dbEvmSwaps.fetchByTransactionHash(1, "0xC6AB282024E9883BA191E10B98FC08A09DF4507EFE62557709A15958BD776530")
.then((result) => {
    console.log(result);
});
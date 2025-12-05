import { DatabasePool } from '../src/index.js';
import 'dotenv/config';


// Constants
// ===========================================================

const db = new DatabasePool({
    host: process.env['DATABASE_HOST']!,
    database: process.env['DATABASE_NAME']!,
    user: process.env['DATABASE_USER']!,
    password: process.env['DATABASE_PASSWORD']!,
    port: parseInt(process.env['DATABASE_PORT']!),
    max: 10,
}, {
    debug: true,
    reconnect: true,
    maxAttempts: 2,
});

(async function() {
    // Simple query to fetch all data from all relevant tables
    const query = `
        SELECT 1;
    `;

    const result2 = await db.query(query);
    await new Promise(resolve => setTimeout(resolve, 10_000));

    const result3 = await db.query(query);
    await new Promise(resolve => setTimeout(resolve, 10_000));

    const result1 = await db.query("SELECT * FROM test;");

})();
import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/utils.ts',
        'src/packages/pg.ts',
    ],
    format: ['cjs', 'esm'],        // both outputs
    target: 'es2022',              // better for Node 18+
    outDir: 'dist',
    clean: true,
    dts: true,
    sourcemap: false,
    splitting: false,              // keep single-file builds
    keepNames: true,               // preserve names
    external: ['dotenv', 'pg'],    // leave externals
    outExtension({ format }) {
        return {
            js: format === 'cjs' ? '.cjs' : '.mjs'
        }
    },
});

import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},test:{include:['tests/**/*.test.ts'],coverage:{provider:'v8',include:['src/lib/*.ts','src/middleware.ts','src/app/api/**/route.ts'],thresholds:{lines:70,functions:70,branches:70,statements:70}}}});

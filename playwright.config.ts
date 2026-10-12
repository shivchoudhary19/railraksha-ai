import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
import {config} from 'dotenv';
config({path:'.env',quiet:true});
// Failure snapshots can contain TOTP setup keys and email-verification links.
process.env.PLAYWRIGHT_NO_COPY_PROMPT='1';
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({
  testDir:'./tests/e2e',timeout:45000,fullyParallel:false,workers:1,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:process.env.APP_ORIGIN??'http://localhost:3000',
    launchOptions:{...(existsSync(chrome)?{executablePath:chrome}:{})},
    // Auth traces contain sensitive request payloads; never persist them.
    trace:'off',screenshot:'off',video:'off'},
});

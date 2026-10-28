#!/usr/bin/env node
/** Local free Expo development-server entrypoint for the stable dev client. */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const expoCli = require.resolve('expo/bin/cli');
const server = spawn(process.execPath, [
  expoCli, 'start', '--dev-client', '--lan', '--port', '8081',
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    RENDERLAB_ANDROID_DEV_VARIANT: '1',
    EXPO_NO_TELEMETRY: '1',
  },
});
server.on('error', error => {
  console.error('Local Expo development server could not start:', error.message);
  process.exitCode = 1;
});
server.on('exit', (code, signal) => {
  process.exitCode = code === null ? (signal ? 130 : 1) : code;
});

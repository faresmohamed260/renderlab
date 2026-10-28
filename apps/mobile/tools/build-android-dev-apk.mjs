#!/usr/bin/env node
/**
 * Stable SIGNED Android development-client rebuild, entirely on the owner's
 * computer. Requires existing private keystore from the first encrypted
 * recovery artifact. Never generates a new signer or publishes an APK.
 *
 * Run: npm ci && npm run dev:apk
 * macOS/Linux default key: ~/.config/renderlab/android/debug.keystore
 * Windows default key: %APPDATA%/RenderLab/android/debug.keystore
 */
import { existsSync, statSync, copyFileSync, chmodSync, unlinkSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const PACKAGE = 'uk.faresuniform.renderlab.dev';
const homeKey = process.platform === 'win32'
  ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'RenderLab', 'android', 'debug.keystore')
  : join(homedir(), '.config', 'renderlab', 'android', 'debug.keystore');
const signingKey = resolve(process.env.RENDERLAB_DEV_SIGNING_KEYSTORE || homeKey);
const mobileRoot = resolve(import.meta.dirname, '..');
const generatedKey = join(mobileRoot, 'android', 'app', 'debug.keystore');
const variantEnv = {
  ...process.env,
  RENDERLAB_ANDROID_DEV_VARIANT: '1',
  EXPO_NO_TELEMETRY: '1',
};
function run(command, args, env = variantEnv) {
  const result = spawnSync(command, args, { cwd: mobileRoot, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Development APK build command failed');
}
if (!existsSync(signingKey) || !statSync(signingKey).isFile() ||
    statSync(signingKey).size < 900) {
  console.error('Signing key unavailable. Decrypt the owner-held development key backup');
  console.error('to ' + homeKey + ' or set RENDERLAB_DEV_SIGNING_KEYSTORE to its path.');
  process.exit(1);
}
if (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_URL) {
  throw new Error('Production Supabase Auth configuration is prohibited in the development APK');
}
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
run(npx, ['expo', 'prebuild', '--platform', 'android', '--no-install', '--non-interactive']);
// Source key stays outside the repository. The generated native tree is ignored
// by Git; its temporary copy is removed even when compilation fails.
try {
  mkdirSync(dirname(generatedKey), { recursive: true });
  copyFileSync(signingKey, generatedKey);
  if (process.platform !== 'win32') chmodSync(generatedKey, 0o600);
  run('keytool', [
    '-list', '-keystore', generatedKey, '-storepass', 'android',
    '-alias', 'androiddebugkey',
  ]);
  run(process.platform === 'win32' ? join(mobileRoot, 'android', gradle)
    : gradle, [
    ':app:assembleDebug',
    '-PreactNativeArchitectures=arm64-v8a,x86_64',
    '--no-daemon', '--console=plain', '--max-workers=2',
  ], variantEnv);
} finally {
  if (existsSync(generatedKey)) unlinkSync(generatedKey);
}
const apk = join(mobileRoot, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!existsSync(apk)) throw new Error('Gradle reported success but no signed development APK exists');
console.log('Development APK: ' + apk);
console.log('Package: ' + PACKAGE + ' — production login remains hard-disabled.');
console.log('Install: adb install -r "' + apk + '"');
console.log('Run Metro on the same computer: npm run dev:metro');

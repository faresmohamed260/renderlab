import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const config=JSON.parse(source('../app.json')).expo;
const pkg=JSON.parse(source('../package.json'));
const builder=source('../tools/build-local-dev-apk.mjs');
test('stable development-only Android ID has no OTA/EAS configuration',()=>{
  assert.equal(config.android.package,'dev.renderlab.mobile');
  assert.equal(config.scheme,'renderlab-dev');
  assert.equal(config.slug,'renderlab-android-dev');
  assert.equal(config.updates?.url,undefined);
  assert.equal(config.extra?.eas?.projectId,undefined);
});
test('local APK uses reusable private signing, guarded device commands and ignored artifacts',()=>{
  assert.equal(pkg.scripts['build:device'],'node tools/build-local-dev-apk.mjs');
  assert.equal(pkg.scripts['start:device'],'expo start --dev-client --host localhost');
  for(const x of ['debug.keystore','assembleDebug','debug-key-sha256','process.env.CI'])
    assert.ok(builder.includes(x),x);
  for(const x of ['.local-build/','*.apk','*.keystore','*.jks','*.p12'])
    assert.ok(source('../.gitignore').split('\n').includes(x),x);
  assert.doesNotMatch(builder,/upload-artifact|eas build|git add/);
});
test('developer APK cannot turn on native Auth',()=>{
  assert.match(source('../src/services/auth/native-auth-config.ts'),/NATIVE_AUTH_RUNTIME_ENABLED\s*=\s*false\b/);
  assert.match(builder,/NATIVE_AUTH_RUNTIME_ENABLED/);
});

#!/usr/bin/env node
/* Owner-approved LOCAL dev-client APK. No hosted signing, EAS, upload, or real Auth. */
import { existsSync, mkdirSync, readFileSync, copyFileSync, writeFileSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'.local-build');
const key=join(homedir(),'.renderlab','android','renderlab-dev.keystore');
const keyPin=join(out,'debug-key-sha256');
const sdk=process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const win=process.platform==='win32';
function fail(msg){console.error('RenderLab dev build: '+msg);process.exit(1)}
function hash(file){return createHash('sha256').update(readFileSync(file)).digest('hex')}
function exec(command,args,cwd=root){
  const result=spawnSync(command,args,{cwd,stdio:'inherit',shell:win && /\.(cmd|bat)$/i.test(command)});
  if(result.error || result.status!==0)fail('Command failed: '+command+' '+args.join(' '));
}
if(process.env.CI || process.env.GITHUB_ACTIONS)fail('Local owner computer only; no hosted signing');
if(Number(process.versions.node.split('.')[0])!==24)fail('Install Node 24 first');
if(!sdk || !existsSync(sdk))fail('Install Android SDK and set ANDROID_HOME or ANDROID_SDK_ROOT');
if(!process.env.JAVA_HOME || !existsSync(process.env.JAVA_HOME))fail('Install JDK 17 and set JAVA_HOME');
const config=JSON.parse(readFileSync(join(root,'app.json'),'utf8')).expo;
const auth=readFileSync(join(root,'src/services/auth/native-auth-config.ts'),'utf8');
if(config.android?.package!=='dev.renderlab.mobile' || config.scheme!=='renderlab-dev' ||
   config.extra?.eas?.projectId || config.updates?.url ||
   !/NATIVE_AUTH_RUNTIME_ENABLED\s*=\s*false\b/.test(auth))fail('Unsafe Android identity, Auth or update config');
if(process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  fail('Do not provide live Supabase config to this disabled-Auth debug APK');
if(existsSync(keyPin) && (!existsSync(key) || hash(key)!==readFileSync(keyPin,'utf8').trim()))
  fail('Debug signing identity changed; restore original private keystore before upgrading');
exec(win?'npm.cmd':'npm',['ci','--no-audit','--no-fund']);
exec(win?'npx.cmd':'npx',['expo','prebuild','--platform','android','--clean','--no-install','--non-interactive']);
const native=join(root,'android');
const gradle=readFileSync(join(native,'app','build.gradle'),'utf8');
// Expo/React Native templates can sign from android/app/debug.keystore.
// Never trust the template's generated default identity: overwrite it with
// the same privately owned RenderLab key after EVERY clean prebuild.
if(!/storeFile\s+file\(['"]debug\.keystore['"]\)/.test(gradle) ||
   !gradle.includes('signingConfig signingConfigs.debug'))
  fail('Generated Gradle debug signing configuration changed; inspect before signing');
mkdirSync(join(homedir(),'.renderlab','android'),{recursive:true,mode:0o700});
if(!existsSync(key)){
  if(existsSync(keyPin))fail('Original RenderLab signing key is missing; restore the private backup');
  const keytool=join(process.env.JAVA_HOME,'bin',win?'keytool.exe':'keytool');
  exec(keytool,['-genkeypair','-noprompt','-storetype','PKCS12','-keystore',key,
    '-storepass','android','-keypass','android','-alias','androiddebugkey',
    '-dname','CN=RenderLab Development Only, O=RenderLab','-keyalg','RSA',
    '-keysize','3072','-validity','3650']);
  if(!win)chmodSync(key,0o600);
}
copyFileSync(key,join(native,'app','debug.keystore'));
exec(win?'gradlew.bat':'./gradlew',[':app:assembleDebug','--no-daemon','--console=plain'],native);
const built=join(root,'android','app','build','outputs','apk','debug','app-debug.apk');
if(!existsSync(built) || !existsSync(key))fail('Gradle did not produce a signed debug APK and reusable local key');
mkdirSync(out,{recursive:true});
const digest=hash(key);
if(existsSync(keyPin) && readFileSync(keyPin,'utf8').trim()!==digest)fail('Debug keystore changed during build');
const apk=join(out,'renderlab-android-dev-debug.apk');
copyFileSync(built,apk);
writeFileSync(keyPin,digest+'\n',{mode:0o600});
console.log('Development APK: '+apk);
console.log('Install once: adb install -r '+apk);
console.log('USB Metro: adb reverse tcp:8081 tcp:8081');
console.log('Live JS edits: npm run start:device');
console.log('Private reusable debug signing identity remains at '+key);

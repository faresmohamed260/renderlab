import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * SDK58 React Native Android 35 crashes with
 * java.lang.IllegalArgumentException: Invalid accessibility role value: status.
 * Text announcements use accessibilityLiveRegion rather than HTML/ARIA roles.
 */
test('native account and emulator TOTP screen use Android-safe accessible announcements', () => {
  for (const path of [
    'src/features/auth/NativeAuthPanel.tsx',
    'tools/android-m2-totp-qa-screen.tsx',
  ]) {
    const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /accessibilityRole=["']status["']/);
    assert.match(source, /accessibilityLiveRegion="polite"/);
  }
});

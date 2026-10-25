import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApiOrigin, resolveApiUrl, canForwardBearer } from '../src/services/api/url-policy.ts';

test('requires HTTPS outside loopback development', () => {
  assert.equal(validateApiOrigin('https://renderlab.example.test'), 'https://renderlab.example.test');
  assert.equal(validateApiOrigin('http://localhost:8081'), 'http://localhost:8081');
  assert.throws(() => validateApiOrigin('http://renderlab.example.test'));
  assert.throws(() => validateApiOrigin('https://user:pass@renderlab.example.test'));
  assert.throws(() => validateApiOrigin('https://renderlab.example.test/api'));
});

test('API URL cannot redirect URL construction across origins', () => {
  assert.equal(resolveApiUrl('https://renderlab.example.test', '/api/jobs'), 'https://renderlab.example.test/api/jobs');
  assert.throws(() => resolveApiUrl('https://renderlab.example.test', '//evil.example.test/x'));
  assert.throws(() => resolveApiUrl('https://renderlab.example.test', '/\\evil.example.test/x'));
  assert.throws(() => resolveApiUrl('https://renderlab.example.test', 'https://evil.example.test'));
});

test('bearer tokens are forbidden on signed media/CDN origins', () => {
  assert.equal(canForwardBearer('https://renderlab.example.test', 'https://renderlab.example.test/api/owned'), true);
  assert.equal(canForwardBearer('https://renderlab.example.test', 'https://r2.example.test/signed'), false);
  assert.equal(canForwardBearer('https://renderlab.example.test', 'http://renderlab.example.test/api/owned'), false);
  assert.equal(canForwardBearer('https://renderlab.example.test', 'not-a-url'), false);
});

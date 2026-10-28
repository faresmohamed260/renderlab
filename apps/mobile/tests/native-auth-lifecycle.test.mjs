import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeAuthForegroundLifecycle } from '../src/services/auth/native-auth-lifecycle.ts';

function setup(initial = 'background') {
  const events = [];
  const callbacks = new Set();
  const source = {
    currentState: initial,
    addEventListener(name, callback) {
      assert.equal(name, 'change');
      callbacks.add(callback);
      return { remove() { callbacks.delete(callback); } };
    },
  };
  const auth = {
    startAutoRefresh() { events.push('start'); },
    stopAutoRefresh() { events.push('stop'); },
  };
  const controller = createNativeAuthForegroundLifecycle(
    source, auth, () => events.push('invalidate'), () => events.push('failure'),
  );
  return { events, callbacks, controller, change(state) { for (const cb of callbacks) cb(state); } };
}

test('background does not refresh and foreground always requires fresh server admission', () => {
  const { events, controller, change } = setup();
  controller.start();
  assert.deepEqual(events, ['invalidate']);
  change('active');
  assert.deepEqual(events, ['invalidate', 'invalidate', 'start']);
  change('active');
  assert.equal(events.filter(x => x === 'start').length, 1);
  change('inactive');
  assert.deepEqual(events.slice(-2), ['invalidate', 'stop']);
  change('background');
  assert.equal(events.filter(x => x === 'stop').length, 1);
  change('active');
  assert.equal(events.filter(x => x === 'start').length, 2);
  controller.stop();
  assert.deepEqual(events.slice(-2), ['invalidate', 'stop']);
});

test('no duplicate listeners and explicit detach stops automatic refresh', () => {
  const { controller, callbacks, change, events } = setup('active');
  controller.start(); controller.start();
  assert.equal(callbacks.size, 1);
  assert.equal(events.filter(x => x === 'start').length, 1);
  controller.stop(); controller.stop();
  assert.equal(callbacks.size, 0);
  assert.equal(events.filter(x => x === 'stop').length, 1);
  change('active');
  assert.equal(events.filter(x => x === 'start').length, 1);
});

test('refresh exceptions fail closed instead of making an authorized UI', async () => {
  const callbacks = new Set();
  const events = [];
  const src = { currentState: 'active', addEventListener(_event, fn) {
    callbacks.add(fn); return { remove: () => callbacks.delete(fn) };
  } };
  const lifecycle = createNativeAuthForegroundLifecycle(src, {
    startAutoRefresh() { return Promise.reject(Error('synthetic sensitive refresh failure')); },
    stopAutoRefresh() { return Promise.resolve(); },
  }, () => events.push('invalidate'), () => events.push('failure'));
  lifecycle.start();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['invalidate', 'invalidate', 'failure']);
  lifecycle.stop();
});

test('optional foreground admission restore runs only after starting refresh, not in background',async()=>{
  const events=[],callbacks=new Set();
  const source={currentState:'background',addEventListener(_event,fn){
    callbacks.add(fn);return{remove(){callbacks.delete(fn)}};
  }};
  const lifecycle=createNativeAuthForegroundLifecycle(
    source,{startAutoRefresh(){events.push('start');},
      stopAutoRefresh(){events.push('stop');}},
    ()=>events.push('lock'),()=>events.push('failed'),
    ()=>{events.push('restore');},
  );
  lifecycle.start();
  assert.deepEqual(events,['lock']);
  for(const fn of callbacks)fn('active');
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events,['lock','lock','start','restore']);
  for(const fn of callbacks)fn('background');
  assert.deepEqual(events.slice(-2),['lock','stop']);
  lifecycle.stop();
});

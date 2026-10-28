import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeAuthEventBridge } from '../src/services/auth/native-auth-events.ts';

function fixture(initial='authorized') {
  let callback=null, foreground=true, stage=initial;
  const events=[];
  const source={onAuthStateChange(fn){
    events.push('subscribe');
    callback=fn;
    return {data:{subscription:{unsubscribe(){events.push('unsubscribe');callback=null;}}}};
  }};
  const coordinator={
    invalidate(){events.push('invalidate');stage='signed_out';},
    requestRestore(){events.push('restore');},
    getState(){return {stage};},
  };
  const bridge=createNativeAuthEventBridge(source,coordinator,
    ()=>foreground,()=>events.push('clear'));
  return {
    events,bridge,
    emit(event){const fn=callback;if(!fn)throw Error('Not subscribed');fn(event,{access_token:'SYNTHETIC-NOT-LOGGED'});},
    stage(s){stage=s;},
    background(){foreground=false;},
    foreground(){foreground=true;},
  };
}
async function afterMacrotask(){await new Promise(r=>setTimeout(r,8));}

test('refresh or account switch locks private data immediately, rechecks asynchronously',async()=>{
  const f=fixture();
  f.bridge.start();
  f.emit('TOKEN_REFRESHED');
  assert.deepEqual(f.events,['subscribe','invalidate','clear']);
  f.emit('USER_UPDATED'); // deduplicated only one pending revalidation
  await afterMacrotask();
  assert.deepEqual(f.events,['subscribe','invalidate','clear','invalidate','clear','restore']);
  f.bridge.stop();
  assert.equal(f.events.at(-1),'unsubscribe');
});
test('signed-out, recovery and unknown events always lock; never auto-resume',async()=>{
  for(const event of ['SIGNED_OUT','PASSWORD_RECOVERY','SUSPICIOUS_EVENT']){
    const f=fixture();
    f.bridge.start();
    f.emit(event);
    assert.deepEqual(f.events,['subscribe','invalidate','clear']);
    await afterMacrotask();
    assert.equal(f.events.includes('restore'),false);
    f.bridge.stop();
  }
});
test('expected credential and MFA SDK notifications do not interrupt their in-flight state',async()=>{
  const f=fixture('verifying_password');
  f.bridge.start();
  f.emit('SIGNED_IN');
  f.stage('verifying_totp');
  f.emit('MFA_CHALLENGE_VERIFIED');
  await afterMacrotask();
  assert.deepEqual(f.events,['subscribe']);
  f.bridge.stop();
});
test('off-foreground auth refresh revokes immediately without private network revalidation',async()=>{
  const f=fixture();
  f.bridge.start(); f.background();
  f.emit('TOKEN_REFRESHED');
  await afterMacrotask();
  assert.deepEqual(f.events,['subscribe','invalidate','clear']);
  f.bridge.stop();
});
test('unsubscription cancels queued restoration, prevents duplicate subscriptions',async()=>{
  const f=fixture();
  f.bridge.start();f.bridge.start();
  f.emit('SIGNED_IN');
  f.bridge.stop();
  await afterMacrotask();
  assert.equal(f.events.filter(x=>x==='subscribe').length,1);
  assert.equal(f.events.filter(x=>x==='restore').length,0);
});
test('subscription setup throws fail-closed and does not expose SDK failure text',()=>{
  const events=[];
  const bridge=createNativeAuthEventBridge({
    onAuthStateChange(){throw Error('SYNTHETIC-PRIVATE-SETUP-ERROR')}
  }, {
    invalidate(){events.push('lock');},
    requestRestore(){events.push('restore');},
    getState(){return {stage:'authorized'};},
  },()=>true,()=>events.push('clear'));
  assert.throws(()=>bridge.start(),e=>e.message==='Native Auth event observer unavailable');
  assert.deepEqual(events,['lock','clear']);
});

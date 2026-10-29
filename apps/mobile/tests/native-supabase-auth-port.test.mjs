import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeSupabaseAuthPort } from '../src/services/auth/native-supabase-auth-port.ts';
import { NATIVE_SUPABASE_AUTH_STORAGE_KEY as KEY } from '../src/services/auth/native-supabase-storage.ts';

function setup() {
  const calls=[];
  let expiration=Math.floor(Date.now()/1000)+3600;
  let remoteFailure=false, clearFailure=false;
  const fake={
    async signInWithPassword(value) {
      calls.push(['password',value.email]);
      return {data:{user:{id:'user-only'},session:{access_token:'synthetic'}},error:null};
    },
    mfa:{
      async getAuthenticatorAssuranceLevel(){calls.push(['aal']);return {data:{currentLevel:'aal1',nextLevel:'aal2'},error:null}},
      async listFactors(){calls.push(['factors']);return {data:{all:[],totp:[]},error:null}},
      async challengeAndVerify(value){calls.push(['totp',value.factorId]);return {data:{},error:null}},
    },
    async getSession(){calls.push(['session']);return {data:{session:{
      access_token:'synthetic-only',expires_at:expiration,user:{id:'user-only'}}},error:null}},
    async getUser(){calls.push(['getUser']);return {data:{user:{id:'user-only'}},error:null}},
    async signOut(opts){calls.push(['sign-out',opts.scope]);return {
      error:remoteFailure ? new Error('synthetic remote sensitive') : null}},
  };
  const store={async removeItem(key){calls.push(['clear',key]);if(clearFailure)throw Error('synthetic private storage');}};
  return {port:createNativeSupabaseAuthPort(fake,store),calls,
    expire:()=>{expiration=Math.floor(Date.now()/1000)-10;},
    failRemote:()=>{remoteFailure=true;},failClear:()=>{clearFailure=true;},fake};
}

test('delegates existing-user password and verified TOTP without saving or echoing credentials',async()=>{
  const {port,calls}=setup();
  assert.equal(await port.signIn({email:'  synthetic@example.test ',password:'not-real'}),true);
  assert.deepEqual(calls[0],['password','synthetic@example.test']);
  assert.deepEqual(await port.getAssurance(),{currentLevel:'aal1',nextLevel:'aal2'});
  assert.deepEqual(await port.listFactors(),{all:[],totp:[]});
  assert.equal(await port.verifyTotp('22222222-2222-4222-8222-222222222222','123456'),true);
  assert.equal(await port.verifyTotp('factor','12345'),false);
  assert.equal(calls.filter(x=>x[0]==='totp').length,1);
  assert.equal(await port.getAccessToken(),'synthetic-only');
  assert.equal(JSON.stringify(calls).includes('not-real'),false);
  assert.equal(JSON.stringify(calls).includes('123456'),false);
});

test('expired tokens and SDK failures fail closed without surfacing SDK error details',async()=>{
  const ctx=setup();
  ctx.expire();
  assert.equal(await ctx.port.getAccessToken(),null);
  ctx.fake.signInWithPassword=async()=>{throw Error('secret user message')};
  ctx.fake.mfa.listFactors=async()=>{throw Error('secret backend message')};
  ctx.fake.mfa.getAuthenticatorAssuranceLevel=async()=>{throw Error('secret assurance')};
  ctx.fake.mfa.challengeAndVerify=async()=>{throw Error('secret code')};
  assert.equal(await ctx.port.signIn({email:'x@y.z',password:'anything'}),false);
  assert.equal(await ctx.port.listFactors(),null);
  assert.equal(await ctx.port.getAssurance(),null);
  assert.equal(await ctx.port.verifyTotp('factor','123456'),false);
});

test('remote global sign-out and encrypted local clear remain independent, fail closed',async()=>{
  const ctx=setup();
  await ctx.port.signOutRemote();
  await ctx.port.clearProtectedSession();
  assert.ok(ctx.calls.some(x=>x[0]==='sign-out'&&x[1]==='global'));
  assert.ok(ctx.calls.some(x=>x[0]==='clear'&&x[1]===KEY));
  ctx.failRemote();ctx.failClear();
  await assert.rejects(()=>ctx.port.signOutRemote(),e=>
    e.message==='Remote sign-out unconfirmed'&&!/sensitive/.test(e.message));
  await assert.rejects(()=>ctx.port.clearProtectedSession(),e=>
    e.message==='Protected native session unavailable'&&!/private/.test(e.message));
});

test('restoration verifies real SDK user against the persisted session user, never only cached JWT',async()=>{
  const ctx=setup();
  assert.equal(await ctx.port.verifySession(),true);
  ctx.fake.getUser=async()=>({data:{user:{id:'different-user'}},error:null});
  assert.equal(await ctx.port.verifySession(),false);
  ctx.fake.getUser=async()=>{throw Error('private authentication failure')};
  assert.equal(await ctx.port.verifySession(),false);
  ctx.expire();
  assert.equal(await ctx.port.verifySession(),false);
});

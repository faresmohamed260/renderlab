import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeProfileAdmissionProbe, NATIVE_PROFILE_ADMISSION_URL as URL } from '../src/services/auth/native-profile-admission.ts';

function makeReply({status=200, url=URL, redirected=false, body={ok:true,profile:{},policy:{}},
  type='application/json', length=null, textThrows=false}={}) {
  return {
    status, url, redirected,
    headers: {get(k) {
      if (k==='content-type') return type;
      if (k==='content-length') return length;
      return null;
    }},
    async text() { if(textThrows) throw Error('synthetic network error with sensitive data');
      return typeof body === 'string' ? body : JSON.stringify(body); },
  };
}

test('strict GET admission sends a synthetic bearer only to canonical profile URL with no-follow',async () => {
  const calls=[];
  const run=createNativeProfileAdmissionProbe(async (url, init)=>{
    calls.push({url, init});
    return makeReply();
  });
  assert.equal((await run('synthetic-token')).status,200);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,URL);
  assert.equal(calls[0].init.method,'GET');
  assert.equal(calls[0].init.redirect,'error');
  assert.equal(calls[0].init.cache,'no-store');
  assert.equal(calls[0].init.credentials,'omit');
  assert.equal(calls[0].init.headers.Authorization,'Bearer synthetic-token');
  assert.equal(calls[0].init.headers.Accept,'application/json');
});

test('no fetch occurs for malformed bearer, whitespace or oversized payload',async()=>{
  let called=0;
  const probe=createNativeProfileAdmissionProbe(async()=>{called++;return makeReply()});
  for(const token of ['', 'token whitespace', '  token', 'token\nnewline', 'x'.repeat(8193)]) {
    assert.equal(await probe(token),null);
  }
  assert.equal(called,0);
});

test('redirects and off-origin final URLs remain locked even if response is 200',async()=>{
  for(const reply of [
    {status:302}, {status:307}, {url:'https://media.example.test/asset'},
    {url:'https://renderlab.faresuniform.uk/api/account/profile?foo=bar'},
    {redirected:true},
    {status:200,redirected:true,url:'https://media.example.test/asset'},
    {status:201},
  ]) {
    const probe=createNativeProfileAdmissionProbe(async()=>makeReply(reply));
    assert.equal(await probe('synthetic'),null);
  }
});

test('rejects non-JSON content, oversized/malformed bodies and failed fetch',async()=>{
  const invalid=[
    {type:'text/html'}, {length:'16385'}, {length:'bad'}, {body:'not-json'},
    {body:'x'.repeat(16385)}, {textThrows:true},
  ];
  for(const opts of invalid) assert.equal(await createNativeProfileAdmissionProbe(
    async()=>makeReply(opts))('synthetic'),null);
  assert.equal(await createNativeProfileAdmissionProbe(
    async()=>{throw Error('synthetic offline')})('synthetic'),null);
});

test('account policy status is not guessed by transport; existing reducer remains authoritative',async()=>{
  for(const status of [200,401,403,503]){
    const probe=createNativeProfileAdmissionProbe(async()=>makeReply({status}));
    assert.deepEqual((await probe('synthetic')).status,status);
  }
});

// Run: node --test push-server/
import test from 'node:test';
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import worker,{decideMessage,runReminders,b64url} from './worker.js';

// Independent RFC 8291 decryption using node:crypto, standing in for the browser.
function makeBrowser(){
 const ecdh=nodeCrypto.createECDH('prime256v1');ecdh.generateKeys();const auth=nodeCrypto.randomBytes(16);
 return {
  keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:auth.toString('base64url')},
  decrypt(body){
   body=Buffer.from(body);const salt=body.subarray(0,16),rs=body.readUInt32BE(16),idlen=body[20],asPublic=body.subarray(21,21+idlen),cipher=body.subarray(21+idlen);
   assert.equal(rs,4096);
   const shared=ecdh.computeSecret(asPublic),info=Buffer.concat([Buffer.from('WebPush: info\0'),ecdh.getPublicKey(),asPublic]);
   const ikm=Buffer.from(nodeCrypto.hkdfSync('sha256',shared,auth,info,32));
   const cek=Buffer.from(nodeCrypto.hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16)),nonce=Buffer.from(nodeCrypto.hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12));
   const d=nodeCrypto.createDecipheriv('aes-128-gcm',cek,nonce);d.setAuthTag(cipher.subarray(-16));
   const plain=Buffer.concat([d.update(cipher.subarray(0,-16)),d.final()]);assert.equal(plain.at(-1),2);
   return JSON.parse(plain.subarray(0,-1).toString());
  }
 };
}
function makeEnv(){
 const {publicKey,privateKey}=nodeCrypto.generateKeyPairSync('ec',{namedCurve:'P-256'});const jwk=privateKey.export({format:'jwk'});
 const store=new Map();
 return {publicKey,store,env:{
  VAPID_PUBLIC_KEY:Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]).toString('base64url'),VAPID_PRIVATE_KEY:jwk.d,VAPID_SUBJECT:'https://example.test/',ALLOWED_ORIGIN:'https://isseiyama0314.github.io',
  SUBS:{get:async(k,t)=>store.has(k)?(t==='json'?JSON.parse(store.get(k)):store.get(k)):null,put:async(k,v)=>{store.set(k,v);},delete:async k=>{store.delete(k);},list:async({prefix,limit=1000})=>({keys:[...store.keys()].filter(k=>k.startsWith(prefix)).slice(0,limit).map(name=>({name})),list_complete:true})}
 }};
}
const call=(env,path,body,origin='https://isseiyama0314.github.io')=>worker.fetch(new Request('https://push.test'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)}),env);
const at=iso=>new Date(iso);
const base={timeZone:'Asia/Tokyo',time:'20:00',practiced:'2026-10-07',streak:4,sent:{}};

test('first reminder only after the chosen local time, within two hours, once a day',()=>{
 assert.equal(decideMessage(base,at('2026-10-08T10:59:00Z')),null); // 19:59 JST
 const m=decideMessage(base,at('2026-10-08T11:00:00Z'));
 assert.equal(m.kind,'first');assert.equal(m.date,'2026-10-08');assert.match(m.body,/4日連続/);
 assert.equal(decideMessage({...base,sent:{first:'2026-10-08'}},at('2026-10-08T11:15:00Z')),null);
 assert.equal(decideMessage({...base,streak:0},at('2026-10-08T13:00:00Z')),null); // 22:00, past the two-hour window
});
test('no reminder on a day already practiced',()=>{
 assert.equal(decideMessage({...base,practiced:'2026-10-08',streak:5},at('2026-10-08T11:00:00Z')),null);
 assert.equal(decideMessage({...base,practiced:'2026-10-08',streak:5},at('2026-10-08T13:30:00Z')),null);
});
test('last call at 22:00 only while a streak is at risk',()=>{
 const m=decideMessage({...base,sent:{first:'2026-10-08'}},at('2026-10-08T13:00:00Z'));
 assert.equal(m.kind,'last');assert.match(m.body,/4日連続/);
 assert.equal(decideMessage({...base,practiced:'2026-10-05',sent:{first:'2026-10-08'}},at('2026-10-08T13:00:00Z')),null); // streak already broken
 assert.equal(decideMessage({...base,time:'21:30',sent:{first:'2026-10-08'}},at('2026-10-08T13:00:00Z')),null); // reminder too close to 22:00
 assert.equal(decideMessage({...base,sent:{first:'2026-10-08',last:'2026-10-08'}},at('2026-10-08T14:00:00Z')),null);
});
test('a lapsed streak gets the neutral message',()=>{
 assert.doesNotMatch(decideMessage({...base,practiced:'2026-10-01'},at('2026-10-08T11:00:00Z')).body,/日連続/);
});
test('dates follow the subscriber time zone',()=>{
 const ny={...base,timeZone:'America/New_York',time:'08:00',practiced:'2026-10-07'};
 assert.equal(decideMessage(ny,at('2026-10-08T12:00:00Z')).date,'2026-10-08'); // 08:00 EDT
});

test('subscribe, sync, scheduled push (encrypted + VAPID), expiry and unsubscribe',async()=>{
 const {env,store,publicKey}=makeEnv(),browser=makeBrowser();
 const subscription={endpoint:'https://web.push.apple.com/QGuNzK3abc',keys:browser.keys};
 let res=await call(env,'/subscribe',{subscription,timeZone:'Asia/Tokyo',time:'20:00',practiced:'2026-10-07',streak:4});
 assert.equal(res.status,200);const {id}=await res.json();assert.ok(store.has('sub:'+id));

 const sentRequests=[],realFetch=globalThis.fetch;let status=201;
 globalThis.fetch=async(url,init)=>{sentRequests.push({url,init});return new Response('',{status});};
 try{
  assert.equal(await runReminders(env,at('2026-10-08T11:05:00Z')),1);
  const {url,init}=sentRequests[0];assert.equal(url,subscription.endpoint);
  assert.equal(init.headers['Content-Encoding'],'aes128gcm');
  assert.deepEqual(browser.decrypt(init.body),{title:'🎸 FRET QUEST',body:'4日連続を、今日もつなごう。1レッスン5分から。',tag:'fq-first',url:'./#courses'});
  const [,t,k]=/^vapid t=([^,]+), k=(.+)$/.exec(init.headers.Authorization);assert.equal(k,env.VAPID_PUBLIC_KEY);
  const [h,c,s]=t.split('.'),claims=JSON.parse(Buffer.from(c,'base64url'));
  assert.equal(claims.aud,'https://web.push.apple.com');assert.equal(claims.sub,'https://example.test/');
  assert.ok(nodeCrypto.verify('sha256',Buffer.from(h+'.'+c),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(s,'base64url')));
  assert.equal(await runReminders(env,at('2026-10-08T11:20:00Z')),0,'first reminder is not repeated');

  res=await call(env,'/sync',{id,practiced:'2026-10-08',streak:5});assert.equal(res.status,200);
  assert.equal(await runReminders(env,at('2026-10-08T13:00:00Z')),0,'practiced today: no last call');

  status=410;assert.equal(await runReminders(env,at('2026-10-09T11:00:00Z')),0);assert.ok(!store.has('sub:'+id),'gone subscription removed');
 }finally{globalThis.fetch=realFetch;}

 res=await call(env,'/subscribe',{subscription,timeZone:'Asia/Tokyo',time:'07:15'});const again=(await res.json()).id;
 assert.equal((await call(env,'/unsubscribe',{id:again})).status,200);assert.equal(store.size,0);
});

test('rejects bad input, foreign origins and non-push endpoints',async()=>{
 const {env}=makeEnv(),browser=makeBrowser();
 const ok={subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/x',keys:browser.keys},timeZone:'Asia/Tokyo',time:'20:00'};
 assert.equal((await call(env,'/subscribe',ok,'https://evil.example')).status,403);
 assert.equal((await call(env,'/subscribe',{...ok,subscription:{...ok.subscription,endpoint:'https://evil.example/push'}})).status,400);
 assert.equal((await call(env,'/subscribe',{...ok,time:'25:00'})).status,400);
 assert.equal((await call(env,'/subscribe',{...ok,timeZone:'Mars/Base'})).status,400);
 assert.equal((await call(env,'/sync',{id:'x'.repeat(32),practiced:'2026-10-08'})).status,404);
 for(let i=0;i<20;i++)assert.equal((await call(env,'/subscribe',ok)).status,200);
 assert.equal((await call(env,'/subscribe',ok)).status,429);
});

// FRET QUEST reminder server: Cloudflare Worker + KV + Cron Trigger.
// Sends a Web Push only on days the player has not practiced yet.
const SUB_PREFIX='sub:',MAX_SUBSCRIPTIONS=20,FIRST_WINDOW=120,LAST_CALL=22*60;
const PUSH_HOSTS=[/(^|\.)push\.apple\.com$/,/^fcm\.googleapis\.com$/,/(^|\.)push\.services\.mozilla\.com$/,/(^|\.)notify\.windows\.com$/];
const enc=new TextEncoder();

export const b64url={
 encode:bytes=>{let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');},
 decode:str=>{const s=atob(str.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((str.length+3)%4));return Uint8Array.from(s,c=>c.charCodeAt(0));}
};
const concat=(...parts)=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let i=0;for(const p of parts){out.set(p,i);i+=p.length;}return out;};
const hkdf=async(salt,ikm,info,bytes)=>new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']),bytes*8));

// RFC 8291 (Message Encryption for Web Push) with the RFC 8188 aes128gcm content coding.
export async function encryptPayload(keys,plaintext,{salt=crypto.getRandomValues(new Uint8Array(16)),serverKeys}={}){
 const uaPublic=b64url.decode(keys.p256dh),authSecret=b64url.decode(keys.auth);
 const pair=serverKeys||await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const asPublic=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
 const uaKey=await crypto.subtle.importKey('raw',uaPublic,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:uaKey},pair.privateKey,256));
 const ikm=await hkdf(authSecret,shared,concat(enc.encode('WebPush: info\0'),uaPublic,asPublic),32);
 const cek=await hkdf(salt,ikm,enc.encode('Content-Encoding: aes128gcm\0'),16),nonce=await hkdf(salt,ikm,enc.encode('Content-Encoding: nonce\0'),12);
 const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,concat(plaintext,new Uint8Array([2]))));
 return concat(salt,new Uint8Array([0,0,16,0]),new Uint8Array([asPublic.length]),asPublic,cipher);
}

// RFC 8292 VAPID token signed with ES256.
export async function vapidJwt(env,audience,now=Date.now()){
 const pub=b64url.decode(env.VAPID_PUBLIC_KEY);
 const key=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:b64url.encode(pub.slice(1,33)),y:b64url.encode(pub.slice(33,65)),d:env.VAPID_PRIVATE_KEY},{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const part=o=>b64url.encode(enc.encode(JSON.stringify(o)));
 const unsigned=part({typ:'JWT',alg:'ES256'})+'.'+part({aud:audience,exp:Math.floor(now/1000)+12*3600,sub:env.VAPID_SUBJECT});
 return unsigned+'.'+b64url.encode(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(unsigned)));
}

export function localParts(date,timeZone){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));
 return {date:p.year+'-'+p.month+'-'+p.day,minutes:Number(p.hour)*60+Number(p.minute)};
}
const previousDay=d=>{const [y,m,day]=d.split('-').map(Number);return new Date(Date.UTC(y,m-1,day-1)).toISOString().slice(0,10);};
const toMinutes=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};

// Returns the notification to send now, or null. `streak` is the run ending on `practiced`.
export function decideMessage(record,now){
 const {date,minutes}=localParts(now,record.timeZone),sent=record.sent||{};
 if(record.practiced===date)return null;
 const atRisk=record.practiced===previousDay(date)?record.streak||0:0,reminder=toMinutes(record.time);
 if(sent.first!==date&&minutes>=reminder&&minutes<reminder+FIRST_WINDOW)
  return {kind:'first',date,ttl:4*3600,title:'🎸 FRET QUEST',body:atRisk?atRisk+'日連続を、今日もつなごう。1レッスン5分から。':'ギターを手に取ろう。今日の1レッスンは5分から。'};
 if(atRisk&&sent.last!==date&&minutes>=LAST_CALL&&reminder<=LAST_CALL-60)
  return {kind:'last',date,ttl:2*3600,title:'🔥 ストリークが途切れそう',body:atRisk+'日連続の記録が今夜で途切れます。1レッスンだけ弾こう。'};
 return null;
}

export async function sendPush(env,subscription,message){
 const payload=enc.encode(JSON.stringify({title:message.title,body:message.body,tag:'fq-'+message.kind,url:'./#courses'}));
 const jwt=await vapidJwt(env,new URL(subscription.endpoint).origin);
 return fetch(subscription.endpoint,{method:'POST',headers:{TTL:String(message.ttl),Urgency:'normal','Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',Authorization:'vapid t='+jwt+', k='+env.VAPID_PUBLIC_KEY},body:await encryptPayload(subscription.keys,payload)});
}

export async function runReminders(env,now=new Date()){
 let cursor,sent=0;
 do{
  const page=await env.SUBS.list({prefix:SUB_PREFIX,cursor});cursor=page.list_complete?undefined:page.cursor;
  for(const {name} of page.keys){
   const record=await env.SUBS.get(name,'json');if(!record)continue;
   const message=decideMessage(record,now);if(!message)continue;
   try{
    const res=await sendPush(env,record.subscription,message);
    if(res.status===404||res.status===410){await env.SUBS.delete(name);continue;}
    if(res.ok){record.sent={...record.sent,[message.kind]:message.date};await env.SUBS.put(name,JSON.stringify(record));sent++;}
    else console.log('push failed',res.status,await res.text());
   }catch(err){console.log('push error',String(err));}
  }
 }while(cursor);
 return sent;
}

function validSubscription(s){
 try{
  const url=new URL(s.endpoint);
  return url.protocol==='https:'&&PUSH_HOSTS.some(r=>r.test(url.hostname))&&b64url.decode(s.keys.p256dh).length===65&&b64url.decode(s.keys.auth).length===16;
 }catch{return false;}
}
function validTimeZone(tz){try{new Intl.DateTimeFormat('en',{timeZone:tz});return typeof tz==='string';}catch{return false;}}
// Applies client fields onto a record; throws on invalid input.
function applyFields(record,body){
 if(body.time!==undefined){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time))throw Error('time');record.time=body.time;}
 if(body.timeZone!==undefined){if(!validTimeZone(body.timeZone))throw Error('timeZone');record.timeZone=body.timeZone;}
 if(body.practiced!==undefined){if(body.practiced!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(body.practiced))throw Error('practiced');record.practiced=body.practiced;}
 if(body.streak!==undefined){if(!Number.isInteger(body.streak)||body.streak<0||body.streak>100000)throw Error('streak');record.streak=body.streak;}
 if(body.subscription!==undefined){if(!validSubscription(body.subscription))throw Error('subscription');record.subscription={endpoint:body.subscription.endpoint,keys:{p256dh:body.subscription.keys.p256dh,auth:body.subscription.keys.auth}};}
 return record;
}
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{22,64}$/.test(id);

async function handle(request,env){
 const path=new URL(request.url).pathname;
 if(request.method!=='POST')return [405,{error:'method'}];
 let body;try{body=await request.json();}catch{return [400,{error:'json'}];}
 if(!body||typeof body!=='object')return [400,{error:'json'}];
 if(path==='/subscribe'){
  let id=validId(body.id)?body.id:null,record=id&&await env.SUBS.get(SUB_PREFIX+id,'json');
  if(!record){
   const existing=await env.SUBS.list({prefix:SUB_PREFIX,limit:MAX_SUBSCRIPTIONS});
   if(existing.keys.length>=MAX_SUBSCRIPTIONS)return [429,{error:'full'}];
   id=b64url.encode(crypto.getRandomValues(new Uint8Array(24)));record={id,createdAt:new Date().toISOString(),sent:{},practiced:null,streak:0};
  }
  try{applyFields(record,body);}catch(err){return [400,{error:err.message}];}
  if(!record.subscription||!record.time||!record.timeZone)return [400,{error:'missing'}];
  await env.SUBS.put(SUB_PREFIX+id,JSON.stringify(record));return [200,{id}];
 }
 if(path==='/sync'||path==='/unsubscribe'){
  if(!validId(body.id))return [400,{error:'id'}];
  const record=await env.SUBS.get(SUB_PREFIX+body.id,'json');if(!record)return [404,{error:'unknown'}];
  if(path==='/unsubscribe'){await env.SUBS.delete(SUB_PREFIX+body.id);return [200,{ok:true}];}
  try{applyFields(record,{time:body.time,timeZone:body.timeZone,practiced:body.practiced,streak:body.streak});}catch(err){return [400,{error:err.message}];}
  await env.SUBS.put(SUB_PREFIX+body.id,JSON.stringify(record));return [200,{ok:true}];
 }
 return [404,{error:'route'}];
}

export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGIN||'').split(',').map(s=>s.trim()).filter(Boolean);
  const cors={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0]||'null','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400',Vary:'Origin'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(origin&&!allowed.includes(origin))return new Response('{"error":"origin"}',{status:403,headers:{...cors,'Content-Type':'application/json'}});
  const [status,json]=await handle(request,env);
  return new Response(JSON.stringify(json),{status,headers:{...cors,'Content-Type':'application/json'}});
 },
 async scheduled(event,env,ctx){ctx.waitUntil(runReminders(env,new Date(event.scheduledTime)));}
};

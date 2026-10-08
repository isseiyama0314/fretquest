(()=>{'use strict';
// Fill both after deploying push-server/ (see push-server/README.md). Empty = calendar reminder only.
const PUSH_SERVER='';
const VAPID_PUBLIC_KEY='';
const F=window.FretQuest,KEY='fretQuestPush';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||null}catch{return null}},store=v=>{try{v?localStorage.setItem(KEY,JSON.stringify(v)):localStorage.removeItem(KEY)}catch{}};
const decode=s=>{const b=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4));return Uint8Array.from(b,c=>c.charCodeAt(0))};
const post=async(path,body)=>{const res=await fetch(PUSH_SERVER.replace(/\/$/,'')+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const json=await res.json().catch(()=>({}));if(!res.ok)throw Object.assign(Error(json.error||'HTTP '+res.status),{status:res.status});return json};
const hasPractice=r=>!!(r?.quests?.length||r?.lessons?.length);
const shift=(date,n)=>{const [y,m,d]=date.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10)};
// Last practiced local date and the consecutive-day run ending on it.
function practice(){const h=F.getState().history||{},dates=Object.keys(h).filter(d=>hasPractice(h[d])).sort(),last=dates.at(-1)||null;let streak=0;if(last)for(let d=last;hasPractice(h[d]);d=shift(d,-1))streak++;return {practiced:last,streak}}
const timeZone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone;
const supported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const iOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
async function subscription(){const reg=await navigator.serviceWorker.ready;return await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(VAPID_PUBLIC_KEY)})}
async function register(time){const sub=(await subscription()).toJSON(),saved=load(),p=practice(),{id}=await post('/subscribe',{id:saved?.id,subscription:sub,timeZone:timeZone(),time,...p});store({id,time,endpoint:sub.endpoint,timeZone:timeZone(),...p});return time}
let syncing=null;
// Pushes practice/time-zone changes to the server; failures retry on the next change, launch or reconnect.
function sync(){if(!PUSH_SERVER||!supported())return Promise.resolve();if(syncing)return syncing;syncing=(async()=>{try{const saved=load();if(!saved)return;
 if(Notification.permission!=='granted'){store(null);return}
 const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
 if(!sub||sub.endpoint!==saved.endpoint){await register(saved.time);return}
 const p=practice(),tz=timeZone();
 if(p.practiced!==saved.practiced||p.streak!==saved.streak||tz!==saved.timeZone){await post('/sync',{id:saved.id,timeZone:tz,...p});store({...saved,timeZone:tz,...p})}
 if(p.practiced===F.today())(await reg.getNotifications()).forEach(n=>n.close());
}catch(err){if(err.status===404){const saved=load();store(null);if(saved)await register(saved.time).catch(()=>store(saved))}}})().finally(()=>{syncing=null});return syncing}
window.FQPush={
 configured:()=>!!(PUSH_SERVER&&VAPID_PUBLIC_KEY),
 // 'ready' | 'unsupported' | 'install' (iOS needs the home-screen app) | 'denied'
 availability:()=>!supported()?(iOS()&&!standalone()?'install':'unsupported'):Notification.permission==='denied'?'denied':'ready',
 current:()=>load()?.time||null,
 async enable(time){if(await Notification.requestPermission()!=='granted')throw Error('denied');return register(time)},
 async disable(){const saved=load();store(null);try{const sub=await (await navigator.serviceWorker.ready).pushManager.getSubscription();await sub?.unsubscribe()}catch{}if(saved)await post('/unsubscribe',{id:saved.id}).catch(()=>{})}
};
window.addEventListener('fq:progress',sync);window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});sync();
})();

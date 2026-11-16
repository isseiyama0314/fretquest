/* Scope is /fretquest/ only. Never cache audio, account data or other sites. */
const VERSION='fq-academy-20261117-rehearsal';
const FILES=['./rpm.js?v=20261117-rehearsal','./rpm.css?v=20261117-rehearsal','./','./index.html','./style.css?v=20261117-rehearsal','./academy.css?v=20261117-rehearsal','./instrument.js?v=20261117-rehearsal','./lessons.js?v=20261117-rehearsal','./pitch.js?v=20261117-rehearsal','./app.js?v=20261117-rehearsal','./stage.css?v=20261117-rehearsal','./stage.js?v=20261117-rehearsal','./home.css?v=20261117-rehearsal','./jam.css?v=20261117-rehearsal','./theme.css?v=20261117-rehearsal','./tools.js?v=20261117-rehearsal','./jam.js?v=20261117-rehearsal','./games.js?v=20261117-rehearsal','./air.js?v=20261117-rehearsal','./licks.js?v=20261117-rehearsal','./train.js?v=20261117-rehearsal','./drills.js?v=20261117-rehearsal','./academy.js?v=20261117-rehearsal','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
/* A new version takes over right away instead of waiting for every open tab to close.
   Files are fetched with cache:'reload' so the offline copy never comes from a stale HTTP cache. */
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fq-academy-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate'){
  /* Pages are always revalidated with the server, so a deploy shows up on the next open. */
  event.respondWith(fetch(event.request.url,{cache:'no-cache',credentials:'same-origin'}).catch(async()=>await caches.match('./index.html')||await caches.match('./')));return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});

/* Scope is /fretquest/ only. Never cache audio, account data or other sites. */
const VERSION='fq-academy-20261106-miccheck';
const FILES=['./','./index.html','./style.css?v=20261106-miccheck','./academy.css?v=20261106-miccheck','./instrument.js?v=20261106-miccheck','./lessons.js?v=20261106-miccheck','./pitch.js?v=20261106-miccheck','./app.js?v=20261106-miccheck','./stage.css?v=20261106-miccheck','./stage.js?v=20261106-miccheck','./home.css?v=20261106-miccheck','./jam.css?v=20261106-miccheck','./theme.css?v=20261106-miccheck','./tools.js?v=20261106-miccheck','./jam.js?v=20261106-miccheck','./games.js?v=20261106-miccheck','./air.js?v=20261106-miccheck','./licks.js?v=20261106-miccheck','./train.js?v=20261106-miccheck','./drills.js?v=20261106-miccheck','./academy.js?v=20261106-miccheck','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
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

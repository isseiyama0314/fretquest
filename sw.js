/* Scope is /fret-quest/ only. Never cache audio, account data or other sites. */
const VERSION='fq-academy-20261009-1';
const FILES=['./','./index.html','./style.css?v=20261009-academy1','./academy.css?v=20261009-academy1','./lessons.js?v=20261009-academy1','./pitch.js?v=20261009-academy1','./app.js?v=20261009-academy1','./academy.js?v=20261009-academy1','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fq-academy-')&&k!==VERSION).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(async()=>await caches.match('./index.html')||await caches.match('./')));return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});

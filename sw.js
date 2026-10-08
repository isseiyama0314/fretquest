/* Scope is /fretquest/ only. Never cache audio, account data or other sites. */
const VERSION='fq-academy-20261010-2';
const FILES=['./','./index.html','./style.css?v=20261010-push','./academy.css?v=20261010-push','./lessons.js?v=20261010-push','./pitch.js?v=20261010-push','./app.js?v=20261010-push','./academy.js?v=20261010-push','./push.js?v=20261010-push','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
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
self.addEventListener('push',event=>{let d={};try{d=event.data?event.data.json():{}}catch{}
 event.waitUntil(self.registration.showNotification(d.title||'🎸 FRET QUEST',{body:d.body||'今日も1レッスン、ギターを弾こう。',icon:'./icons/icon-192.png',tag:d.tag||'fq-reminder',data:{url:d.url||'./#courses'}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=new URL(event.notification.data?.url||'./#courses',self.registration.scope).href;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{const open=list.find(c=>c.url.startsWith(self.registration.scope));return open?open.focus():clients.openWindow(url);}));});

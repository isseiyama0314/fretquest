/* Browser checks for Today's menu and unified records (XP, streak, bonus, export/import).
   Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
await p.goto(BASE,{waitUntil:'networkidle'});
const state=()=>p.evaluate(()=>{const s=window.FretQuest.getState(),d=s.history[window.FretQuest.today()]||{};return {xp:s.xp,extra:d.extra||[],lessons:d.lessons||[],bonus:!!d.bonus,streak:document.querySelector('#streak-value').textContent,menu:document.querySelector('#menu-count').textContent,daily:document.querySelector('#daily-start').textContent.trim()};});
let s=await state();
check('fresh menu',s.menu==='0 / 3'&&s.daily.startsWith('今日のメニュー（0 / 3）')&&s.xp===0,JSON.stringify(s));
if(OUT){await p.evaluate(()=>document.querySelector('#today').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:OUT+'/menu.png'});}

// Session from the menu, backing only, one chorus.
await p.click('#menu-grid [data-menu="1"]');await p.click('[data-ch="1"]');await p.click('[data-mic="0"]');await p.click('#jam-start');
await p.waitForSelector('.stage-result',{timeout:120000});
const jamXp=await p.$eval('.stage-result',e=>e.querySelector('.success-xp')?.textContent||'');await p.click('#jam-back');
s=await state();check('session counted',jamXp==='+20 XP'&&s.extra.some(x=>x.startsWith('jam:'))&&s.xp===20&&s.streak==='1'&&s.menu==='1 / 3',jamXp+' '+JSON.stringify(s));

// Rhythm game from the menu in tap mode with no taps: three misses end it.
await p.click('#menu-grid [data-menu="2"]');await p.click('[data-in="tap"]');await p.click('#game-start');
await p.waitForSelector('.stage-result',{timeout:180000});
const gameXp=await p.$eval('.stage-result',e=>e.querySelector('.success-xp')?.textContent||'');await p.click('#g-close');
s=await state();check('game counted',gameXp==='+20 XP'&&s.xp===40&&s.menu==='2 / 3',gameXp+' '+JSON.stringify(s));

// A lesson clear completes the menu: 40 for the lesson + 40 bonus.
const earned=await p.evaluate(()=>window.FretQuest.recordLesson('first-1',100,'quiz'));
s=await state();check('menu bonus',earned===80&&s.bonus&&s.xp===120&&s.menu==='3 / 3'&&s.daily.includes('完走'),earned+' '+JSON.stringify(s));
// Replaying the same session the same day gives no extra XP.
const again=await p.evaluate(()=>window.FretQuest.recordActivity(window.FretQuest.getState().history[window.FretQuest.today()].extra.find(x=>x.startsWith('jam:'))));
check('no duplicate XP',again===0,again);

// Export, wipe, import: XP, activities, bonus and best scores come back.
const backup=await p.evaluate(()=>{const g=JSON.parse(localStorage.getItem('fretQuestGames')||'{}');g.best={...(g.best||{}),survival:95};localStorage.setItem('fretQuestGames',JSON.stringify(g));return window.FretQuest.exportState();});
await p.evaluate(()=>{localStorage.clear();});await p.reload({waitUntil:'networkidle'});
await p.evaluate(b=>window.FretQuest.importState(b),backup);
s=await state();const best=await p.evaluate(()=>JSON.parse(localStorage.getItem('fretQuestGames')).best.survival);
check('import round trip',s.xp===120&&s.bonus&&s.extra.length===2&&best===95&&s.menu==='3 / 3',JSON.stringify(s)+' best '+best);
if(OUT){await p.evaluate(()=>document.querySelector('#today').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:OUT+'/menu-done.png'});}
// Importing the same backup twice must not add XP.
await p.evaluate(b=>window.FretQuest.importState(b),backup);s=await state();check('re-import keeps XP',s.xp===120,s.xp);
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

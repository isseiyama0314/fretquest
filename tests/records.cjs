/* Browser checks for Today's menu and unified records (XP, streak, bonus, export/import).
   Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
/* A silent microphone, so a pitch-judged drill picked by the menu still runs to its end. */
await p.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>window.FretQuest.audioContext().createMediaStreamDestination().stream;});
await p.goto(BASE,{waitUntil:'networkidle'});
const state=()=>p.evaluate(()=>{const s=window.FretQuest.getState(),d=s.history[window.FretQuest.today()]||{};return {xp:s.xp,extra:d.extra||[],lessons:d.lessons||[],bonus:!!d.bonus,full:d.full,streak:document.querySelector('#streak-value').textContent,menu:document.querySelector('#menu-count').textContent,daily:document.querySelector('#daily-start').textContent.trim()};});
let s=await state();
check('fresh menu: the goal is one item',s.menu==='0 / 1'&&s.daily.startsWith('今日の練習を始める')&&s.xp===0,JSON.stringify(s));
if(OUT){await p.evaluate(()=>document.querySelector('#today').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:OUT+'/menu.png'});}

// Session from the menu, backing only, one chorus: 20 for the session + 20 for reaching today's goal.
await p.click('#menu-grid [data-menu="1"]');await p.click('[data-ch="1"]');await p.click('[data-mic="0"]');await p.click('#jam-start');
await p.waitForSelector('.stage-result',{timeout:120000});
const jamXp=await p.$eval('.stage-result',e=>e.querySelector('.success-xp')?.textContent||'');await p.click('#jam-back');
s=await state();check('one item reaches the goal',jamXp==='+40 XP'&&s.extra.some(x=>x.startsWith('jam:'))&&s.xp===40&&s.bonus&&s.full===false&&s.streak==='1'&&s.menu==='達成'&&s.daily.startsWith('もう1つやる'),jamXp+' '+JSON.stringify(s));

// Game from the menu with no input: a rhythm game in tap mode ends after three misses, a drill runs out its time.
await p.click('#menu-grid [data-menu="2"]');const drill=!(await p.$('[data-in="tap"]'));
if(drill)await p.click('#drill-start');else{await p.click('[data-in="tap"]');await p.click('#game-start');}
await p.waitForSelector('.stage-result',{timeout:180000});
const gameXp=await p.$eval('.stage-result',e=>e.querySelector('.success-xp')?.textContent||'');await p.click(drill?'#d-close':'#g-close');
s=await state();check('optional game counted'+(drill?' (drill)':''),gameXp==='+20 XP'&&s.xp===60&&s.menu==='達成 +1',gameXp+' '+JSON.stringify(s));

// A lesson clear completes the full course: 40 for the lesson + 20.
const earned=await p.evaluate(()=>window.FretQuest.recordLesson('first-1',100,'quiz'));
s=await state();check('full course',earned===60&&s.full===true&&s.xp===120&&s.menu==='達成 +2'&&s.daily.includes('フルコース'),earned+' '+JSON.stringify(s));
// Replaying the same session the same day gives no extra XP.
const again=await p.evaluate(()=>window.FretQuest.recordActivity(window.FretQuest.getState().history[window.FretQuest.today()].extra.find(x=>x.startsWith('jam:'))));
check('no duplicate XP',again===0,again);

// Export, wipe, import: XP, activities, bonus and best scores come back.
const backup=await p.evaluate(()=>{const g=JSON.parse(localStorage.getItem('fretQuestGames')||'{}');g.best={...(g.best||{}),survival:95};localStorage.setItem('fretQuestGames',JSON.stringify(g));return window.FretQuest.exportState();});
await p.evaluate(()=>{localStorage.clear();});await p.reload({waitUntil:'networkidle'});
await p.evaluate(b=>window.FretQuest.importState(b),backup);
s=await state();const best=await p.evaluate(()=>JSON.parse(localStorage.getItem('fretQuestGames')).best.survival);
check('import round trip',s.xp===120&&s.bonus&&s.full===true&&s.extra.length===2&&best===95&&s.menu==='達成 +2',JSON.stringify(s)+' best '+best);
if(OUT){await p.evaluate(()=>document.querySelector('#today').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:OUT+'/menu-done.png'});}
// A record from before the two-step bonus (bonus without full, worth 40) keeps its XP and counts as a full course.
{const legacy=await p.evaluate(b=>{const o=typeof b==='string'?JSON.parse(b):JSON.parse(JSON.stringify(b)),st=o.state||o;for(const d of Object.values(st.history))delete d.full;localStorage.clear();return typeof b==='string'?JSON.stringify(o):o;},backup);
 await p.reload({waitUntil:'networkidle'});await p.evaluate(b=>window.FretQuest.importState(b),legacy);
 const l=await state(),badge=await p.evaluate(()=>[...document.querySelectorAll('#badges .badge.unlocked')].some(b=>b.textContent.includes('メニュー完走')));
 check('legacy full day keeps its XP',l.xp===120&&l.bonus&&l.menu==='達成 +2'&&badge,JSON.stringify(l)+' badge '+badge);}
// Importing the same backup twice must not add XP.
await p.evaluate(b=>window.FretQuest.importState(b),backup);s=await state();check('re-import keeps XP',s.xp===120,s.xp);
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

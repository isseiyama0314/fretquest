/* Browser checks for skipping ahead: unlock without a test, the skip challenge (pass and fail), experienced mode.
   Usage is the same as stage-playthrough.cjs. Uses tap mode so no microphone is needed. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/';
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
await p.goto(BASE+'#courses',{waitUntil:'networkidle'});
await p.evaluate(()=>window.FretQuest.ensureAudio());await p.waitForTimeout(500);
const states=course=>p.$$eval('#course-detail .course-lesson',els=>els.map(e=>e.className.replace('course-lesson ','')));
const st=()=>p.evaluate(()=>{const s=window.FretQuest.getState();return {xp:s.xp,cleared:Object.keys(s.courses||{}),unlocked:s.unlocked,exp:s.experienced};});

await p.click('[data-course="riffs"]');
check('locked by default',(await states()).filter(x=>x==='locked').length===5,(await states()).join(','));
await p.click('#skip-unlock');await p.waitForTimeout(200);
let s=await st();const after=await states();
check('unlock without test',after.every(x=>x==='available')&&s.xp===0&&s.cleared.length===0&&s.unlocked.includes('riffs')&&!(await p.$('#skip-challenge')),after.join(',')+' '+JSON.stringify(s));

async function challenge(course,taps){
 await p.click(`[data-course="${course}"]`);await p.click('#skip-challenge');await p.click('#lesson-begin');await p.waitForSelector('#stage-start');
 await p.click('[data-input="tap"]');await p.click('[data-speed="1"]');await p.click('#stage-start');await p.waitForSelector('#stage-pad');
 const l=await p.evaluate(c=>{const x=window.FQCourses.find(k=>k.id===c);return x.lessons[x.lessons.length-1];},course),spb=60/l.exercise.bpm;
 if(taps){const start=Date.now(),times=(l.exercise.notes||l.exercise.strums).map(n=>(.35+4*spb+n.beat*spb)*1000);
  for(const t of times){const w=t-(Date.now()-start);if(w>0)await p.waitForTimeout(w);await p.locator('#stage-pad').dispatchEvent('pointerdown');}}
 await p.waitForSelector('.stage-result',{timeout:120000});const score=await p.$eval('.result-score strong',e=>e.textContent);
 await p.click('#stage-back');await p.waitForTimeout(300);return score;
}
let score=await challenge('stage',false);s=await st();
check('failed challenge keeps course locked',!s.unlocked.includes('stage')&&score==='0',score+' '+JSON.stringify(s));
score=await challenge('stage',true);s=await st();await p.click('[data-course="stage"]');const st2=await states();
check('passed challenge opens course',s.unlocked.includes('stage')&&st2.every(x=>x!=='locked')&&Number(score)>=60,score+' '+st2.join(',')+' '+JSON.stringify(s));

await p.click('#experienced');await p.waitForTimeout(200);await p.click('[data-course="fretboard"]');await p.waitForTimeout(200);
s=await st();const hero=await p.$eval('#hero-course',e=>e.textContent),st3=await states();
check('experienced mode',s.exp&&st3.every(x=>x!=='locked')&&hero.startsWith('指板'),hero+' '+st3.join(','));
const backup=await p.evaluate(()=>window.FretQuest.exportState());await p.evaluate(()=>localStorage.clear());await p.reload({waitUntil:'networkidle'});
await p.evaluate(b=>window.FretQuest.importState(b),backup);s=await st();
check('import keeps skips',s.exp&&s.unlocked.includes('riffs')&&s.unlocked.includes('stage'),JSON.stringify(s));
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

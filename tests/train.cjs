/* Browser checks for off-guitar training: every mode runs, a perfect Lv1 run opens Lv2, a poor run does not,
   wrong rhythm answers enter the rhythm book, and XP is counted. Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
await p.goto(BASE,{waitUntil:'networkidle'});
check('cards',(await p.$$eval('#train-cards [data-train]',e=>e.length))===9,'9 modes');
/* Answers the open question correctly (right=true) or wrongly. */
async function answer(right){
 const q=await p.evaluate(()=>{const q=window.FQTrain.current();return {choices:q.choices,answer:q.answer,multi:q.multi,frets:q.answerFrets,melody:q.melody};});
 if(q.melody){for(const [k,m] of q.melody.slice(1).entries()){const want=right?m:m+1;await p.locator(`[data-midi="${want}"]`).first().click();}}
 else if(q.frets){const f=right?q.frets[0]:[...Array(13).keys()].find(x=>!q.frets.includes(x));await p.click(`[data-fret="${f}"]`);}
 else if(q.multi){for(let k=0;k<q.multi;k++){const c=right?q.answer[k]:q.choices.find(x=>x!==q.answer[k]);await p.click(`[data-choice="${q.choices.indexOf(c)}"]`);}}
 else{const c=right?q.answer:q.choices.find(x=>x!==q.answer);await p.click(`[data-choice="${q.choices.indexOf(c)}"]`);}
 await p.click('#train-next');
}
async function play(id,right,shot){
 await p.click(`[data-train="${id}"]`);await p.click('#train-start');
 for(let i=0;i<5;i++){await p.waitForSelector('#train-feedback');if(shot&&i===1)await p.screenshot({path:OUT+'/train-'+id+'.png'});await answer(right(i));}
 await p.waitForSelector('.stage-result');const r=await p.evaluate(()=>({title:document.querySelector('#modal-title').textContent,score:document.querySelector('.result-score strong').textContent}));
 if(shot)await p.screenshot({path:OUT+'/train-result.png'});
 await p.click('#train-close');await p.waitForTimeout(200);return r;
}
for(const id of ['melody','interval','chord','prog','meter','timing','fret','theory']){const r=await play(id,()=>true,OUT&&(id==='melody'||id==='timing'));check(id+' perfect run opens Lv2',r.title==='Lv2 解放！'&&r.score==='5',JSON.stringify(r));}
const before=await p.evaluate(()=>window.FQStage.kit.rhythmBook.weak().length);
const r=await play('rhythm',i=>i<2,OUT);const after=await p.evaluate(()=>window.FQStage.kit.rhythmBook.weak().length);
const lv=await p.evaluate(()=>JSON.parse(localStorage.getItem('fretQuestTrain')).rhythm.unlocked);
check('poor rhythm run stays at Lv1 and fills the rhythm book',r.title==='あと少し！'&&lv===1&&after>before,JSON.stringify(r)+' book '+before+'→'+after);
const st=await p.evaluate(()=>{const s=window.FretQuest.getState(),d=s.history[window.FretQuest.today()];return {xp:s.xp,extra:d.extra,menu:document.querySelector('#menu-count').textContent};});
check('xp and daily menu',st.xp===180&&st.extra.length===9&&st.menu==='1 / 3',JSON.stringify(st));
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

/* Browser checks for off-guitar training: every mode runs, a passing run counts toward the next level and the third opens it, a poor run does not,
   wrong rhythm answers enter the rhythm book, and XP is counted. Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
await p.goto(BASE,{waitUntil:'networkidle'});
check('cards',(await p.$$eval('#train-cards [data-train]',e=>e.length))===10,'10 modes');
/* Answers the open question correctly (right=true) or wrongly. */
async function answer(right){
 const q=await p.evaluate(()=>{const q=window.FQTrain.current();return {choices:q.choices,answer:q.answer,multi:q.multi,frets:q.answerFrets,melody:q.melody};});
 /* A right answer first taps the given note on another string, which must not use up a slot. */
 if(q.melody){if(right)await p.locator(`[data-midi="${q.melody[0]}"]`).last().click();for(const [k,m] of q.melody.slice(1).entries()){const want=right?m:m+1;await p.locator(`[data-midi="${want}"]`).first().click();}}
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
/* One passing run counts 1 of 3; the third opens the next level. */
for(const id of ['melody','interval','chord','prog','modulate','meter','timing','fret','theory']){const r=await play(id,()=>true,OUT&&(id==='melody'||id==='timing'));check(id+' perfect run counts 1 of 3',r.title==='クリア 1 / 3'&&r.score==='5',JSON.stringify(r));}
{const r2=await play('theory',()=>true),r3=await play('theory',()=>true),lv=await p.evaluate(()=>JSON.parse(localStorage.getItem('fretQuestTrain')).theory.unlocked);
 check('third passing run opens Lv2',r2.title==='クリア 2 / 3'&&r3.title==='Lv2 解放！'&&lv===2,JSON.stringify([r2,r3,lv]));}
{const opened=await p.evaluate(()=>{const all=JSON.parse(localStorage.getItem('fretQuestTrain'));all.chord={unlocked:3,best:{1:5,2:4}};localStorage.setItem('fretQuestTrain',JSON.stringify(all));window.FQTrain.lobby('chord');return [...document.querySelectorAll('[data-lv]')].map(b=>b.disabled?'x':'o').join('');});
 check('levels unlocked before the change stay open',opened==='oooxx',opened);await p.evaluate(()=>window.FretQuest.close());}
const before=await p.evaluate(()=>window.FQStage.kit.rhythmBook.weak().length);
const r=await play('rhythm',i=>i<2,OUT);const after=await p.evaluate(()=>window.FQStage.kit.rhythmBook.weak().length);
const lv=await p.evaluate(()=>JSON.parse(localStorage.getItem('fretQuestTrain')).rhythm.unlocked);
check('poor rhythm run stays at Lv1 and fills the rhythm book',r.title==='あと少し！'&&lv===1&&after>before,JSON.stringify(r)+' book '+before+'→'+after);
/* Modulation: a wrong answer shows the review with both keys' tonics to compare; every level builds a question. */
{const r=await p.evaluate(async()=>{const out=[];for(let lv=1;lv<=5;lv++){const q=window.FQTrain.modes.modulate.make(lv);out.push(q.choices.includes(q.answer)&&q.choices.length>=4);}return out;});
 await p.evaluate(()=>window.FQTrain.run('modulate',4));await p.waitForSelector('[data-choice]');
 const q=await p.evaluate(()=>({c:window.FQTrain.current().choices,a:window.FQTrain.current().answer}));const wrong=q.c.findIndex(x=>x!==q.a);
 await p.click(`[data-choice="${wrong}"]`);const rv=await p.evaluate(()=>({tonic:!!document.querySelector('[data-iv="tonic"]'),text:document.querySelector('.interval-review p')?.innerText||''}));
 if(OUT)await p.screenshot({path:OUT+'/train-modulate.png'});
 check('modulation levels and review',r.every(Boolean)&&rv.tonic&&rv.text.length>0,JSON.stringify({r,rv,a:q.a,picked:q.c[wrong]}));
 await p.evaluate(()=>window.FretQuest.close());}
/* Weak spots: answered items are logged (rhythm stays in the rhythm book), melody slots carry their steps and undos, replays are counted. */
{const log=await p.evaluate(()=>window.FQTrain.log());const by=m=>log.filter(r=>r.m===m);
 check('every answer is logged per item',by('melody').length===2*5&&by('melody').every(r=>/度[上下]$/.test(r.it))&&by('prog').length===3*5&&by('interval').length===5&&!by('rhythm').length&&by('timing').every(r=>/ズレ$/.test(r.it)),JSON.stringify({melody:by('melody').length,prog:by('prog').length,interval:by('interval').length,rhythm:by('rhythm').length,timing:[...new Set(by('timing').map(r=>r.it))]}));
 await p.evaluate(()=>window.FQTrain.run('melody',1));await p.waitForSelector('[data-midi]');
 const q=await p.evaluate(()=>window.FQTrain.current().melody);await p.click('#train-listen');
 await p.locator(`[data-midi="${q[1]+1}"]`).first().click();await p.click('#train-undo');for(const m of q.slice(1))await p.locator(`[data-midi="${m}"]`).first().click();
 const last=await p.evaluate(()=>window.FQTrain.log().slice(-2));
 check('undo and replay are recorded on the melody slot',last.length===2&&last[0].ok===1&&last[0].ud===1&&!last[1].ud&&last.every(r=>r.rp===1&&r.ms>=0),JSON.stringify(last));
 await p.evaluate(()=>window.FretQuest.close());}
/* The estimate: repeated misses with the same wrong answer, and right answers far slower than usual, both rank as weak; the lobby lists them. */
{const r=await p.evaluate(()=>{const now=Date.now(),row=(it,ok,ms,c)=>({at:now,m:'chord',lv:2,it,ok,ms,rp:0,...(c?{c}:{})}),rows=[];
  for(let i=0;i<6;i++)rows.push(row('メジャー',1,1500));
  for(let i=0;i<3;i++)rows.push(row('セブンス（7）',0,2000,'メジャー'));
  for(let i=0;i<3;i++)rows.push(row('マイナー',1,5000));
  localStorage.setItem('fretQuestTrainLog',JSON.stringify(rows));const w=window.FQTrain.weakness('chord');window.FQTrain.lobby('chord');
  return {w:w.map(x=>[x.item,x.level,x.confused?.with]),box:document.querySelector('.train-weak').innerText};});
 const lv=Object.fromEntries(r.w.map(x=>[x[0],x[1]]));
 check('weak spots from misses and slow answers',lv['セブンス（7）']==='苦手'&&lv['マイナー']==='やや苦手'&&lv['メジャー']==='得意'&&r.w[0][2]==='メジャー'&&/セブンス（7）[\s\S]*メジャーと取り違え 3回/.test(r.box)&&r.box.indexOf('セブンス')<r.box.indexOf('マイナー')&&/3 \/ 3回正解・うち迷い 3回/.test(r.box),JSON.stringify(r));
 if(OUT)await p.screenshot({path:OUT+'/train-weak.png'});
 await p.evaluate(()=>window.FretQuest.close());}
const st=await p.evaluate(()=>{const s=window.FretQuest.getState(),d=s.history[window.FretQuest.today()];return {xp:s.xp,extra:d.extra,menu:document.querySelector('#menu-count').textContent};});
/* 10 modes × 20 XP, plus 20 for reaching today's goal (one item). */
check('xp and daily menu',st.xp===220&&st.extra.length===10&&st.menu==='達成',JSON.stringify(st));
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

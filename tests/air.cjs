/* Air practice (on-screen fretboard, no instrument): every module's phrase fits its board window and every chord has a form;
   trace scores high with the right positions on time and low with wrong positions; recall, shapes and changes pass when
   done right; a dojo session mission passes from board taps; free sessions score on the board; bass uses 4 strings.
   Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
let failed=0;const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
async function page(inst){
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.errs=[];
 p.on('pageerror',e=>p.errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')p.errs.push(m.text())});
 await p.addInitScript(i=>{try{localStorage.setItem('fretQuestInstrument',i);}catch{}},inst);
 await p.goto(BASE,{waitUntil:'networkidle'});await p.evaluate(()=>window.FretQuest.ensureAudio());return p;
}
const tap=(p,s,f,scope='')=>p.locator(scope+' .air-cell[data-s="'+s+'"][data-f="'+f+'"]').first().dispatchEvent('pointerdown');
/* Taps each note at its time, measured from the click on start (count-in of 4 beats after 0.4 s). */
async function playTrace(p,id,{wrong=false,speed=1}={}){
 await p.evaluate(id=>window.FQAir.start(window.FQDojo.modules.find(m=>m.id===id),1),id);await p.waitForSelector('#air-start');
 await p.click('[data-speed="'+speed+'"]');
 const spec=await p.evaluate(id=>{const s=window.FQAir.specFor(window.FQDojo.modules.find(m=>m.id===id),1);return {notes:s.notes,bpm:s.bpm,w:s.w};},id),spb=60/(spec.bpm*speed);
 await p.click('#air-start');const start=Date.now();await p.waitForSelector('.air-play');
 for(const n of spec.notes){const w=(.4+4*spb+n.beat*spb)*1000-(Date.now()-start);if(w>0)await p.waitForTimeout(w);
  await tap(p,wrong?(n.string===1?2:n.string-1):n.string,n.fret,'.air-play');}
 await p.waitForSelector('.stage-result',{timeout:90000});const score=Number(await p.$eval('.result-score strong',e=>e.textContent));return score;
}

// ---------- Guitar ----------
let p=await page('guitar');
const data=await p.evaluate(()=>{const bad=[];for(const m of window.FQDojo.modules)for(let st=1;st<=Math.min(2,window.FQAir.steps(m));st++){const s=window.FQAir.specFor(m,st);
 if(s.notes)s.notes.forEach(n=>{if(n.fret<s.w.lo||n.fret>s.w.hi)bad.push(m.id+' '+n.string+'.'+n.fret);});
 if(s.chords)s.chords.forEach(c=>{if(!window.FretQuest.chordShape(c))bad.push(m.id+' '+c);});}return {bad,n:window.FQDojo.modules.length};});
check('every guitar module fits its board',data.bad.length===0&&data.n===105,JSON.stringify(data));
const cards=await p.$$eval('#air-cards .air-card',x=>x.length);check('training cards',cards===2,cards);
if(OUT){await p.evaluate(()=>document.querySelector('#air-cards').scrollIntoView({block:'center'}));await p.screenshot({path:OUT+'/air-cards.png'});}

let score=await playTrace(p,'bb-box');
const st1=await p.evaluate(()=>window.FQAir.status(window.FQDojo.modules.find(m=>m.id==='bb-box')));
check('trace: right positions on time',score>=95&&st1[0],score+' '+JSON.stringify(st1));
if(OUT)await p.screenshot({path:OUT+'/air-trace-result.png'});
await p.click('#air-back');await p.waitForSelector('.dojo-module');
score=await playTrace(p,'bb-box',{wrong:true});check('trace: wrong strings score low',score<60,score);
await p.click('#air-back');await p.waitForSelector('.dojo-module');

// Recall: the right positions in order, one wrong tap on the way.
await p.evaluate(()=>window.FQAir.start(window.FQDojo.modules.find(m=>m.id==='bb-box'),2));await p.waitForSelector('.air-recall');
{const {notes,w}=await p.evaluate(()=>window.FQAir.specFor(window.FQDojo.modules.find(m=>m.id==='bb-box'),2));
 /* A miss before starting is only a pointer to the lit note; one miss after the start costs one note. */
 await tap(p,6,w.lo,'.air-recall');const pre=await p.$eval('#air-msg',e=>e.textContent);
 await tap(p,notes[0].string,notes[0].fret,'.air-recall');await tap(p,notes[1].string,notes[1].fret,'.air-recall');
 await tap(p,6,w.lo,'.air-recall');
 const msg=await p.$eval('#air-msg',e=>e.textContent);
 for(const n of notes.slice(2))await tap(p,n.string,n.fret,'.air-recall');
 await p.waitForSelector('.stage-result',{timeout:10000});const s=Number(await p.$eval('.result-score strong',e=>e.textContent)),expect=Math.round((notes.length-2)/(notes.length-1)*100);
 check('recall: start from the lit note, one mistake costs one note',s===expect&&msg.includes('ちがう')&&pre.includes('光っている'),s+' expected '+expect+' | '+pre+' | '+msg);}
{const desc=await p.evaluate(()=>window.FQAir.specFor(window.FQDojo.modules.find(m=>m.id==='pent-box1'),2).notes.slice(-3).map(n=>n.string+'.'+n.fret).join(' '));
 check('pent box 1 comes down through every note of the box',desc==='5.5 6.8 6.5',desc);}
await p.click('#air-back');await p.waitForSelector('.dojo-module');

// Session mission on the board: A on every downbeat, then B, C, D in the B.B. box.
await p.evaluate(()=>window.FQAir.start(window.FQDojo.modules.find(m=>m.id==='bb-box'),3));await p.waitForSelector('.mission-box');
await p.click('[data-ch="1"]');await p.click('#jam-start');const t0=Date.now();await p.waitForSelector('#jam-board .air-cell');
{const spb=60/84,pos=[[2,10],[2,12],[2,13],[1,10]];
 for(let beat=0;beat<48;beat++){const w=(.4+4*spb+beat*spb+.03)*1000-(Date.now()-t0);if(w>0)await p.waitForTimeout(w);const [s,f]=pos[beat%4];await tap(p,s,f,'#jam-board');}
 if(OUT)await p.screenshot({path:OUT+'/air-mission.png'});
 await p.waitForSelector('.stage-result',{timeout:60000});
 const r=await p.evaluate(()=>({title:document.querySelector('#modal-title').textContent,goals:[...document.querySelectorAll('.stage-result .goal')].map(g=>(g.classList.contains('ok')?'✓':'✗')+g.querySelector('span').textContent+' '+g.querySelector('b').textContent),st:window.FQAir.status(window.FQDojo.modules.find(m=>m.id==='bb-box'))}));
 check('session mission from board taps',r.title==='ミッション達成！'&&r.st.every(Boolean),JSON.stringify(r));}
await p.click('#jam-back');await p.waitForSelector('.dojo-module');
const home=await p.$eval('.air-home',e=>e.textContent).catch(()=>'');check('air mastery points to the guitar',home.includes('ギター'),home);
await p.evaluate(()=>window.FretQuest.close());await p.waitForTimeout(200);
const badge=await p.$$eval('#dojo [data-module="bb-box"] .dojo-air',x=>x.length);check('dojo card shows the air badge',badge===1,badge);

// Shapes: each chord's fretted positions, with one wrong tap.
await p.evaluate(()=>window.FQAir.start(window.FQDojo.modules.find(m=>m.id==='seventh-shuffle'),1));await p.waitForSelector('.air-shapes');
{const chords=await p.evaluate(()=>window.FQAir.specFor(window.FQDojo.modules.find(m=>m.id==='seventh-shuffle'),1).chords.map(c=>({c,t:window.FretQuest.chordShape(c).map((f,i)=>({s:6-i,f})).filter(x=>x.f>0)})));
 await tap(p,1,5,'.air-shapes');
 for(const ch of chords){for(const t of ch.t)await tap(p,t.s,t.f,'.air-shapes');await p.waitForTimeout(800);}
 await p.waitForSelector('.stage-result',{timeout:10000});const s=Number(await p.$eval('.result-score strong',e=>e.textContent)),taps=chords.reduce((a,c)=>a+c.t.length,0);
 check('shapes: forms placed',s===Math.round(taps/(taps+1)*100),s+' for '+taps+' taps + 1 wrong');}
await p.click('#air-back');await p.waitForSelector('.dojo-module');

// Changes: build each form one beat before its chord starts.
await p.evaluate(()=>window.FQAir.start(window.FQDojo.modules.find(m=>m.id==='seventh-shuffle'),2));await p.waitForSelector('#air-start');await p.click('[data-speed="1"]');
{const spec=await p.evaluate(()=>{const s=window.FQAir.specFor(window.FQDojo.modules.find(m=>m.id==='seventh-shuffle'),2);return {bpm:s.bpm,seq:s.seq.map(c=>({beat:c.beat,t:window.FretQuest.chordShape(c.chord).map((f,i)=>({s:6-i,f})).filter(x=>x.f>0)}))};}),spb=60/spec.bpm;
 await p.click('#air-start');const start=Date.now();await p.waitForSelector('.air-play');
 for(const c of spec.seq){const w=(.4+8*spb+(c.beat-1.2)*spb)*1000-(Date.now()-start);if(w>0)await p.waitForTimeout(w);for(const t of c.t)await tap(p,t.s,t.f,'.air-play');}
 if(OUT)await p.screenshot({path:OUT+'/air-changes.png'});
 await p.waitForSelector('.stage-result',{timeout:90000});const s=Number(await p.$eval('.result-score strong',e=>e.textContent));
 check('changes: every form in time',s===100,s+' over '+spec.seq.length+' changes');}
await p.click('#air-back');

// Free session on the board: chord tones of A7 score.
await p.evaluate(()=>window.FQJam.lobby(window.FQJam.sessions.find(s=>s.id==='blues-a'),{air:true}));await p.click('[data-ch="1"]');await p.click('#jam-start');await p.waitForSelector('#jam-board .air-cell');
for(let i=0;i<8;i++){await p.waitForTimeout(500);await tap(p,4,7,'#jam-board');}
await p.click('#jam-stop');await p.waitForSelector('.stage-result');
{const r=await p.evaluate(()=>({title:document.querySelector('#modal-title').textContent,pts:document.querySelector('.result-score strong')?.textContent}));check('free board session scores',r.title==='ナイス・セッション！'&&Number(r.pts)>0,JSON.stringify(r));}
if(p.errs.length){failed++;console.log('page errors',JSON.stringify(p.errs));}
await p.close();

// ---------- Bass ----------
p=await page('bass');
const bass=await p.evaluate(()=>{const bad=[];for(const m of window.FQDojo.modules)for(let st=1;st<=2;st++){const s=window.FQAir.specFor(m,st);s.notes.forEach(n=>{if(n.fret<s.w.lo||n.fret>s.w.hi)bad.push(m.id);});}return {bad,n:window.FQDojo.modules.length};});
check('every bass line fits its board',bass.bad.length===0&&bass.n===8,JSON.stringify(bass));
score=await playTrace(p,'b-walk');
const rows=await p.evaluate(()=>window.FQAir.boardHtml({lo:0,hi:5}).match(/air-row s\d/g).length);
check('bass trace on a 4-string board',score>=95&&rows===4,score+' rows '+rows);
if(OUT)await p.screenshot({path:OUT+'/air-bass-result.png'});
if(p.errs.length){failed++;console.log('page errors',JSON.stringify(p.errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

/* Browser checks for bass mode: converted stages (melody and root lines), octave-tolerant judging, the bass tuner,
   the bass-line dojo (tap step and a session mission), and the 4-string training boards.
   Synthetic tones only; this does not prove accuracy with a real bass and a phone microphone.
   Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
await p.addInitScript(()=>{
 try{localStorage.setItem('fretQuestInstrument','bass');}catch{}
 navigator.mediaDevices.getUserMedia=async()=>{
  const ctx=window.FretQuest.audioContext(),dest=ctx.createMediaStreamDestination(),plan=window.__plan||{};
  /* A bass-like tone: sawtooth through a low lowpass, so the upper harmonics are weak. */
  const pluck=(t,m,d,v=.35)=>{const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.value=440*Math.pow(2,(m-69)/12);f.type='lowpass';f.frequency.value=900;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.006);g.gain.exponentialRampToValueAtTime(.001,t+Math.max(.15,d*.9));o.connect(f);f.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.05);};
  const hold=m=>{const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=440*Math.pow(2,(m-69)/12);f.type='lowpass';f.frequency.value=900;g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.setValueAtTime(.3,ctx.currentTime+.4);o.connect(f);f.connect(g);g.connect(dest);o.start();window.__hold=o;};
  if(plan.kind==='stage'){const spb=60/plan.bpm,t0=ctx.currentTime+.35+4*spb;plan.notes.forEach((n,i)=>{if(plan.mode==='silent')return;const shift=plan.mode==='octave'&&i%2?12:plan.mode==='guitar'?24:0;pluck(t0+n.beat*spb,n.midi+shift,n.len*spb);});}
  if(plan.kind==='tone')hold(plan.midi);
  /* Session missions: the root on beat 1 of every bar, then the fifth, the octave and the fifth. */
  if(plan.kind==='mission')setTimeout(()=>{const T=ctx.currentTime,spb=60/plan.bpm,t0=T+.4+4*spb;for(let beat=0;beat<plan.roots.length*4;beat++){const r=plan.roots[Math.floor(beat/4)];pluck(t0+beat*spb+.03,r+[0,7,12,7][beat%4],spb*.8);}},0);
  return dest.stream;};
});
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('fretQuestV1')||'{"xp":0,"history":{}}');s.courses={};for(const c of window.FQCourses)for(const l of c.lessons)s.courses[l.id]={completedAt:new Date().toISOString(),bestScore:0,attempts:1,method:'self'};localStorage.setItem('fretQuestV1',JSON.stringify(s));});
await p.reload({waitUntil:'networkidle'});
await p.evaluate(()=>window.FretQuest.ensureAudio());
const head=await p.evaluate(()=>({pressed:document.querySelector('#inst-switch [aria-pressed="true"]')?.textContent,title:document.querySelector('.topbar-title').textContent,kicker:document.querySelector('#train .kicker').textContent}));
check('header shows bass',head.pressed==='ベース'&&head.title.includes('ベーシスト')&&head.kicker.startsWith('ベース'),JSON.stringify(head));
if(OUT)await p.screenshot({path:OUT+'/bass-home.png'});

// Conversion: melodies drop into the bass range; strum charts become roots on the same rhythm.
const conv=await p.evaluate(()=>{const all=window.FQCourses.flatMap(c=>c.lessons.map(l=>({c,l}))),bad=[];let songs=0,strums=0;
 for(const {l} of all){if(l.type!=='song'&&l.type!=='strum')continue;const a=window.FQInst.adapt(l);a.type==='song'?0:bad.push(l.id+' type');
  if(l.type==='song'){songs++;}else{strums++;if(a.exercise.notes.length!==l.exercise.strums.length)bad.push(l.id+' count');
   a.exercise.notes.forEach((n,i)=>{if(n.midi%12!==window.FQInst.rootPc(l.exercise.strums[i].chord))bad.push(l.id+' root '+n.chord);});}
  a.exercise.notes.forEach(n=>{if(n.midi<28||n.midi>60||n.string<1||n.string>4||n.fret<0||n.fret>15||28+[0,15,10,5,0][n.string]+n.fret!==n.midi)bad.push(l.id+' pos '+n.midi+' '+n.string+'.'+n.fret);});}
 return {songs,strums,bad:bad.slice(0,8)};});
check('every stage converts to a playable bass line',conv.bad.length===0&&conv.songs>0&&conv.strums>0,JSON.stringify(conv));

async function stage(id,mode,expect,shot){
 const plan=await p.evaluate(({id,mode})=>{const l=window.FQCourses.flatMap(c=>c.lessons).find(x=>x.id===id),a=window.FQInst.adapt(l);window.__plan={kind:'stage',mode,bpm:l.exercise.bpm,notes:a.exercise.notes};
  const c=window.FQCourses.find(c=>c.lessons.includes(l));window.FretQuest.show(()=>{});window.FQStage.lobby({lesson:l,course:c},{back:()=>window.FretQuest.close()});return {n:a.exercise.notes.length,beats:l.exercise.beats,bpm:l.exercise.bpm};},{id,mode});
 await p.waitForSelector('#stage-start');await p.click('[data-input="mic"]');await p.click('[data-speed="1"]');await p.click('[data-latency="0"]');
 if(shot&&OUT)await p.screenshot({path:OUT+'/'+shot+'-lobby.png'});
 await p.click('#stage-start');
 if(shot&&OUT){await p.waitForTimeout(Math.min((plan.beats+4)*60/plan.bpm*450,8000));await p.screenshot({path:OUT+'/'+shot+'-play.png'});}
 await p.waitForSelector('.stage-result',{timeout:120000});
 const score=Number(await p.$eval('.result-score strong',e=>e.textContent)),grid=await p.$$eval('.result-grid div',d=>d.map(x=>x.innerText.replace('\n',' ')).join(', '));
 const ok=expect==='high'?score>=95:score<60;check('stage '+id+' '+mode,ok,score+' | '+grid);
 await p.click('#stage-back');await p.waitForTimeout(300);
}
const strumId=await p.evaluate(()=>window.FQCourses.flatMap(c=>c.lessons).find(l=>l.type==='strum'&&l.exercise.strums.some(s=>s.up)).id);
await stage('first-6','good','high','bass-song');
await stage('first-6','octave','high');
await stage('first-6','silent','low');
await stage('first-6','guitar','low');
await stage(strumId,'good','high','bass-roots');

// Tuner: E1 directly, and the low E heard an octave high (folds back to E1); the A string.
async function tune(midi){
 await p.evaluate(m=>{window.__plan={kind:'tone',midi:m};window.FQTools.tuner();},midi);await p.waitForSelector('#tn-start');
 const strings=await p.$$eval('[data-tn]',x=>x.map(b=>b.dataset.tn).join(','));
 await p.click('#tn-start');await p.waitForTimeout(1800);
 const r=await p.evaluate(()=>({note:document.querySelector('#tn-note').textContent,cents:document.querySelector('#tn-cents').textContent,active:document.querySelector('[data-tn].active')?.dataset.tn}));
 if(OUT&&midi===28)await p.screenshot({path:OUT+'/bass-tuner.png'});
 await p.evaluate(()=>{window.__hold?.stop();window.FretQuest.close();});await p.waitForTimeout(200);return {...r,strings};
}
let t=await tune(28);check('tuner hears E1',t.strings==='28,33,38,43'&&t.note==='E'&&t.active==='28'&&Math.abs(parseInt(t.cents))<=5,JSON.stringify(t));
t=await tune(40);check('tuner folds an octave-high E to the 4th string',t.note==='E'&&t.active==='28',JSON.stringify(t));
t=await tune(33);check('tuner hears A1',t.note==='A'&&t.active==='33',JSON.stringify(t));

// Dojo: bass lines only, a tap learn step and a session mission.
await p.evaluate(()=>document.querySelector('#dojo-section').scrollIntoView());
const dojo=await p.evaluate(()=>({cards:document.querySelectorAll('#dojo [data-module]').length,count:document.querySelector('#dojo-count').textContent,ids:window.FQDojo.modules.map(m=>m.id).join(',')}));
check('dojo shows bass lines',dojo.count==='0 / 8'&&dojo.ids.split(',').every(x=>x.startsWith('b-')),JSON.stringify(dojo));
if(OUT)await p.screenshot({path:OUT+'/bass-dojo.png'});
await p.evaluate(()=>window.FQDojo.open(window.FQDojo.modules.find(m=>m.id==='b-walk')));await p.waitForSelector('.dojo-module');
const lines=await p.$$eval('.dojo-module svg line',x=>x.filter(l=>l.getAttribute('x1')==='20').length);
check('dojo board has 4 strings',lines===4,lines);
if(OUT)await p.screenshot({path:OUT+'/bass-module.png'});
await p.click('[data-step="1"]');await p.waitForSelector('#stage-start');await p.click('[data-input="tap"]');await p.click('[data-speed="1"]');await p.click('#stage-start');await p.waitForSelector('#stage-pad');
{const ex=await p.evaluate(()=>window.FQDojo.chartFor(window.FQDojo.modules.find(m=>m.id==='b-walk'),1).exercise),spb=60/ex.bpm,start=Date.now();
 for(const n of ex.notes){const w=(.35+4*spb+n.beat*spb)*1000-(Date.now()-start);if(w>0)await p.waitForTimeout(w);await p.locator('#stage-pad').dispatchEvent('pointerdown');}
 await p.waitForSelector('.stage-result',{timeout:60000});const s=Number(await p.$eval('.result-score strong',e=>e.textContent));check('walking bass learn step (tap)',s>=95&&ex.inst==='bass'&&ex.notes[0].midi===38,s);
 await p.click('#stage-back');await p.waitForSelector('.dojo-module');}
await p.evaluate(()=>{const st=JSON.parse(localStorage.getItem('fretQuestLicks')||'{}');st['b-root']={s1:80,s2:80};localStorage.setItem('fretQuestLicks',JSON.stringify(st));window.FQDojo.open(window.FQDojo.modules.find(m=>m.id==='b-root'));});
await p.waitForSelector('.dojo-module');
const roots=await p.evaluate(()=>window.FQJam.sessions.find(s=>s.id==='blues-a').chart.map(bar=>28+((bar[0].root-4+12)%12)));
await p.evaluate(r=>{window.__plan={kind:'mission',bpm:84,roots:r};},roots);
await p.click('[data-step="3"]');await p.waitForSelector('.mission-box');
const lobbyText=await p.$eval('.jam-key',e=>e.textContent);
await p.click('[data-ch="1"]');await p.click('#jam-start');
if(OUT){await p.waitForTimeout(9000);await p.screenshot({path:OUT+'/bass-mission.png'});}
await p.waitForSelector('.stage-result',{timeout:180000});
const mr=await p.evaluate(()=>({title:document.querySelector('#modal-title').textContent,goals:[...document.querySelectorAll('.stage-result .goal')].map(g=>(g.classList.contains('ok')?'✓':'✗')+g.querySelector('span').textContent+' '+g.querySelector('b').textContent)}));
check('root mission passes',mr.title==='ミッション達成！'&&lobbyText.includes('ベース抜き'),JSON.stringify(mr));
await p.evaluate(()=>window.FretQuest.close());

// Training: 4-string boards.
await p.evaluate(()=>window.FQTrain.run('melody',1));await p.waitForSelector('.train-board');
const mel=await p.evaluate(()=>({strings:document.querySelectorAll('.train-string').length,melody:window.FQTrain.current().melody,low:Math.min(...[...document.querySelectorAll('[data-midi]')].map(b=>Number(b.dataset.midi)))}));
check('melody board is a 4-string bass board',mel.strings===4&&mel.low===28&&mel.melody.every(m=>m>=28&&m<=50),JSON.stringify(mel));
if(OUT)await p.screenshot({path:OUT+'/bass-melody.png'});
await p.evaluate(()=>window.FretQuest.close());
await p.evaluate(()=>window.FQTrain.run('fret',1));await p.waitForSelector('[data-fret]');
const fq=await p.evaluate(()=>window.FQTrain.current().prompt);check('fret map asks about the 4th string',fq.startsWith('4弦'),fq);
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

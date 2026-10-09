/* Browser playthrough of the play-along stages with a synthetic "guitar" fed in as the microphone.
   Usage:  python3 -m http.server 8765   (from the folder that contains fretquest/)
           node tests/stage-playthrough.cjs
   Env: BASE (default http://localhost:8765/fretquest/), PW (path to the playwright package), OUT (screenshot folder).
   This checks the judging logic against clean synthetic tones. It does not prove accuracy with a real guitar. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
const PASS=60;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
// Fake microphone: plucked sawtooth notes or strums that follow the chart (mode = good | silent | random), shifted by window.__off seconds.
await p.addInitScript(()=>{
 navigator.mediaDevices.getUserMedia=async()=>{
  const ctx=window.FretQuest.audioContext(),dest=ctx.createMediaStreamDestination();
  const mode=window.__fakeMode||'good',lesson=window.__lesson,e=lesson.exercise,speed=window.__speed||1;
  const spb=60/(e.bpm*speed),t0=ctx.currentTime+.35+(e.meter||4)*spb+(window.__off||0);
  const G=window.__gain||1,pluck=(t,midi,dur,v=.3)=>{v*=G;const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.value=440*Math.pow(2,(midi-69)/12);f.type='lowpass';f.frequency.value=2500;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.005);g.gain.exponentialRampToValueAtTime(.001,t+Math.max(.2,dur*.95));o.connect(f);f.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.05);};
  if(mode==='good'){
   if(lesson.type==='song')e.notes.forEach(n=>pluck(t0+n.beat*spb,n.midi,n.len*spb));
   else e.strums.forEach(s=>[40,47,52,55,59,64].forEach((m,k)=>pluck(t0+s.beat*spb+k*.008,m,Math.min(.5,s.len*spb),.12)));
  }
  /* Optional steady room noise, e.g. an unplugged electric guitar in a normal room. */
  if(window.__noise){const n=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=n;src.loop=true;g.gain.value=window.__noise;src.connect(g);g.connect(dest);src.start();}
  if(mode==='random'){for(let t=0;t<e.beats*spb;t+=.13)[40,47,52].forEach(m=>pluck(t0+t,m,.12,.15));}
  return dest.stream;};
});
await p.goto(BASE+'#courses',{waitUntil:'networkidle'});
// Unlock every lesson.
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('fretQuestV1')||'{"xp":0,"history":{}}');s.courses={};for(const c of window.FQCourses)for(const l of c.lessons)s.courses[l.id]={completedAt:new Date().toISOString(),bestScore:0,attempts:1,method:'self'};localStorage.setItem('fretQuestV1',JSON.stringify(s));});
await p.reload({waitUntil:'networkidle'});

async function runLesson(id,{mode='good',input='mic',speed=1,off=0,lat=0,shot=null,expect,gain=1,noise=0}){
 await p.evaluate(({id,mode,speed,off,gain,noise})=>{window.__fakeMode=mode;window.__speed=speed;window.__off=off;window.__gain=gain;window.__noise=noise;window.__lesson=window.FQCourses.flatMap(c=>c.lessons).find(l=>l.id===id);},{id,mode,speed,off,gain,noise});
 await p.click(`[data-course="${id.split('-')[0]}"]`);
 await p.click(`[data-lesson="${id}"]`);
 await p.click('#lesson-begin');
 await p.waitForSelector('#stage-start');
 await p.click(`[data-input="${input}"]`);await p.click(`[data-speed="${speed}"]`);await p.click(`[data-latency="${lat}"]`);
 if(shot&&OUT)await p.screenshot({path:`${OUT}/${shot}-lobby.png`});
 await p.click('#stage-start');
 await p.waitForSelector('#stage-score');
 const lesson=await p.evaluate(()=>window.__lesson),spb=60/(lesson.exercise.bpm*speed);
 if(input==='tap'){
  const start=Date.now(),times=(lesson.exercise.notes||lesson.exercise.strums).map(n=>(.35+4*spb+n.beat*spb+off)*1000);
  for(const t of times){const wait=t-(Date.now()-start);if(wait>0)await p.waitForTimeout(wait);await p.locator('#stage-pad').dispatchEvent('pointerdown');}
 }else if(shot&&OUT){await p.waitForTimeout(Math.min((lesson.exercise.beats+4)*spb*450,9000));await p.screenshot({path:`${OUT}/${shot}-play.png`});}
 await p.waitForSelector('.stage-result',{timeout:90000});
 const score=Number(await p.$eval('.result-score strong',e=>e.textContent)),grid=await p.$$eval('.result-grid div',d=>d.map(x=>x.innerText.replace('\n',' ')).join(', '));
 if(shot&&OUT){await p.waitForTimeout(1200);await p.screenshot({path:`${OUT}/${shot}-result.png`});}
 const ok=expect==='high'?score>=95:score<PASS;if(!ok)failed++;
 console.log(ok?'ok  ':'FAIL',id,mode,input,'speed',speed,'off',off,'lat',lat,gain<1?'quiet x'+gain+' noise '+noise:'','=>',score,'|',grid);
 await p.click('#stage-back');await p.waitForTimeout(300);
}
const cases=process.env.ALL?[]:[
 ['first-6',{expect:'high',shot:'song'}],
 ['first-6',{mode:'silent',expect:'low'}],
 ['first-6',{mode:'random',expect:'low'}],
 ['riffs-4',{expect:'high'}],
 ['stage-5',{expect:'high'}],
 ['chords-3',{expect:'high',shot:'strum'}],
 ['chords-3',{mode:'silent',expect:'low'}],
 ['chords-3',{mode:'random',expect:'low'}],
 ['chords-6',{expect:'high'}],
 ['groove-3',{expect:'high'}],
 ['groove-5',{speed:0.75,expect:'high'}],
 ['first-6',{off:.2,lat:0.2,expect:'high'}],
 ['first-5',{input:'tap',expect:'high'}],
 ['chords-1',{input:'tap',expect:'high'}],
 // Quiet guitar (1/20 level) in a room with steady noise, like an unplugged electric.
 ['chords-3',{gain:.05,noise:.002,expect:'high'}],
 ['chords-3',{gain:.05,noise:.002,mode:'silent',expect:'low'}],
 ['chords-3',{gain:.05,noise:.002,mode:'random',expect:'low'}],
 ['first-6',{gain:.05,noise:.002,expect:'high'}],
 ['first-6',{gain:.05,noise:.002,mode:'silent',expect:'low'}],
];
// ALL=1 also plays every stage once with clean input.
if(process.env.ALL)for(const l of await p.evaluate(()=>window.FQCourses.flatMap(c=>c.lessons).filter(l=>l.type==='song'||l.type==='strum').map(l=>l.id)))cases.push([l,{expect:'high'}]);
for(const [id,o] of cases){try{await runLesson(id,o);}catch(e){failed++;console.log('FAIL',id,e.message.split('\n')[0]);await p.click('#modal-close').catch(()=>{});}}
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

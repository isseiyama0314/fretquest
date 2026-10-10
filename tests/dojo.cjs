/* Browser checks for the phrase dojo: learn and groove steps (tap mode), a session mission (synthetic microphone),
   mastery, and a pop session. Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
await p.addInitScript(()=>{
 navigator.mediaDevices.getUserMedia=async()=>{
  const ctx=window.FretQuest.audioContext(),dest=ctx.createMediaStreamDestination(),plan=window.__plan||{};
  const pluck=(t,m,d)=>{const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.value=440*Math.pow(2,(m-69)/12);f.type='lowpass';f.frequency.value=2500;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.3,t+.005);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(f);f.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.05);};
  /* Session missions: one note per beat, the downbeat note on beat 1 of every bar. */
  if(plan.kind==='mission')setTimeout(()=>{const T=ctx.currentTime,spb=60/plan.bpm,t0=T+.4+4*spb;for(let beat=0;beat<plan.bars*4;beat++)pluck(t0+beat*spb+.03,beat%4===0?plan.down:plan.others[beat%plan.others.length],spb*.7);},0);
  return dest.stream;};
});
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>window.FretQuest.ensureAudio());await p.waitForTimeout(600);
const cards=await p.$$eval('#dojo [data-module]',e=>e.length),tabs=await p.$$eval('#dojo-tabs [data-genre]',e=>e.map(x=>x.textContent).join(','));
check('dojo renders',cards===7&&tabs.includes('ジャズ'),cards+' cards, tabs '+tabs);
if(OUT){await p.evaluate(()=>document.querySelector('#dojo-section').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:OUT+'/dojo.png'});}

async function tapStep(id,step){
 await p.click(`[data-step="${step}"]`);await p.waitForSelector('#stage-start');
 await p.click('[data-input="tap"]');await p.click('[data-speed="1"]');await p.click('#stage-start');await p.waitForSelector('#stage-pad');
 const ex=await p.evaluate(({id,step})=>window.FQDojo.chartFor(window.FQDojo.modules.find(m=>m.id===id),step).exercise,{id,step}),spb=60/ex.bpm;
 const start=Date.now(),times=(ex.notes||ex.strums).map(n=>(.35+4*spb+n.beat*spb)*1000);
 for(const t of times){const w=t-(Date.now()-start);if(w>0)await p.waitForTimeout(w);await p.locator('#stage-pad').dispatchEvent('pointerdown');}
 await p.waitForSelector('.stage-result',{timeout:120000});const score=await p.$eval('.result-score strong',e=>e.textContent);
 await p.click('#stage-back');await p.waitForSelector('.dojo-module');return Number(score);
}
await p.click('[data-module="bb-box"]');await p.waitForSelector('.dojo-module');
const locked=await p.$$eval('.dojo-step',e=>e.map(x=>x.disabled));
if(OUT)await p.screenshot({path:OUT+'/dojo-module.png'});
check('steps unlock in order',JSON.stringify(locked)==='[false,true,true]',JSON.stringify(locked));
const s1=await tapStep('bb-box',1),after1=await p.$$eval('.dojo-step',e=>e.map(x=>x.disabled));
check('learn step',s1>=95&&!after1[1],s1+' '+JSON.stringify(after1));
const s2=await tapStep('bb-box',2);check('groove step',s2>=95&&!(await p.$$eval('.dojo-step',e=>e.map(x=>x.disabled)))[2],s2);

// Use step: a session mission. First fail (low register), then pass (B.B. box register, A on every downbeat).
async function mission(plan){
 await p.evaluate(pl=>{window.__plan=pl;},plan);
 await p.click('[data-step="3"]');await p.waitForSelector('.mission-box');await p.click('[data-ch="1"]');await p.click('#jam-start');
 if(OUT&&plan.shot){await p.waitForTimeout(9000);await p.screenshot({path:OUT+'/dojo-mission.png'});}
 await p.waitForSelector('.stage-result',{timeout:180000});
 const r=await p.evaluate(()=>({title:document.querySelector('#modal-title').textContent,goals:[...document.querySelectorAll('.stage-result .goal')].map(g=>(g.classList.contains('ok')?'✓':'✗')+g.querySelector('span').textContent+' '+g.querySelector('b').textContent)}));
 if(OUT&&plan.shot)await p.screenshot({path:OUT+'/dojo-mission-result.png'});
 await p.click('#jam-back');await p.waitForSelector('.dojo-module');return r;
}
let r=await mission({kind:'mission',bpm:84,bars:12,down:45,others:[48,50,52,55]});
check('mission fails in the low register',r.title==='ミッション未達成'&&r.goals.some(g=>g.startsWith('✗高音域')),JSON.stringify(r));
r=await mission({kind:'mission',bpm:84,bars:12,down:69,others:[71,72,74,76],shot:true});
const mastered=await p.evaluate(()=>window.FQDojo.status(window.FQDojo.modules.find(m=>m.id==='bb-box')).every(Boolean));
check('mission passes and masters the lick',r.title==='ミッション達成！'&&mastered,JSON.stringify(r));
await p.click('#modal-close');await p.waitForTimeout(300);
const rank=await p.$eval('#dojo-count',e=>e.textContent);check('mastery count',rank==='1 / 21',rank);

// A comping module and a pop session.
await p.click('[data-genre="JAZZ"]');await p.click('[data-module="shells"]');await p.waitForSelector('.dojo-chords');
if(OUT)await p.screenshot({path:OUT+'/dojo-comp.png'});
const c1=await tapStep('shells',1);check('comping learn step',c1>=95,c1);
await p.click('#modal-close');await p.waitForTimeout(300);
const pop=await p.evaluate(()=>!!window.FQJam.sessions.find(s=>s.id==='oudou'));
await p.evaluate(()=>window.FQJam.lobby(window.FQJam.sessions.find(s=>s.id==='oudou')));await p.click('[data-ch="1"]');await p.click('[data-mic="0"]');await p.click('#jam-start');
await p.waitForTimeout(4000);const playing=await p.$eval('#jam-now',e=>e.textContent);await p.click('#jam-stop');await p.waitForSelector('.stage-result');
check('pop session plays',pop&&playing.length>0,playing);
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

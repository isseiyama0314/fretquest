/* Browser checks for jam sessions and rhythm games with a synthetic "guitar" as the microphone.
   Usage is the same as stage-playthrough.cjs (serve the folder that contains fretquest/ on port 8765).
   Math.random is pinned to 0 so call & response always uses the first pattern of each pool. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.addInitScript(()=>{
 Math.random=()=>0;
 navigator.mediaDevices.getUserMedia=async()=>{
  const ctx=window.FretQuest.audioContext(),dest=ctx.createMediaStreamDestination(),T=ctx.currentTime,plan=window.__plan;
  const pluck=(t,midi,dur,v=.3)=>{v*=plan.gain||1;const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.value=440*Math.pow(2,(midi-69)/12);f.type='lowpass';f.frequency.value=2500;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.005);g.gain.exponentialRampToValueAtTime(.001,t+Math.max(.12,dur*.95));o.connect(f);f.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.05);};
  const strum=t=>[40,45,50,55].forEach((m,k)=>pluck(t+k*.006,m,.09,.12));
  if(plan.kind==='jam'){
   /* Arpeggiate the current chord's tones, one per beat. */
   const s=window.FQJam.sessions.find(x=>x.id===plan.id),spb=60/plan.bpm,t0=T+.4+4*spb;
   for(let beat=0;beat<s.chart.length*4;beat++){const bar=s.chart[Math.floor(beat/4)],ch=bar[Math.min(bar.length-1,Math.floor((beat%4)/(4/bar.length)))];
    const midi=plan.wrong?61+(beat*5)%12:52+((ch.root+ch.tones[beat%ch.tones.length]-52%12+12)%12);pluck(t0+beat*spb+spb*.25,midi,spb*.6);}
  }
  if(plan.kind==='survival'){
   const P=[0,4,6,10,12,14];let bpm=70,start=T+.4;
   for(let round=0;round<plan.rounds;round++){const spb=60/bpm,judge=start+4*spb;for(let bar=0;bar<2;bar++)P.forEach(i=>strum(judge+bar*4*spb+i*spb/4));start=judge+8*spb+spb;bpm+=5;}
  }
  if(plan.kind==='clock'){const spb=60/plan.bpm;for(let k=0;k<plan.beats;k++)strum(T+.4+k*spb+(plan.drift||0)*k);}
  if(plan.kind==='call'){
   const CALL=['x...x...x...x...','x...x.x.x...x...','..x...x...x...x.','x..x..x...x.x...','x.xxx...x.xxx...'];
   let level=1,wins=0,bpm=76,start=T+.4+4*60/76;
   for(let round=0;round<plan.rounds;round++){const spb=60/bpm,resp=start+4*spb,pat=CALL[Math.min(4,Math.floor((level-1)/2))];
    [...pat].forEach((c,i)=>{if(c==='x')strum(resp+i*spb/4);});
    wins++;if(wins%2===0)level++;const end=resp+4*spb;start=end+2*spb;bpm=Math.min(132,76+Math.floor((level-1)/2)*6);}
  }
  return dest.stream;};
});
await p.goto(BASE,{waitUntil:'networkidle'});
// Start the audio clock first so the fake guitar and the game share a settled timeline.
await p.evaluate(()=>window.FretQuest.ensureAudio());await p.waitForTimeout(800);
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};

async function jam(id,{wrong=false,gain=1}={}){
 const s=await p.evaluate(id=>{const s=window.FQJam.sessions.find(x=>x.id===id);return {bpm:s.bpm};},id);
 await p.evaluate(({id,bpm,wrong,gain})=>{window.__plan={kind:'jam',id,bpm,wrong,gain};},{id,bpm:s.bpm,wrong,gain});
 await p.click(`[data-jam="${id}"]`);await p.click('[data-ch="1"]');await p.click('[data-mic="1"]');
 if(OUT)await p.screenshot({path:`${OUT}/jam-lobby.png`});
 await p.click('#jam-start');await p.waitForSelector('#jam-now');
 if(OUT){await p.waitForTimeout(9000);await p.screenshot({path:`${OUT}/jam-play.png`});}
 await p.waitForSelector('.stage-result',{timeout:180000});
 const grid=await p.$$eval('.result-grid div',d=>d.map(x=>x.innerText.replace('\n',' ')));
 const tones=parseInt((grid.find(x=>x.includes('CHORD TONES'))||'0'));
 if(OUT)await p.screenshot({path:`${OUT}/jam-result.png`});
 check('jam '+id+(wrong?' (chromatic)':'')+(gain<1?' quiet x'+gain:''),wrong?tones<50:tones>=90,grid.join(', '));
 await p.click('#jam-back');await p.waitForTimeout(300);
}
async function game(id,plan,expect,opts={}){
 await p.evaluate(plan=>{window.__plan=plan;},plan);
 await p.click(`[data-game="${id}"]`);
 if(opts.pat)await p.click(`[data-pat="${opts.pat}"]`);if(opts.cb)await p.click(`[data-cb="${opts.cb}"]`);
 await p.click('[data-in="mic"]');await p.click('#game-start');await p.waitForSelector('#g-phase');
 if(OUT&&opts.shot){await p.waitForTimeout(opts.shot);await p.screenshot({path:`${OUT}/game-${id}.png`});}
 await p.waitForSelector('.stage-result',{timeout:400000});
 const score=Number(await p.$eval('.result-score strong',e=>e.textContent)),line=await p.$eval('.stage-result p',e=>e.textContent);
 if(OUT)await p.screenshot({path:`${OUT}/game-${id}-result.png`});
 check('game '+id+' '+JSON.stringify(opts),expect(score),score+' | '+line);
 await p.click('#g-close');await p.waitForTimeout(300);
}
const only=process.env.ONLY;
if(!only||only==='jam'){await jam('ii-v-i');await jam('ii-v-i',{wrong:true});await jam('bossa');await jam('ii-v-i',{gain:.05});}
if(!only||only==='call')await game('call',{kind:'call',rounds:8},s=>s>=5,{shot:6000});
if(!only||only==='survival')await game('survival',{kind:'survival',rounds:5},s=>s>=90,{pat:'mix'});
if(!only||only==='clock')await game('clock',{kind:'clock',bpm:100,beats:240},s=>s===16,{cb:100});
if(!only||only==='clock')await game('clock',{kind:'clock',bpm:100,beats:200,drift:.006},s=>s<16,{cb:100});
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

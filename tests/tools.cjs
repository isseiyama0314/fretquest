/* Browser checks for the tuner and automatic timing measurement, with a synthetic microphone.
   Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.addInitScript(()=>{
 navigator.mediaDevices.getUserMedia=async()=>{
  const ctx=window.FretQuest.audioContext(),dest=ctx.createMediaStreamDestination(),T=ctx.currentTime,plan=window.__plan;
  const pluck=(t,freq,dur,v=.3)=>{const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.value=freq;f.type='lowpass';f.frequency.value=2500;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.005);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(f);f.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.05);};
  if(plan.kind==='tone')pluck(T+.05,plan.freq,30,plan.v||.25);
  /* Mic check: faint room noise from the start, then 4 strums at plan.v during the playing phase (from 2 s). */
  if(plan.kind==='mic'){const n=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=n;src.loop=true;g.gain.value=plan.noise??.0002;src.connect(g);g.connect(dest);src.start();
   if(plan.v)for(let k=0;k<4;k++)[82.4,110,146.8].forEach((f,j)=>pluck(T+2.6+k*1.2+j*.008,f,1,plan.v));}
  /* The app reads its start time just after the microphone opens, so schedule from the next task to share that clock reading. */
  if(plan.kind==='cal')setTimeout(()=>{const T2=ctx.currentTime,spb=60/90;for(let i=0;i<8;i++)[82.4,110,146.8].forEach((f,k)=>pluck(T2+.5+(4+i)*spb+plan.off+k*.006,f,.09,.12));},0);
  if(plan.kind==='stage'){const l=window.FQCourses.flatMap(c=>c.lessons).find(x=>x.id===plan.id),e=l.exercise,spb=60/e.bpm,t0=T+.35+4*spb+plan.off;e.notes.forEach(n=>pluck(t0+n.beat*spb,440*Math.pow(2,(n.midi-69)/12),n.len*spb*.95));}
  return dest.stream;};
});
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>window.FretQuest.ensureAudio());await p.waitForTimeout(800);
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};

async function tune(freq,expect){
 await p.evaluate(f=>{window.__plan={kind:'tone',freq:f};},freq);
 await p.click('#open-tuner');await p.click('#tn-start');await p.waitForTimeout(1800);
 const r=await p.evaluate(()=>({note:document.querySelector('#tn-note').textContent,cents:document.querySelector('#tn-cents').textContent,inTune:document.querySelector('.tuner-face').classList.contains('in-tune'),done:[...document.querySelectorAll('.tuner-strings .done b')].map(x=>x.textContent).join('')}));
 if(OUT)await p.screenshot({path:`${OUT}/tuner-${freq}.png`});
 check('tuner '+freq+'Hz',expect(r),JSON.stringify(r));
 await p.click('#modal-close');await p.waitForTimeout(300);
}
await tune(110*Math.pow(2,8/1200),r=>r.note==='A'&&r.cents==='+8 セント'&&!r.inTune);
await tune(110,r=>r.note==='A'&&r.inTune&&r.done==='A');
await tune(196*Math.pow(2,-20/1200),r=>r.note==='G'&&r.cents==='-20 セント');

// Mic sensitivity: a very quiet string is below the tuner's gate at ×1; tapping the MIC badge to ×4 makes it readable while listening, and ×12 is kept.
{await p.evaluate(()=>{localStorage.setItem('fretQuestMicGain','1');window.__plan={kind:'tone',freq:110,v:.002};});
 await p.click('#open-tuner');await p.click('#tn-start');await p.waitForTimeout(1800);
 const read=()=>p.evaluate(()=>({badge:document.querySelector('[data-mic-gain]').textContent,note:document.querySelector('#tn-note').textContent,level:parseFloat(document.querySelector('#tn-level').style.width)||0}));
 const x1=await read();await p.click('[data-mic-gain]');await p.waitForTimeout(1500);const x4=await read();
 await p.click('[data-mic-gain]');await p.waitForTimeout(600);const x12=await read(),saved=await p.evaluate(()=>localStorage.getItem('fretQuestMicGain'));
 check('mic sensitivity lifts a quiet string',x1.badge==='MIC ×1'&&x1.note!=='A'&&x4.badge==='MIC ×4'&&x4.note==='A'&&x4.level>x1.level+10&&x12.level>x4.level&&saved==='12',JSON.stringify({x1,x4,x12,saved}));
 await p.evaluate(()=>localStorage.removeItem('fretQuestMicGain'));await p.click('#modal-close');await p.waitForTimeout(300);}

// Mic check: the setting buttons save the default and every MIC badge follows; the check recommends the smallest gain that lifts
// normal playing to about -30 dBFS (loud → ×1, normal → ×4, very quiet → ×12 with a move-closer note), and says when nothing was played.
{const check1=async(plan,start)=>{await p.evaluate(({plan,start})=>{localStorage.setItem('fretQuestMicGain',String(start));window.__plan=plan;},{plan,start});
  await p.click('#open-miccheck');await p.click('#mc-start');await p.waitForFunction(()=>document.querySelector('#mc-start').textContent==='もう一度チェック',null,{timeout:20000}).catch(()=>{});
  const r=await p.evaluate(()=>({phase:document.querySelector('#mc-phase').textContent,sub:document.querySelector('#mc-sub').textContent,result:document.querySelector('#mc-result').innerText,apply:document.querySelector('#mc-apply')?.textContent||''}));
  return r;};
 const loud=await check1({kind:'mic',v:.25},4);await p.click('#mc-apply').catch(()=>{});
 const savedLoud=await p.evaluate(()=>({g:localStorage.getItem('fretQuestMicGain'),pressed:document.querySelector('[data-mc-gain][aria-pressed="true"]')?.dataset.mcGain}));
 if(OUT)await p.screenshot({path:`${OUT}/miccheck.png`});
 await p.click('#modal-close');await p.waitForTimeout(300);
 const normal=await check1({kind:'mic',v:.03},1);await p.click('#modal-close');await p.waitForTimeout(300);
 const faint=await check1({kind:'mic',v:.003},4);await p.click('#modal-close');await p.waitForTimeout(300);
 const none=await check1({kind:'mic',v:0},4);
 await p.click('[data-mc-gain="12"]');const set12=await p.evaluate(()=>localStorage.getItem('fretQuestMicGain'));
 await p.click('#modal-close');await p.waitForTimeout(300);await p.click('#open-tuner');const badge=await p.textContent('[data-mic-gain]');
 check('mic check recommends a gain and sets the default',loud.phase==='おすすめ ×1'&&loud.apply==='×1 を基本設定にする'&&savedLoud.g==='1'&&savedLoud.pressed==='1'
  &&normal.phase==='おすすめ ×4'&&faint.phase==='おすすめ ×12'&&/近づける/.test(faint.sub)&&none.phase==='弦の音を拾えませんでした'&&set12==='12'&&badge==='MIC ×12',JSON.stringify({loud,savedLoud,normal,faint,none,set12,badge}));
 await p.evaluate(()=>localStorage.removeItem('fretQuestMicGain'));await p.click('#modal-close');await p.waitForTimeout(300);}

// Timing: a player 0.2 s late on every click; the measured offset must fix a stage played 0.2 s late.
await p.evaluate(()=>{window.__plan={kind:'cal',off:.2};});
await p.click('#open-calibrate');await p.click('#cal-start');await p.waitForFunction(()=>/秒$/.test(document.querySelector('#cal-phase').textContent)&&document.querySelector('#cal-start').textContent==='もう一度測る',null,{timeout:30000}).catch(()=>{});
const cal=await p.evaluate(()=>({phase:document.querySelector('#cal-phase').textContent,sub:document.querySelector('#cal-sub').textContent,saved:JSON.parse(localStorage.getItem('fretQuestStage')||'{}').latency}));
if(OUT)await p.screenshot({path:`${OUT}/calibrate.png`});
check('calibrate +0.2s',Math.abs(cal.saved-.2)<=.05,JSON.stringify(cal));
await p.click('#modal-close');await p.waitForTimeout(300);

await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('fretQuestV1')||'{"xp":0,"history":{}}');s.courses={};for(const id of ['first-1','first-2','first-3','first-4','first-5'])s.courses[id]={completedAt:new Date().toISOString(),bestScore:0,attempts:1,method:'self'};localStorage.setItem('fretQuestV1',JSON.stringify(s));window.__plan={kind:'stage',id:'first-6',off:.2};});
await p.reload({waitUntil:'networkidle'});await p.evaluate(()=>{window.__plan={kind:'stage',id:'first-6',off:.2};});
await p.evaluate(()=>window.FretQuest.ensureAudio());await p.waitForTimeout(800);
await p.click('[data-course="first"]');await p.click('[data-lesson="first-6"]');await p.click('#lesson-begin');await p.waitForSelector('#stage-measure');
const label=await p.$eval('#stage-measure',e=>e.textContent);
await p.click('[data-input="mic"]');await p.click('[data-speed="1"]');await p.click('#stage-start');
await p.waitForSelector('.stage-result',{timeout:90000});
const score=Number(await p.$eval('.result-score strong',e=>e.textContent));
check('stage after calibration (0.2 s late player)',score>=95,score+' | lobby: '+label);
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

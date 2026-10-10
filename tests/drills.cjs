/* Browser checks for the pitch-judged guitar drills with a synthetic "guitar" as the microphone.
   The fake guitar answers whatever the drill currently asks (read through FQDrills.state()).
   Usage is the same as stage-playthrough.cjs (serve the folder that contains fretquest/ on port 8765). */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.addInitScript(()=>{
 navigator.mediaDevices.getUserMedia=async()=>{
  const ctx=window.FretQuest.audioContext(),dest=ctx.createMediaStreamDestination(),hz=m=>440*Math.pow(2,(m-69)/12);
  /* Rings at a steady level, then dies away over the last 0.3 s, like a sustained guitar note. */
  const voice=(t,dur,v)=>{const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='sawtooth';f.type='lowpass';f.frequency.value=2500;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.005);g.gain.exponentialRampToValueAtTime(v*.4,t+Math.max(.05,dur-.3));g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(f);f.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.05);return o;};
  window.__fake={
   pluck(t,midi,dur=.5,v=.3){voice(t,dur,v).frequency.value=hz(midi);},
   /* Pick the fretted note, then push it up to the bent pitch and hold. */
   bend(t,from,to){const o=voice(t,1.4,.3);o.frequency.setValueAtTime(hz(from),t);o.frequency.setValueAtTime(hz(from),t+.15);o.frequency.exponentialRampToValueAtTime(hz(to),t+.4);}
  };
  return dest.stream;};
});
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>window.FretQuest.ensureAudio());await p.waitForTimeout(800);
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
check('cards',(await p.$$eval('#drill-cards [data-drill]',e=>e.length))===3,'3 drills');

/* Runs a drill; answer(state) is called in the page every 60 ms with the current state and acts at most once per question. */
async function drill(id,opt,answer,expect,shot){
 await p.click(`[data-drill="${id}"]`);await p.click(`[data-opt="${opt}"]`);await p.click('#drill-start');await p.waitForSelector('#d-phase');
 await p.evaluate(src=>{window.__answer=eval(src);window.__seen=new Set();clearInterval(window.__loop);window.__loop=setInterval(()=>{const s=window.FQDrills.state();if(s)window.__answer(s,window.__fake,window.__seen);},60);},answer.toString());
 if(OUT&&shot){await p.waitForTimeout(shot);await p.screenshot({path:`${OUT}/drill-${id}.png`});}
 await p.waitForSelector('.stage-result',{timeout:400000});await p.evaluate(()=>clearInterval(window.__loop));
 const score=Number(await p.$eval('.result-score strong',e=>e.textContent)),line=await p.$eval('.stage-result p',e=>e.textContent);
 if(OUT&&shot)await p.screenshot({path:`${OUT}/drill-${id}-result.png`});
 check(id+' '+opt+' '+expect.name,expect(score),score+' | '+line);
 await p.click('#d-close');await p.waitForTimeout(300);
}
const only=process.env.ONLY;
if(!only||only==='hunt'){
 await drill('hunt','2',(s,f,seen)=>{if(s.q&&!seen.has(s.q.shownAt)){seen.add(s.q.shownAt);f.pluck(s.now+.05,s.q.targets[0]);}},function cleanFindsMany(x){return x>=30;},5000);
 /* Always a semitone above the target: the right string, the wrong note. */
 await drill('hunt','1',(s,f,seen)=>{if(s.q&&!seen.has(s.q.shownAt)){seen.add(s.q.shownAt);f.pluck(s.now+.05,s.q.targets[0]+1,.4);}},function wrongNotesScoreZero(x){return x===0;});
}
if(!only||only==='change'){
 /* Root on beat 1, a strum of the chord on beat 3, like a player would. */
 const play=late=>`(s,f,seen)=>{if(!s.round||seen.has(s.round.bars[0].t))return;seen.add(s.round.bars[0].t);const spb=60/s.round.bpm,K=window.FQStage.kit,names=window.__names;
  s.round.bars.forEach((b,i)=>{f.pluck(b.t+${late},b.midi,spb*1.5);K.chordMidis(names[i]).forEach((m,k)=>f.pluck(b.t+2*spb+k*.008,m,spb*1.2,.08));});}`;
 await p.evaluate(()=>{window.__names=['G','C','D','G'];});
 await drill('change','gcd',eval(play(0)),function onTimeReaches140(x){return x===140;},12000);
 await drill('change','gcd',eval(play(.45)),function lateChangesScoreZero(x){return x===0;});
}
if(!only||only==='bend'){
 await drill('bend','2',(s,f,seen)=>{if(s.q&&!seen.has(s.q.go)){seen.add(s.q.go);f.bend(s.q.go+.1,s.q.base,s.q.target);}},function cleanBendsScoreHigh(x){return x>=85;},6000);
 await drill('bend','2',(s,f,seen)=>{if(s.q&&!seen.has(s.q.go)){seen.add(s.q.go);f.bend(s.q.go+.1,s.q.base,s.q.target-.5);}},function underBendsScoreZero(x){return x===0;});
 /* Fretting the target note directly is not a bend. */
 await drill('bend','2',(s,f,seen)=>{if(s.q&&!seen.has(s.q.go)){seen.add(s.q.go);f.pluck(s.q.go+.1,s.q.target,1.2);}},function frettedTargetScoresZero(x){return x===0;});
}
const st=await p.evaluate(()=>{const d=window.FretQuest.getState().history[window.FretQuest.today()];return {extra:d?.extra,best:JSON.parse(localStorage.getItem('fretQuestDrills')).best};});
if(!only)check('activity and bests',['game:hunt','game:change','game:bend'].every(x=>st.extra.includes(x))&&st.best['hunt-2']>=30&&st.best['change-gcd']===140,JSON.stringify(st));
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

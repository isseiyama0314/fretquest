/* "フレーズを聴く" schedules the whole phrase ahead; leaving the screen (✕, 戻る) must cut it.
   Every synth the page creates is wrapped so the test can see whether its sound was stopped.
   Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/';
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>{const K=window.FQStage.kit,orig=K.synth;window.__synths=[];K.synth=ctx=>{const s=orig(ctx),stop=s.stop;s.stopped=false;s.stop=()=>{s.stopped=true;stop();};window.__synths.push(s);return s;};return window.FretQuest.ensureAudio();});
/* Plays the phrase on the start screen, leaves it with `leave`, and reports whether the playing synth was stopped. */
async function listenThenLeave(name,leave){
 await p.evaluate(()=>window.FQAir.start(window.FQDojo.modules.find(m=>m.id==='arp-251'),1));await p.waitForSelector('#air-listen');
 const before=await p.evaluate(()=>window.__synths.length);
 await p.click('#air-listen');await p.waitForTimeout(600);
 const made=await p.evaluate(n=>window.__synths.length>n||window.__synths.some(s=>!s.stopped),before);
 await leave();await p.waitForTimeout(300);
 const live=await p.evaluate(()=>window.__synths.filter(s=>!s.stopped).length);
 check(name,made&&live===0,'synths '+await p.evaluate(()=>window.__synths.length)+', still playing '+live);
}
await listenThenLeave('close with ✕ stops the phrase',()=>p.click('#modal-close'));
await listenThenLeave('戻る stops the phrase',()=>p.click('#air-back'));
await p.evaluate(()=>window.FretQuest.close?.());
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

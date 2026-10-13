/* Coming back from another app: iOS can leave the audio context "running" with a clock that no longer moves, so a demo
   started afterwards stays silent and still. Simulated here by freezing currentTime on a running context.
   Checks that the first start after returning replaces the frozen context and the demo runs, and that a clock freezing
   mid-run brings up the tap-to-resume button. Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/';
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>window.FretQuest.ensureAudio());
/* Leave the app and come back with a frozen clock. */
await p.evaluate(()=>{
 const ctx=window.FretQuest.audioContext();window.__old=ctx;
 const hide=v=>{Object.defineProperty(document,'hidden',{get:()=>v,configurable:true});document.dispatchEvent(new Event('visibilitychange'));};
 hide(true);const t=ctx.currentTime;Object.defineProperty(ctx,'currentTime',{get:()=>t,configurable:true});hide(false);
});
const frozen=await p.evaluate(()=>window.FretQuest.audioContext().state);
check('the frozen context still says running',frozen==='running',frozen);
/* Start a phrase demo from the dojo. */
await p.evaluate(()=>window.FQDojo.open(window.FQDojo.modules.find(m=>m.id==='bb-box')));await p.waitForSelector('.dojo-module');
await p.click('[data-step="1"]');await p.waitForSelector('#stage-demo');await p.click('#stage-demo');await p.waitForSelector('#stage-progress');
await p.waitForTimeout(3500);
const r=await p.evaluate(()=>{const ctx=window.FretQuest.audioContext(),a=ctx.currentTime;return new Promise(res=>setTimeout(()=>res({replaced:ctx!==window.__old,state:ctx.state,moved:ctx.currentTime>a,progress:parseFloat(document.querySelector('#stage-progress').style.width)||0}),300));});
check('the first start after returning replaces the frozen context and the demo runs',r.replaced&&r.state==='running'&&r.moved&&r.progress>0,JSON.stringify(r));
/* A clock that freezes during a run brings up the tap-to-resume button. */
await p.evaluate(()=>{const ctx=window.FretQuest.audioContext(),t=ctx.currentTime;Object.defineProperty(ctx,'currentTime',{get:()=>t,configurable:true});});
await p.waitForTimeout(1500);
const stall=await p.$$eval('.audio-stall',x=>x.length);
check('a clock frozen mid-run shows the resume button',stall===1,stall);
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

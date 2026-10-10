/* Audio stall recovery: if the audio clock stops mid-session (iOS interruption) and will not resume on its own,
   a "tap to resume" button appears; tapping it resumes the clock and the session moves on. Usage as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/';
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:390,height:844}});let failed=0;
const errs=[];p.on('pageerror',e=>errs.push(e.message));const check=(n,ok,d)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',n,'=>',d);};
await p.goto(BASE,{waitUntil:'networkidle'});await p.evaluate(()=>window.FretQuest.ensureAudio());
await p.evaluate(()=>window.FQJam.lobby(window.FQJam.sessions.find(s=>s.id==='blues-a'),{air:true}));await p.click('[data-ch="1"]');await p.click('#jam-start');
await p.waitForTimeout(5000);
/* Stop the clock and make automatic resume fail, as iOS does without a tap. */
await p.evaluate(async()=>{const ctx=window.FretQuest.audioContext();window.__realResume=ctx.resume.bind(ctx);ctx.resume=()=>Promise.resolve();await ctx.suspend();});
await p.waitForTimeout(1200);
const stalled=await p.evaluate(()=>({btn:!!document.querySelector('.audio-stall'),w:document.querySelector('#jam-progress').style.width}));
await p.waitForTimeout(800);const still=await p.$eval('#jam-progress',e=>e.style.width);
check('stall freezes the session and shows the resume button',stalled.btn&&stalled.w===still&&stalled.w!=='0%',JSON.stringify(stalled)+' then '+still);
await p.evaluate(()=>{const ctx=window.FretQuest.audioContext();ctx.resume=window.__realResume;});
/* Either the next automatic retry or a tap on the button resumes it. */
await p.evaluate(()=>document.querySelector('.audio-stall')?.click());await p.waitForTimeout(1500);
const after=await p.evaluate(()=>({btn:!!document.querySelector('.audio-stall'),state:window.FretQuest.audioContext().state,w:document.querySelector('#jam-progress').style.width}));
check('resume clears the button and the session moves on',!after.btn&&after.state==='running'&&after.w!==still,JSON.stringify(after));
await p.click('#jam-stop');
if(errs.length){failed++;console.log(errs);}console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

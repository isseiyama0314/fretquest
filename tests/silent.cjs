/* Silent-mode playback: with a stand-in for Safari's navigator.audioSession, sound starts as "playback",
   switches to "play-and-record" while the microphone is live and returns to "playback" afterwards.
   This checks the switching logic only; whether iOS then ignores the silent switch needs a real iPhone. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/';
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage();let failed=0;
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{navigator.audioSession={type:'auto'};navigator.mediaDevices.getUserMedia=async()=>{const ctx=window.FretQuest.audioContext();const o=ctx.createOscillator(),d=ctx.createMediaStreamDestination();o.connect(d);o.start();return d.stream;};});
await p.goto(BASE,{waitUntil:'networkidle'});
const steps=await p.evaluate(async()=>{const F=window.FretQuest,out=[];await F.ensureAudio();out.push(navigator.audioSession.type);
 const st=await F.openMicStream({audio:true});out.push(navigator.audioSession.type);await F.ensureAudio();out.push(navigator.audioSession.type);
 st.getTracks().forEach(t=>t.stop());await F.ensureAudio();out.push(navigator.audioSession.type);return out;});
const want=['playback','play-and-record','play-and-record','playback'],ok=JSON.stringify(steps)===JSON.stringify(want);if(!ok)failed++;
console.log(ok?'ok  ':'FAIL','audio session',JSON.stringify(steps));
if(errs.length){failed++;console.log(errs);}console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

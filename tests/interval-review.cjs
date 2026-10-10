/* Interval review: a wrong answer shows the root, the right note and the chosen note on a board (guitar and bass)
   with two playback buttons; a right answer shows no review. Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});let fails=0;
for(const inst of ['guitar','bass']){const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(i=>localStorage.setItem('fretQuestInstrument',i),inst);
await p.goto(BASE,{waitUntil:'networkidle'});
for(let i=0;i<6;i++){
 await p.evaluate(()=>window.FQTrain.run('interval',5));await p.waitForSelector('[data-choice]');
 const q=await p.evaluate(()=>({a:window.FQTrain.current().answer,c:window.FQTrain.current().choices}));
 const wrong=q.c.findIndex(x=>x!==q.a);await p.click(`[data-choice="${wrong}"]`);
 const r=await p.evaluate(()=>({board:!!document.querySelector('.interval-review svg'),right:document.querySelectorAll('circle.iv-right').length,wrongDot:document.querySelectorAll('circle.iv-wrong').length,text:document.querySelector('.interval-review p')?.innerText}));
 await p.click('[data-iv="wrong"]');await p.click('[data-iv="right"]');
 const ok=r.board&&r.right===1&&r.wrongDot===1;if(!ok)fails++;console.log(inst,ok?'ok':'FAIL',q.a,'vs',q.c[wrong],'|',r.text.replace(/\n/g,' / '));
 if(i===0&&OUT){await p.evaluate(()=>document.querySelector('.interval-review').scrollIntoView({block:'center'}));await p.screenshot({path:OUT+'/interval-review-'+inst+'.png'});}
}
// A right answer shows no review.
await p.evaluate(()=>window.FQTrain.run('interval',1));await p.waitForSelector('[data-choice]');
const a=await p.evaluate(()=>window.FQTrain.current().choices.indexOf(window.FQTrain.current().answer));await p.click(`[data-choice="${a}"]`);
const none=await p.evaluate(()=>!document.querySelector('.interval-review'));if(!none)fails++;console.log(inst,none?'ok':'FAIL','no review after a right answer');
if(errs.length){fails++;console.log(errs);}await p.close();}
console.log(fails?fails+' failed':'all passed');await b.close();process.exit(fails?1:0);})();

/* Browser checks for the feel games (offbeat, odd meters, polyrhythm) in tap mode: a player tapping every target
   clears all five levels, a silent player loses three lives at level 1. Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
await p.goto(BASE,{waitUntil:'networkidle'});
/* Taps each target on the audio clock: a tap is recorded at currentTime - comp, so fire at target + comp. */
await p.addScriptTag({content:`window.__autoTap=()=>{const done=new Set();const loop=()=>{const r=window.FQGames.run();if(!r)return;const R=r.round;if(R)R.targets.forEach(t=>{const k=t.toFixed(4);if(done.has(k))return;const dt=t+r.comp-r.ctx.currentTime;if(dt<.06&&dt>-.005){done.add(k);setTimeout(()=>document.querySelector('#g-pad').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true})),Math.max(0,dt*1000));}});requestAnimationFrame(loop);};loop();};`});
async function game(id,tap,shot){
 await p.click(`[data-game="${id}"]`);await p.click('[data-in="tap"]');await p.click('#game-start');await p.waitForSelector('#g-pad');
 if(tap)await p.evaluate(()=>window.__autoTap());
 if(shot){await p.waitForTimeout(2600);await p.screenshot({path:OUT+'/feel-'+id+'.png'});}
 await p.waitForSelector('.stage-result',{timeout:300000});
 const r=await p.evaluate(()=>({score:document.querySelector('.result-score strong').textContent,line:document.querySelector('.stage-result p').textContent}));
 await p.click('#g-close');await p.waitForTimeout(300);return r;
}
for(const id of ['offbeat','odd','poly']){const r=await game(id,true,OUT);check(id+' perfect taps clear every level',r.score==='5'&&r.line.includes('全レベル制覇'),JSON.stringify(r));}
const r=await game('offbeat',false,false);check('silence ends at level 0',r.score==='0',JSON.stringify(r));
const best=await p.$eval('[data-game="poly"] .game-best',e=>e.textContent);check('best shown',best==='BEST Lv5',best);
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

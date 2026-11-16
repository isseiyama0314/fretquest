/* End-to-end rehearsal: real audio clock, full form, recovery, cancellation, records and offline assets. */
const {chromium}=require(process.env.PW||'playwright');
const assert=require('node:assert/strict');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/';
(async()=>{
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE,{waitUntil:'networkidle'});
 await page.click('#rpm-open');
 assert.equal(await page.locator('[data-rpm-track]').count(),3);
 for(const id of ['funk-e9','funk-minor','blues-a']){
  await page.click('[data-rpm-track="'+id+'"]');
  const bars=await page.locator('.rpm-chart span').count();assert.equal(bars,id==='blues-a'?12:8);
 }
 await page.click('[data-rpm-track="funk-e9"]');
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844});
  assert.ok(await page.evaluate(()=>document.querySelector('.modal-dialog').scrollWidth<=document.querySelector('.modal-dialog').clientWidth+1),'no modal overflow at '+width);
 }
 await page.setViewportSize({width:390,height:844});
 if(process.env.OUT)await page.screenshot({path:process.env.OUT+'/rpm-lobby.png',fullPage:true});
 // A stopped rehearsal cannot earn XP or generate a completion record.
 await page.click('#rpm-start');await page.waitForSelector('#rpm-stop');await page.click('#rpm-stop');
 assert.equal(await page.evaluate(()=>window.FQRehearsal.exportData().length),0);
 assert.equal(await page.evaluate(()=>window.FretQuest.getState().xp),0);
 // Exercise the actual scheduler with code hidden and accompaniment removed.
 await page.evaluate(()=>{const e=document.querySelector('#rpm-tempo');e.value=160;e.dispatchEvent(new Event('input'));});
 await page.click('[data-rpm-mode="blind"]');await page.uncheck('#rpm-guide');
 await page.evaluate(()=>{window.__rpmBeats=[];const original=window.FQJam.scheduleBeat;window.FQJam.scheduleBeat=(r,b)=>{window.__rpmBeats.push({beat:b,t:r.t0+b*r.spb});return original(r,b);};});
 await page.click('#rpm-start');
 await page.waitForFunction(()=>document.querySelector('#rpm-phase')?.textContent==='伴奏する',{timeout:15000});
 assert.equal(await page.locator('#rpm-chart').isVisible(),false);
 await page.waitForFunction(()=>document.querySelector('#rpm-phase')?.textContent==='あなたのソロ',{timeout:18000});
 await page.waitForFunction(()=>document.querySelector('#rpm-phase')?.textContent==='耳だけで数える',{timeout:18000});
 assert.equal(await page.locator('#rpm-chart').isVisible(),false);
 assert.equal(await page.locator('#rpm-bar').textContent(),'');
 if(process.env.OUT)await page.screenshot({path:process.env.OUT+'/rpm-recovery.png'});
 await page.click('#rpm-reveal');
 await page.waitForFunction(()=>!document.querySelector('#rpm-chart').hidden);
 await page.waitForFunction(()=>document.querySelector('#rpm-phase')?.textContent==='伴奏へ戻る',{timeout:18000});
 assert.equal(await page.locator('#rpm-chart').isVisible(),false,'help resets when the role changes');
 await page.waitForSelector('#rpm-save',{timeout:20000});
 assert.match(await page.locator('.rpm-result').innerText(),/コードを確認/);
 for(const c of ['groove','solo','recover','end'])await page.check('.rpm-checks input[value="'+c+'"]');
 await page.click('#rpm-save');assert.equal(await page.locator('#rpm-save').isDisabled(),true);
 const saved=await page.evaluate(()=>window.FretQuest.exportState());
 assert.equal(saved.rehearsal.length,1);assert.equal(saved.rehearsal[0].checks.length,4);assert.equal(saved.rehearsal[0].assisted,true);
 assert.ok(saved.state.xp>=20);
 assert.match(await page.locator('#rpm-entry').innerText(),/0 \/ 3/,'assisted completion is not marked as unaided readiness');
 const times=await page.evaluate(()=>window.__rpmBeats.map(b=>b.t));
 assert.equal(times.length,144);assert.ok(times.every((t,i)=>!i||Math.abs(t-times[i-1]-.375)<.001),'continuous audio across role boundaries');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.evaluate(()=>window.FQRehearsal.exportData().length),1);
 await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
 await page.evaluate(b=>{window.FretQuest.importState(b);window.FretQuest.importState(b);},saved);
 assert.equal(await page.evaluate(()=>window.FQRehearsal.exportData().length),1,'import deduplicates');
 assert.equal(await page.evaluate(()=>window.FretQuest.getState().xp),saved.state.xp);
 await page.evaluate(()=>window.FQRehearsal.importData([{id:'bad',mode:'guide',bpm:90,at:1,checks:[]},null]));
 assert.equal(await page.evaluate(()=>window.FQRehearsal.exportData().length),1);
 // Modal close and page hiding both cancel without awarding additional completion.
 await page.click('#rpm-open');await page.click('#rpm-start');await page.click('#modal-close');
 await page.waitForTimeout(500);assert.equal(await page.locator('#modal').isVisible(),false);
 await page.click('#rpm-open');await page.click('#rpm-start');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForSelector('#rpm-start');
 assert.equal(await page.evaluate(()=>window.FQRehearsal.exportData().length),1);
 // Offline bundle has both new assets at the same version as the HTML.
 const sw=await (await page.request.get(BASE+'sw.js')).text();assert.ok(sw.includes('./rpm.js?v=20261117-rehearsal2')&&sw.includes('./rpm.css?v=20261117-rehearsal2'));
 assert.deepEqual(errors,[]);console.log('PASS: full rehearsal, recovery, audio timeline, 3 viewport widths, cancellation, persistence, deduplicated export/import and cache manifest.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

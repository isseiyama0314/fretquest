/* Opening the app always starts at the top: a #section in the URL and a scrolled reload both land on My Studio.
   Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/';
(async()=>{
const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
const where=async()=>{await p.waitForTimeout(800);return p.evaluate(()=>({hash:location.hash,y:Math.round(scrollY)}));};
for(const h of ['#courses','#dojo-section','#practice']){await p.goto('about:blank');await p.goto(BASE+h,{waitUntil:'networkidle'});const w=await where();check('open '+h,w.hash===''&&w.y===0,JSON.stringify(w));}
await p.goto(BASE,{waitUntil:'networkidle'});await p.click('.nav-link[href="#courses"]');await p.waitForTimeout(800);
const before=await p.evaluate(()=>Math.round(scrollY));await p.reload({waitUntil:'networkidle'});const w=await where();
check('reload after the menu jump',before>0&&w.hash===''&&w.y===0,'before '+before+' '+JSON.stringify(w));
const m=await p.evaluate(async()=>(await (await fetch('./manifest.webmanifest')).json()).start_url);check('manifest start_url',m==='./',m);
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

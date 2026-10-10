/* Browser checks for the rhythm book and the weak-rhythm remix, with a synthetic microphone.
   Usage is the same as stage-playthrough.cjs. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/',OUT=process.env.OUT;
const P='x..x..x...x.x...',BPM=84;
(async()=>{
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[];let failed=0;p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const check=(name,ok,detail)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',name,'=>',detail);};
await p.addInitScript(({P,BPM})=>{
 navigator.mediaDevices.getUserMedia=async()=>{
  const ctx=window.FretQuest.audioContext(),dest=ctx.createMediaStreamDestination(),plan=window.__plan;
  const pluck=(t,m)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=440*Math.pow(2,(m-69)/12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.005);g.gain.exponentialRampToValueAtTime(.001,t+.09);o.connect(g);g.connect(dest);o.start(t);o.stop(t+.12);};
  /* The app reads its start time right after the microphone opens; schedule from the next task to share it. */
  if(plan==='remix')setTimeout(()=>{const T=ctx.currentTime,spb=60/BPM;let start=T+.4+4*spb;for(let round=0;round<8;round++){const resp=start+4*spb;[...P].forEach((c,i)=>{if(c==='x')[40,45,50].forEach((m,k)=>pluck(resp+i*spb/4+k*.006,m));});start=resp+6*spb;}},0);
  return dest.stream;};
},{P,BPM});
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>window.FretQuest.ensureAudio());await p.waitForTimeout(600);
const book=()=>p.evaluate(()=>window.FQStage.kit.rhythmBook.weak().map(w=>w.p+' '+w.src));

// 1. A stage with no input files its missed bars.
await p.evaluate(()=>{const s={xp:0,history:{},courses:{},unlocked:['chords']};localStorage.setItem('fretQuestV1',JSON.stringify(s));});await p.reload({waitUntil:'networkidle'});
await p.click('[data-course="chords"]');await p.click('[data-lesson="chords-1"]');await p.click('#lesson-begin');await p.click('[data-input="tap"]');await p.click('[data-speed="1"]');await p.click('#stage-start');
await p.waitForSelector('.stage-result',{timeout:90000});await p.click('#stage-back');
let bk=await book();check('stage misses fill the book',bk.some(x=>x.startsWith('x...x...x....... CとGを行き来する'))&&bk.length>=2,bk.join(' | '));

// 2. Remix with one weak rhythm, played perfectly: 8/8 and the rhythm graduates.
await p.evaluate(P=>{localStorage.setItem('fretQuestRhythmBook',JSON.stringify({items:{[P]:{p:P,bpm:84,src:'テスト',miss:2,hit:0,streak:0,last:Date.now()}}}));window.__plan='remix';},P);
await p.click('[data-game="remix"]');
const lobbyBook=await p.$eval('.book',e=>e.innerText.replace(/\n/g,' '));
if(OUT)await p.screenshot({path:OUT+'/remix-lobby.png'});
await p.click('[data-in="mic"]');await p.click('#game-start');
if(OUT){await p.waitForTimeout(5200);await p.screenshot({path:OUT+'/remix-play.png'});}
await p.waitForSelector('.stage-result',{timeout:180000});
const res=await p.evaluate(()=>({score:document.querySelector('.result-score strong').textContent,line:document.querySelector('.stage-result p').textContent}));
if(OUT)await p.screenshot({path:OUT+'/remix-result.png'});
bk=await book();check('remix perfect run',res.score==='8'&&res.line.includes('克服')&&!bk.some(x=>x.startsWith(P))&&lobbyBook.includes('テスト'),JSON.stringify(res)+' book: '+bk.length);
await p.click('#g-close');await p.waitForTimeout(300);

// 3. Call & response with silence: the result lists missed rhythms and offers a review.
await p.evaluate(()=>{window.__plan='silent';});
await p.click('[data-game="call"]');await p.click('[data-in="mic"]');await p.click('#game-start');
await p.waitForSelector('.stage-result',{timeout:180000});
const hasReview=!!(await p.$('#g-review'));if(OUT)await p.screenshot({path:OUT+'/call-review.png'});
if(hasReview){await p.click('#g-review');await p.waitForTimeout(300);}
const title=await p.$eval('#modal-title',e=>e.textContent);
check('call misses offer a review',hasReview&&title==='苦手リミックス',title);
if(errs.length){failed++;console.log('page errors',JSON.stringify(errs));}
console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

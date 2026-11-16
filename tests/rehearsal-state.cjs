/* Deterministic DOM/audio-scheduling regression checks. Requires jsdom; no browser or microphone. */
const {JSDOM}=require(process.env.JSDOM||'jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'http://localhost/fretquest/',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.scrollTo=()=>{};let frames=new Map(),counter=0;w.requestAnimationFrame=fn=>{frames.set(++counter,fn);return counter;};w.cancelAnimationFrame=id=>frames.delete(id);
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
const starts=[];let stopped=0;
const ctx={state:'running',currentTime:0,sampleRate:48000,baseLatency:0,outputLatency:0,destination:{},createBuffer:()=>({getChannelData:()=>new Float32Array(19200)}),createGain:()=>({gain:param(),connect(){},disconnect(){stopped++;}}),createBiquadFilter:()=>({frequency:param(),connect(){}}),createOscillator:()=>({frequency:param(),connect(){},start(t){assert.ok(Number.isFinite(t));starts.push(t);},stop(){}}),createBufferSource:()=>({connect(){},start(t){assert.ok(Number.isFinite(t));starts.push(t);},stop(){}})};
for(const f of ['instrument.js','lessons.js','pitch.js','app.js','stage.js','jam.js','rpm.js'])w.eval(fs.readFileSync(f,'utf8'));
w.FretQuest.ensureAudio=async()=>{};w.FretQuest.audioContext=()=>ctx;w.FretQuest.keepAudio=()=>{};
const click=s=>{assert.ok(d.querySelector(s),s);d.querySelector(s).click();};
const tick=seconds=>{const end=ctx.currentTime+seconds;while(ctx.currentTime<end){ctx.currentTime=Math.min(end,ctx.currentTime+.02);const work=[...frames.values()];frames.clear();work.forEach(fn=>fn());}};
async function start(){click('#rpm-start');await new Promise(setImmediate);assert.ok(d.querySelector('#rpm-stop'),d.querySelector('#toast').textContent+' | '+d.querySelector('#modal-inner').textContent.slice(-400));}
(async()=>{
 let completions=0;
 for(const id of ['funk-e9','funk-minor','blues-a'])for(const mode of ['guide','blind']){
  click('#rpm-open');click('[data-rpm-track="'+id+'"]');click('[data-rpm-mode="'+mode+'"]');
  const input=d.querySelector('#rpm-tempo');input.value=160;input.dispatchEvent(new w.Event('input'));
  const guide=d.querySelector('#rpm-guide');guide.checked=false;guide.dispatchEvent(new w.Event('change'));
  // Capture the actual scheduling API to assert no keys are played while the user accompanies.
  const orig=w.FQJam.band,keyTimes=[];w.FQJam.band=(...args)=>{const b=orig(...args),keys=b.keys;return {...b,keys:(t,...rest)=>{keyTimes.push(t);return keys(t,...rest);}};};
  const before=ctx.currentTime;await start();const t0=before+.25+4*.375;tick(2);
  assert.equal(d.querySelector('#rpm-chart').hidden,mode==='blind');
  const length=id==='blues-a'?12:8;
  tick(4*.375*4);assert.equal(d.querySelector('#rpm-phase').textContent,'伴奏する');
  const beforeRecord=w.FQRehearsal.exportData().length;
  tick(length*4*.375);assert.equal(d.querySelector('#rpm-phase').textContent,'あなたのソロ');
  tick(length*4*.375);assert.equal(d.querySelector('#rpm-phase').textContent,'耳だけで数える');
  assert.equal(d.querySelector('#rpm-chart').hidden,true);assert.equal(d.querySelector('#rpm-bar').textContent,'');
  if(mode==='guide'){click('#rpm-reveal');tick(.02);assert.equal(d.querySelector('#rpm-chart').hidden,false);}
  tick(length*4*.375);assert.equal(d.querySelector('#rpm-phase').textContent,'伴奏へ戻る');assert.equal(d.querySelector('#rpm-chart').hidden,mode==='blind');
  tick(length*4*.375+2);assert.ok(d.querySelector('#rpm-save'),'full form ends');
  assert.equal(w.FQRehearsal.exportData().length,beforeRecord,'completion requires explicit reflection save');
  for(const ch of d.querySelectorAll('.rpm-checks input'))ch.checked=true;click('#rpm-save');completions++;
  assert.equal(w.FQRehearsal.exportData().length,completions);assert.equal(d.querySelector('#rpm-save').disabled,true);
  assert.ok(!keyTimes.some(t=>t>=t0+16*.375&&t<t0+(16+length*4)*.375),'no competing keys during accompaniment');
  const item=w.FQRehearsal.exportData().at(-1);assert.equal(item.assisted,mode==='guide');
  w.FQJam.band=orig;w.FretQuest.close();
 }
 const backup=JSON.parse(JSON.stringify(w.FretQuest.exportState())),xp=backup.state.xp;
 w.FretQuest.importState(backup);w.FretQuest.importState(backup);
 assert.equal(w.FQRehearsal.exportData().length,6);assert.equal(w.FretQuest.getState().xp,xp);
 assert.match(d.querySelector('#rpm-entry').textContent,/3 \/ 3/);
 w.FQRehearsal.importData([null,{id:'unknown',bpm:80,at:1,mode:'guide',checks:[]}]);assert.equal(w.FQRehearsal.exportData().length,6);
 // Stop, modal close, hidden page and pending start cancellation must never grant records or XP.
 click('#rpm-open');await start();tick(2);click('#rpm-stop');assert.equal(frames.size,0);
 await start();w.FretQuest.close();assert.equal(frames.size,0);
 click('#rpm-open');await start();Object.defineProperty(d,'hidden',{configurable:true,value:true});d.dispatchEvent(new w.Event('visibilitychange'));assert.ok(d.querySelector('#rpm-start'));assert.equal(frames.size,0);
 Object.defineProperty(d,'hidden',{configurable:true,value:false});let resolve;w.FretQuest.ensureAudio=()=>new Promise(r=>resolve=r);click('#rpm-start');w.FretQuest.close();resolve();await Promise.resolve();assert.equal(frames.size,0);
 assert.equal(w.FQRehearsal.exportData().length,6);assert.equal(w.FretQuest.getState().xp,xp);
 // Slow foreground frame must abort rather than scheduling a burst of old beats.
 w.FretQuest.ensureAudio=async()=>{};click('#rpm-open');await start();ctx.currentTime+=10;tick(.02);assert.ok(d.querySelector('#rpm-start'));assert.equal(frames.size,0);
 assert.ok(starts.length>1000);
 console.log('PASS: 6 complete runs, both guidance modes, all chord forms, recovery reveal/reset, keyboard-free accompaniment, ending, records/XP deduplication, invalid import, close/hide/pending cancellation and stalled-frame abort.');
 dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exit(1);});

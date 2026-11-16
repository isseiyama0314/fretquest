/* Playback-pitch regression checks. Requires jsdom; no browser or microphone. */
const {JSDOM}=require(process.env.JSDOM||'jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=f=>fs.readFileSync(f,'utf8'),settle=()=>new Promise(setImmediate);
function setup(instrument,setting){
 const dom=new JSDOM(source('index.html'),{url:'http://localhost/fretquest/',runScripts:'outside-only'}),w=dom.window;
 w.localStorage.setItem('fretQuestInstrument',instrument);if(setting)w.localStorage.setItem('fretQuestBassVoice',setting);
 w.scrollTo=()=>{};w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 const canvas=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
 w.HTMLCanvasElement.prototype.getContext=()=>canvas;
 const tones=[],param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const ctx={state:'running',currentTime:10,sampleRate:48000,baseLatency:0,destination:{},createBuffer:()=>({getChannelData:()=>new Float32Array(19200)}),createGain:()=>({gain:param(),connect(){},disconnect(){}}),createBiquadFilter:()=>({frequency:param(),connect(){}}),createOscillator(){return {type:'sine',frequency:param(),connect(){},start(t){tones.push({type:this.type,midi:Math.round(69+12*Math.log2(this.frequency.value/440)),t});},stop(){}};},createBufferSource:()=>({connect(){},start(){},stop(){}})};
 for(const f of ['instrument.js','lessons.js','pitch.js','app.js','stage.js','tools.js','jam.js','games.js','air.js','licks.js','train.js'])w.eval(source(f));
 w.FretQuest.ensureAudio=async()=>{};w.FretQuest.audioContext=()=>ctx;w.FretQuest.keepAudio=()=>{};w.FQInst.mount();
 return {dom,w,d:w.document,tones};
}
(async()=>{
 for(const instrument of ['guitar','bass']){
  const {dom,w,d,tones}=setup(instrument);
  try{
   const I=w.FQInst,raw=[28,33,38,43],course=w.FQCourses.find(c=>c.lessons.some(l=>l.type==='song')),lesson=course.lessons.find(l=>l.type==='song');
   const adapted=JSON.stringify(I.adapt(lesson));
   assert.equal(d.querySelector('#bass-voice').hidden,instrument!=='bass');
   if(instrument==='bass')assert.equal(I.bassVoice(),'clear');
   for(const setting of ['clear','natural']){
    I.setVoice(setting);const shift=instrument==='bass'&&setting==='clear'?24:0;
    assert.deepEqual(raw.map(I.voice),raw.map(m=>m+shift));assert.equal(JSON.stringify(I.adapt(lesson)),adapted);
    // A real stage demo must schedule the audible register without changing the chart.
    w.FretQuest.show(()=>w.FQStage.lobby({lesson,course},{}));tones.length=0;d.querySelector('#stage-demo').click();await settle();
    const expected=instrument==='bass'?I.adapt(lesson).exercise.notes.map(n=>n.midi):lesson.exercise.notes.map(n=>n.midi);
    assert.deepEqual(tones.filter(x=>x.type==='sawtooth').map(x=>x.midi),Array.from(expected,m=>m+shift),'stage guide '+instrument+' '+setting);
    w.FretQuest.close();
    // Screen-board sounds use exactly one transposition.
    tones.length=0;await w.FQAir.tapSound(raw[0]);
    assert.deepEqual(tones.filter(x=>x.type==='sawtooth').map(x=>x.midi),[raw[0]+shift]);
    // Melody prompt pitches and answer targets remain separated.
    const q=w.FQTrain.modes.melody.make(1),answer=Array.from(q.melody);tones.length=0;await q.play();
    assert.deepEqual(tones.filter(x=>x.type==='sawtooth').map(x=>x.midi),answer.map(m=>m+shift));assert.deepEqual(Array.from(q.answer),answer);
    w.FQTrain.run('melody',1);await settle();const current=w.FQTrain.current(),m=current.melody[0];tones.length=0;d.querySelector('[data-midi="'+m+'"]').click();await settle();
    assert.equal(tones.filter(x=>x.type==='sawtooth').at(-1).midi,m+shift,'melody tap matches prompt register');w.FretQuest.close();
    // The tuner must keep its displayed target at E1/E2 while changing only reference playback.
    let ref=null;w.FretQuest.playTone=async m=>{ref=m;return true;};w.FQTools.tuner();const low=instrument==='bass'?28:40;
    d.querySelector('[data-tn="'+low+'"]').click();assert.equal(ref,low+shift);assert.ok(d.querySelector('[data-tn="'+low+'"]'));w.FretQuest.close();
    // General interval prompts retain their original register in both output settings.
    const rng=w.Math.random;w.Math.random=()=>.1;const iv=w.FQTrain.modes.interval.make(1);w.Math.random=rng;tones.length=0;await iv.play();
    assert.ok(tones.filter(x=>x.type==='sawtooth').every(x=>x.midi<80));
   }
   assert.equal(w.localStorage.getItem('fretQuestBassVoice'),'natural');
  }finally{dom.window.close();}
 }
 const persisted=setup('bass','natural');assert.equal(persisted.w.FQInst.voice(28),28);assert.equal(persisted.d.querySelector('[data-bass-voice="natural"]').getAttribute('aria-pressed'),'true');persisted.dom.window.close();
 const invalid=setup('bass','invalid');assert.equal(invalid.w.FQInst.voice(28),52);invalid.dom.window.close();
 console.log('PASS: bass/guitar × clear/natural, stage demonstrations, fretboard notes, melody prompts and taps, tuner references, unchanged charts/answers/general intervals, saved setting and invalid-value fallback.');
})().catch(e=>{console.error(e);process.exit(1);});

/* Timed taps on the audio clock, shared by the browser checks.
   The play screens judge taps against the AudioContext clock, from a start time they set when the start button is clicked
   (stage.js: ctx.currentTime+.35+meter*spb; air.js and jam.js: ctx.currentTime+.4+count-in beats*spb). Scheduling taps
   from Playwright on the wall clock adds ~120 ms of delivery delay, and headless Chromium's audio clock can stall for a few
   hundred ms mid-run, which shifts every later tap and fails runs at random. So the audio time of the start click is
   recorded in the page, and taps are dispatched from inside the page when the audio clock reaches each one.
   Usage:  await armStart(p,'#stage-start');await p.click('#stage-start');await p.waitForSelector('#stage-pad');
           await tapOnClock(p,times.map(at=>({at,sel:'#stage-pad'})));
   `at` is seconds of audio time after the start click; taps are sent in order, several may share a time. */
async function armStart(p,sel){
 await p.evaluate(sel=>{window.__a0=null;document.querySelector(sel).addEventListener('click',()=>{window.__a0=window.FretQuest.audioContext().currentTime;},{capture:true,once:true});},sel);
}
async function tapOnClock(p,taps){
 await p.evaluate(async taps=>{
  const ctx=window.FretQuest.audioContext();if(window.__a0==null)throw new Error('start click was not recorded; call armStart before clicking start');
  for(const {at,sel} of taps){
   while(ctx.currentTime<window.__a0+at)await new Promise(r=>setTimeout(r,2));
   const el=document.querySelector(sel);if(!el)throw new Error('no tap target '+sel);
   el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,composed:true}));}
 },taps);
}
module.exports={armStart,tapOnClock};

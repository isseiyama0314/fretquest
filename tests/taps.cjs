/* Screen taps sent on the audio clock, from inside the page.
   Stages, the board and sessions judge taps against the AudioContext clock. Timing taps from Playwright on the wall clock
   adds ~120 ms of delivery delay, and headless Chromium's audio clock can stall for a few hundred ms mid-run, which
   shifts every later tap and fails runs at random. So: note the audio time when the start button is clicked, then
   dispatch each tap once the audio clock reaches its time after that click. */

/* Call before clicking the start button; the click handler that computes the screen's start time runs right after.
   The audio context is created first, since some screens only create it inside that click. */
exports.armStart=(p,selector)=>p.evaluate(async sel=>{await window.FretQuest.ensureAudio();document.querySelector(sel).addEventListener('click',()=>{window.__a0=window.FretQuest.audioContext().currentTime;},{capture:true,once:true});},selector);

/* taps: [{at: seconds after the start click, sel: a selector or a list of selectors tapped together}] */
exports.tapOnAudioClock=(p,taps)=>p.evaluate(async taps=>{
 const ctx=window.FretQuest.audioContext();
 for(const t of taps){
  while(ctx.currentTime<window.__a0+t.at)await new Promise(r=>setTimeout(r,2));
  for(const sel of [].concat(t.sel))document.querySelector(sel)?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,composed:true}));
 }
},taps);

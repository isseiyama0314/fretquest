/* FRET QUEST tools: a microphone tuner and an automatic timing (latency) measurement.
   Microphone audio is analysed on this device only. Nothing is recorded or uploaded. */
(()=>{'use strict';
const F=window.FretQuest,K=window.FQStage.kit,$=s=>document.querySelector(s);
const INST=window.FQInst.get(),BASS=window.FQInst.isBass();
const STRINGS=BASS?[{n:4,midi:28,name:'E'},{n:3,midi:33,name:'A'},{n:2,midi:38,name:'D'},{n:1,midi:43,name:'G'}]
 :[{n:6,midi:40,name:'E'},{n:5,midi:45,name:'A'},{n:4,midi:50,name:'D'},{n:3,midi:55,name:'G'},{n:2,midi:59,name:'B'},{n:1,midi:64,name:'E'}];
let session=null;
function stop(){if(!session)return;const s=session;session=null;cancelAnimationFrame(s.raf);clearTimeout(s.timer);s.audio?.stop();if(s.mic){s.mic.stream.getTracks().forEach(t=>t.stop());s.mic.src.disconnect();}}
async function openMic(){
 await F.ensureAudio();const ctx=F.audioContext();
 if(!ctx||ctx.state!=='running')throw Error('audio');
 return {ctx,mic:await K.openMic(ctx)};
}
const micError=e=>e.name==='NotAllowedError'?'マイクが許可されていません。ブラウザの設定で許可してください。':e.message==='audio'?'音を扱えません。消音設定を確認してください。':'マイクを開始できません。他のアプリが使っていないか確認してください。';

/* ---------- Tuner ---------- */
function tuner(){
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="tool-tuner"><div class="lesson-progress">TOOLS / TUNER</div><h2 id="modal-title">チューナー</h2>'
   +'<p>1本ずつ鳴らすと、いちばん近い弦を自動で選びます。弦をタップすると、その弦に固定してお手本の音が鳴ります。</p>'
   +'<div class="tuner-face"><div class="tuner-note" id="tn-note">—</div><div class="tuner-cents" id="tn-cents">弦を1本鳴らそう</div>'
   +'<div class="tuner-meter"><span class="tuner-zone"></span><i class="tuner-needle" id="tn-needle"></i><span class="tuner-scale"><b>♭</b><b>0</b><b>♯</b></span></div>'
   +'<div class="tuner-hint" id="tn-hint">&nbsp;</div><div class="stage-mic tuner-mic"><span>MIC</span><div class="stage-level"><span id="tn-level"></span></div></div></div>'
   +'<div class="tuner-strings" role="group" aria-label="弦を選ぶ">'+STRINGS.map(s=>'<button type="button" data-tn="'+s.midi+'"><small>'+s.n+'弦</small><b>'+s.name+'</b><i aria-hidden="true">✓</i></button>').join('')+'</div>'
   +'<button type="button" class="action-button" id="tn-start">マイクをオンにする</button>'
   +'<p class="lesson-caption">'+(BASS?'4弦ベースの標準チューニング（E A D G、A4=440Hz）。お手本の音は聴きやすいよう1オクターブ上で鳴らします。':'標準チューニング（E A D G B E、A4=440Hz）。')+'±5セント以内が合格の目安です。</p></div>';
  let locked=null;const done=new Set();
  document.querySelectorAll('[data-tn]').forEach(b=>b.onclick=()=>{const m=Number(b.dataset.tn);locked=locked===m?null:m;document.querySelectorAll('[data-tn]').forEach(x=>x.classList.toggle('locked',Number(x.dataset.tn)===locked));if(locked)F.playTone(BASS?locked+12:locked,1.4);});
  $('#tn-start').onclick=async()=>{
   const generation=F.generation(),btn=$('#tn-start');btn.disabled=true;
   let opened;try{opened=await openMic();}catch(e){if(generation===F.generation()){btn.disabled=false;F.notify(micError(e));}return;}
   if(generation!==F.generation()){opened.mic.stream.getTracks().forEach(t=>t.stop());return;}
   const {ctx,mic}=opened;stop();session={mic};F.setCleanup(stop);btn.textContent='マイクで聴いています';
   const recent=[],floor=K.onsetDetector();let goodSince=0,level=0;const me=session;
   const frame=()=>{
    if(session!==me)return;
    mic.an.getFloatTimeDomainData(mic.buf);floor(mic.buf,ctx.currentTime);/* The floor creeps up under a long held note; cap the gate so a sustained string keeps reading (YIN itself rejects pitchless noise). */
    const d=window.FQPitch.detect(mic.buf,ctx.sampleRate,Math.min(floor.gate(),.003),INST.minHz);
    level=level*.7+d.rms*.3;$('#tn-level').style.width=K.meterPct(level)+'%';
    if(d.frequency){recent.push(d.frequency);if(recent.length>7)recent.shift();}else if(recent.length)recent.shift();
    if(recent.length>=3){
     /* Median of recent frames keeps the needle steady while the string rings out. */
     let f=[...recent].sort((a,b)=>a-b)[Math.floor(recent.length/2)],heard=window.FQPitch.midi(f);
     /* A phone microphone often hears a bass string an octave (or two) high: fold it back down to the open strings. */
     if(BASS){let best=null;for(const k of [0,1,2])for(const st of STRINGS){if(locked!=null&&st.midi!==locked)continue;const d=Math.abs(heard-12*k-st.midi);if(!best||d<best.d-.5)best={d,k};}heard-=12*best.k;f/=2**best.k;}
     const target=locked??STRINGS.reduce((best,s)=>Math.abs(heard-s.midi)<Math.abs(heard-best.midi)?s:best).midi;
     const cents=Math.round(window.FQPitch.cents(f,target)),ok=Math.abs(cents)<=5,far=Math.abs(cents)>150;
     $('#tn-note').textContent=far?K.noteName(Math.round(heard)):K.noteName(target).replace(/\d+$/,'');
     $('#tn-cents').textContent=far?'目標から遠すぎます':(cents>0?'+':'')+cents+' セント';
     $('#tn-needle').style.left=(50+Math.max(-50,Math.min(50,cents)))+'%';
     $('#tn-hint').textContent=far?'ペグを大きく回して近づけよう':ok?'ぴったり！':cents<0?'低い → ペグを締めて音を上げる':'高い → ペグを緩めて音を下げる';
     document.querySelector('.tuner-face').classList.toggle('in-tune',ok&&!far);
     document.querySelectorAll('[data-tn]').forEach(x=>x.classList.toggle('active',Number(x.dataset.tn)===target));
     if(ok&&!far){goodSince=goodSince||performance.now();if(performance.now()-goodSince>600&&!done.has(target)){done.add(target);document.querySelector('[data-tn="'+target+'"]')?.classList.add('done');if(done.size===STRINGS.length)F.notify(STRINGS.length+'本ともチューニングOK！');}}else goodSince=0;
    }
    session.raf=requestAnimationFrame(frame);
   };
   session.raf=requestAnimationFrame(frame);
  };
 });
}

/* ---------- Timing measurement ---------- */
const BPM=90,COUNT=4,TAPS=8;
function calibrate(back){
 const current=()=>{try{return Number(JSON.parse(localStorage.getItem('fretQuestStage'))?.latency)||0;}catch{return 0;}};
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="tool-cal"><div class="lesson-progress">TOOLS / TIMING</div><h2 id="modal-title">タイミングを測る</h2>'
   +'<p>スピーカーやイヤホン、マイクの遅れは端末ごとに違います。クリックに合わせて弾くだけで、判定のずれを自動で補正します。</p>'
   +'<div class="game-howto"><b>やり方</b>4カウントのあと、クリック8回に合わせて、ミュートした弦をジャッと刻みます。いつも使うイヤホンで測りましょう。</div>'
   +'<div class="game-stage cal-stage"><div class="game-phase" id="cal-phase">現在 '+(current()>=0?'+':'')+current().toFixed(2)+'秒</div><div class="game-sub" id="cal-sub">スタートを押して準備</div><div class="game-beats cal-dots" id="cal-dots">'+'<i></i>'.repeat(TAPS)+'</div></div>'
   +'<button type="button" class="action-button" id="cal-start">測定スタート</button>'+(back?'<button type="button" class="action-button secondary-action" id="cal-back">戻る</button>':'')
   +'<p class="lesson-caption">8回のずれの中央値を使います。ばらつきが大きいときは保存せず、もう一度測ります。</p></div>';
  if(back)$('#cal-back').onclick=back;
  $('#cal-start').onclick=async()=>{
   const generation=F.generation(),btn=$('#cal-start');btn.disabled=true;
   let opened;try{opened=await openMic();}catch(e){if(generation===F.generation()){btn.disabled=false;F.notify(micError(e));}return;}
   if(generation!==F.generation()){opened.mic.stream.getTracks().forEach(t=>t.stop());return;}
   const {ctx,mic}=opened;stop();
   const audio=K.synth(ctx),spb=60/BPM,start=ctx.currentTime+.5,targets=Array.from({length:TAPS},(_,i)=>start+(COUNT+i)*spb);
   for(let i=0;i<COUNT+TAPS;i++)audio.click(start+i*spb,i%4===0);
   /* Same base as the stages' microphone judging, without the saved offset, so the result is the offset itself. */
   const base=(ctx.outputLatency||ctx.baseLatency||0)+.045,onset=K.onsetDetector(),onsets=[];
   const me={mic,audio};session=me;F.setCleanup(stop);
   const frame=()=>{
    if(session!==me)return;
    mic.an.getFloatTimeDomainData(mic.buf);const at=ctx.currentTime-base;if(onset(mic.buf,at))onsets.push(at);
    const v=ctx.currentTime-(ctx.outputLatency||ctx.baseLatency||0),i=Math.floor((v-start)/spb);
    $('#cal-phase').textContent=i<COUNT?(i<0?'READY':'COUNT '+(i+1)):i<COUNT+TAPS?'STRUM!':'…';
    $('#cal-sub').textContent=i<COUNT?'次の小節から刻みます':'クリックに合わせて '+Math.min(TAPS,i-COUNT+1)+' / '+TAPS;
    document.querySelectorAll('#cal-dots i').forEach((x,k)=>x.classList.toggle('on',k===i-COUNT));
    if(ctx.currentTime-base>targets[TAPS-1]+.4){finish();return;}
    me.raf=requestAnimationFrame(frame);
   };
   const finish=()=>{
    stop();
    const offs=[];for(const t of targets){let best=null;for(const o of onsets){if(Math.abs(o-t)<=.35&&(best===null||Math.abs(o-t)<Math.abs(best-t)))best=o;}if(best!==null)offs.push(best-t);}
    offs.sort((a,b)=>a-b);
    const median=offs.length?offs[Math.floor(offs.length/2)]:0,spread=offs.length?offs.map(o=>Math.abs(o-median)).sort((a,b)=>a-b)[Math.floor(offs.length/2)]:1;
    btn.disabled=false;btn.textContent='もう一度測る';
    if(offs.length<5){$('#cal-phase').textContent='音を拾えませんでした';$('#cal-sub').textContent=offs.length+' / '+TAPS+' 回だけ検出。'+INST.name+'をマイクに近づけて、もう一度。';return;}
    if(spread>.04){$('#cal-phase').textContent='ばらつきが大きいです';$('#cal-sub').textContent='ずれの幅 ±'+Math.round(spread*1000)+'ms。ゆっくり正確に、もう一度。';return;}
    const value=Math.max(-.05,Math.min(.35,Math.round(median*100)/100));
    window.FQStage.setLatency(value);
    $('#cal-phase').textContent=(value>=0?'+':'')+value.toFixed(2)+'秒';$('#cal-sub').textContent='保存しました。曲・セッション・リズムゲームの判定に使います（'+offs.length+' / '+TAPS+' 回検出）。';
   };
   me.raf=requestAnimationFrame(frame);
  };
 });
}

const bind=()=>{$('#open-tuner')?.addEventListener('click',tuner);$('#open-calibrate')?.addEventListener('click',()=>calibrate(null));};
bind();
window.FQTools={tuner,calibrate};
})();

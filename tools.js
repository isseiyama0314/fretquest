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
   +'<div class="tuner-hint" id="tn-hint">&nbsp;</div><div class="stage-mic tuner-mic">'+K.micBadge()+'<div class="stage-level"><span id="tn-level"></span></div></div></div>'
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

/* ---------- Sound check ----------
   Plays a test tone and shows the audio state, so a silent phone can be diagnosed (and a screenshot sent). */
function soundCheck(){
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="tool-tuner"><div class="lesson-progress">TOOLS / SOUND CHECK</div><h2 id="modal-title">サウンドチェック</h2>'
   +'<p>ボタンを押すと「ポーン」とテスト音が鳴ります。聞こえなければ、下の表示ごとスクリーンショットを送ってください。</p>'
   +'<button type="button" class="action-button" id="sc-play">テスト音を鳴らす</button>'
   +'<div class="sc-diag" id="sc-diag"></div>'
   +'<ul class="sc-tips"><li>本体の音量ボタンで音量を上げる（消音スイッチとは別です）</li><li>Bluetoothイヤホンにつながっていないか確認</li><li>一度アプリを閉じて開き直す</li></ul></div>';
  const show=()=>{const d=F.audioDiag(),ios=(/OS (\d+)_(\d+)/.exec(navigator.userAgent)||[]).slice(1).join('.');
   $('#sc-diag').innerHTML=[['音声エンジン',d.state],['サンプルレート',d.rate?d.rate+' Hz':'—'],['オーディオセッション',d.session],['無音ループ（旧iOS用）',d.loop],['マイク使用中',d.mic?'はい':'いいえ'],['iOS',ios||'—']].map(([k,v])=>'<div><span>'+k+'</span><b>'+v+'</b></div>').join('');};
  $('#sc-play').onclick=async()=>{await F.ensureAudio();const ok=await F.playTone(69,1.2);[0,.35].forEach((d,i)=>F.playTone(i?76:72,.9,.4+d));show();if(!ok)F.notify('音声エンジンが動いていません。開き直してもう一度試してください。');};
  show();
 });
}
/* ---------- Mic check ----------
   The default microphone sensitivity, plus a short measurement: 2 s of quiet for the room noise, then 6 s of playing.
   It recommends the smallest gain that lifts normal playing to about -30 dBFS, comfortably above the detectors' fixed minimum
   levels (the most demanding is the lesson pitch check's .008 RMS), so room noise is boosted no more than needed. */
const MC_QUIET=2,MC_PLAY=6,MC_TARGET=.03,MC_LABEL={1:'大きい音・アンプ',4:'標準',12:'小さい音・離れて'};
const dbfs=v=>Math.round(20*Math.log10(Math.max(v,1e-6)));
function micCheck(){
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  const gains=K.micGains,cur=K.micGain();
  el.innerHTML='<div class="tool-mic"><div class="lesson-progress">TOOLS / MIC CHECK</div><h2 id="modal-title">マイクチェック</h2>'
   +'<p>マイクの音をアプリの中で増幅する倍率（マイク感度）の基本設定です。演奏中にMICボタンで切り替えた値も、ここに保存されます。</p>'
   +'<div class="mc-gains" role="group" aria-label="マイク感度">'+gains.map(g=>'<button type="button" data-mc-gain="'+g+'" aria-pressed="'+(g===cur)+'"><b>×'+g+'</b><small>'+MC_LABEL[g]+'</small></button>').join('')+'</div>'
   +'<div class="game-stage cal-stage"><div class="game-phase" id="mc-phase">チェック</div><div class="game-sub" id="mc-sub">静かな状態→弾いた音の順に測って、おすすめの感度を出します</div>'
   +'<div class="stage-mic"><span>MIC</span><div class="stage-level"><span id="mc-level"></span></div></div></div>'
   +'<div id="mc-result" class="mc-result" aria-live="polite"></div>'
   +'<button type="button" class="action-button" id="mc-start">チェックする（8秒）</button>'
   +'<p class="lesson-caption">増幅すると、部屋の雑音も同じだけ大きくなります。弦の音と雑音の差を広げるには、'+INST.name+'にiPhoneを近づけるのがいちばんです。</p></div>';
  const sync=()=>{const g=K.micGain();el.querySelectorAll('[data-mc-gain]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.mcGain)===g)));};
  const onGain=()=>{if(!el.isConnected||!el.querySelector('[data-mc-gain]'))return window.removeEventListener('fq:micgain',onGain);sync();};
  window.addEventListener('fq:micgain',onGain);
  el.querySelectorAll('[data-mc-gain]').forEach(b=>b.onclick=()=>{if(!b.closest('.mc-gains').classList.contains('busy'))K.setMicGain(Number(b.dataset.mcGain));});
  $('#mc-start').onclick=async()=>{
   const generation=F.generation(),btn=$('#mc-start');btn.disabled=true;$('#mc-result').innerHTML='';
   let opened;try{opened=await openMic();}catch(e){if(generation===F.generation()){btn.disabled=false;F.notify(micError(e));}return;}
   if(generation!==F.generation()){opened.mic.stream.getTracks().forEach(t=>t.stop());return;}
   const {ctx,mic}=opened;stop();const me={mic};session=me;F.setCleanup(stop);
   /* The gain is fixed during the measurement, so the levels can be converted back to the raw input. */
   const g=mic.gain.gain.value,box=el.querySelector('.mc-gains');box.classList.add('busy');
   const t0=ctx.currentTime,quiet=[],play=[],onset=K.onsetDetector();let hits=0;
   const frame=()=>{
    if(session!==me)return;
    mic.an.getFloatTimeDomainData(mic.buf);let e=0;for(let i=mic.buf.length-512;i<mic.buf.length;i++)e+=mic.buf[i]*mic.buf[i];
    const rms=Math.sqrt(e/512),t=ctx.currentTime-t0;$('#mc-level').style.width=K.meterPct(rms)+'%';
    if(t<MC_QUIET){quiet.push(rms);$('#mc-phase').textContent='静かに';$('#mc-sub').textContent='弾かずに待ってください（部屋の雑音を測ります）';}
    else if(t<MC_QUIET+MC_PLAY){play.push(rms);if(onset(mic.buf,t))hits++;$('#mc-phase').textContent='弾いて！';$('#mc-sub').textContent='いつもの強さで、何回か弦を鳴らす　'+Math.ceil(MC_QUIET+MC_PLAY-t)+'秒';}
    else{finish();return;}
    me.raf=requestAnimationFrame(frame);
   };
   const finish=()=>{
    stop();box.classList.remove('busy');btn.disabled=false;btn.textContent='もう一度チェック';
    const pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.min(s.length-1,Math.floor(s.length*p))]:0;};
    const noise=Math.max(1e-6,pct(quiet,.5))/g,peak=pct(play,.95)/g,snr=20*Math.log10(Math.max(peak,1e-6)/noise);
    if(hits<2||snr<6){$('#mc-phase').textContent='弦の音を拾えませんでした';$('#mc-sub').textContent=INST.name+'をマイクに近づけて、もう一度。';$('#mc-result').innerHTML='<p>雑音 '+dbfs(noise)+' dB ／ 弾いた音 '+dbfs(peak)+' dB（入力そのままの大きさ）</p>';return;}
    const rec=K.micGains.find(x=>peak*x>=MC_TARGET)||K.micGains[K.micGains.length-1],enough=peak*rec>=MC_TARGET;
    $('#mc-phase').textContent='おすすめ ×'+rec;$('#mc-sub').textContent=enough?'いつもの強さが十分に聞こえる、いちばん小さい倍率です':'最大の×12でも小さめです。iPhoneを近づけると安定します';
    $('#mc-result').innerHTML='<p>弾いた音 '+dbfs(peak)+' dB ／ 雑音 '+dbfs(noise)+' dB（差 '+Math.round(snr)+' dB'+(snr<15?'：雑音が多めです。近づけるか静かな場所で':'')+'）。数値は増幅前の入力の大きさです。</p>'
     +(rec===K.micGain()?'<p class="mc-ok">今の設定（×'+rec+'）のままで大丈夫です。</p>':'<button type="button" class="action-button" id="mc-apply">×'+rec+' を基本設定にする</button>');
    $('#mc-apply')?.addEventListener('click',()=>{K.setMicGain(rec);$('#mc-result').insertAdjacentHTML('beforeend','<p class="mc-ok">×'+rec+' に設定しました。</p>');$('#mc-apply').remove();});
   };
   me.raf=requestAnimationFrame(frame);
  };
 });
}
const bind=()=>{$('#open-miccheck')?.addEventListener('click',micCheck);$('#open-tuner')?.addEventListener('click',tuner);$('#open-soundcheck')?.addEventListener('click',soundCheck);$('#open-calibrate')?.addEventListener('click',()=>calibrate(null));};
bind();
window.FQTools={soundCheck,tuner,calibrate,micCheck};
})();

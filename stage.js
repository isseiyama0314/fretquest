/* FRET QUEST stage: play-along charts with a scrolling tab, a backing beat and live judging.
   Microphone audio is analysed on this device only. Nothing is recorded or uploaded. */
(()=>{'use strict';
const F=window.FretQuest,$=s=>document.querySelector(s);
const NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],OPEN=[0,64,59,55,50,45,40];
const STRING_COLOR=[null,'#ff8fb8','#ffc56b','#c7ef75','#6fe3d2','#8fb4ff','#c69cff'];
const GRADE={perfect:{label:'PERFECT',pts:100},great:{label:'GREAT',pts:75},ok:{label:'OK',pts:40},miss:{label:'MISS',pts:0}};
/* Score thresholds. Slow tempo can clear a stage but tops out at two stars. */
const PASS=60,STAR2=80,STAR3=93,SLOW_CAP=92,EXTRA_PENALTY=25;
const noteName=m=>NAMES[m%12]+(Math.floor(m/12)-1);
const starsFor=score=>score>=STAR3?3:score>=STAR2?2:score>=PASS?1:0;
const starText=n=>'★'.repeat(n)+'☆'.repeat(3-n);
let prefs={speed:1,input:'mic',backing:true,latency:0},run=null;
try{Object.assign(prefs,JSON.parse(localStorage.getItem('fretQuestStage'))||{});}catch{}
const savePrefs=()=>{try{localStorage.setItem('fretQuestStage',JSON.stringify(prefs));}catch{}};

function chart(l,speed){
 const e=l.exercise,spb=60/(e.bpm*speed),meter=e.meter||4,song=l.type==='song';
 const items=(song?e.notes:e.strums).map((n,i)=>({...n,i,time:n.beat*spb,dur:n.len*spb,grade:null,hitAt:null}));
 return {song,spb,meter,beats:e.beats,items,length:e.beats*spb,bpm:Math.round(e.bpm*speed)};
}
const chordMidis=name=>(F.chordShape(name)||[]).map((fret,i)=>fret<0?null:OPEN[6-i]+fret).filter(m=>m!==null);
/* How long after its time a note can still be caught. */
const lateWindow=(c,it)=>c.song?Math.min(.6,Math.max(.3,it.dur*.8)):.24;

/* Small synthesizer. Everything routes through one gain so stopping is instant. */
function synth(ctx){
 const master=ctx.createGain();master.gain.value=.9;master.connect(ctx.destination);
 const noise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.4),ctx.sampleRate),nd=noise.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 const env=(g,t,peak,attack,decay)=>{g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+decay);};
 const burst=(t,type,freq,peak,decay)=>{const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;f.type=type;f.frequency.value=freq;env(g,t,peak,.002,decay);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+decay+.05);};
 return {master,noise,env,burst,
  click(t,accent){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(accent?1320:880,t);env(g,t,accent?.32:.2,.002,.06);o.connect(g);g.connect(master);o.start(t);o.stop(t+.1);},
  kick(t){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+.14);env(g,t,.55,.003,.24);o.connect(g);g.connect(master);o.start(t);o.stop(t+.3);},
  snare(t){burst(t,'bandpass',1900,.22,.13);},
  hat(t,accent){burst(t,'highpass',7200,accent?.07:.045,.035);},
  pluck(t,midi,dur,vol=.16){const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain(),end=Math.max(.25,dur)+.25;o.type='sawtooth';o.frequency.value=440*Math.pow(2,(midi-69)/12);f.type='lowpass';f.frequency.setValueAtTime(3200,t);f.frequency.exponentialRampToValueAtTime(700,t+end);env(g,t,vol,.004,end);o.connect(f);f.connect(g);g.connect(master);o.start(t);o.stop(t+end+.05);},
  pad(t,midis,dur){midis.slice(-4).forEach(m=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=440*Math.pow(2,(m-69)/12);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.028,t+.18);g.gain.setValueAtTime(.028,t+Math.max(.2,dur-.05));g.gain.linearRampToValueAtTime(.0001,t+dur+.25);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.3);});},
  stop(){const t=ctx.currentTime;master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);master.gain.linearRampToValueAtTime(0,t+.04);setTimeout(()=>master.disconnect(),120);}
 };
}

function schedule(r){
 const {c,audio:a,t0}=r,at=b=>t0+b*c.spb;
 for(let b=-c.meter;b<0;b++)a.click(at(b),b===-c.meter);
 if(r.backing&&c.song){
  for(let b=0;b<Math.ceil(c.beats);b++){const inBar=b%c.meter;
   if(inBar===0)a.kick(at(b));else if(c.meter===4&&inBar===2)a.kick(at(b));
   if(c.meter===4&&inBar%2===1)a.snare(at(b));
   a.hat(at(b),inBar===0);if(c.meter===4)a.hat(at(b+.5),false);}
 }
 /* Strum backing is a soft pad with no sharp attacks, so it does not look like a strum to the onset detector. */
 if(r.backing&&!c.song){
  let start=null,chord=null;const flush=end=>{if(chord!==null)a.pad(at(start),chordMidis(chord),(end-start)*c.spb);};
  c.items.forEach(it=>{if(it.chord!==chord){flush(it.beat);chord=it.chord;start=it.beat;}});flush(c.beats);
 }
 if(r.guide)c.items.forEach(it=>{
  if(c.song)a.pluck(at(it.beat),it.midi,it.dur);
  else{const notes=chordMidis(it.chord);(it.up?[...notes].reverse().slice(0,4):notes).forEach((m,k)=>a.pluck(at(it.beat)+k*.014,m,Math.min(it.dur,.9),it.up?.05:.075));}
 });
}

async function openMic(ctx){
 /* Raw instrument input: iOS voice processing (echo cancellation) treats a sustained guitar note as noise and suppresses it. */
 const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
 const src=ctx.createMediaStreamSource(stream),an=ctx.createAnalyser();an.fftSize=2048;src.connect(an);
 return {stream,src,an,buf:new Float32Array(an.fftSize)};
}

function stop(){
 if(!run)return;const r=run;run=null;cancelAnimationFrame(r.raf);r.audio.stop();
 if(r.mic){r.mic.stream.getTracks().forEach(t=>t.stop());r.mic.src.disconnect();}
 document.removeEventListener('visibilitychange',r.onHide);
}

/* ---------- Judging ---------- */
function mark(r,it,grade,at){
 it.grade=grade;it.hitAt=at;r.counts[grade]++;r.points+=GRADE[grade].pts;
 if(grade==='miss'){r.combo=0;r.missRun=(r.missRun||0)+1;
  /* Several misses while the microphone hears almost nothing: the guitar is too far or too quiet. */
  if(r.mic&&!r.warned&&r.missRun>=3&&(r.peak||0)<.006){r.warned=true;F.notify('ギターの音がほとんど届いていません。iPhoneを弦から10〜20cmに近づけてみて。');}
 }else{r.missRun=0;r.combo++;r.maxCombo=Math.max(r.maxCombo,r.combo);burst(r,it);}
 popup(r,GRADE[grade].label,grade,grade==='miss'||grade==='perfect'?'':at<it.time?'EARLY':'LATE');
}
function judge(r,it,at){
 r.offsets.push(at-it.time);const off=Math.abs(at-it.time),[p,g]=r.c.song?[.1,.2]:[.09,.16];
 mark(r,it,off<=p?'perfect':off<=g?'great':'ok',at);
}
/* A strum onset or a tap: take the closest open target, otherwise count an extra hit. */
function strike(r,at){
 const win=r.c.song?.3:.24;let best=null;
 for(const it of r.c.items){if(it.grade)continue;const d=Math.abs(at-it.time);if(d<=win&&(!best||d<Math.abs(at-best.time)))best=it;}
 if(best){judge(r,best,at);return;}
 if(at>-.2&&at<r.c.length+.3){r.extra++;r.combo=0;popup(r,'EXTRA','extra','');}
}
/* Onset detector: the newest ~10 ms must jump well above both the recent quiet level and the previous frame.
   After a hit the floor jumps to the new level, so one ringing strum is never counted twice.
   Thresholds follow the room's noise floor instead of a fixed level, so a quiet guitar (an unplugged electric,
   a phone across the room) still registers while steady background noise does not. */
function onsetDetector(){
 let hist=[1,1,1,1,1,1],prev=1,last=-99,floor=null;
 const detect=(buf,at)=>{
  let e=0;for(let i=buf.length-512;i<buf.length;i++)e+=buf[i]*buf[i];
  const short=Math.sqrt(e/512);
  /* Noise floor: falls quickly to quiet moments; it may only rise between notes (no attack for 0.35 s),
     so a ringing guitar never raises its own threshold. */
  floor=floor===null?short:short<floor?floor*.7+short*.3:at-last>.35?floor*.995+short*.005:floor;
  const hit=short>Math.max(.0025,floor*3)&&short>Math.min(...hist)*2+floor&&short>prev*1.3&&at-last>.08;
  prev=short;
  if(hit){hist=hist.map(()=>short);last=at;}else{hist.push(short);hist.shift();}
  return hit;
 };
 detect.gate=()=>Math.max(.0012,(floor||0)*3);
 return detect;
}
/* Input level on a decibel scale (-60 dB to -10 dB), so quiet playing still moves the meter. */
const meterPct=rms=>Math.max(0,Math.min(100,(20*Math.log10(Math.max(rms,1e-6))+60)*2));
function listen(r,now){
 const m=r.mic;m.an.getFloatTimeDomainData(m.buf);const at=now-r.comp,onset=r.onset(m.buf,at),d=window.FQPitch.detect(m.buf,r.ctx.sampleRate,r.onset.gate());
 r.level=r.level*.6+d.rms*.4;r.peak=Math.max((r.peak||0)*.995,d.rms);
 if(onset){r.lastOnset=at;r.stable=0;if(!r.c.song)strike(r,at);}
 if(!r.c.song)return;
 if(!d.frequency){r.stable=0;r.lastMidi=null;r.heard=null;return;}
 const midi=Math.round(window.FQPitch.midi(d.frequency));r.heard=midi;
 if(midi!==r.lastMidi||r.stable===0){r.firstMatch=at;r.stable=0;}
 r.lastMidi=midi;r.stable++;
 if(r.stable<2)return;
 const it=r.c.items.find(x=>!x.grade&&x.midi===midi&&r.firstMatch>=x.time-.28&&r.firstMatch<=x.time+lateWindow(r.c,x));
 if(!it)return;
 /* A repeated pitch only counts when the string is picked again. */
 const prev=r.c.items[it.i-1];
 if(prev&&prev.midi===midi&&prev.hitAt!==null&&r.lastOnset<=prev.hitAt+.04)return;
 judge(r,it,r.firstMatch);
}

/* ---------- Drawing ---------- */
function burst(r,it){
 const y=r.c.song?laneY(r,it.string):r.laneMid,color=r.c.song?STRING_COLOR[it.string]:'#c7ef75';
 for(let k=0;k<12;k++){const a=Math.random()*Math.PI*2,v=60+Math.random()*160;r.fx.push({x:r.hitX,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,color});}
}
const laneY=(r,string)=>r.top+(string-1)*r.gap;
function sizeCanvas(r){
 const cv=r.cv,dpr=Math.min(2,window.devicePixelRatio||1),w=cv.clientWidth,h=cv.clientHeight;
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
 r.g.setTransform(dpr,0,0,dpr,0,0);r.W=w;r.H=h;r.hitX=Math.min(78,w*.2);r.top=24;r.gap=(h-48)/5;r.laneMid=h*.56;
}
function pill(g,x,y,w,h,rad){g.beginPath();g.moveTo(x+rad,y);g.arcTo(x+w,y,x+w,y+h,rad);g.arcTo(x+w,y+h,x,y+h,rad);g.arcTo(x,y+h,x,y,rad);g.arcTo(x,y,x+w,y,rad);g.closePath();}
function draw(r,t,dt){
 sizeCanvas(r);const {g,W,H,c,hitX}=r,pps=86/c.spb,x=time=>hitX+(time-t)*pps;
 g.clearRect(0,0,W,H);
 for(let b=Math.floor((t-hitX/pps)/c.spb);b<=c.beats;b++){const bx=x(b*c.spb);if(bx>W)break;if(b<0)continue;g.fillStyle=b%c.meter===0?'rgba(255,255,255,.16)':'rgba(255,255,255,.05)';g.fillRect(bx,8,b%c.meter===0?2:1,H-16);}
 if(c.song){
  for(let s=1;s<=6;s++){const y=laneY(r,s);g.fillStyle='rgba(255,255,255,'+(.13+s*.02)+')';g.fillRect(0,y-(.5+s*.25),W,1+s*.5);g.fillStyle='rgba(255,255,255,.38)';g.font='700 9px "DM Sans",sans-serif';g.fillText(String(s),6,y+3);}
 }else{
  g.fillStyle='rgba(255,255,255,.08)';g.fillRect(0,r.laneMid-22,W,44);
 }
 const glow=g.createLinearGradient(hitX-18,0,hitX+18,0);glow.addColorStop(0,'rgba(199,239,117,0)');glow.addColorStop(.5,'rgba(199,239,117,.28)');glow.addColorStop(1,'rgba(199,239,117,0)');
 g.fillStyle=glow;g.fillRect(hitX-18,0,36,H);g.fillStyle='#c7ef75';g.fillRect(hitX-1.5,6,3,H-12);
 let lastChord=null;
 for(const it of c.items){
  const x0=x(it.time),x1=x(it.time+it.dur);
  if(!c.song&&it.chord!==lastChord){lastChord=it.chord;if(x0>-40&&x0<W+60){g.font='800 14px "DM Sans",sans-serif';const w=g.measureText(it.chord).width+16;g.fillStyle='rgba(255,255,255,.14)';pill(g,x0-w/2,10,w,24,12);g.fill();g.fillStyle='#fff';g.fillText(it.chord,x0-w/2+8,27);}}
  if(x1<-30||x0>W+30)continue;
  const hit=it.grade&&it.grade!=='miss';if(hit&&t-it.hitAt>.25)continue;
  const color=it.grade==='miss'?'rgba(150,145,170,.45)':c.song?STRING_COLOR[it.string]:it.up?'#ffc56b':'#c7ef75';
  const y=c.song?laneY(r,it.string):r.laneMid,cx=hit?hitX:x0,scale=hit?1+(t-it.hitAt)*3:1,alpha=hit?Math.max(0,1-(t-it.hitAt)*4):1;
  g.globalAlpha=alpha;
  if(c.song&&!hit&&x1-x0>30){g.fillStyle=color;g.globalAlpha=alpha*.32;pill(g,x0,y-5,x1-x0-6,10,5);g.fill();g.globalAlpha=alpha;}
  g.fillStyle=color;g.beginPath();g.arc(cx,y,13*scale,0,Math.PI*2);g.fill();
  g.fillStyle='#211d33';
  if(c.song){g.font='900 14px "Noto Sans JP",sans-serif';const label=String(it.fret);g.fillText(label,cx-g.measureText(label).width/2,y+4.5);}
  else{g.beginPath();const d=it.up?-1:1;g.moveTo(cx-6,y-4*d);g.lineTo(cx+6,y-4*d);g.lineTo(cx,y+6*d);g.closePath();g.fill();g.fillRect(cx-1.5,y-(it.up?-3:9),3,6);}
  g.globalAlpha=1;
 }
 r.fx=r.fx.filter(p=>(p.life-=dt*2.2)>0);
 for(const p of r.fx){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;g.globalAlpha=p.life;g.fillStyle=p.color;g.fillRect(p.x-2,p.y-2,4,4);}
 g.globalAlpha=1;
 if(t<0&&!r.preview){const n=Math.ceil(-t/c.spb);if(n>=1&&n<=c.meter){g.fillStyle='rgba(255,255,255,.92)';g.font='900 64px "DM Sans",sans-serif';const s=String(n);g.fillText(s,W/2-g.measureText(s).width/2,H/2+22);}}
}
function popup(r,label,cls,sub){
 const el=$('#stage-judge');if(!el)return;el.className='stage-judge '+cls;el.innerHTML=label+(sub?'<small>'+sub+'</small>':'');void el.offsetWidth;el.classList.add('show');
}
function hud(r,t){
 const total=r.c.items.length;
 $('#stage-score').textContent=Math.max(0,Math.round((r.points-r.extra*EXTRA_PENALTY)/total));
 $('#stage-combo').textContent=r.combo;$('#stage-combo-box').classList.toggle('hot',r.combo>=10);
 $('#stage-progress').style.width=Math.min(100,Math.max(0,t/r.c.length*100))+'%';
 if(r.mic)$('#stage-level').style.width=meterPct(r.level)+'%';
 const next=r.c.items.find(i=>!i.grade);
 if(r.c.song){
  const heard=$('#stage-heard');if(heard)heard.textContent=r.mic?(r.heard!=null?noteName(r.heard):'—'):'TAP';
  if(next&&next!==r.shownNext){r.shownNext=next;$('#stage-next').innerHTML='<span>NEXT</span><b>'+next.string+'弦 '+next.fret+'フレット</b><em>'+noteName(next.midi)+'</em>';}
 }else{
  const chord=(next||r.c.items[r.c.items.length-1]).chord;
  if(chord!==r.shownChord){r.shownChord=chord;$('#stage-chord').innerHTML=F.chordDiagram(chord);}
 }
}

/* ---------- Screens ---------- */
let current=null;
function lobby(session,hooks){
 current={session,hooks};const l=session.lesson,c=chart(l,1),best=F.getState().courses?.[l.id]?.bestScore,bestStars=best!=null?starsFor(best):null;
 $('.modal-dialog').classList.add('is-stage');
 $('#modal-inner').innerHTML='<div class="stage-lobby"><div class="lesson-progress">'+session.course.title+' / STAGE</div><h2 id="modal-title">'+l.title+'</h2>'
  +'<div class="stage-meta"><span>♩ '+l.exercise.bpm+'</span><span>'+c.items.length+(c.song?'音':'ストローク')+'</span><span>約'+Math.round(c.length)+'秒</span><span class="stage-best">'+(bestStars!==null?'BEST '+starText(bestStars):'NEW')+'</span></div>'
  +'<div class="stage-screen preview"><canvas id="stage-canvas" aria-hidden="true"></canvas></div>'
  +'<p class="stage-howto">'+(c.song?'数字が光る線に重なったら、その<b>弦</b>の<b>フレット</b>を弾く。上が細い1弦、0は開放弦。':'矢印が光る線に重なったら、上のコードでストローク。<b>↓</b>はダウン、<b>↑</b>はアップ。')+'</p>'
  +'<div class="stage-options"><div class="chip-row" role="group" aria-label="テンポ"><button type="button" data-speed="0.75">ゆっくり</button><button type="button" data-speed="1">ふつう</button></div>'
  +'<div class="chip-row" role="group" aria-label="判定方法"><button type="button" data-input="mic">ギターで弾く（マイク）</button><button type="button" data-input="tap">画面タップで遊ぶ</button></div>'
  +'<div class="chip-row three" role="group" aria-label="タイミング補正"><button type="button" data-latency="0">補正なし</button><button type="button" data-latency="0.1">+0.1秒</button><button type="button" data-latency="0.2">+0.2秒<small>Bluetooth</small></button></div>'
  +'<button type="button" class="stage-measure" id="stage-measure">'+(prefs.latency&&![0,.1,.2].includes(prefs.latency)?'測定値 '+(prefs.latency>0?'+':'')+prefs.latency.toFixed(2)+'秒を使用中 ・ ':'')+'ずれを自動で測る →</button>'
  +'<button type="button" class="stage-measure" id="stage-tune">弾く前にチューニング →</button>'
  +'<label class="stage-toggle"><input type="checkbox" id="stage-backing"> <span>伴奏を鳴らす</span></label></div>'
  +'<button type="button" class="action-button" id="stage-start">スタート '+F.icon('arrow')+'</button><button type="button" class="action-button secondary-action" id="stage-demo">お手本を見て聴く</button>'
  +'<p class="lesson-caption" id="stage-caption"></p></div>';
 const sync=()=>{
  document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===prefs.speed)));
  document.querySelectorAll('[data-input]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.input===prefs.input)));
  document.querySelectorAll('[data-latency]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.latency)===prefs.latency)));
  $('#stage-backing').checked=prefs.backing;
  $('#stage-caption').textContent=(prefs.input==='mic'
   ?(c.song?'マイクで音の高さとタイミングを判定します。和音や運指は判定しません。':'マイクでストロークのタイミングを判定します。押さえたコードが正しいかは判定しません。')+' 音声はこの端末内で処理し、録音・送信はしません。'
   :'タップのタイミングを判定します。ギター演奏の判定ではありません。お手本の音が一緒に鳴ります。')
   +' ★1（'+PASS+'点）でクリア。「ゆっくり」は★2まで。';
 };
 document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{prefs.speed=Number(b.dataset.speed);savePrefs();sync();});
 document.querySelectorAll('[data-input]').forEach(b=>b.onclick=()=>{prefs.input=b.dataset.input;savePrefs();sync();});
 document.querySelectorAll('[data-latency]').forEach(b=>b.onclick=()=>{prefs.latency=Number(b.dataset.latency);savePrefs();sync();});
 $('#stage-backing').onchange=e=>{prefs.backing=e.target.checked;savePrefs();};
 $('#stage-tune').onclick=()=>window.FQTools.tuner();
 $('#stage-measure').onclick=()=>window.FQTools.calibrate(()=>lobby(session,hooks));
 $('#stage-start').onclick=()=>start('play');$('#stage-demo').onclick=()=>start('demo');
 sync();
 const r={cv:$('#stage-canvas'),c,fx:[],preview:true};r.g=r.cv.getContext('2d');requestAnimationFrame(()=>{if(r.cv.isConnected)draw(r,-.01,0);});
 $('#stage-start').focus();
}

async function start(mode){
 const {session}=current,l=session.lesson,generation=F.generation();
 for(const id of ['stage-start','stage-demo'])$('#'+id).disabled=true;
 await F.ensureAudio();const ctx=F.audioContext();
 if(generation!==F.generation())return;
 if(!ctx||ctx.state!=='running'){F.notify('音を再生できません。端末の消音設定と音量を確認してください。');lobby(session,current.hooks);return;}
 const input=mode==='demo'?'demo':prefs.input;let mic=null;
 if(input==='mic'){
  try{mic=await openMic(ctx);}catch(e){
   if(generation!==F.generation())return;
   F.notify(e.name==='NotAllowedError'?'マイクが許可されていません。設定で許可するか、タップで遊べます。':'マイクを開始できません。タップで遊べます。');
   lobby(session,current.hooks);return;}
  if(generation!==F.generation()){mic.stream.getTracks().forEach(t=>t.stop());return;}
 }
 const speed=prefs.speed,c=chart(l,speed);
 $('#modal-inner').innerHTML='<div class="stage-play"><div class="stage-hud"><div><small>SCORE</small><strong id="stage-score">0</strong></div><div class="stage-title"><small>'+(mode==='demo'?'お手本':input==='mic'?'MIC':'TAP')+' ・ ♩ '+c.bpm+'</small><b id="modal-title">'+l.title+'</b></div><div id="stage-combo-box" class="stage-combo"><small>COMBO</small><strong id="stage-combo">0</strong></div></div>'
  +'<div class="stage-track"><span id="stage-progress"></span></div>'
  +'<div class="stage-screen" id="stage-screen"><canvas id="stage-canvas" aria-label="流れてくる譜面"></canvas><div id="stage-judge" class="stage-judge" aria-live="polite"></div></div>'
  +(c.song?'<div class="stage-info"><div class="stage-next" id="stage-next"></div><div class="stage-heard"><small>きこえた音</small><b id="stage-heard">—</b></div></div>':'<div class="stage-info"><div class="stage-chord" id="stage-chord"></div><div class="stage-tip">↓ ダウン<br>↑ アップ<br><small>コードの形は自己チェック</small></div></div>')
  +(input==='mic'?'<div class="stage-mic"><span>MIC</span><div class="stage-level"><span id="stage-level"></span></div></div>':'')
  +(input==='tap'?'<button type="button" class="stage-pad" id="stage-pad">TAP</button>':'')
  +'<button type="button" class="action-button secondary-action" id="stage-quit">やめる</button></div>';
 const comp=(ctx.outputLatency||ctx.baseLatency||0)+(input==='mic'?.045:.01)+(Number(prefs.latency)||0);
 const r={ctx,c,mic,input,mode,speed,lesson:l,audio:synth(ctx),backing:prefs.backing,guide:input!=='mic',t0:ctx.currentTime+.35+c.meter*c.spb,
  outLat:ctx.outputLatency||ctx.baseLatency||0,comp,counts:{perfect:0,great:0,ok:0,miss:0},offsets:[],points:0,extra:0,combo:0,maxCombo:0,
  fx:[],onset:onsetDetector(),lastOnset:-99,stable:0,lastMidi:null,firstMatch:0,heard:null,level:0,last:performance.now()};
 r.cv=$('#stage-canvas');r.g=r.cv.getContext('2d');
 schedule(r);run=r;F.setCleanup(stop);
 r.onHide=()=>{if(document.hidden){stop();lobby(session,current.hooks);F.notify('アプリから離れたので、演奏を止めました。');}};
 document.addEventListener('visibilitychange',r.onHide);
 if(input==='tap'){const tap=e=>{e.preventDefault();if(run!==r)return;strike(r,r.ctx.currentTime-r.t0-r.comp);const pad=$('#stage-pad');pad.classList.remove('hit');void pad.offsetWidth;pad.classList.add('hit');};$('#stage-pad').addEventListener('pointerdown',tap);$('#stage-screen').addEventListener('pointerdown',tap);}
 $('#stage-quit').onclick=()=>{stop();lobby(session,current.hooks);};
 const frame=()=>{
  if(run!==r)return;const nowMs=performance.now(),dt=Math.min(.05,(nowMs-r.last)/1000);r.last=nowMs;
  const now=ctx.currentTime-r.t0,judgeAt=now-r.comp;
  if(mode!=='demo'){
   if(mic)listen(r,now);
   for(const it of c.items)if(!it.grade&&judgeAt>it.time+lateWindow(c,it))mark(r,it,'miss',judgeAt);
  }else for(const it of c.items)if(!it.grade&&now-r.outLat>=it.time){it.grade='perfect';it.hitAt=now-r.outLat;burst(r,it);}
  draw(r,now-r.outLat,dt);if(mode!=='demo')hud(r,now);else{$('#stage-progress').style.width=Math.min(100,Math.max(0,now/c.length*100))+'%';hud(r,now);$('#stage-score').textContent='—';$('#stage-combo').textContent='—';}
  if(judgeAt>c.length+.5&&c.items.every(i=>i.grade)){finish(r);return;}
  r.raf=requestAnimationFrame(frame);
 };
 r.raf=requestAnimationFrame(frame);
}

function finish(r){
 stop();const {session,hooks}=current;
 if(r.mode==='demo'){lobby(session,hooks);return;}
 const total=r.c.items.length,score=Math.max(0,Math.min(100,Math.round((r.points-r.extra*EXTRA_PENALTY)/total))),slow=r.speed<1;
 const recorded=slow?Math.min(score,SLOW_CAP):score,stars=starsFor(recorded),passed=score>=PASS;
 const mean=r.offsets.length>=5?r.offsets.reduce((a,b)=>a+b,0)/r.offsets.length:0,drift=Math.abs(mean)>=.06?'<p class="stage-drift">平均で<b>'+Math.abs(mean).toFixed(2)+'秒'+(mean>0?'遅め':'早め')+'</b>でした。'+(mean>0?'イヤホンや端末の遅れなら、スタート前の「タイミング補正」で調整できます。':'少し落ち着いて、伴奏をよく聴いてみよう。')+'</p>':'';
 const earned=passed?F.recordLesson(r.lesson.id,recorded,r.input==='mic'?'microphone':'tap'):0;
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="stage-result'+(passed?' passed':'')+'">'+(passed?'<div class="confetti" aria-hidden="true">'+Array.from({length:24},(_,i)=>'<i style="--x:'+(4+i*4)+'%;--delay:'+(i%5*.07)+'s;--r:'+(i%2?220:-170)+'deg"></i>').join('')+'</div>':'')
   +'<div class="lesson-progress">'+session.course.title+' / RESULT</div><h2 id="modal-title">'+(passed?(stars===3?'パーフェクトな演奏！':'ステージ、クリア！'):'あと少し！')+'</h2>'
   +'<div class="result-stars" aria-label="'+stars+'つ星">'+[0,1,2].map(i=>'<span class="'+(i<stars?'on':'')+'" style="--i:'+i+'">★</span>').join('')+'</div>'
   +'<div class="result-score"><strong>'+score+'</strong><small>/ 100</small></div>'
   +'<div class="result-grid"><div><b>'+r.counts.perfect+'</b><small>PERFECT</small></div><div><b>'+r.counts.great+'</b><small>GREAT</small></div><div><b>'+r.counts.ok+'</b><small>OK</small></div><div><b>'+r.counts.miss+'</b><small>MISS</small></div><div><b>'+r.maxCombo+'</b><small>MAX COMBO</small></div>'+(r.extra?'<div><b>'+r.extra+'</b><small>EXTRA</small></div>':'')+'</div>'
   +(earned?'<div class="success-xp">+'+earned+' XP</div>':'')+drift
   +'<p>'+(passed?'':'★1（'+PASS+'点）でクリア。「ゆっくり」にすると、ずっと弾きやすくなります。')+(slow&&passed?'「ゆっくり」でのクリアです。★3は「ふつう」で狙えます。':'')+'</p>'
   +'<p class="lesson-caption">'+(r.input==='mic'?(r.c.song?'マイクで音の高さとタイミングを判定しました。':'マイクでストロークのタイミングを判定しました。コードの押さえ方は判定していません。'):'画面タップのタイミングを判定しました。ギター演奏の判定ではありません。')+'</p>'
   +(passed&&hooks.next?'<button type="button" class="action-button" id="stage-next-lesson">次のレッスンへ '+F.icon('arrow')+'</button>':'')
   +'<button type="button" class="action-button '+(passed&&hooks.next?'secondary-action':'')+'" id="stage-retry">もう一度弾く</button>'
   +'<button type="button" class="action-button secondary-action" id="stage-back">コースに戻る</button></div>';
  $('#stage-next-lesson')?.addEventListener('click',hooks.next);
  $('#stage-retry').onclick=()=>{F.show(()=>{});lobby(session,hooks);};
  $('#stage-back').onclick=hooks.back;
  ($('#stage-next-lesson')||$('#stage-retry')).focus();
 });
}

/* Silent looping preview of a stage for the home screen. Stops when the canvas leaves the page. */
let previewToken=0;
function preview(cv,l){
 const token=++previewToken,still=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let r=null,start=0,last=performance.now();
 const reset=()=>{r={cv,g:cv.getContext('2d'),c:chart(l,1),fx:[],preview:true};start=performance.now()+400;};
 reset();
 if(still){draw(r,r.c.spb*2,0);return;}
 const frame=now=>{
  if(token!==previewToken||!cv.isConnected)return;
  const dt=Math.min(.05,(now-last)/1000),t=(now-start)/1000;last=now;
  if(!document.hidden&&cv.clientWidth){
   for(const it of r.c.items)if(!it.grade&&t>=it.time){it.grade='perfect';it.hitAt=t;burst(r,it);}
   draw(r,t,dt);
  }
  if(t>Math.min(r.c.length,14)+.8)reset();
  requestAnimationFrame(frame);
 };
 requestAnimationFrame(frame);
}
const setLatency=v=>{prefs.latency=v;savePrefs();};
window.FQStage={lobby,preview,starsFor,starText,stop,setLatency,kit:{synth,openMic,onsetDetector,meterPct,chordMidis,noteName}};
})();

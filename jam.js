/* FRET QUEST jam sessions: loop a standard's chord changes with a generated band and play over it.
   Only the chord progressions are used. No melodies are included. Microphone audio stays on this device. */
(()=>{'use strict';
const F=window.FretQuest,K=window.FQStage.kit,$=s=>document.querySelector(s);
const ROOT={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
const PC=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
/* Chord tones and the scale suggested over each chord quality. */
const QUALITY={
 maj7:{tones:[0,4,7,11],scale:[0,2,4,5,7,9,11]},'6':{tones:[0,4,7,9],scale:[0,2,4,5,7,9,11]},'':{tones:[0,4,7],scale:[0,2,4,5,7,9,11]},
 m7:{tones:[0,3,7,10],scale:[0,2,3,5,7,9,10]},m6:{tones:[0,3,7,9],scale:[0,2,3,5,7,9,11]},m:{tones:[0,3,7],scale:[0,2,3,5,7,8,10]},
 '7':{tones:[0,4,7,10],scale:[0,2,4,5,7,9,10]},m7b5:{tones:[0,3,6,10],scale:[0,1,3,5,6,8,10]},dim7:{tones:[0,3,6,9],scale:[0,2,3,5,6,8,9,11]}
};
const DEGREE={0:'R',3:'♭3',4:'3',6:'♭5',7:'5',9:'6',10:'♭7',11:'7'};
const pretty=sym=>sym.replace(/^([A-G])b/,'$1♭').replace(/^([A-G])#/,'$1♯').replace('m7b5','m7♭5');
function parse(sym){const m=/^([A-G][#b]?)(.*)$/.exec(sym),q=QUALITY[m[2]]?m[2]:'';return {sym,root:ROOT[m[1]],q,tones:QUALITY[q].tones,scale:QUALITY[q].scale};}
const BLUES=[0,3,5,6,7,10],MINOR=[0,2,3,5,7,8,10],MAJOR=[0,2,4,5,7,9,11];

/* Bars are separated by spaces; two chords in one bar are joined with a comma. */
const SESSIONS=[
 {id:'blues-a',genre:'BLUES',title:'12小節ブルース in A',feel:'shuffle',bpm:84,key:9,keyScale:BLUES,keyName:'Aブルース・スケール',bars:'A7 D7 A7 A7 D7 D7 A7 A7 E7 D7 A7 E7',about:'ブルースの基本形。まずはここから。Aブルース・スケールの音なら、どこを弾いても大きく外れません。'},
 {id:'chicago',genre:'BLUES',title:'Sweet Home Chicago',feel:'shuffle',bpm:92,key:4,keyScale:BLUES,keyName:'Eブルース・スケール',bars:'E7 A7 E7 E7 A7 A7 E7 E7 B7 A7 E7 B7',about:'Eのシャッフル・ブルース。2小節目でAに行く「クイック・チェンジ」の形です。'},
 {id:'thrill',genre:'BLUES',title:'The Thrill Is Gone',feel:'slow',bpm:72,key:11,keyScale:MINOR,keyName:'Bナチュラル・マイナー',bars:'Bm7 Bm7 Bm7 Bm7 Em7 Em7 Bm7 Bm7 Gmaj7 F#7 Bm7 F#7',about:'ゆったりしたマイナー・ブルース。9小節目のGと10小節目のF♯7で、色が変わる瞬間を狙おう。'},
 {id:'billie',genre:'JAZZ BLUES',title:"Billie's Bounce",feel:'swing',bpm:110,key:5,keyScale:BLUES,keyName:'Fブルース・スケール',bars:'F7 Bb7 F7 Cm7,F7 Bb7 Bdim7 F7 Am7,D7 Gm7 C7 F7,D7 Gm7,C7',about:'ジャズ・ブルースの定番進行。ブルース・スケールに、各コードの音（大きい丸）を混ぜるとジャズらしくなります。'},
 {id:'ii-v-i',genre:'JAZZ',title:'ii–V–I in C',feel:'swing',bpm:100,key:0,keyScale:MAJOR,keyName:'Cメジャー・スケール',bars:'Dm7 G7 Cmaj7 Cmaj7',about:'ジャズの最小単位。Dm7→G7→Cmaj7の流れで、各コードの3度と7度を探そう。'},
 {id:'autumn',genre:'JAZZ',title:'Autumn Leaves（枯葉）',feel:'swing',bpm:104,key:7,keyScale:MINOR,keyName:'Gナチュラル・マイナー',bars:'Cm7 F7 Bbmaj7 Ebmaj7 Am7b5 D7 Gm6 Gm6 Cm7 F7 Bbmaj7 Ebmaj7 Am7b5 D7 Gm6 Gm6 Am7b5 D7 Gm6 Gm6 Cm7 F7 Bbmaj7 Ebmaj7 Am7b5 D7 Gm7,C7 Fm7,Bb7 Am7b5 D7 Gm6 Gm6',about:'セッションで最初に演奏されることが多い1曲。ほとんどの小節でGナチュラル・マイナーの音が使えます。'},
 {id:'fly',genre:'JAZZ',title:'Fly Me to the Moon',feel:'swing',bpm:112,key:9,keyScale:MINOR,keyName:'Aナチュラル・マイナー（Cメジャーと同じ音）',bars:'Am7 Dm7 G7 Cmaj7,C7 Fmaj7 Bm7b5 E7 Am7,A7 Dm7 G7 Cmaj7,Am7 Dm7,G7 Cmaj7 Cmaj7 Bm7b5 E7',about:'4度ずつ下がっていく進行。E7とA7の小節だけ、コードの音（大きい丸）を意識しよう。'},
 {id:'oudou',genre:'POPS',title:'王道進行',feel:'pop',bpm:96,key:0,keyScale:MAJOR,keyName:'Cメジャー・スケール',bars:'Fmaj7 G Em Am Fmaj7 G Em Am',about:'J-POPのサビで最もよく聴く進行（IV–V–iii–vi）。前向きなのに少し切ない響き。メロディはCメジャーの音で。'},
 {id:'canon',genre:'POPS',title:'カノン進行',feel:'pop',bpm:84,key:0,keyScale:MAJOR,keyName:'Cメジャー・スケール',bars:'C G Am Em F C F G',about:'ベースが1音ずつ下がっていく定番進行。各小節の頭でコードの音に着地すると、ぐっと歌って聴こえます。'},
 {id:'ballad',genre:'POPS',title:'ポップ・バラード',feel:'pop',bpm:72,key:0,keyScale:MAJOR,keyName:'Cメジャー・スケール',bars:'C Am F G C Am F G',about:'ゆったりした4コード。音数を減らして、長い音を大事に弾く練習に。'},
 {id:'bossa',genre:'BOSSA NOVA',title:'Blue Bossa',feel:'bossa',bpm:120,key:0,keyScale:MINOR,keyName:'Cナチュラル・マイナー',bars:'Cm7 Cm7 Fm7 Fm7 Dm7b5 G7 Cm7 Cm7 Ebm7 Ab7 Dbmaj7 Dbmaj7 Dm7b5 G7 Cm7 Dm7b5,G7',about:'ボサノバのリズムで。9〜12小節目はD♭へ転調するので、大きい丸の音に乗り換えます。'}
];
SESSIONS.forEach(s=>{s.chart=s.bars.split(' ').map(bar=>bar.split(',').map(parse));});

let prefs={bpm:{},choruses:2,mic:true};
try{Object.assign(prefs,JSON.parse(localStorage.getItem('fretQuestJam'))||{});}catch{}
const save=()=>{try{localStorage.setItem('fretQuestJam',JSON.stringify(prefs));}catch{}};
const best=id=>Number(prefs.best?.[id])||0;
const latency=()=>{try{return Number(JSON.parse(localStorage.getItem('fretQuestStage'))?.latency)||0;}catch{return 0;}};
let run=null,current=null;

/* ---------- Band ---------- */
function band(ctx,a){
 const m=n=>440*Math.pow(2,(n-69)/12);
 return {
  bass(t,midi,dur){const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type='triangle';o.frequency.value=m(midi);f.type='lowpass';f.frequency.value=600;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.42,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.15,dur));o.connect(f);f.connect(g);g.connect(a.master);o.start(t);o.stop(t+dur+.05);},
  keys(t,notes,dur,vol=.045){notes.forEach(n=>{const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o2.type='triangle';o.frequency.value=m(n);o2.frequency.value=m(n)*2.001;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);o2.connect(g);g.connect(a.master);o.start(t);o2.start(t);o.stop(t+dur+.05);o2.stop(t+dur+.05);});},
  ride(t,v=.05){a.burst(t,'highpass',5200,v,.22);},
  rim(t){a.burst(t,'bandpass',2600,.11,.035);},
  kick:a.kick,snare:a.snare,hat:a.hat
 };
}
/* Guitar-range-free voicings: bass sits below E2, keys use a compact shell in the middle. */
const bassNote=(pc,low=28)=>low+((pc-low%12+12)%12);
function voicing(ch){const base=52+((ch.root-52%12+12)%12);return ch.tones.slice(1).map(i=>base+i).map(n=>n>66?n-12:n).sort((x,y)=>x-y);}
/* Schedules one beat of the band. Called a second ahead of time, so long sessions stay light. */
function scheduleBeat(r,beat){
 const {s,b,spb,t0}=r,swing=s.feel==='bossa'||s.feel==='pop'?.5:2/3,bi=Math.floor(beat/4)%s.chart.length,k=beat%4,bar=s.chart[bi];
 const ch=bar[Math.min(bar.length-1,Math.floor(k/(4/bar.length)))],nextRoot=s.chart[(bi+1)%s.chart.length][0].root,t=t0+beat*spb;
 if(s.feel==='bossa'){
  if(k===0||k===2)b.kick(t);b.hat(t,false);b.hat(t+spb/2,false);
  /* 3-2 clave feel on the rim across two bars. */
  if(Math.floor(beat/4)%2===0){if(k===0||k===3)b.rim(t);if(k===1)b.rim(t+spb/2);}else{if(k===1)b.rim(t);if(k===2)b.rim(t+spb/2);}
  if(k===0)b.bass(t,bassNote(ch.root),spb*1.4);if(k===1)b.bass(t+spb/2,bassNote(ch.root+7),spb*.9);if(k===2)b.bass(t,bassNote(ch.root+7),spb*1.2);if(k===3)b.bass(t+spb/2,bassNote(nextRoot),spb*.5);
  if(k===0||k===2)b.keys(t,voicing(ch),spb*.9);if(k===1||k===3)b.keys(t+spb/2,voicing(ch),spb*.6,.035);
 }else if(s.feel==='pop'){
  /* Straight 8-beat: kick on 1 and 3, snare on 2 and 4, eighth hats, root eighths in the bass. */
  if(k%2===0)b.kick(t);else b.snare(t);b.hat(t,k===0);b.hat(t+spb/2,false);
  b.bass(t,bassNote(ch.root),spb*.45);b.bass(t+spb/2,bassNote(ch.root),spb*.4);
  if(k===0||k===2)b.keys(t,voicing(ch),spb*1.8,.04);
 }else if(s.feel==='swing'){
  b.ride(t,k%2?.055:.045);if(k%2){b.ride(t+spb*swing,.035);b.hat(t,false);}
  const walk=k===0?ch.root:k===3?nextRoot+(Math.random()<.5?1:-1):ch.root+ch.tones[k===1?1:2];
  b.bass(t,bassNote(walk),spb*.9);
  if(k===0)b.keys(t,voicing(ch),spb*.5);if(k===1)b.keys(t+spb*swing,voicing(ch),spb*.7,.04);
 }else{
  if(k%2===0)b.kick(t);else b.snare(t);b.hat(t,k===0);b.hat(t+spb*swing,false);
  const step=[0,7,9,7][k];b.bass(t,bassNote(ch.root+step),spb*.55);b.bass(t+spb*swing,bassNote(ch.root+step),spb*.3);
  if(k%2)b.keys(t,voicing(ch),spb*.35,.05);
 }
}

/* ---------- Fretboard map of usable notes ---------- */
const OPEN=[64,59,55,50,45,40];
function fretboard(s,ch,heard){
 const W=360,H=118,x=f=>f===0?12:28+(f-.5)*25.5,y=i=>14+i*18;
 let svg='<svg viewBox="0 0 '+W+' '+H+'" class="jam-board" role="img" aria-label="'+pretty(ch.sym)+'で使える音"><rect x="22" y="8" width="'+(W-24)+'" height="'+(H-16)+'" rx="6" fill="#ffffff08"/>';
 for(let f=1;f<=13;f++)svg+='<line x1="'+(22+f*25.5)+'" x2="'+(22+f*25.5)+'" y1="10" y2="'+(H-10)+'" stroke="#ffffff'+(f===12?'40':'14')+'"/>';
 [3,5,7,9].forEach(f=>svg+='<circle cx="'+x(f)+'" cy="'+(H-4)+'" r="2" fill="#ffffff40"/>');svg+='<circle cx="'+(x(12)-4)+'" cy="'+(H-4)+'" r="2" fill="#ffffff40"/><circle cx="'+(x(12)+4)+'" cy="'+(H-4)+'" r="2" fill="#ffffff40"/>';
 svg+='<rect x="20" y="10" width="3" height="'+(H-20)+'" fill="#ffffff66"/>';
 OPEN.forEach((open,i)=>{svg+='<line x1="22" x2="'+W+'" y1="'+y(i)+'" y2="'+y(i)+'" stroke="#ffffff'+(i>2?'38':'26')+'" stroke-width="'+(1+i*.25)+'"/>';
  for(let f=0;f<=13;f++){const midi=open+f,pc=(midi%12-ch.root+12)%12,keyPc=(midi%12-s.key+12)%12,isTone=ch.tones.includes(pc),inKey=s.keyScale.includes(keyPc)||ch.scale.includes(pc),hit=heard===midi;
   if(isTone)svg+='<circle cx="'+x(f)+'" cy="'+y(i)+'" r="7.5" class="tone d'+pc+(hit?' hit':'')+'"/><text x="'+x(f)+'" y="'+(y(i)+3)+'" text-anchor="middle">'+DEGREE[pc]+'</text>';
   else if(inKey)svg+='<circle cx="'+x(f)+'" cy="'+y(i)+'" r="3.4" class="scale'+(hit?' hit':'')+'"/>';
   else if(hit)svg+='<circle cx="'+x(f)+'" cy="'+y(i)+'" r="6" class="out hit"/>';}});
 return svg+'</svg>';
}

/* ---------- Missions ---------- */
function evalGoal(g,log){
 const n=log.length,ratio=f=>n?log.filter(f).length/n:0,pct=v=>Math.round(v*100)+'%';
 let ok,shown;
 if(g.type==='notes'){ok=n>=g.min;shown=n+' / '+g.min+'音';}
 else if(g.type==='maxNotes'){ok=n>0&&n<=g.max;shown=n+'音';}
 else if(g.type==='inSet'){const v=ratio(x=>g.pcs.includes(x.midi%12));ok=v>=g.ratio;shown=pct(v)+' / '+pct(g.ratio);}
 else if(g.type==='tones'){const v=ratio(x=>x.tone);ok=v>=g.ratio;shown=pct(v)+' / '+pct(g.ratio);}
 else if(g.type==='range'){const v=ratio(x=>x.midi>=g.lo&&x.midi<=g.hi);ok=v>=g.ratio;shown=pct(v)+' / '+pct(g.ratio);}
 else{const v=log.filter(g.type==='guide'?x=>[3,4,10,11].includes(x.rel):g.type==='pc'?x=>x.midi%12===g.pc:x=>x.down&&(g.pcs?g.pcs.includes(x.midi%12):x.tone)).length;ok=v>=g.min;shown=v+' / '+g.min;}
 return {label:g.label,ok,shown};
}
function goalsHtml(m,log,live){return (live?'<div class="mission-title">MISSION</div>':'')+m.goals.map(g=>{const e=evalGoal(g,log);return '<div class="goal '+(e.ok?'ok':'')+'"><i>'+(e.ok?'✓':'・')+'</i><span>'+e.label+'</span><b>'+e.shown+'</b></div>';}).join('');}
function missionHtml(m){return '<div class="mission-box"><div class="mission-title">MISSION</div><p>'+m.text+'</p>'+goalsHtml(m,[],false)+'</div>';}

/* ---------- Screens ---------- */
function cards(){
 return SESSIONS.map(s=>'<button type="button" class="jam-card genre-'+s.genre.split(' ')[0].toLowerCase()+'" data-jam="'+s.id+'"><span class="jam-genre">'+s.genre+'</span><strong>'+s.title+'</strong><span class="jam-changes">'+s.chart.slice(0,4).map(b=>b.map(c=>pretty(c.sym)).join(' ')).join(' │ ')+'</span><span class="jam-foot"><span>♩ '+s.bpm+' ・ '+s.chart.length+'小節</span><span>'+(best(s.id)?'BEST '+best(s.id):'NEW')+'</span></span></button>').join('');
}
function renderCards(){const el=$('#jam-cards');if(!el)return;el.innerHTML=cards();el.querySelectorAll('[data-jam]').forEach(b=>b.onclick=()=>lobby(SESSIONS.find(s=>s.id===b.dataset.jam)));}

/* opts.mission turns a session into a graded assignment for the phrase dojo: {text, choruses, goals:[...]}.
   opts.onDone(passed) reports the outcome; opts.back returns to the caller. */
let currentOpts={};
function lobby(s,opts={}){
 current=s;currentOpts=opts;const bpm=prefs.bpm[s.id]||s.bpm;
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="jam-lobby"><div class="lesson-progress">'+s.genre+' / SESSION</div><h2 id="modal-title">'+s.title+'</h2>'
   +'<div class="stage-meta"><span>'+s.chart.length+'小節</span><span>'+({swing:'スウィング',shuffle:'シャッフル',slow:'スロー',bossa:'ボサノバ',pop:'8ビート'})[s.feel]+'</span><span class="stage-best">'+(best(s.id)?'BEST '+best(s.id):'NEW')+'</span></div>'
   +(opts.mission?missionHtml(opts.mission):'<p>'+s.about+'</p>')
   +'<div class="jam-chart lobby-chart">'+s.chart.map(bar=>'<span>'+bar.map(c=>pretty(c.sym)).join(' ')+'</span>').join('')+'</div>'
   +'<p class="jam-key">使える音：<b>'+s.keyName+'</b>。演奏中は、今のコードの音を大きい丸で表示します。</p>'
   +'<div class="stage-options"><label class="jam-tempo">テンポ <b id="jam-bpm-label">'+bpm+'</b><input type="range" id="jam-bpm" min="'+Math.round(s.bpm*.6)+'" max="'+Math.round(s.bpm*1.3)+'" value="'+bpm+'"></label>'
   +'<div class="chip-row three" role="group" aria-label="長さ"><button type="button" data-ch="1">1コーラス</button><button type="button" data-ch="2">2コーラス</button><button type="button" data-ch="4">4コーラス</button></div>'
   +(opts.mission?'':'<div class="chip-row" role="group" aria-label="採点"><button type="button" data-mic="1">ギターで採点（マイク）</button><button type="button" data-mic="0">伴奏だけ流す</button></div>')+'</div>'
   +'<button type="button" class="action-button" id="jam-start">セッション開始 '+F.icon('arrow')+'</button>'
   +'<p class="lesson-caption">コード進行のみを収録し、メロディは含みません。採点は「今のコードに合う音を弾いたか」のゆるい目安で、間違いはありません。伴奏をスピーカーで鳴らすとマイクが拾うことがあるため、イヤホン推奨。音声は録音・送信しません。</p></div>';
  const sync=()=>{document.querySelectorAll('[data-ch]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.ch)===prefs.choruses)));document.querySelectorAll('[data-mic]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mic==='1')===prefs.mic)));};
  document.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{prefs.choruses=Number(b.dataset.ch);save();sync();});
  document.querySelectorAll('[data-mic]').forEach(b=>b.onclick=()=>{prefs.mic=b.dataset.mic==='1';save();sync();});
  $('#jam-bpm').oninput=e=>{prefs.bpm[s.id]=Number(e.target.value);$('#jam-bpm-label').textContent=e.target.value;save();};
  $('#jam-start').onclick=start;sync();$('#jam-start').focus();
 });
}

function stop(){if(!run)return;const r=run;run=null;cancelAnimationFrame(r.raf);r.audio.stop();if(r.mic){r.mic.stream.getTracks().forEach(t=>t.stop());r.mic.src.disconnect();}document.removeEventListener('visibilitychange',r.onHide);}

async function start(){
 const s=current,generation=F.generation();$('#jam-start').disabled=true;
 await F.ensureAudio();const ctx=F.audioContext();if(generation!==F.generation())return;
 if(!ctx||ctx.state!=='running'){F.notify('音を再生できません。消音設定と音量を確認してください。');lobby(s);return;}
 let mic=null;
 const mission=currentOpts.mission;
 if(prefs.mic||mission){try{mic=await K.openMic(ctx);}catch(e){if(generation!==F.generation())return;F.notify('マイクを使えません。伴奏だけで始めます。');}
  if(generation!==F.generation()){mic?.stream.getTracks().forEach(t=>t.stop());return;}}
 const bpm=prefs.bpm[s.id]||s.bpm,spb=60/bpm,audio=K.synth(ctx);
 const r={s,ctx,mic,audio,b:band(ctx,audio),spb,choruses:mission?Math.max(prefs.choruses,mission.choruses||1):prefs.choruses,mission,opts:currentOpts,log:[],t0:ctx.currentTime+.4+4*spb,comp:(ctx.outputLatency||ctx.baseLatency||0)+.045+latency(),
  onset:K.onsetDetector(),lastOnset:-99,stable:0,lastMidi:null,scoredMidi:null,scoredAt:-99,heard:null,points:0,notes:0,tones:0,inside:0,combo:0,maxCombo:0,shownBar:-1,shownHeard:null};
 r.total=s.chart.length*4*r.choruses*spb;
 for(let i=0;i<4;i++)audio.click(r.t0-(4-i)*spb,i===0);
 r.beats=s.chart.length*4*r.choruses;r.nextBeat=0;
 const el=$('#modal-inner');
 el.innerHTML='<div class="jam-play"><div class="stage-hud"><div><small>SCORE</small><strong id="jam-score">'+(mic?0:'—')+'</strong></div><div class="stage-title"><small>♩ '+bpm+' ・ <span id="jam-chorus">1</span> / '+r.choruses+'</small><b id="modal-title">'+s.title+'</b></div><div class="stage-combo" id="jam-combo-box"><small>COMBO</small><strong id="jam-combo">'+(mic?0:'—')+'</strong></div></div>'
  +'<div class="stage-track"><span id="jam-progress"></span></div>'
  +'<div class="jam-now"><div><small>NOW</small><b id="jam-now">—</b></div><div class="jam-next"><small>NEXT</small><b id="jam-next">—</b></div><div class="jam-beats" id="jam-beats"><i></i><i></i><i></i><i></i></div></div>'
  +'<div class="jam-board-wrap" id="jam-board"></div><div class="jam-legend"><span><i class="lg tone"></i>コードの音</span><span><i class="lg scale"></i>使える音</span>'+(mic?'<span>きこえた音 <b id="jam-heard">—</b></span>':'')+'</div>'
  +(r.mission?'<div class="mission-box live" id="jam-mission">'+goalsHtml(r.mission,[],true)+'</div>':'')+'<div id="stage-judge" class="stage-judge jam-judge" aria-live="polite"></div>'
  +'<div class="jam-chart" id="jam-chart">'+s.chart.map((bar,i)=>'<span data-bar="'+i+'">'+bar.map(c=>pretty(c.sym)).join(' ')+'</span>').join('')+'</div>'
  +(mic?'<div class="stage-mic"><span>MIC</span><div class="stage-level"><span id="jam-level"></span></div></div>':'')
  +'<button type="button" class="action-button secondary-action" id="jam-stop">終わる</button></div>';
 run=r;F.setCleanup(stop);
 r.onHide=()=>{if(document.hidden){stop();lobby(s);}};document.addEventListener('visibilitychange',r.onHide);
 $('#jam-stop').onclick=()=>finish(r);
 let level=0;
 const frame=()=>{
  if(run!==r)return;
  while(r.nextBeat<r.beats&&r.t0+r.nextBeat*spb<ctx.currentTime+1)scheduleBeat(r,r.nextBeat++);
  const now=ctx.currentTime-r.t0,view=now-(ctx.outputLatency||ctx.baseLatency||0),beatIndex=Math.floor(view/spb),barIndex=Math.floor(beatIndex/4),bar=s.chart[((barIndex%s.chart.length)+s.chart.length)%s.chart.length];
  const per=4/bar.length,ch=view<0?s.chart[0][0]:bar[Math.min(bar.length-1,Math.floor((beatIndex%4)/per))];
  if(mic){
   const at=now-r.comp;mic.an.getFloatTimeDomainData(mic.buf);if(r.onset(mic.buf,at)){r.lastOnset=at;r.stable=0;}const d=window.FQPitch.detect(mic.buf,ctx.sampleRate,r.onset.gate());level=level*.6+d.rms*.4;
   const midi=d.frequency?Math.round(window.FQPitch.midi(d.frequency)):null;
   /* Ignore anything below the guitar's low E: the backing bass lives there. */
   if(midi===null||midi<40){r.stable=0;r.lastMidi=null;}
   else{if(midi!==r.lastMidi)r.stable=0;r.lastMidi=midi;r.stable++;
    if(r.stable===2&&at>=0&&(midi!==r.scoredMidi||r.lastOnset>r.scoredAt))judge(r,midi,ch,at);}
   r.heard=midi;
  }
  if(barIndex!==r.shownBar){r.shownBar=barIndex;
   document.querySelectorAll('#jam-chart [data-bar]').forEach(x=>x.classList.toggle('on',Number(x.dataset.bar)===((barIndex%s.chart.length)+s.chart.length)%s.chart.length&&view>=0));
   const cur=$('#jam-chart .on');if(cur){const box=$('#jam-chart');box.scrollTop=cur.offsetTop-box.offsetTop-6;}
   $('#jam-chorus').textContent=Math.min(r.choruses,Math.max(1,Math.floor(barIndex/s.chart.length)+1));}
  const nextBar=s.chart[(((barIndex+1)%s.chart.length)+s.chart.length)%s.chart.length];
  const key=ch.sym+'|'+r.heard;
  if(key!==r.shownHeard){r.shownHeard=key;$('#jam-now').textContent=pretty(ch.sym);$('#jam-next').textContent=pretty(bar.length>1&&ch===bar[0]?bar[1].sym:nextBar[0].sym);$('#jam-board').innerHTML=fretboard(s,ch,r.heard);if(mic)$('#jam-heard').textContent=r.heard!=null?K.noteName(r.heard):'—';}
  document.querySelectorAll('#jam-beats i').forEach((x,i)=>x.classList.toggle('on',view>=-4*spb&&((beatIndex%4)+4)%4===i));
  $('#jam-progress').style.width=Math.max(0,Math.min(100,view/r.total*100))+'%';
  if(mic){$('#jam-level').style.width=K.meterPct(level)+'%';$('#jam-score').textContent=r.points;$('#jam-combo').textContent=r.combo;$('#jam-combo-box').classList.toggle('hot',r.combo>=8);}
  if(view>r.total+.3){finish(r);return;}
  r.raf=requestAnimationFrame(frame);
 };
 r.raf=requestAnimationFrame(frame);
}

function judge(r,midi,ch,at){
 r.scoredMidi=midi;r.scoredAt=at;r.notes++;
 const inBar=(((at/r.spb)%4)+4)%4,rel=(midi%12-ch.root+12)%12;
 r.log.push({midi,rel,tone:ch.tones.includes(rel),down:inBar<.5||inBar>3.8});
 if(r.mission){const el=$('#jam-mission');if(el)el.innerHTML=goalsHtml(r.mission,r.log,true);}
 const pc=(midi%12-ch.root+12)%12,keyPc=(midi%12-r.s.key+12)%12;let label,cls,pts;
 if(ch.tones.includes(pc)){label='CHORD TONE';cls='perfect';pts=100;r.tones++;r.inside++;r.combo++;}
 else if(r.s.keyScale.includes(keyPc)||ch.scale.includes(pc)){label='NICE';cls='great';pts=50;r.inside++;r.combo++;}
 else{label='OUTSIDE';cls='ok';pts=0;r.combo=0;}
 r.points+=pts+(pts?Math.min(50,r.combo*2):0);r.maxCombo=Math.max(r.maxCombo,r.combo);
 const el=$('#stage-judge');if(el){el.className='stage-judge jam-judge '+cls;el.innerHTML=label+'<small>'+PC[midi%12]+(pts?' ・ '+(DEGREE[pc]||''):'')+'</small>';void el.offsetWidth;el.classList.add('show');}
}

function finish(r){
 const s=r.s,played=r.ctx.currentTime-r.t0;stop();
 /* A session counts as practice after a full pass or at least 30 seconds of playing. */
 const earned=played>=Math.min(30,r.total)?F.recordActivity('jam:'+s.id):0;
 const scored=!!r.mic&&r.notes>0,goals=r.mission?r.mission.goals.map(g=>evalGoal(g,r.log)):null,missionPassed=!!goals&&scored&&goals.every(g=>g.ok);
 if(r.mission)r.opts.onDone?.(missionPassed);
 if(scored&&r.points>best(s.id)){prefs.best=prefs.best||{};prefs.best[s.id]=r.points;save();}
 renderCards();
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="stage-result'+(scored?' passed':'')+'"><div class="lesson-progress">'+s.genre+' / SESSION</div><h2 id="modal-title">'+(r.mission?(missionPassed?'ミッション達成！':'ミッション未達成'):scored?'ナイス・セッション！':'おつかれさま！')+'</h2>'
   +(goals?'<div class="mission-box">'+goals.map(g=>'<div class="goal '+(g.ok?'ok':'')+'"><i>'+(g.ok?'✓':'・')+'</i><span>'+g.label+'</span><b>'+g.shown+'</b></div>').join('')+'</div>':'')
   +(scored?'<div class="result-score"><strong>'+r.points+'</strong><small>PTS</small></div>'
    +'<div class="result-grid"><div><b>'+r.notes+'</b><small>NOTES</small></div><div><b>'+Math.round(r.tones/r.notes*100)+'%</b><small>CHORD TONES</small></div><div><b>'+Math.round(r.inside/r.notes*100)+'%</b><small>IN KEY</small></div><div><b>'+r.maxCombo+'</b><small>MAX COMBO</small></div></div>'
    +'<p>'+(r.tones/r.notes>=.4?'コードの音をしっかり狙えています。次はテンポを上げてみよう。':'まずは大きい丸（コードの音）を、コードが変わった瞬間に1音だけ狙ってみよう。')+'</p>'
    :'<p>'+(r.mic?'音が検出されませんでした。ギターをマイクに近づけて、1音ずつはっきり弾いてみよう。':'伴奏だけのセッションでした。マイクをオンにすると、コードに合う音を弾けたかを表示します。')+'</p>')
   +(earned?'<div class="success-xp">+'+earned+' XP</div>':'')
   +'<p class="lesson-caption">'+(r.mic?'単音の音の高さだけを見ています。和音、リズム、フレーズの良し悪しは判定しません。':'')+'</p>'
   +'<button type="button" class="action-button" id="jam-again">もう一度セッション</button><button type="button" class="action-button secondary-action" id="jam-back">閉じる</button></div>';
  const opts=r.opts||{};$('#jam-again').onclick=()=>lobby(s,opts);$('#jam-back').onclick=opts.back||F.close;$('#jam-again').focus();
 });
}

window.addEventListener('fq:progress',()=>{try{prefs.best=JSON.parse(localStorage.getItem('fretQuestJam'))?.best||prefs.best;}catch{}renderCards();});
window.FQJam={sessions:SESSIONS,renderCards,lobby};
renderCards();
})();

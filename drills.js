/* FRET QUEST guitar drills judged by pitch: fretboard hunter, chord-change attack and string bending.
   The microphone hears single notes (pitch plus pick attack). Chords, fingering and which string was used are not judged.
   Nothing is recorded or uploaded. */
(()=>{'use strict';
const F=window.FretQuest,K=window.FQStage.kit,P=window.FQPitch,I=window.FQInst,$=s=>document.querySelector(s);
/* Strings come from the instrument setting: 6 on guitar, 4 on bass (string 1 is the thinnest). */
const BASS=I.isBass(),INST=I.get(),OPEN=INST.open,LOW=OPEN.length-1,NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],ALT={1:'C♯ / D♭',3:'D♯ / E♭',6:'F♯ / G♭',8:'G♯ / A♭',10:'A♯ / B♭'};
const NATURAL=[0,2,4,5,7,9,11],ALL=[...Array(12).keys()];
let prefs={best:{},hunt:'1',change:'gcd',bend:'2'};
try{Object.assign(prefs,JSON.parse(localStorage.getItem('fretQuestDrills'))||{});}catch{}
const save=()=>{try{localStorage.setItem('fretQuestDrills',JSON.stringify(prefs));}catch{}};
const latency=()=>{try{return Number(JSON.parse(localStorage.getItem('fretQuestStage'))?.latency)||0;}catch{return 0;}};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const noteName=m=>NAMES[m%12]+(Math.floor(m/12)-1);
const place=(s,f)=>s+'弦'+(f?f+'フレット':'開放');

const HUNT_TIME=60;
const STRINGS=OPEN.slice(1).map((_,i)=>LOW-i);
const HUNT={'1':{label:LOW+'・'+(LOW-1)+'弦',strings:[LOW,LOW-1],pcs:NATURAL},'2':{label:'全部の弦',strings:STRINGS,pcs:NATURAL},'3':{label:'♯♭もあり',strings:STRINGS,pcs:ALL}};
const PROGS={gcd:{label:'G → C → D → G',chords:['G','C','D','G']},pop:{label:'Em → C → G → D',chords:['Em','C','G','D']},f:{label:'C → Am → F → G',chords:['C','Am','F','G']}};
/* Bends on strings 3 and 2, where they are usually played. steps are semitones. */
const BENDS={'1':{label:'半音',steps:[1]},'2':{label:'全音',steps:[2]},'3':{label:'ミックス',steps:[1,2,2,3]}};
const BEND_SPOTS=[[3,7],[2,8],[3,9],[2,10],[3,5],[2,5],[3,12],[2,12]],BEND_ROUNDS=8,STEP_NAME={1:'半音',2:'全音',3:'1音半'};
const OPTS={hunt:HUNT,change:PROGS,bend:BENDS};
const GAMES={
 hunt:{title:'指板ハンター',tag:'言われた音を、60秒で何個弾ける？',kicker:'FRETBOARD HUNTER',unit:'音',about:'画面に出た弦と音名を、ギターで弾こう。正しい高さの音が聞こえたら次の問題へ。60秒で何個見つけられるかに挑戦。',how:'指定された弦の0〜12フレットから探します。判定するのは音の高さだけで、どの弦で弾いたかは判定しません。'},
 change:{title:'コードチェンジ・アタック',tag:'小節の頭に、次のコードが間に合うか。',kicker:'CHORD CHANGE ATTACK',unit:'BPM',about:'1小節ごとにコードが変わります。各小節の1拍目に、そのコードのいちばん低い音（ルート）を弾こう。4小節中3回間に合えばテンポが上がります。ミス3回で終了。',how:BASS?'1拍目にルート音を弾こう。2〜4拍目は自由（ルートを刻み続けてもOK）。判定するのは1拍目のルート音の高さとタイミングです。':'1拍目はルート音を1本だけ、2〜4拍目は自由にストロークしてOK。判定するのはルート音の高さとタイミングだけで、コード全体の押さえ方は判定しません。'},
 ...(BASS?{}:{bend:{title:'チョーキング・ジャッジ',tag:'狙った音程まで、ぴったり上げる。',kicker:'BEND TO PITCH',unit:'点',about:'お手本の音を聴いてから、指定のフレットを弾いて弦を持ち上げよう。目標の高さで0.3秒キープできたら成功。ずれの小ささで点数が決まります。全8問。',how:'最初に押さえたフレットの音から持ち上げてください。はじめから高いフレットを押さえた音は数えません。'}})
};
let run=null;

/* ---------- Cards and lobby ---------- */
const bestKey=id=>id+'-'+prefs[id];
function bestLabel(id){const b=prefs.best[bestKey(id)];return (OPTS[id][prefs[id]]?.label||'')+' ・ '+(b?'BEST '+(id==='change'?'♩ ':'')+b+(id==='change'?'':' '+GAMES[id].unit):'NEW');}
function renderCards(){
 const el=$('#drill-cards');if(!el)return;
 if(BASS){const lead=$('#drill-lead');if(lead)lead.textContent='マイクで音の高さを判定。指板とコードチェンジ（ルート弾き）を3分で。';}
 el.innerHTML=Object.entries(GAMES).map(([id,g])=>'<button type="button" class="game-card drill-card drill-'+id+'" data-drill="'+id+'"><span class="jam-genre">'+g.kicker+'</span><strong>'+g.title+'</strong><span class="jam-changes">'+g.tag+'</span><span class="game-best">'+bestLabel(id)+'</span></button>').join('');
 el.querySelectorAll('[data-drill]').forEach(b=>b.onclick=()=>lobby(b.dataset.drill));
}
function stop(){if(!run)return;const r=run;run=null;cancelAnimationFrame(r.raf);r.audio.stop();r.mic.stream.getTracks().forEach(t=>t.stop());r.mic.src.disconnect();document.removeEventListener('visibilitychange',r.onHide);}

function lobby(id){
 const g=GAMES[id];
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="jam-lobby"><div class="lesson-progress">GUITAR DRILL / '+g.kicker+'</div><h2 id="modal-title">'+g.title+'</h2><div class="stage-meta"><span class="stage-best" id="drill-best">'+bestLabel(id)+'</span></div><p>'+g.about+'</p>'
   +'<div class="game-howto"><b>判定</b>'+g.how+'</div>'
   +'<div class="stage-options"><div class="chip-row three" role="group" aria-label="難易度">'+Object.entries(OPTS[id]).map(([k,v])=>'<button type="button" data-opt="'+k+'">'+v.label+'</button>').join('')+'</div></div>'
   +'<button type="button" class="action-button" id="drill-start">マイクで始める '+F.icon('arrow')+'</button>'
   +'<p class="lesson-caption">チューニングを合わせてから始めよう。イヤホンを使うと、お手本の音を自分の音と取り違えにくくなります。</p></div>';
  const sync=()=>{document.querySelectorAll('[data-opt]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.opt===prefs[id])));$('#drill-best').textContent=bestLabel(id);};
  document.querySelectorAll('[data-opt]').forEach(b=>b.onclick=()=>{prefs[id]=b.dataset.opt;save();sync();renderCards();});
  $('#drill-start').onclick=()=>start(id);sync();$('#drill-start').focus();
 });
}

/* ---------- Shared engine: one microphone loop feeding pitch, attacks and a stable note to the game. ---------- */
async function start(id){
 const generation=F.generation();$('#drill-start').disabled=true;
 await F.ensureAudio();const ctx=F.audioContext();if(generation!==F.generation())return;
 if(!ctx||ctx.state!=='running'){F.notify('音を再生できません。消音設定と音量を確認してください。');lobby(id);return;}
 let mic;try{mic=await K.openMic(ctx);}catch(e){if(generation!==F.generation())return;F.notify('マイクを使えません。このドリルはギターの音を聴いて判定します。');lobby(id);return;}
 if(generation!==F.generation()){mic.stream.getTracks().forEach(t=>t.stop());return;}
 const out=ctx.outputLatency||ctx.baseLatency||0;
 const r={id,ctx,mic,audio:K.synth(ctx),onset:K.onsetDetector(),comp:out+.045+latency(),out,level:0,lastOnset:-99,stable:0,lastMidi:null,firstMatch:0,state:{}};
 $('#modal-inner').innerHTML='<div class="game-play drill-play drill-'+id+'"><div class="stage-hud"><div><small id="d-left-label">SCORE</small><strong id="d-left">0</strong></div><div class="stage-title"><small>GUITAR DRILL</small><b id="modal-title">'+GAMES[id].title+'</b></div><div class="stage-combo"><small id="d-right-label">TIME</small><strong id="d-right">—</strong></div></div>'
  +'<div class="game-stage"><div class="game-phase" id="d-phase">READY</div><div class="drill-target" id="d-target">&nbsp;</div><div class="game-sub" id="d-sub">&nbsp;</div><div id="d-extra" class="drill-extra"></div><div class="drill-heard">聞こえた音 <b id="d-heard">—</b></div></div>'
  +'<div class="stage-mic"><span>MIC</span><div class="stage-level"><span id="d-level"></span></div></div>'
  +'<button type="button" class="action-button secondary-action" id="d-quit">やめる</button></div>';
 run=r;F.setCleanup(stop);
 r.onHide=()=>{if(document.hidden){stop();lobby(id);}};document.addEventListener('visibilitychange',r.onHide);
 $('#d-quit').onclick=()=>{stop();lobby(id);};
 const game=({hunt,change,bend})[id](r);
 let shown=null;
 const frame=()=>{
  if(run!==r)return;
  mic.an.getFloatTimeDomainData(mic.buf);
  const at=ctx.currentTime-r.comp,onset=r.onset(mic.buf,at),d=P.detect(mic.buf,ctx.sampleRate,r.onset.gate(),INST.minHz);
  r.level=r.level*.6+d.rms*.4;$('#d-level').style.width=K.meterPct(r.level)+'%';
  if(onset){r.lastOnset=at;r.stable=0;}
  /* A note counts once the same semitone is heard in two frames in a row; firstMatch is when it began. */
  if(d.frequency){const m=Math.round(P.midi(d.frequency));if(m!==r.lastMidi||r.stable===0){r.firstMatch=at;r.stable=0;}r.lastMidi=m;r.stable++;}else{r.stable=0;r.lastMidi=null;}
  const midi=r.stable>=2?r.lastMidi:null;
  if(midi!==shown){shown=midi;$('#d-heard').textContent=midi===null?'—':noteName(midi);}
  if(game.tick(ctx.currentTime,{at,onset,freq:d.frequency,midi,since:r.firstMatch})===false)return;
  r.raf=requestAnimationFrame(frame);
 };
 r.raf=requestAnimationFrame(frame);
}
function flash(text,cls){const el=$('#d-phase');el.textContent=text;el.className='game-phase '+(cls||'');}

/* ---------- Drill 1: fretboard hunter ---------- */
function hunt(r){
 const lv=HUNT[prefs.hunt]||HUNT['1'],t0=r.ctx.currentTime+1.2,end=t0+HUNT_TIME;let q=null,prev=null,correct=0,wrong=0,next=t0;const times=[];
 $('#d-left-label').textContent='FOUND';
 const ask=at=>{
  const pool=[];lv.strings.forEach(s=>lv.pcs.forEach(pc=>{if(!prev||pc!==prev.pc)pool.push([s,pc]);}));
  const [s,pc]=pick(pool),frets=[...Array(13).keys()].filter(f=>(OPEN[s]+f)%12===pc);
  q={s,pc,frets,targets:new Set(frets.map(f=>OPEN[s]+f)),shownAt:at,warned:null};prev=q;r.state.q={string:s,targets:[...q.targets],shownAt:at};
  $('#d-target').innerHTML='<span class="drill-string">'+s+'弦の</span><b>'+(ALT[pc]||NAMES[pc])+'</b>';
  $('#d-sub').textContent='見つけたら弾こう';flash('FIND','turn');
 };
 return {tick(now,f){
  const left=Math.max(0,end-now);$('#d-right').textContent=now<t0?HUNT_TIME:Math.ceil(left);
  if(now<t0){flash('READY','listen');$('#d-sub').textContent='ギターを構えて';return;}
  if(now>=end){r.state.q=null;finish(r,{score:correct,line:HUNT_TIME+'秒で '+correct+'音'+(times.length?'・平均 '+(times.reduce((a,b)=>a+b,0)/times.length).toFixed(1)+'秒/音':'')+(wrong?'・ちがう音 '+wrong+'回':''),share:'60秒で'+correct+'音'});return false;}
  if(!q){if(now>=next)ask(f.at);return;}
  /* The note must start after the question appeared and come with a fresh pick attack. */
  if(f.midi===null||f.since<q.shownAt||r.lastOnset<q.shownAt-.05)return;
  if(q.targets.has(f.midi)){
   correct++;times.push(f.at-q.shownAt);$('#d-left').textContent=correct;
   flash('GOT IT!','ok');$('#d-sub').textContent=place(q.s,f.midi-OPEN[q.s])+'でした';q=null;r.state.q=null;next=now+.45;return;
  }
  if(q.warned===f.midi||r.stable<3)return;q.warned=f.midi;
  if(f.midi%12===q.pc){$('#d-sub').textContent='音名は合っています。'+q.s+'弦の0〜12フレットで、オクターブ違いを探そう';flash('OCTAVE','listen');return;}
  wrong++;flash('MISS','ng');$('#d-sub').textContent='それは '+NAMES[f.midi%12]+'。もう一度探そう';
 }};
}

/* ---------- Drill 2: chord-change attack ---------- */
/* Guitar: the chord's lowest fretted string is its root in every shape used here (G, C, D, Em, Am, F).
   Bass: the root on the two lowest strings at the lowest fret. */
function rootOf(name){
 if(BASS){const pc=I.rootPc(name);let best=null;for(const s of [LOW,LOW-1])for(let f=0;f<12;f++)if((OPEN[s]+f)%12===pc&&(!best||f<best.fret))best={s,fret:f,midi:OPEN[s]+f};return best;}
 const shape=F.chordShape(name)||[];const i=shape.findIndex(x=>x>=0);return i<0?null:{s:6-i,fret:shape[i],midi:OPEN[6-i]+shape[i]};
}
/* Roots are accepted from just below the lowest open string up two octaves. */
const ROOT_LO=OPEN[LOW]-2,ROOT_HI=OPEN[LOW]+24;
function change(r){
 const prog=PROGS[prefs.change]||PROGS.gcd,bars=prog.chords.map(c=>({chord:c,root:rootOf(c)}));
 let bpm=60,lives=3,top=0,round=null;const rows=[];
 $('#d-left-label').textContent='TEMPO';$('#d-right-label').textContent='LIFE';$('#d-right').classList.add('g-lives');
 const lifeUi=()=>{$('#d-right').textContent='♥'.repeat(Math.max(0,lives))+'♡'.repeat(3-Math.max(0,lives));};
 const newRound=start=>{
  const spb=60/bpm,judge=start+4*spb;
  for(let k=0;k<4;k++)r.audio.click(start+k*spb,k===0);
  /* During the judged bars the beat is a soft hi-hat: no pitch, so it cannot be taken for a root note. */
  for(let k=0;k<16;k++)r.audio.hat(judge+k*spb,k%4===0);
  round={spb,start,judge,end:judge+16*spb,bars:bars.map((b,i)=>({...b,t:judge+i*4*spb,hit:null})),judged:false};
  r.state.round={bpm,bars:round.bars.map(b=>({t:b.t,midi:b.root.midi}))};
  $('#d-left').textContent=bpm;lifeUi();$('#d-extra').innerHTML=chips(round.bars,-1);
 };
 newRound(r.ctx.currentTime+.5);
 return {tick(now,f){
  const v=now-r.out,R=round;
  if(f.midi!==null&&f.midi>=ROOT_LO&&f.midi<=ROOT_HI)for(const b of R.bars){
   if(b.hit!==null||f.midi%12!==b.root.midi%12)continue;
   /* Time it by the pick attack when one came just before the pitch settled. */
   const t=r.lastOnset<=f.since&&r.lastOnset>f.since-.15?r.lastOnset:f.since;
   if(Math.abs(t-b.t)<=.3&&r.lastOnset>=b.t-.35){b.hit=t-b.t;$('#d-extra').innerHTML=chips(R.bars,Math.floor((v-R.judge)/(4*R.spb)));break;}
  }
  if(v<R.judge){const n=Math.max(1,Math.min(4,Math.floor((v-R.start)/R.spb)+1));flash('COUNT '+n,'listen');$('#d-target').innerHTML='<b>'+R.bars[0].chord+'</b>';$('#d-sub').textContent='1拍目に '+place(R.bars[0].root.s,R.bars[0].root.fret)+'（'+noteName(R.bars[0].root.midi)+'）';return;}
  if(v<R.end){
   const i=Math.min(3,Math.floor((v-R.judge)/(4*R.spb))),b=R.bars[i],nb=R.bars[(i+1)%4],beat=Math.floor((v-R.judge)/R.spb)%4+1;
   flash(beat===1?'NOW!':String(beat),beat===1?'turn':'');
   $('#d-target').innerHTML='<b>'+b.chord+'</b><span class="drill-next">次 '+nb.chord+' ・ '+place(nb.root.s,nb.root.fret)+'</span>';
   $('#d-sub').textContent=(i+1)+' / 4 小節';$('#d-extra').innerHTML=chips(R.bars,i);return;
  }
  if(!R.judged&&f.at>R.end+.1){
   R.judged=true;const hits=R.bars.filter(b=>b.hit!==null).length,ok=hits>=3;
   rows.push({bpm,hits,offsets:R.bars.map(b=>b.hit)});
   if(ok){top=Math.max(top,bpm);bpm+=8;flash('TEMPO UP!','ok');}else{lives--;flash('MISS','ng');}
   $('#d-sub').textContent='4回中 '+hits+'回 間に合った';$('#d-extra').innerHTML=chips(R.bars,-1);lifeUi();
   if(lives<=0||bpm>140){r.state.round=null;setTimeout(()=>finish(r,{score:top,rows,line:prog.label+' を ♩ '+(top||'—')+' までクリア',share:prog.label+' を♩'+(top||'—')+'でチェンジ'}),1000);return false;}
   newRound(R.end+R.spb);
  }
 }};
}
function chips(bars,current){return '<div class="change-chips">'+bars.map((b,i)=>'<span class="'+(i===current?'now ':'')+(b.hit===null?(i<current?'miss':''):Math.abs(b.hit)<=.08?'great':'ok')+'"><b>'+b.chord+'</b><small>'+(b.hit===null?(i<current?'✗':'·'):(Math.abs(b.hit)<=.03?'JUST':(b.hit<0?'−':'+')+Math.round(Math.abs(b.hit)*1000)+'ms'))+'</small></span>').join('')+'</div>';}

/* ---------- Drill 3: string bending ---------- */
function bend(r){
 const lv=BENDS[prefs.bend]||BENDS['2'],spots=[...BEND_SPOTS].sort(()=>Math.random()-.5),results=[];
 let n=0,q=null;
 $('#d-left-label').textContent='ROUND';$('#d-right-label').textContent='SCORE';
 const ask=t=>{
  const [s,fret]=spots[n%spots.length],step=lv.steps[n%lv.steps.length],base=OPEN[s]+fret,target=base+step;n++;
  /* The reference tone is the target pitch; the player starts only after it has died away. */
  r.audio.pluck(t,target,.6,.12);
  q={s,fret,step,base,target,tf:P.frequency(target),go:t+1.3,end:t+1.3+5,started:false,hold:null,devs:[],max:-Infinity,warned:false,done:null};
  r.state.q={base,target,go:q.go,end:q.end};
  $('#d-left').textContent=n+' / '+BEND_ROUNDS;
  $('#d-target').innerHTML='<span class="drill-string">'+place(s,fret)+'</span><b>'+STEP_NAME[step]+'</b><span class="drill-next">'+noteName(base)+' → '+noteName(target)+'</span>';
  $('#d-extra').innerHTML=gauge(null,step);
 };
 const close=(score,note)=>{q.done={score,note};results.push({s:q.s,fret:q.fret,step:q.step,score,note});r.state.q=null;
  flash(score?'NICE!':'MISS',score?'ok':'ng');$('#d-sub').textContent=(score?score+'点 ・ ':'')+note;
  $('#d-right').textContent=Math.round(results.reduce((a,b)=>a+b.score,0)/results.length);q.next=r.ctx.currentTime+1.1;};
 ask(r.ctx.currentTime+.6);
 return {tick(now,f){
  if(q.done){if(now<q.next)return;if(n>=BEND_ROUNDS){const avg=Math.round(results.reduce((a,b)=>a+b.score,0)/results.length);finish(r,{score:avg,results,line:BEND_ROUNDS+'問の平均 '+avg+'点 ・ 成功 '+results.filter(x=>x.score).length+'問',share:'チョーキング'+lv.label+' '+avg+'点'});return false;}ask(now+.2);return;}
  if(now<q.go){flash('LISTEN','listen');$('#d-sub').textContent='この高さまで上げよう';return;}
  if(now>=q.end){const c=Math.round(q.max);close(0,!q.started?'フレットの音が聞こえませんでした':q.max===-Infinity?'音が途切れました':c<-25?'あと '+(-c)+' セント足りない':'上げすぎ（+'+c+' セント）');return;}
  flash('BEND!','turn');
  if(!f.freq||r.lastOnset<q.go-r.comp-.05){if(!q.started)$('#d-sub').textContent=place(q.s,q.fret)+'を弾いて、持ち上げる';return;}
  const fromBase=1200*Math.log2(f.freq/P.frequency(q.base)),c=1200*Math.log2(f.freq/q.tf);
  /* The bend must start from the fretted note, so fretting the target pitch directly does not count. */
  if(!q.started){
   if(Math.abs(fromBase)<=70){q.started=true;}
   else{if(Math.abs(c)<=40&&!q.warned){q.warned=true;$('#d-sub').textContent='はじめは '+place(q.s,q.fret)+' の音から';}return;}
  }
  q.max=Math.max(q.max,c);$('#d-extra').innerHTML=gauge(fromBase,q.step);
  if(Math.abs(c)<=25){if(q.hold===null){q.hold=f.at;q.devs=[];}q.devs.push(Math.abs(c));
   if(f.at-q.hold>=.3){const mean=q.devs.reduce((a,b)=>a+b,0)/q.devs.length;close(Math.max(50,Math.min(100,Math.round(100-mean*2))),'ずれ平均 '+Math.round(mean)+' セント');}}
  else q.hold=null;
 }};
}
/* Gauge from the fretted note (left) to past the target; the green band is ±25 cents around the target. */
function gauge(cents,step){
 const span=step*100+60,x=c=>Math.max(0,Math.min(100,c/span*100)),t=x(step*100),band=25/span*100;
 return '<div class="bend-gauge" aria-hidden="true"><i class="bend-band" style="left:'+(t-band)+'%;width:'+band*2+'%"></i><i class="bend-target" style="left:'+t+'%"></i>'+(cents===null?'':'<i class="bend-needle" style="left:'+x(cents)+'%"></i>')+'</div><div class="bend-scale"><span>押さえた音</span><span style="left:'+t+'%">目標</span></div>';
}

/* ---------- Result ---------- */
function finish(r,res){
 stop();const id=r.id,key=bestKey(id),old=prefs.best[key]||0,record=res.score>old;
 if(record){prefs.best[key]=res.score;save();}
 const earned=F.recordActivity('game:'+id);renderCards();
 const text='FRET QUEST '+GAMES[id].title+'：'+res.share+(record?'（自己ベスト）':'');
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="stage-result'+(record?' passed':'')+'">'+(record?'<div class="confetti" aria-hidden="true">'+Array.from({length:20},(_,i)=>'<i style="--x:'+(5+i*4.5)+'%;--delay:'+(i%4*.07)+'s;--r:'+(i%2?200:-160)+'deg"></i>').join('')+'</div>':'')
   +'<div class="lesson-progress">GUITAR DRILL / RESULT</div><h2 id="modal-title">'+(record?'自己ベスト更新！':'ドリル終了')+'</h2>'
   +'<div class="result-score"><strong>'+(res.score||0)+'</strong><small>'+GAMES[id].unit+'</small></div><p>'+res.line+'</p>'
   +(res.rows?res.rows.map(x=>'<div class="clock-row"><b>♩ '+x.bpm+'</b><span>'+x.hits+' / 4</span><span>'+x.offsets.map(o=>o===null?'✗':(o<0?'−':'+')+Math.round(Math.abs(o)*1000)).join(' ')+'</span><span>'+(x.hits>=3?'✓':'✗')+'</span></div>').join(''):'')
   +(res.results?res.results.map(x=>'<div class="clock-row"><b>'+x.s+'弦'+x.fret+'f</b><span>'+STEP_NAME[x.step]+'</span><span>'+x.note+'</span><span>'+(x.score||'✗')+'</span></div>').join(''):'')
   +(earned?'<div class="success-xp">+'+earned+' XP</div>':'')
   +'<p class="lesson-caption">マイクで単音の高さとタイミングを判定しました。押さえ方やどの弦で弾いたかは判定していません。ベスト記録はこの端末に保存されます。</p>'
   +'<button type="button" class="action-button" id="d-share">結果をシェア</button><button type="button" class="action-button secondary-action" id="d-again">もう一度</button><button type="button" class="action-button secondary-action" id="d-close">閉じる</button></div>';
  $('#d-share').onclick=async()=>{const url=location.origin+location.pathname;try{if(navigator.share){await navigator.share({text,url});return;}await navigator.clipboard.writeText(text+' '+url);F.notify('結果をコピーしました。');}catch(e){if(e?.name!=='AbortError')F.notify('シェアできませんでした。');}};
  $('#d-again').onclick=()=>lobby(id);$('#d-close').onclick=F.close;$('#d-again').focus();
 });
}

window.addEventListener('fq:progress',()=>{try{prefs.best=JSON.parse(localStorage.getItem('fretQuestDrills'))?.best||prefs.best;}catch{}renderCards();});
window.FQDrills={games:GAMES,renderCards,lobby,state:()=>run?{id:run.id,now:run.ctx.currentTime,...run.state}:null};
renderCards();
})();

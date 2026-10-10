/* FRET QUEST air practice: learn phrases, chord shapes and session playing on an on-screen fretboard, with no instrument.
   The board uses the real strings and frets of the chosen instrument, so the movements carry over to the guitar or bass.
   Four games: trace (tap the phrase in time with guides), recall (rebuild it from memory), shapes (place chord forms)
   and changes (have each form ready before the chord changes). Sessions use the same board through FQJam (opts.air). */
(()=>{'use strict';
const F=window.FretQuest,K=window.FQStage.kit,I=window.FQInst,$=s=>document.querySelector(s);
const INST=I.get(),OPEN=INST.open,STRINGS=OPEN.length-1,BASS=I.isBass();
const PASS=60,EXTRA_PENALTY=25;
const GRADE={perfect:{label:'PERFECT',pts:100},great:{label:'GREAT',pts:75},ok:{label:'OK',pts:40},miss:{label:'MISS',pts:0}};
const latencyPref=()=>{try{return Number(JSON.parse(localStorage.getItem('fretQuestStage'))?.latency)||0;}catch{return 0;}};

/* ---------- Progress: per module, a1/a2 best scores and a3 (session mission) passed. Kept in this browser. ---------- */
const KEY='fretQuestAir';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}};
const store=(id,patch)=>{const all=load();all[id]={...(all[id]||{}),...patch};try{localStorage.setItem(KEY,JSON.stringify(all));}catch{}window.dispatchEvent(new Event('fq:air'));};
/* Strum-chart modules practise chord forms; tab modules practise the phrase. A session step exists only where the module has a session mission. */
const isShape=m=>m.kind==='comp'&&(m.learn.type||'strum')==='strum';
const steps=m=>isShape(m)?2:m.use.session?3:2;
function status(m){const p=load()[m.id]||{};return [(p.a1||0)>=PASS,(p.a2||0)>=PASS,!!p.a3].slice(0,steps(m));}
/* Records a step result and awards daily XP on a first pass. */
function result(m,step,score,passed){
 const p=load()[m.id]||{},k='a'+step;
 if(step===3){if(passed&&!p.a3){store(m.id,{a3:true});award(m,step);}return;}
 if(score>(p[k]||0)){store(m.id,{[k]:score});if(passed&&(p[k]||0)<PASS)award(m,step);}
}
function award(m,step){const xp=F.recordActivity('lick:'+m.id+'-a'+step);if(status(m).every(Boolean))F.notify('「'+m.title+'」を指板でマスター！ 次は'+INST.name+'で弾いてみよう。');else if(xp)F.notify('+'+xp+' XP');}

/* ---------- Board ---------- */
/* A window of frets that holds every position, at least 6 frets wide and at most 10. */
function windowFor(positions){
 const fs=positions.map(p=>p.fret),min=Math.min(...fs),max=Math.max(...fs);
 const lo=min<=1?0:min-1;let hi=Math.max(max+1,lo+5);if(hi-lo>9)hi=lo+9;return {lo,hi};
}
const INLAY=[3,5,7,9,15,17];
function boardHtml(w){
 let h='<div class="air-board'+(BASS?' bass':'')+'" style="--cols:'+(w.hi-w.lo+1)+'" role="group" aria-label="指板（'+INST.name+'）">';
 for(let s=1;s<=STRINGS;s++){
  h+='<div class="air-row s'+s+'"><b class="air-sn">'+s+'</b>';
  for(let f=w.lo;f<=w.hi;f++)h+='<button type="button" class="air-cell'+(f===0?' nut':'')+'" data-s="'+s+'" data-f="'+f+'" data-midi="'+(OPEN[s]+f)+'" aria-label="'+s+'弦 '+f+'フレット"><span></span></button>';
  h+='</div>';
 }
 h+='<div class="air-row air-frets"><b class="air-sn"></b>'+Array.from({length:w.hi-w.lo+1},(_,i)=>{const f=w.lo+i;return '<span class="'+(INLAY.includes(f)||f===12?'inlay':'')+'">'+(f===0?'開放':f)+'</span>';}).join('')+'</div></div>';
 return h;
}
const cell=(root,s,f)=>root.querySelector('.air-cell[data-s="'+s+'"][data-f="'+f+'"]');
/* Calls fn for every tap on the board, with the position and the time of the touch. */
function bindBoard(root,fn){
 root.querySelectorAll('.air-cell').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();fn({s:Number(b.dataset.s),f:Number(b.dataset.f),midi:Number(b.dataset.midi),el:b});}));
}
const flashCell=(b,cls)=>{if(!b)return;b.classList.remove(cls);void b.offsetWidth;b.classList.add(cls);setTimeout(()=>b.classList.remove(cls),450);};

/* ---------- Sound ---------- */
let kit=null;
async function sound(){await F.ensureAudio();const ctx=F.audioContext();if(!ctx||ctx.state!=='running'){F.notify('音を再生できません。音量を確認してください。');return null;}if(!kit||kit.ctx!==ctx||kit.dead){kit={ctx,a:K.synth(ctx)};}return kit;}
const stopKit=()=>{if(kit){kit.a.stop();kit.dead=true;kit=null;}};
/* A tapped note sounds right away. Bass notes play an octave up so a phone speaker can carry them. */
const voice=m=>BASS?m+12:m;
async function tapSound(midi){const k=await sound();k?.a.pluck(k.ctx.currentTime+.005,voice(midi),.45,.15);}
async function playPhrase(notes,bpm){const k=await sound();if(!k)return;const spb=60/bpm,t=k.ctx.currentTime+.1;notes.forEach(n=>k.a.pluck(t+n.beat*spb,voice(n.midi),n.len*spb,.15));}
function strumShape(name){sound().then(k=>{if(!k)return;const ms=K.chordMidis(name),t=k.ctx.currentTime+.02;ms.forEach((m,i)=>k.a.pluck(t+i*.018,m,.9,.07));});}

/* ---------- Shared screens ---------- */
const head=(kicker,title)=>'<div class="lesson-progress">'+kicker+'</div><h2 id="modal-title">'+title+'</h2>';
function popup(text,cls,sub){const el=$('#air-judge');if(!el)return;el.className='stage-judge air-judge '+cls;el.innerHTML=text+(sub?'<small>'+sub+'</small>':'');void el.offsetWidth;el.classList.add('show');}
function resultScreen({kicker,title,score,passed,lines,again,back,next}){
 const stars=window.FQStage.starsFor(score);
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="stage-result'+(passed?' passed':'')+'">'+head(kicker,passed?title:'あと少し！')
   +'<div class="result-stars" aria-label="'+stars+'つ星">'+[0,1,2].map(i=>'<span class="'+(i<stars?'on':'')+'" style="--i:'+i+'">★</span>').join('')+'</div>'
   +'<div class="result-score"><strong>'+score+'</strong><small>/ 100</small></div>'
   +(lines||'')
   +'<p>'+(passed?'':'★1（'+PASS+'点）でクリア。')+'</p>'
   +'<p class="lesson-caption">画面の指板でのタップを判定しました。'+INST.name+'の演奏の判定ではありません。</p>'
   +(passed&&next?'<button type="button" class="action-button" id="air-next-step">'+next.label+' '+F.icon('arrow')+'</button>':'')
   +'<button type="button" class="action-button'+(passed&&next?' secondary-action':'')+'" id="air-again">もう一度</button>'
   +'<button type="button" class="action-button secondary-action" id="air-back">戻る</button></div>';
  $('#air-again').onclick=again;$('#air-back').onclick=back;if(passed&&next)$('#air-next-step').onclick=next.go;
  ($('#air-next-step')||$('#air-again')).focus();
 });
}

/* ---------- Game 1: trace ----------
   The phrase plays out on the board: a ring closes in on each position, tap it on the beat.
   Right position and timing score like a stage; a wrong position costs points and leaves the note open. */
let run=null;
function stopRun(){if(!run)return;const r=run;run=null;cancelAnimationFrame(r.raf);r.audio.stop();document.removeEventListener('visibilitychange',r.onHide);}
function traceLobby(spec){
 const prefs=traceLobby.prefs||(traceLobby.prefs={speed:.75,guide:true});
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="air-lobby">'+head(spec.kicker,spec.title)
   +'<p>光る輪が縮んで<b>ぴったり重なった瞬間</b>に、その場所をタップ。指板の位置とリズムを同時に覚えます。</p>'
   +'<div class="air-board-wrap">'+boardHtml(spec.w)+'</div>'
   +'<div class="stage-options"><div class="chip-row" role="group" aria-label="テンポ"><button type="button" data-speed="0.75">ゆっくり</button><button type="button" data-speed="1">ふつう</button></div>'
   +'<label class="stage-toggle"><input type="checkbox" id="air-guide"> <span>お手本の音も一緒に鳴らす</span></label></div>'
   +'<button type="button" class="action-button" id="air-start">スタート '+F.icon('arrow')+'</button>'
   +'<button type="button" class="action-button secondary-action" id="air-listen">フレーズを聴く</button>'
   +'<button type="button" class="action-button secondary-action" id="air-back">戻る</button>'
   +'<p class="lesson-caption">♩'+spec.bpm+'・'+spec.notes.length+'音。★1（'+PASS+'点）でクリア。「ゆっくり」は★2まで。</p></div>';
  /* Show where the phrase lives before it starts. */
  spec.notes.forEach((n,i)=>cell(el,n.string,n.fret)?.classList.add(i===0?'first':'preview'));
  const sync=()=>{el.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===prefs.speed)));$('#air-guide').checked=prefs.guide;};
  el.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{prefs.speed=Number(b.dataset.speed);sync();});
  $('#air-guide').onchange=e=>{prefs.guide=e.target.checked;};
  $('#air-listen').onclick=()=>playPhrase(spec.notes,spec.bpm);
  $('#air-start').onclick=()=>traceStart(spec,prefs);$('#air-back').onclick=spec.back;sync();
 });
}
async function traceStart(spec,prefs){
 const generation=F.generation();await F.ensureAudio();const ctx=F.audioContext();if(generation!==F.generation())return;
 if(!ctx||ctx.state!=='running'){F.notify('音を再生できません。音量を確認してください。');return;}
 stopKit();stopRun();
 const speed=prefs.speed,spb=60/(spec.bpm*speed),meter=4,beats=spec.beats,outLat=ctx.outputLatency||ctx.baseLatency||0;
 const r={ctx,audio:K.synth(ctx),spb,t0:ctx.currentTime+.4+meter*spb,comp:outLat+.01+latencyPref(),outLat,
  items:spec.notes.map((n,i)=>({...n,i,time:n.beat*spb,grade:null})),points:0,extra:0,combo:0,maxCombo:0,counts:{perfect:0,great:0,ok:0,miss:0},offsets:[]};
 const a=r.audio,at=b=>r.t0+b*spb;
 for(let b=-meter;b<0;b++)a.click(at(b),b===-meter);
 for(let b=0;b<Math.ceil(beats);b++){a.hat(at(b),b%meter===0);if(b%meter===0)a.kick(at(b));}
 if(prefs.guide)r.items.forEach(it=>a.pluck(at(it.beat),voice(it.midi),Math.max(.2,it.len*spb),.05));
 const length=beats*spb;
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="air-play"><div class="stage-hud"><div><small>SCORE</small><strong id="air-score">0</strong></div><div class="stage-title"><small>指板 ・ ♩ '+Math.round(spec.bpm*speed)+'</small><b id="modal-title">'+spec.title+'</b></div><div class="stage-combo" id="air-combo-box"><small>COMBO</small><strong id="air-combo">0</strong></div></div>'
   +'<div class="stage-track"><span id="air-progress"></span></div>'
   +'<div class="air-next" id="air-next">&nbsp;</div>'
   +'<div class="air-board-wrap play">'+boardHtml(spec.w)+'<div id="air-judge" class="stage-judge air-judge" aria-live="polite"></div></div>'
   +'<button type="button" class="action-button secondary-action" id="air-quit">やめる</button></div>';
 });
 const root=$('.air-play');run=r;F.setCleanup(stopRun);
 r.onHide=()=>{if(document.hidden){stopRun();traceLobby(spec);}};document.addEventListener('visibilitychange',r.onHide);
 $('#air-quit').onclick=()=>{stopRun();traceLobby(spec);};
 const mark=(it,grade,t)=>{it.grade=grade;r.counts[grade]++;r.points+=GRADE[grade].pts;
  if(grade==='miss'){r.combo=0;popup('MISS','miss','');flashCell(cell(root,it.string,it.fret),'missed');}
  else{r.combo++;r.maxCombo=Math.max(r.maxCombo,r.combo);popup(GRADE[grade].label,grade,grade==='perfect'?'':t<it.time?'EARLY':'LATE');flashCell(cell(root,it.string,it.fret),'hit');}};
 bindBoard(root,({s,f,midi,el})=>{
  if(run!==r)return;const t=r.ctx.currentTime-r.t0-r.comp;
  a.pluck(r.ctx.currentTime+.003,voice(midi),.4,.14);
  let best=null;for(const it of r.items){if(it.grade)continue;const d=Math.abs(t-it.time);if(d<=.3&&(!best||d<Math.abs(t-best.time)))best=it;}
  if(best&&best.string===s&&best.fret===f){const off=Math.abs(t-best.time);r.offsets.push(t-best.time);mark(best,off<=.09?'perfect':off<=.17?'great':'ok',t);return;}
  if(t>-.3&&t<length+.3){r.extra++;r.combo=0;flashCell(el,'wrong');popup(best&&best.midi===midi?'場所がちがう':'WRONG','extra',best&&best.midi===midi?'同じ音、別のポジション':'');}
 });
 const frame=()=>{
  if(run!==r)return;F.keepAudio(ctx);const now=ctx.currentTime-r.t0,view=now-r.outLat,judgeAt=now-r.comp;
  for(const it of r.items)if(!it.grade&&judgeAt>it.time+.3)mark(it,'miss',judgeAt);
  /* Approach rings on the next two positions: they close over 1.5 beats and meet the cell on the beat. */
  const upcoming=r.items.filter(it=>!it.grade).slice(0,2),lead=1.5*spb;
  root.querySelectorAll('.air-cell.target').forEach(b=>{if(!upcoming.some(it=>cell(root,it.string,it.fret)===b))b.classList.remove('target','soon');});
  upcoming.forEach((it,k)=>{const b=cell(root,it.string,it.fret);if(!b)return;const p=1-(it.time-view)/lead;if(p<0){if(k===0)b.classList.add('soon');return;}
   b.classList.add('target');b.classList.toggle('second',k===1);b.style.setProperty('--ap',Math.min(1,p).toFixed(3));});
  const next=upcoming[0];$('#air-next').innerHTML=next?'<span>NEXT</span><b>'+next.string+'弦 '+next.fret+'フレット</b><em>'+K.noteName(next.midi)+'</em>':'&nbsp;';
  $('#air-score').textContent=Math.max(0,Math.round((r.points-r.extra*EXTRA_PENALTY)/r.items.length));$('#air-combo').textContent=r.combo;
  $('#air-progress').style.width=Math.max(0,Math.min(100,view/length*100))+'%';
  if(judgeAt>length+.5&&r.items.every(i=>i.grade)){traceFinish(spec,r,speed);return;}
  r.raf=requestAnimationFrame(frame);
 };
 r.raf=requestAnimationFrame(frame);
}
function traceFinish(spec,r,speed){
 stopRun();
 const score=Math.max(0,Math.min(100,Math.round((r.points-r.extra*EXTRA_PENALTY)/r.items.length))),recorded=speed<1?Math.min(score,92):score,passed=score>=PASS;
 spec.onResult?.(recorded,passed);
 const mean=r.offsets.length>=4?r.offsets.reduce((x,y)=>x+y,0)/r.offsets.length:0;
 resultScreen({kicker:spec.kicker,title:'指板でなぞれた！',score,passed,next:spec.next,
  lines:'<div class="result-grid"><div><b>'+r.counts.perfect+'</b><small>PERFECT</small></div><div><b>'+r.counts.great+'</b><small>GREAT</small></div><div><b>'+r.counts.ok+'</b><small>OK</small></div><div><b>'+r.counts.miss+'</b><small>MISS</small></div><div><b>'+r.maxCombo+'</b><small>MAX COMBO</small></div>'+(r.extra?'<div><b>'+r.extra+'</b><small>WRONG</small></div>':'')+'</div>'
   +(Math.abs(mean)>=.06?'<p class="stage-drift">タップが平均<b>'+Math.abs(mean).toFixed(2)+'秒'+(mean>0?'遅め':'早め')+'</b>でした。</p>':'')
   +(speed<1&&passed?'<p>「ゆっくり」でのクリアです。★3は「ふつう」で。</p>':''),
  again:()=>traceLobby(spec),back:spec.back});
}

/* ---------- Game 2: recall ----------
   No guides: rebuild the phrase position by position. The first note is given; "listen" plays it as sound only.
   The same pitch somewhere else is pointed out but not accepted, since the point is the shape on the neck.
   The player taps the lit first note too, so starting from it is never a mistake; only notes 2.. are scored. */
function recall(spec){
 const notes=spec.notes;let idx=0,clean=0,wrongHere=0,mistakes=0;
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="air-recall">'+head(spec.kicker,spec.title)
   +'<p>ガイドなしで、フレーズを<b>同じ場所</b>で再現しよう。光っている1音目から弾き始めて、'+notes.length+'音。音はタップするたびに鳴ります。</p>'
   +'<div class="train-slots air-slots" id="air-slots">'+notes.map(()=>'<span>？</span>').join('')+'</div>'
   +'<div class="air-board-wrap">'+boardHtml(spec.w)+'</div>'
   +'<div class="air-msg" id="air-msg" aria-live="polite">&nbsp;</div>'
   +'<div class="iv-play"><button type="button" id="air-listen">▶ フレーズを聴く</button><button type="button" id="air-hint">ヒント（次の場所）</button></div>'
   +'<button type="button" class="action-button secondary-action" id="air-back">戻る</button></div>';
  const root=el.querySelector('.air-recall'),slots=root.querySelectorAll('#air-slots span');
  cell(root,notes[0].string,notes[0].fret)?.classList.add('first');
  $('#air-listen').onclick=()=>playPhrase(notes,spec.bpm);$('#air-back').onclick=()=>{stopKit();spec.back();};
  const reveal=()=>{const n=notes[idx];cell(root,n.string,n.fret)?.classList.add('hint');};
  $('#air-hint').onclick=()=>{if(idx>=notes.length)return;wrongHere=Math.max(wrongHere,2);mistakes++;reveal();};
  bindBoard(root,({s,f,midi,el:b})=>{
   if(idx>=notes.length)return;tapSound(midi);const n=notes[idx];
   if(n.string===s&&n.fret===f){
    if(idx===0)root.querySelectorAll('.air-cell.first').forEach(x=>x.classList.remove('first'));
    else if(!wrongHere)clean++;root.querySelectorAll('.air-cell.hint').forEach(x=>x.classList.remove('hint'));
    flashCell(b,'hit');slots[idx].textContent=s+'-'+f;slots[idx].classList.add('filled',wrongHere?'ng':'ok');idx++;wrongHere=0;$('#air-msg').textContent=' ';
    if(idx>=notes.length){const score=Math.round(clean/(notes.length-1)*100),passed=score>=PASS;spec.onResult?.(score,passed);
     setTimeout(()=>{playPhrase(notes,spec.bpm);resultScreen({kicker:spec.kicker,title:'何も見ずに再現できた！',score,passed,next:spec.next,
      lines:'<div class="result-grid"><div><b>'+clean+' / '+(notes.length-1)+'</b><small>一発で正解</small></div><div><b>'+mistakes+'</b><small>まちがい</small></div></div>',
      again:()=>recall(spec),back:()=>{stopKit();spec.back();}});},500);}
    return;}
   flashCell(b,'wrong');if(idx===0){$('#air-msg').textContent='光っている場所から始めよう。';return;}wrongHere++;mistakes++;
   $('#air-msg').textContent=midi===n.midi?'音は合っています。でも、このフレーズでは別の場所で弾きます。':wrongHere>=2?'正しい場所を光らせました。':'ちがう場所です。もう一度。';
   if(wrongHere>=2)reveal();
  });
 });
}

/* ---------- Game 3: shapes (comping) ----------
   Place each chord form on the board, with the diagram in view. Open strings and muted strings are shown at the nut. */
function shapeTargets(name){const shape=F.chordShape(name)||[];return shape.map((fret,i)=>({string:6-i,fret})).filter(t=>t.fret>0);}
function shapeWindow(names){const fs=names.flatMap(n=>shapeTargets(n).map(t=>t.fret));const max=Math.max(3,...fs),min=Math.min(...fs);return max<=5?{lo:0,hi:5}:{lo:Math.max(0,min-1),hi:Math.max(min+4,max+1)};}
function nutMarks(root,name){const shape=F.chordShape(name)||[];
 root.querySelectorAll('.open-mark,.mute-mark').forEach(b=>{b.classList.remove('open-mark','mute-mark');const sp=b.querySelector('span');if(sp)sp.textContent='';});
 shape.forEach((fret,i)=>{const s=6-i,b=root.querySelector('.air-cell[data-s="'+s+'"][data-f="0"]')||root.querySelector('.air-row.s'+s+' .air-sn');if(!b||fret>0)return;
  b.classList.add(fret===0?'open-mark':'mute-mark');const sp=b.querySelector('span');if(sp)sp.textContent=fret===0?'○':'×';});}
function shapes(spec){
 const names=spec.chords,w=shapeWindow(names);let ci=0,taps=0,good=0;
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="air-shapes">'+head(spec.kicker,spec.title)
   +'<p>図を見ながら、押さえる場所を全部タップ。○は開放弦、×は弾かない弦です。</p>'
   +'<div class="air-shape-top"><div class="air-chord-name" id="air-chord"></div><div class="air-diagram" id="air-diagram"></div></div>'
   +'<div class="air-board-wrap">'+boardHtml(w)+'</div><div class="air-msg" id="air-msg" aria-live="polite">&nbsp;</div>'
   +'<button type="button" class="action-button secondary-action" id="air-back">戻る</button></div>';
  const root=el.querySelector('.air-shapes');let left=[];
  const show=()=>{const name=names[ci];root.querySelectorAll('.air-cell').forEach(b=>b.classList.remove('placed'));
   left=shapeTargets(name);$('#air-chord').innerHTML='<small>'+(ci+1)+' / '+names.length+'</small>'+name;$('#air-diagram').innerHTML=F.chordDiagram(name);nutMarks(root,name);};
  $('#air-back').onclick=()=>{stopKit();spec.back();};
  bindBoard(root,({s,f,midi,el:b})=>{
   if(ci>=names.length)return;if(f===0){tapSound(midi);return;}taps++;const k=left.findIndex(t=>t.string===s&&t.fret===f);
   if(k<0){if(b.classList.contains('placed'))return;flashCell(b,'wrong');$('#air-msg').textContent='そこは押さえません。';return;}
   good++;tapSound(midi);b.classList.add('placed');left.splice(k,1);$('#air-msg').textContent=' ';
   if(!left.length){strumShape(names[ci]);ci++;if(ci<names.length)setTimeout(show,650);
    else{const score=Math.round(good/taps*100),passed=score>=PASS;spec.onResult?.(score,passed);
     setTimeout(()=>resultScreen({kicker:spec.kicker,title:'フォームを指板に置けた！',score,passed,next:spec.next,lines:'<div class="result-grid"><div><b>'+names.length+'</b><small>コード</small></div><div><b>'+(taps-good)+'</b><small>まちがい</small></div></div>',again:()=>shapes(spec),back:()=>{stopKit();spec.back();}}),700);}}
  });
  show();
 });
}

/* ---------- Game 4: changes (comping) ----------
   The progression plays; each chord's form must be complete on the board before that chord starts (a short grace after).
   No diagram, so the forms come from memory. */
function changes(spec){
 const prefs=changes.prefs||(changes.prefs={speed:.75});
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="air-lobby">'+head(spec.kicker,spec.title)
   +'<p>次のコードのフォームを、<b>コードが変わる前に</b>指板に作ろう。図は出ません。間に合えばジャーンと鳴ります。</p>'
   +'<div class="jam-chart lobby-chart">'+spec.seq.map(c=>'<span>'+c.chord+'</span>').join('')+'</div>'
   +'<div class="stage-options"><div class="chip-row" role="group" aria-label="テンポ"><button type="button" data-speed="0.75">ゆっくり</button><button type="button" data-speed="1">ふつう</button></div></div>'
   +'<button type="button" class="action-button" id="air-start">スタート '+F.icon('arrow')+'</button><button type="button" class="action-button secondary-action" id="air-back">戻る</button>'
   +'<p class="lesson-caption">'+spec.seq.length+'回のチェンジ。最初のコードは、カウント中に作ります。★1（'+PASS+'点）でクリア。</p></div>';
  const sync=()=>el.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===prefs.speed)));
  el.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{prefs.speed=Number(b.dataset.speed);sync();});
  $('#air-start').onclick=()=>changesStart(spec,prefs.speed);$('#air-back').onclick=spec.back;sync();
 });
}
async function changesStart(spec,speed){
 const generation=F.generation();await F.ensureAudio();const ctx=F.audioContext();if(generation!==F.generation())return;
 if(!ctx||ctx.state!=='running'){F.notify('音を再生できません。音量を確認してください。');return;}
 stopKit();stopRun();
 const spb=60/(spec.bpm*speed),lead=8,outLat=ctx.outputLatency||ctx.baseLatency||0,GRACE=.3;
 const r={ctx,audio:K.synth(ctx),t0:ctx.currentTime+.4+lead*spb,ci:0,ok:0,results:[]};
 const a=r.audio,at=b=>r.t0+b*spb,end=spec.beats;
 for(let b=-lead;b<0;b++)a.click(at(b),(b+lead)%4===0);
 for(let b=0;b<end;b++){a.hat(at(b),b%4===0);if(b%4===0)a.kick(at(b));if(b%4===2)a.snare(at(b));}
 const w=shapeWindow(spec.seq.map(c=>c.chord));
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="air-play"><div class="stage-hud"><div><small>OK</small><strong id="air-score">0</strong></div><div class="stage-title"><small>指板 ・ ♩ '+Math.round(spec.bpm*speed)+'</small><b id="modal-title">'+spec.title+'</b></div><div class="stage-combo"><small>CHANGE</small><strong id="air-count">1 / '+spec.seq.length+'</strong></div></div>'
   +'<div class="stage-track"><span id="air-progress"></span></div>'
   +'<div class="air-change"><div><small>作るコード</small><b id="air-chord">—</b></div><div class="air-timer"><small>あと</small><b id="air-left">—</b></div></div>'
   +'<div class="air-board-wrap play">'+boardHtml(w)+'<div id="air-judge" class="stage-judge air-judge" aria-live="polite"></div></div>'
   +'<button type="button" class="action-button secondary-action" id="air-quit">やめる</button></div>';
 });
 const root=$('.air-play');run=r;F.setCleanup(stopRun);
 r.onHide=()=>{if(document.hidden){stopRun();changes(spec);}};document.addEventListener('visibilitychange',r.onHide);
 $('#air-quit').onclick=()=>{stopRun();changes(spec);};
 let left=[],placed=0;
 const target=()=>{const c=spec.seq[r.ci];root.querySelectorAll('.air-cell').forEach(b=>b.classList.remove('placed','ready'));left=c?shapeTargets(c.chord):[];placed=0;
  if(c){$('#air-chord').textContent=c.chord;$('#air-count').textContent=(r.ci+1)+' / '+spec.seq.length;nutMarks(root,c.chord);}};
 target();
 bindBoard(root,({s,f,midi,el:b})=>{
  if(run!==r||r.ci>=spec.seq.length||f===0)return;const k=left.findIndex(t=>t.string===s&&t.fret===f);
  if(k<0){if(!b.classList.contains('placed'))flashCell(b,'wrong');return;}
  a.pluck(r.ctx.currentTime+.003,voice(midi),.3,.1);b.classList.add('placed');left.splice(k,1);placed++;
  if(!left.length)root.querySelectorAll('.air-cell.placed').forEach(x=>x.classList.add('ready'));
 });
 const frame=()=>{
  if(run!==r)return;F.keepAudio(ctx);const now=ctx.currentTime-r.t0,view=now-outLat;
  const c=spec.seq[r.ci];
  if(c){const due=c.beat*spb;$('#air-left').textContent=Math.max(0,due-view).toFixed(1)+'秒';
   if(view>=due+GRACE||(!left.length&&view>=due-.02)){
    const ok=!left.length;r.results.push(ok);if(ok){r.ok++;const t=Math.max(ctx.currentTime+.01,at(c.beat));K.chordMidis(c.chord).forEach((m,i)=>a.pluck(t+i*.016,m,Math.min(1.6,(spec.seq[r.ci+1]?.beat??end)-c.beat)*spb,.07));popup('CHANGE!','perfect',c.chord);}else popup('間に合わず','miss',c.chord);
    $('#air-score').textContent=r.ok;r.ci++;target();}}
  $('#air-progress').style.width=Math.max(0,Math.min(100,view/(end*spb)*100))+'%';
  if(r.ci>=spec.seq.length&&view>end*spb){stopRun();const score=Math.round(r.ok/spec.seq.length*100),recorded=speed<1?Math.min(score,92):score,passed=score>=PASS;spec.onResult?.(recorded,passed);
   resultScreen({kicker:spec.kicker,title:'チェンジに間に合った！',score,passed,next:spec.next,lines:'<div class="result-grid"><div><b>'+r.ok+' / '+spec.seq.length+'</b><small>間に合った</small></div></div>'+(speed<1&&passed?'<p>「ゆっくり」でのクリアです。★3は「ふつう」で。</p>':''),again:()=>changes(spec),back:spec.back});return;}
  r.raf=requestAnimationFrame(frame);
 };
 r.raf=requestAnimationFrame(frame);
}

/* ---------- Dojo glue ---------- */
const STEP_INFO={line:[['なぞる','光る場所をリズムに合わせてタップ'],['思い出す','ガイドなしで場所を再現'],['エア・セッション','指板でミッションに挑戦']],
 comp:[['フォームを置く','図を見て、押さえる場所をタップ'],['チェンジに間に合え','図なしで、コードが変わる前に']]};
const infoFor=m=>STEP_INFO[isShape(m)?'comp':'line'].slice(0,steps(m));
/* Turns a module and an air step into the spec each game takes, with a hand-off to the next step. */
function specFor(m,step){
 const kicker='指板で練習 / '+m.title,back=()=>window.FQDojo.open(m),info=infoFor(m);
 const next=step<steps(m)?{label:'次は「'+info[step][0]+'」',go:()=>start(m,step+1)}:null;
 const onResult=(score,passed)=>result(m,step,score,passed);
 if(isShape(m)){
  const ex=window.FQDojo.chartFor(m,step===1?1:2).exercise,seq=[];
  ex.strums.forEach(s=>{if(!seq.length||seq[seq.length-1].chord!==s.chord)seq.push({chord:s.chord,beat:s.beat});});
  return {kicker,title:m.title+'（'+info[step-1][0]+'）',back,next,onResult,chords:[...new Set(seq.map(c=>c.chord))],seq,bpm:ex.bpm,beats:ex.beats};
 }
 const ex=window.FQDojo.chartFor(m,1).exercise;
 return {kicker,title:m.title+'（'+info[step-1][0]+'）',back,next,onResult,notes:ex.notes,bpm:ex.bpm,beats:ex.beats,w:windowFor(ex.notes)};
}
function start(m,step){
 const spec=specFor(m,step);
 if(isShape(m))return step===1?shapes(spec):changes(spec);
 if(step===1)return traceLobby(spec);
 if(step===2)return recall(spec);
 /* Step 3: the module's session mission, played on the board around the phrase's position. */
 const s=window.FQJam.sessions.find(x=>x.id===m.use.session);
 window.FQJam.lobby(s,{air:spec.w,mission:{text:m.use.text,goals:m.use.goals,choruses:m.use.choruses||1},back:()=>window.FQDojo.open(m),onDone:passed=>result(m,3,0,passed)});
}
/* The block of air steps inside a dojo module screen. */
function stepsHtml(m){
 const st=status(m),info=infoFor(m),all=st.every(Boolean);
 return '<div class="air-steps"><div class="air-steps-head"><b>指板で練習</b><small>'+INST.name+'がなくても、画面の指板で動きを先に覚える</small></div>'
  +info.map(([label,sub],i)=>{const locked=i>0&&!st[i-1];return '<button type="button" class="dojo-step air-step'+(st[i]?' done':'')+'" data-air-step="'+(i+1)+'" '+(locked?'disabled':'')+'><span class="dojo-pip">'+(st[i]?'✓':i+1)+'</span><span><b>'+label+'</b><small>'+sub+(locked?' ・ 前のステップをクリアで解放':'')+'</small></span><span class="dojo-go">'+(st[i]?'もう一度':'挑戦')+' →</span></button>';}).join('')
  +(all?'<p class="air-home">指板ではマスター済み。次は'+INST.name+'を持って、上の「覚える」で同じ場所を弾いてみよう。</p>':'')+'</div>';
}
function bindSteps(root,m){root.querySelectorAll('[data-air-step]').forEach(b=>b.onclick=()=>start(m,Number(b.dataset.airStep)));}

/* ---------- Picker for the training section ---------- */
function picker(){
 const list=window.FQDojo.modules,GEN=[['BLUES','ブルース'],['JAZZ','ジャズ'],['POPS','ポップス']];
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="air-picker">'+head(INST.name+'なしトレーニング','フレーズを指板で')
   +'<p>フレーズ道場の'+(BASS?'ベースライン':'フレーズと伴奏')+'を、画面の指板だけで練習。なぞる → 思い出す → セッションで使う。家に帰ったら、もう'+INST.name+'で弾ける状態に。</p>'
   +GEN.map(([g,label])=>{const ms=list.filter(m=>m.genre===g);return ms.length?'<h3>'+label+'</h3><div class="dojo-grid">'+ms.map(m=>{const st=status(m);return '<button type="button" class="dojo-card'+(st.every(Boolean)?' mastered':'')+'" data-air-module="'+m.id+'"><span class="jam-genre">'+(m.kind==='comp'?'COMP':m.kind==='line'?'BASS':'SOLO')+'</span><strong>'+m.title+'</strong><span class="jam-changes">'+m.tag+'</span><span class="dojo-pips">'+st.map(d=>'<i class="'+(d?'on':'')+'"></i>').join('')+'</span></button>';}).join('')+'</div>':'';}).join('')
   +'<button type="button" class="action-button secondary-action" id="air-close">閉じる</button></div>';
  el.querySelectorAll('[data-air-module]').forEach(b=>b.onclick=()=>window.FQDojo.open(list.find(m=>m.id===b.dataset.airModule)));
  $('#air-close').onclick=F.close;
 });
}
/* Cards under the training section: phrases on the board, and sessions played on the board. */
function renderCards(){
 const el=$('#air-cards');if(!el)return;
 const list=window.FQDojo?.modules||[],done=list.filter(m=>status(m).every(Boolean)).length;
 el.innerHTML='<button type="button" class="game-card train-card air-card" id="air-open-phrases"><span class="jam-genre">'+done+' / '+list.length+'</span><strong>フレーズを指板で</strong><span class="jam-changes">道場の'+(BASS?'ベースライン':'フレーズ・伴奏')+'を、なぞって覚える</span></button>'
  +'<button type="button" class="game-card train-card air-card" id="air-open-session"><span class="jam-genre">SESSION</span><strong>指板でセッション</strong><span class="jam-changes">伴奏に合わせて画面の指板でアドリブ</span></button>';
 $('#air-open-phrases').onclick=picker;
 $('#air-open-session').onclick=sessionPicker;
}
function sessionPicker(){
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="air-picker">'+head(INST.name+'なしトレーニング','指板でセッション')
   +'<p>バンドの伴奏に合わせて、画面の指板をタップしてアドリブ。コードの音（大きい丸）を狙うとポイント。</p>'
   +'<div class="dojo-grid">'+window.FQJam.sessions.map(s=>'<button type="button" class="dojo-card" data-air-session="'+s.id+'"><span class="jam-genre">'+s.genre+'</span><strong>'+s.title+'</strong><span class="jam-changes">♩ '+s.bpm+' ・ '+s.chart.length+'小節</span></button>').join('')+'</div>'
   +'<button type="button" class="action-button secondary-action" id="air-close">閉じる</button></div>';
  el.querySelectorAll('[data-air-session]').forEach(b=>b.onclick=()=>window.FQJam.lobby(window.FQJam.sessions.find(s=>s.id===b.dataset.airSession),{air:true,back:sessionPicker}));
  $('#air-close').onclick=F.close;
 });
}
window.addEventListener('fq:air',renderCards);window.addEventListener('fq:progress',renderCards);
window.FQAir={boardHtml,bindBoard,windowFor,cell,status,steps,start,stepsHtml,bindSteps,picker,specFor,renderCards,tapSound,voice,load};
/* Deferred scripts run before DOMContentLoaded, so the dojo modules exist by then. */
if(document.readyState==='complete')renderCards();else document.addEventListener('DOMContentLoaded',renderCards);
})();

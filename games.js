/* FRET QUEST rhythm games on the guitar: call & response, tempo survival and internal clock.
   Strum the muted strings; the microphone only measures attack timing. Nothing is recorded or uploaded.
   While the player is being judged, the backing is a soft pad with no attacks, so it is not mistaken for a strum. */
(()=>{'use strict';
const F=window.FretQuest,K=window.FQStage.kit,$=s=>document.querySelector(s);
let prefs={input:'mic',best:{},survival:'8',clock:80};
try{Object.assign(prefs,JSON.parse(localStorage.getItem('fretQuestGames'))||{});}catch{}
const save=()=>{try{localStorage.setItem('fretQuestGames',JSON.stringify(prefs));}catch{}};
const latency=()=>{try{return Number(JSON.parse(localStorage.getItem('fretQuestStage'))?.latency)||0;}catch{return 0;}};
const PAD=[52,55,59,64];

/* 16-step bars: x = strum, . = rest. Grouped by difficulty. */
const CALLS=[
 ['x...x...x...x...','x...x...x.......','x.......x.......','x...x.......x...','x.......x...x...'],
 ['x...x.x.x...x...','x.x.x...x.x.x...','x...x...x.x.x.x.','x.x.x.x.x...x...','x.x.x...x...x...'],
 ['..x...x...x...x.','x.....x.x.....x.','x...x.x...x.x...','x.x...x.x.x.....','..x.x...x...x...'],
 ['x..x..x...x.x...','x.x..x.x..x.x...','x..x..x.x.......','x...x..x..x.x...','..x..x..x...x...'],
 ['x.xxx...x.xxx...','xxxxx...x...x...','x..xx..xx...x...','x.x.xxx.x...x...','xx..xx..x.x.x...']
];
const SURVIVAL={'4':{label:'4分音符',p:'x...x...x...x...'},'8':{label:'8分音符',p:'x.x.x.x.x.x.x.x.'},'mix':{label:'↓ ↓↑ ・↑ ↓↑',p:'x...x.x...x.x.x.'}};
const GAMES={
 call:{title:'コール＆レスポンス',tag:'聴いて、まねして、返す。',kicker:'COPY THE GROOVE',about:'アプリが1小節のリズムを叩きます。次の小節で、同じリズムをミュートした弦で返そう。正解で少しずつ難しく、ミス3回で終了。'},
 survival:{title:'テンポ・サバイバル',tag:'どこまで速く刻める？',kicker:'HOW FAST CAN YOU GO',about:'4カウントの後、2小節ぶん同じパターンを刻みます。85％以上そろえばテンポが5上がります。ミス3回で終了。'},
 remix:{title:'苦手リミックス',tag:'ミスしたリズムを、まとめて克服。',kicker:'REMIX YOUR WEAK SPOTS',about:'これまでのゲームや曲でミスしたリズムが「苦手リズム帳」にたまります。そこから8問を、聴いてまねる・譜面を見て弾く・耳だけで覚える、の3つの形で出題。2回続けて成功したリズムは卒業です。'},
 clock:{title:'ジャスト・タイミング',tag:'クリックが消えても、テンポキープ。',kicker:'YOUR INNER METRONOME',about:'4分音符を刻み続けよう。途中でクリックが消えます。消えている間もテンポを保てたか、ずれをミリ秒で測ります。'}
};
const hits=p=>[...p].map((c,i)=>c==='x'?i:-1).filter(i=>i>=0);
const pick=a=>a[Math.floor(Math.random()*a.length)];
let run=null;

/* ---------- Shared engine ---------- */
function cardHtml(){return Object.entries(GAMES).map(([id,g])=>'<button type="button" class="game-card game-'+id+'" data-game="'+id+'"><span class="jam-genre">'+g.kicker+'</span><strong>'+g.title+'</strong><span class="jam-changes">'+g.tag+'</span><span class="game-best">'+bestLabel(id)+'</span></button>').join('');}
function bestLabel(id){const b=prefs.best[id];if(!b)return 'NEW';return id==='call'?'BEST LEVEL '+b:id==='survival'?'BEST ♩ '+b:id==='remix'?'BEST '+b+' / 8':'BEST '+b+' 小節';}
function renderCards(){const el=$('#game-cards');if(!el)return;el.innerHTML=cardHtml();el.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>lobby(b.dataset.game));}

function stop(){if(!run)return;const r=run;run=null;cancelAnimationFrame(r.raf);r.audio.stop();if(r.mic){r.mic.stream.getTracks().forEach(t=>t.stop());r.mic.src.disconnect();}document.removeEventListener('visibilitychange',r.onHide);}

function wood(r,t,accent){const ctx=r.ctx;[1,2.7].forEach((mult,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=(accent?1250:1050)*mult;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(i?.05:.28,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.07);o.connect(g);g.connect(r.audio.master);o.start(t);o.stop(t+.09);});}

function lobby(id){
 const g=GAMES[id];
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="jam-lobby"><div class="lesson-progress">RHYTHM GAME / '+g.kicker+'</div><h2 id="modal-title">'+g.title+'</h2><div class="stage-meta"><span class="stage-best">'+bestLabel(id)+'</span></div><p>'+g.about+'</p>'
   +'<div class="game-howto"><b>準備</b>左手で6本の弦に軽く触れて音を止め、右手でジャッと刻みます（ブラッシング）。音程は判定しません。</div>'
   +'<div class="stage-options">'
   +(id==='survival'?'<div class="chip-row three" role="group" aria-label="パターン">'+Object.entries(SURVIVAL).map(([k,v])=>'<button type="button" data-pat="'+k+'">'+v.label+'</button>').join('')+'</div>':'')
   +(id==='remix'?bookHtml():'')
   +(id==='clock'?'<div class="chip-row three" role="group" aria-label="テンポ">'+[60,80,100].map(b=>'<button type="button" data-cb="'+b+'">♩ '+b+'</button>').join('')+'</div>':'')
   +'<div class="chip-row" role="group" aria-label="判定方法"><button type="button" data-in="mic">ギターで刻む（マイク）</button><button type="button" data-in="tap">画面タップで遊ぶ</button></div></div>'
   +'<button type="button" class="action-button" id="game-start">スタート '+F.icon('arrow')+'</button>'
   +'<p class="lesson-caption">マイクでは音の立ち上がりのタイミングだけを測ります。スタート前の「タイミング補正」は曲のステージと共通です。</p></div>';
  const sync=()=>{
   document.querySelectorAll('[data-in]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.in===prefs.input)));
   document.querySelectorAll('[data-pat]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pat===prefs.survival)));
   document.querySelectorAll('[data-cb]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.cb)===prefs.clock)));
  };
  document.querySelectorAll('[data-in]').forEach(b=>b.onclick=()=>{prefs.input=b.dataset.in;save();sync();});
  document.querySelectorAll('[data-pat]').forEach(b=>b.onclick=()=>{prefs.survival=b.dataset.pat;save();sync();});
  document.querySelectorAll('[data-cb]').forEach(b=>b.onclick=()=>{prefs.clock=Number(b.dataset.cb);save();sync();});
  $('#game-start').onclick=()=>start(id);sync();$('#game-start').focus();
 });
}

async function start(id){
 const generation=F.generation();$('#game-start').disabled=true;
 await F.ensureAudio();const ctx=F.audioContext();if(generation!==F.generation())return;
 if(!ctx||ctx.state!=='running'){F.notify('音を再生できません。消音設定と音量を確認してください。');lobby(id);return;}
 let mic=null;
 if(prefs.input==='mic'){try{mic=await K.openMic(ctx);}catch(e){if(generation!==F.generation())return;F.notify('マイクを使えません。タップで遊べます。');lobby(id);return;}
  if(generation!==F.generation()){mic.stream.getTracks().forEach(t=>t.stop());return;}}
 const out=ctx.outputLatency||ctx.baseLatency||0;
 const r={id,ctx,mic,audio:K.synth(ctx),onsets:[],onset:K.onsetDetector(),comp:out+(mic?.045:.01)+latency(),out,level:0};
 $('#modal-inner').innerHTML='<div class="game-play game-'+id+'"><div class="stage-hud"><div><small id="g-left-label">LEVEL</small><strong id="g-left">1</strong></div><div class="stage-title"><small>RHYTHM GAME</small><b id="modal-title">'+GAMES[id].title+'</b></div><div class="stage-combo"><small id="g-right-label">LIFE</small><strong id="g-right" class="g-lives">♥♥♥</strong></div></div>'
  +'<div class="game-stage"><div class="game-phase" id="g-phase">READY</div><div class="game-sub" id="g-sub">&nbsp;</div><div class="game-grid" id="g-grid"></div><div class="game-beats" id="g-beats"><i></i><i></i><i></i><i></i></div><div id="g-extra"></div></div>'
  +(mic?'<div class="stage-mic"><span>MIC</span><div class="stage-level"><span id="g-level"></span></div></div>':'<button type="button" class="stage-pad" id="g-pad">TAP</button>')
  +'<button type="button" class="action-button secondary-action" id="g-quit">やめる</button></div>';
 run=r;F.setCleanup(stop);
 r.onHide=()=>{if(document.hidden){stop();lobby(id);}};document.addEventListener('visibilitychange',r.onHide);
 $('#g-quit').onclick=()=>{stop();lobby(id);};
 if(!mic){const tap=e=>{e.preventDefault();if(run!==r)return;r.onsets.push(ctx.currentTime-r.comp);const pad=$('#g-pad');pad.classList.remove('hit');void pad.offsetWidth;pad.classList.add('hit');};$('#g-pad').addEventListener('pointerdown',tap);}
 const game=({call,survival,clock,remix})[id](r);
 const frame=()=>{
  if(run!==r)return;
  if(mic){mic.an.getFloatTimeDomainData(mic.buf);let e=0;for(let i=0;i<mic.buf.length;i+=4)e+=mic.buf[i]*mic.buf[i];r.level=r.level*.6+Math.sqrt(e/(mic.buf.length/4))*.4;
   const at=ctx.currentTime-r.comp;if(r.onset(mic.buf,at))r.onsets.push(at);$('#g-level').style.width=K.meterPct(r.level)+'%';}
  if(game.tick(ctx.currentTime)===false)return;
  r.raf=requestAnimationFrame(frame);
 };
 r.raf=requestAnimationFrame(frame);
}

/* Greedy nearest matching of strum times to target times. */
function match(targets,onsets,tol){
 const used=new Set(),offsets=[];let hit=0;
 for(const t of targets){let best=-1,d=Infinity;onsets.forEach((o,i)=>{const x=Math.abs(o-t);if(!used.has(i)&&x<d){d=x;best=i;}});if(best>=0&&d<=tol){used.add(best);hit++;offsets.push(onsets[best]-t);}}
 return {hit,extra:onsets.length-used.size,offsets};
}
function grid(pattern,lit,hidden){return [...pattern].map((c,i)=>'<span class="'+(i%4===0?'beat ':'')+(hidden?'hidden':c==='x'?'on':'')+(lit.has(i)?' lit':'')+'"></span>').join('');}
function beatsUi(index){document.querySelectorAll('#g-beats i').forEach((x,i)=>x.classList.toggle('on',index===i));}
function flash(text,cls){const el=$('#g-phase');el.textContent=text;el.className='game-phase '+(cls||'');}

/* ---------- Shared call & response rounds ----------
   plan.next(result) returns the next round {pattern,bpm,mode,src,tol,extra} or null to stop.
   Modes ("faces"): call = hear it and see it, ear = hear it only, read = see it only and play it straight away. */
const PROMPT={call:['LISTEN','このリズムを覚えて'],ear:['LISTEN','耳だけで覚えよう'],read:['READ','譜面を読んで、次の小節で弾こう']};
function copyRounds(r,plan){
 let round=null;
 const newRound=(start,item)=>{
  const spb=60/item.bpm,step=spb/4,resp=start+4*spb;
  for(let k=0;k<4;k++)r.audio.hat(start+k*spb,k===0);
  if(item.mode!=='read')hits(item.pattern).forEach(i=>wood(r,start+i*step,i===0));
  r.audio.pad(start,PAD,10*spb);
  round={...item,spb,step,callStart:start,resp,end:resp+4*spb,targets:hits(item.pattern).map(i=>resp+i*step),judged:false,hidden:item.mode==='ear'};
  $('#g-grid').innerHTML=grid(item.pattern,new Set(),round.hidden);
  if(item.src)$('#g-extra').innerHTML='<span class="g-src">'+item.src+'</span>';
 };
 const firstItem=plan.next(null),first=r.ctx.currentTime+.4,spb0=60/firstItem.bpm;
 for(let k=0;k<4;k++)r.audio.click(first+k*spb0,k===0);newRound(first+4*spb0,firstItem);
 return {tick(now){
  const v=now-r.out,R=round;
  if(v<R.callStart){flash('READY');$('#g-sub').textContent=R.mode==='read'?'譜面を見て準備':'まずは聴くだけ';beatsUi(-1);return;}
  if(v<R.resp){const i=Math.floor((v-R.callStart)/R.step);flash(PROMPT[R.mode][0],'listen');$('#g-sub').textContent=PROMPT[R.mode][1];beatsUi(Math.floor(i/4));
   if(R.mode==='call')$('#g-grid').innerHTML=grid(R.pattern,new Set(hits(R.pattern).filter(h=>h<=i)),false);return;}
  if(v<R.end){flash('YOUR TURN','turn');$('#g-sub').textContent=R.mode==='read'?'譜面どおりに弾こう':'同じリズムを返そう';beatsUi(Math.floor((v-R.resp)/R.spb));return;}
  if(!R.judged&&now-r.comp>R.end+.12){
   R.judged=true;const m=match(R.targets,r.onsets.filter(o=>o>R.resp-.12&&o<R.end+.12),R.tol),ok=m.hit===R.targets.length&&m.extra<=R.extra;
   r.onsets=r.onsets.filter(o=>o>=R.end+.12);
   const fate=K.rhythmBook.record(R.pattern,R.bpm,R.src||'コール＆レスポンス',ok);
   $('#g-grid').innerHTML=grid(R.pattern,new Set(),false);
   flash(ok?(fate==='conquered'?'克服！':'NICE!'):m.hit<R.targets.length?'MISS':'EXTRA',ok?'ok':'ng');
   $('#g-sub').textContent=ok?(fate==='conquered'?'苦手リズム帳から卒業！':'ばっちり！'):m.hit+' / '+R.targets.length+' 拍そろった'+(m.extra?'・余分 '+m.extra:'');
   const next=plan.next({round:R,ok,m,fate});
   if(!next){setTimeout(plan.finish,900);return false;}
   newRound(R.end+2*R.spb,next);
  }
  beatsUi(-1);
 }};
}

/* ---------- Game 1: call & response ---------- */
function call(r){
 let level=1,lives=3,wins=0;const missed=[];
 return copyRounds(r,{
  next(res){
   if(res){if(res.ok){wins++;if(wins%2===0)level++;}else{lives--;missed.push(res.round.pattern);}
    $('#g-left').textContent=level;$('#g-right').textContent='♥'.repeat(Math.max(0,lives))+'♡'.repeat(3-Math.max(0,lives));if(lives<=0)return null;}
   return {pattern:pick(CALLS[Math.min(CALLS.length-1,Math.floor((level-1)/2))]),bpm:Math.min(132,76+Math.floor((level-1)/2)*6),mode:level>=7?'ear':'call',src:'コール＆レスポンス Lv'+level,tol:level<5?.13:.1,extra:level<3?1:0};
  },
  finish:()=>finish(r,{score:level,wins,missed,line:wins+' ラウンド成功・レベル '+level+' まで到達'})
 });
}

/* ---------- Game 4: weak-rhythm remix ----------
   Eight rounds drawn from the rhythm book (weakest first), each with a different face.
   Short books are topped up with standard patterns so the remix always runs. */
let reviewSet=null;
const REMIX_ROUNDS=8;
function remix(r){
 const weak=reviewSet||K.rhythmBook.weak().slice(0,REMIX_ROUNDS);reviewSet=null;
 const base=weak.map(w=>({pattern:w.p,bpm:Math.max(70,Math.min(120,w.bpm||84)),src:w.src})),items=[];
 /* Repeat the weak rhythms to fill eight rounds, so one can be passed twice and leave the book. Warm-ups only when the book is empty. */
 for(let i=0;items.length<REMIX_ROUNDS;i++)items.push(base.length?base[i%base.length]:{pattern:pick(CALLS[Math.min(CALLS.length-1,1+Math.floor(i/3))]),bpm:84,src:'ウォームアップ'});
 for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
 const faces=['call','read','ear'];let n=0,cleared=0,conquered=0;const missed=[];
 $('#g-left-label').textContent='ROUND';$('#g-right-label').textContent='CLEAR';$('#g-right').classList.remove('g-lives');$('#g-right').textContent='0 / '+REMIX_ROUNDS;
 return copyRounds(r,{
  next(res){
   if(res){if(res.ok)cleared++;else missed.push(res.round.pattern);if(res.fate==='conquered')conquered++;$('#g-right').textContent=cleared+' / '+REMIX_ROUNDS;}
   if(n>=items.length)return null;
   const it=items[n];n++;$('#g-left').textContent=n+' / '+REMIX_ROUNDS;
   return {...it,mode:faces[(n-1)%3],tol:.12,extra:0};
  },
  finish:()=>finish(r,{score:cleared,missed,conquered,line:(cleared>=7?'ハイレベル！':cleared>=4?'OK！ この調子で。':'もう一回！')+' '+REMIX_ROUNDS+'問中 '+cleared+'問クリア'+(conquered?'・'+conquered+'個のリズムを克服':'')})
 });
}

/* ---------- Game 2: tempo survival ---------- */
function survival(r){
 const pat=SURVIVAL[prefs.survival]||SURVIVAL['8'];let bpm=70,lives=3,top=0,round=null;
 $('#g-left-label').textContent='TEMPO';
 const newRound=start=>{
  const spb=60/bpm,step=spb/4,judge=start+4*spb;
  for(let k=0;k<4;k++)r.audio.click(start+k*spb,k===0);
  r.audio.pad(start,PAD,12*spb);
  const targets=[0,1].flatMap(b=>hits(pat.p).map(i=>judge+b*4*spb+i*step));
  round={spb,start,judge,end:judge+8*spb,targets,judged:false};
  $('#g-grid').innerHTML=grid(pat.p,new Set(),false);$('#g-left').textContent=bpm;
 };
 newRound(r.ctx.currentTime+.4);
 return {tick(now){
  const v=now-r.out,R=round;
  if(v<R.judge){flash('COUNT '+Math.max(1,Math.min(4,Math.floor((v-R.start)/R.spb)+1)),'listen');$('#g-sub').textContent='♩ '+bpm+' に合わせて準備';beatsUi(Math.floor((v-R.start)/R.spb));return;}
  if(v<R.end){const i=Math.floor((v-R.judge)/R.step);flash('KEEP IT!','turn');$('#g-sub').textContent=(Math.floor(i/16)+1)+' / 2 小節';beatsUi(Math.floor(i/4)%4);$('#g-grid').innerHTML=grid(pat.p,new Set([i%16]),false);return;}
  if(!R.judged&&now-r.comp>R.end+.12){
   R.judged=true;const m=match(R.targets,r.onsets.filter(o=>o>R.judge-.2&&o<R.end+.12),.1),acc=Math.max(0,(m.hit-m.extra*.5)/R.targets.length);
   r.onsets=r.onsets.filter(o=>o>=R.end+.12);
   K.rhythmBook.record(pat.p,bpm,'テンポ・サバイバル ♩'+bpm,acc>=.85);
   if(acc>=.85){top=Math.max(top,bpm);bpm+=5;flash('TEMPO UP!','ok');}else{lives--;flash('MISS','ng');}
   $('#g-sub').textContent=Math.round(acc*100)+'％ そろった';$('#g-right').textContent='♥'.repeat(lives)+'♡'.repeat(3-lives);
   if(lives<=0){setTimeout(()=>finish(r,{score:top,line:pat.label+'で ♩ '+(top||'—')+' までクリア'}),900);return false;}
   newRound(R.end+R.spb);
  }
  beatsUi(-1);
 }};
}

/* ---------- Game 3: internal clock ---------- */
function clock(r){
 const bpm=prefs.clock,spb=60/bpm,LEVELS=[2,4,8,12,16];let li=0,round=null,cleared=0;const history=[];
 $('#g-left-label').textContent='SILENT';$('#g-right-label').textContent='STAGE';$('#g-right').classList.remove('g-lives');
 const newRound=start=>{
  const silent=LEVELS[li],quiet=start+8*spb,back=quiet+silent*4*spb;
  for(let k=0;k<8;k++)r.audio.click(start+k*spb,k%4===0);
  for(let k=0;k<4;k++)r.audio.click(back+k*spb,k===0);
  round={start,quiet,back,end:back+4*spb,silent,targets:Array.from({length:silent*4},(_,k)=>quiet+k*spb),judged:false};
  $('#g-left').textContent=silent+'小節';$('#g-right').textContent=(li+1)+' / '+LEVELS.length;$('#g-grid').innerHTML='';
 };
 newRound(r.ctx.currentTime+.4);
 return {tick(now){
  const v=now-r.out,R=round;
  if(v<R.quiet){flash('KEEP ♩ '+bpm,'listen');$('#g-sub').textContent='クリックに合わせて4分音符を刻もう';beatsUi(Math.floor((v-R.start)/spb)%4);return;}
  if(v<R.back){flash('…','turn');$('#g-sub').textContent='クリックが消えても、刻み続けて';beatsUi(-1);return;}
  if(v<R.end){flash('CHECK','listen');$('#g-sub').textContent='クリックとずれていないかな？';beatsUi(Math.floor((v-R.back)/spb)%4);return;}
  if(!R.judged&&now-r.comp>R.end+.12){
   R.judged=true;
   /* The player's constant offset while the click plays (device latency, personal feel) is the baseline,
      so only drift during the silence is measured. */
   const base=match(Array.from({length:8},(_,k)=>R.start+k*spb),r.onsets.filter(o=>o>R.start-spb/2&&o<R.quiet-spb/2),spb/2).offsets.sort((x,y)=>x-y),baseline=base.length>=4?base[Math.floor(base.length/2)]:0;
   const m=match(R.targets.map(t=>t+baseline),r.onsets.filter(o=>o>R.quiet-spb/2+baseline&&o<R.back+baseline),spb/2),n=m.offsets.length;
   r.onsets=r.onsets.filter(o=>o>=R.end);
   const mean=n?m.offsets.reduce((a,b)=>a+Math.abs(b),0)/n*1000:999;
   /* Least-squares slope of offset against beat number: positive means the player slowed down. */
   const xs=m.offsets.map((_,i)=>i),mx=(n-1)/2,my=n?m.offsets.reduce((a,b)=>a+b,0)/n:0,slope=n>2?xs.reduce((a,x,i)=>a+(x-mx)*(m.offsets[i]-my),0)/xs.reduce((a,x)=>a+(x-mx)**2,0):0;
   const drift=slope*R.targets.length*1000,ok=n>=R.targets.length*.8&&mean<=60;
   history.push({silent:R.silent,mean,drift,ok,offsets:m.offsets});
   $('#g-grid').innerHTML=graph(m.offsets,spb);
   flash(ok?'ON TIME!':'DRIFT','ok '+(ok?'':'ng'));
   $('#g-sub').textContent='平均のずれ '+Math.round(mean)+'ms'+(Math.abs(drift)>=40?'・だんだん'+(drift<0?'速く':'遅く')+'なっています':'');
   if(ok){cleared=R.silent;li++;}
   if(!ok||li>=LEVELS.length){setTimeout(()=>finish(r,{score:cleared,history,line:cleared?'クリックなしで '+cleared+' 小節キープ':'まずは2小節キープを目指そう'}),1600);return false;}
   newRound(R.end+2*spb);
  }
 }};
}
function graph(offsets,spb){
 const W=320,H=90,lim=Math.min(.25,spb/2),y=o=>H/2-Math.max(-1,Math.min(1,o/lim))*(H/2-8);
 let s='<svg viewBox="0 0 '+W+' '+H+'" class="clock-graph" aria-label="拍ごとのずれ"><rect x="0" y="0" width="'+W+'" height="'+H+'" rx="10" fill="#ffffff08"/><line x1="8" x2="'+(W-8)+'" y1="'+H/2+'" y2="'+H/2+'" stroke="#c7ef75" stroke-dasharray="3 4"/><text x="10" y="14">遅い</text><text x="10" y="'+(H-6)+'">速い</text>';
 offsets.forEach((o,i)=>{const x=24+i*(W-40)/Math.max(1,offsets.length-1);s+='<circle cx="'+x+'" cy="'+y(o)+'" r="3.5" fill="'+(Math.abs(o)<=.03?'#c7ef75':Math.abs(o)<=.06?'#6fe3d2':'#ffc56b')+'"/>';});
 return s+'</svg>';
}

/* The rhythm book as shown in the remix lobby. */
function bookHtml(){
 const weak=K.rhythmBook.weak();
 if(!weak.length)return '<div class="book-empty">苦手リズム帳はまだ空です。ほかのゲームや曲でミスしたリズムがここにたまります。今は基本パターンでリミックスします。</div>';
 return '<div class="book"><div class="book-head"><b>苦手リズム帳</b><span>'+weak.length+'個</span></div>'+weak.slice(0,6).map(w=>'<div class="book-row"><div class="mini-grid">'+[...w.p].map((c,i)=>'<i class="'+(c==='x'?'on':'')+(i%4===0?' beat':'')+'"></i>').join('')+'</div><span class="book-src">'+w.src+'</span><span class="book-rate">'+w.miss+'ミス'+(w.hit?' / '+w.hit+'成功':'')+'</span></div>').join('')+(weak.length>6?'<div class="book-more">ほか '+(weak.length-6)+'個</div>':'')+'</div>';
}
/* Rhythms missed in this game, with a one-tap review. */
function missedHtml(missed){
 const list=[...new Set(missed||[])].slice(0,4);if(!list.length)return '';
 return '<div class="book"><div class="book-head"><b>今回ミスしたリズム</b><span>苦手リズム帳に追加</span></div>'+list.map(p=>'<div class="book-row"><div class="mini-grid">'+[...p].map((c,i)=>'<i class="'+(c==='x'?'on':'')+(i%4===0?' beat':'')+'"></i>').join('')+'</div></div>').join('')+'<button type="button" class="action-button" id="g-review">このリズムを今すぐ復習</button></div>';
}
function finish(r,res){
 stop();const id=r.id,old=prefs.best[id]||0,record=res.score>old&&!(id==='call'&&!res.wins);
 if(record){prefs.best[id]=res.score;save();}
 const earned=F.recordActivity('game:'+id);renderCards();
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="stage-result'+(record?' passed':'')+'">'+(record?'<div class="confetti" aria-hidden="true">'+Array.from({length:20},(_,i)=>'<i style="--x:'+(5+i*4.5)+'%;--delay:'+(i%4*.07)+'s;--r:'+(i%2?200:-160)+'deg"></i>').join('')+'</div>':'')
   +'<div class="lesson-progress">RHYTHM GAME / RESULT</div><h2 id="modal-title">'+(record?'自己ベスト更新！':'ゲーム終了')+'</h2>'
   +'<div class="result-score"><strong>'+(res.score||0)+'</strong><small>'+(id==='call'?'LEVEL':id==='survival'?'BPM':id==='remix'?'/ 8':'BARS')+'</small></div><p>'+res.line+'</p>'
   +missedHtml(res.missed)
   +(res.history?res.history.map(h=>'<div class="clock-row"><b>'+h.silent+'小節</b><span>平均 '+Math.round(h.mean)+'ms</span><span>'+(Math.abs(h.drift)>=40?(h.drift<0?'走り気味':'もたり気味'):'安定')+'</span><span>'+(h.ok?'✓':'✗')+'</span></div>').join(''):'')
   +(earned?'<div class="success-xp">+'+earned+' XP</div>':'')
   +'<p class="lesson-caption">'+(r.mic?'マイクで音の立ち上がりのタイミングを測りました。':'画面タップのタイミングを測りました。ギター演奏の判定ではありません。')+' ベスト記録はこの端末に保存されます。</p>'
   +'<button type="button" class="action-button" id="g-again">もう一度</button><button type="button" class="action-button secondary-action" id="g-close">閉じる</button></div>';
  $('#g-again').onclick=()=>lobby(id);$('#g-review')?.addEventListener('click',()=>{reviewSet=[...new Set(res.missed)].map(p=>K.rhythmBook.weak().find(w=>w.p===p)||{p,bpm:84,src:'今回のミス'});lobby('remix');});$('#g-close').onclick=F.close;$('#g-again').focus();
 });
}

window.addEventListener('fq:progress',()=>{try{prefs.best=JSON.parse(localStorage.getItem('fretQuestGames'))?.best||prefs.best;}catch{}renderCards();});
window.FQGames={games:GAMES,calls:CALLS,renderCards,lobby};
renderCards();
})();

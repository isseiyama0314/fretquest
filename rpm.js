/* Session skills pathway. Progressions and cues are our practice arrangements. */
(()=>{'use strict';
const F=window.FretQuest,J=window.FQJam,K=window.FQStage.kit,$=s=>document.querySelector(s);
const KEY='fretQuestRehearsal',PC=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
const tracks=[
 {id:'funk-e9',title:'01. ワンコードで会話する',tag:'E9 / FUNK',tip:'まずは2拍・4拍に短いコード。ソロはEとG♯を着地点に、2小節弾いて2小節休む。',shapes:[['E9','x 7 6 7 7 x']],notes:'E、G♯、B、D、F♯。まずEとG♯の2音でリズムを作る。'},
 {id:'funk-minor',title:'02. コードの変化についていく',tag:'Em7 → A7 / FUNK',tip:'1小節ごとのコードチェンジ。ソロはEm7でG、A7でC♯に着地する。',shapes:[['Em7','x 7 9 7 8 x'],['A7','5 x 5 6 5 x']],notes:'Eドリアン。E、F♯、G、A、B、C♯、D。A7のC♯を意識する。'},
 {id:'blues-a',title:'03. 12小節を見失わない',tag:'A / SHUFFLE BLUES',tip:'4小節ずつ数える。5小節目のD7、9小節目のE7を道しるべにする。2小節目にもD7が入る練習形。',shapes:[['A7','5 x 5 6 5 x'],['D7','x 5 4 5 3 x'],['E7','x 7 6 7 5 x']],notes:'Aマイナー・ペンタのA、C、D、E、Gを出発点に。A7のC♯、D7のF♯、E7のG♯に着地する練習も。'}
];
const modes={guide:'コードを見ながら',blind:'コードを隠して通す'};
const checks=[['groove','伴奏の音量を抑えて、拍を保てた。'],['solo','合図でソロに入り、短いフレーズと休符で弾けた。'],['recover','表示が消えても数え、次の周回の頭で戻れた。'],['end','ソロを伴奏へ渡し、最後の1拍を合わせて音を切れた。']];
let records=[],run=null,selected=tracks[0].id,mode='guide',tempo=84,showGuide=true;
function valid(rows){return Array.isArray(rows)?rows.filter(r=>r&&tracks.some(t=>t.id===r.id)&&Object.hasOwn(modes,r.mode)&&Number.isFinite(r.at)&&Number.isInteger(r.bpm)&&r.bpm>=50&&r.bpm<=160&&Array.isArray(r.checks)).map(r=>({id:r.id,mode:r.mode,at:r.at,bpm:r.bpm,assisted:!!r.assisted,checks:[...new Set(r.checks.filter(c=>checks.some(x=>x[0]===c)))].sort()})).slice(-60):[];}
function load(){try{records=valid(JSON.parse(localStorage.getItem(KEY)));}catch{records=[];}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(records));return true;}catch{F.notify('このブラウザに記録を保存できませんでした。');return false;}}
load();
function plan(length){let bar=0;return [
 ['listen',4,'まず聴く','弾かずに、スネアの2拍・4拍を聴く。'],
 ['comp',length,'伴奏する','短いコードを2拍・4拍へ。ベースの音域を空けよう。'],
 ['solo',length,'あなたのソロ','最初は2音。2小節弾いたら2小節休んで、バンドを聴こう。'],
 ['recover',length,'耳だけで数える','いったん弾くのを休む。4小節ずつ数えて、次の周回の頭で戻ろう。'],
 ['return',length,'伴奏へ戻る','次の人へ渡したつもりで音量を下げ、最後の合図を見る。'],
 ['ending',1,'全員で最後の1拍','1拍目で一緒に鳴らす。2拍目でミュートする。']
].map(([id,bars,title,tip])=>{const p={id,bars,title,tip,start:bar};bar+=bars;return p;});}
function phaseAt(p,beat){return p.find(x=>beat>=x.start*4&&beat<(x.start+x.bars)*4)||null;}
function track(){return tracks.find(t=>t.id===selected)||tracks[0];}
function chart(s){return s.chart.map((bar,i)=>'<span data-rpm-bar="'+i+'"><small>'+ (i+1)+'</small>'+bar.map(c=>c.sym).join(' / ')+'</span>').join('');}
function overview(){const el=$('#rpm-entry');if(!el)return;
 const ready=tracks.filter(t=>records.some(r=>r.id===t.id&&r.mode==='blind'&&!r.assisted&&r.checks.length===4)).length;
 el.innerHTML='<div><span class="rpm-label">SESSION REHEARSAL</span><h2>セッション上達への道</h2><p>弾けるフレーズを、誰かと演奏できる力に。<br>伴奏、ソロ交代、ロストからの復帰、エンディングを通して練習。</p><span class="rpm-record">コード非表示で自己チェック4項目達成：'+ready+' / 3</span></div><button type="button" id="rpm-open" class="action-button">セッション練習を始める '+F.icon('arrow')+'</button>';
 $('#rpm-open').onclick=lobby;
}
function lobby(){load();F.show(el=>{
 $('.modal-dialog').classList.add('is-stage');
 const t=track(),s=J.sessions.find(x=>x.id===t.id),last=records.filter(r=>r.id===t.id).at(-1);
 el.innerHTML='<div class="rpm-lobby"><div class="lesson-progress">SESSION SKILLS</div><h2 id="modal-title">セッション上達への道</h2><p class="rpm-lead">まず、1曲を一緒に終える。伴奏、ソロ、合図への反応を、一歩ずつ身につけよう。</p>'
 +'<div class="rpm-track-list" role="group" aria-label="練習する進行">'+tracks.map(x=>'<button type="button" data-rpm-track="'+x.id+'" aria-pressed="'+(x.id===selected)+'"><small>'+x.tag+'</small><b>'+x.title+'</b></button>').join('')+'</div>'
 +'<p>'+t.tip+'</p><div class="rpm-chart">'+chart(s)+'</div>'
 +'<details class="rpm-notes"><summary>伴奏の押さえ方と、ソロの入口</summary><p>数字は6弦から1弦のフレット。xは鳴らさない弦。コードは短く切り、まず2拍・4拍だけ。</p><div class="rpm-shapes">'+t.shapes.map(([ch,shape])=>'<div><b>'+ch+'</b><code>'+shape+'</code></div>').join('')+'</div><p>'+t.notes+'</p><p>慣れたら裏拍を1か所加える。鍵盤がいるつもりで、弾かない小節も作ってみよう。</p><button type="button" class="action-button secondary-action" id="rpm-solo-drill">この進行で単音の練習をする</button></details>'
 +'<div class="rpm-settings"><label>テンポ <b id="rpm-tempo-label">'+tempo+' BPM</b><input id="rpm-tempo" type="range" min="50" max="160" value="'+tempo+'"></label><div class="chip-row" role="group" aria-label="コードの表示">'+Object.entries(modes).map(([k,v])=>'<button type="button" data-rpm-mode="'+k+'" aria-pressed="'+(k===mode)+'">'+v+'</button>').join('')+'</div><label class="rpm-toggle"><input type="checkbox" id="rpm-guide" '+(showGuide?'checked':'')+'>伴奏中のコードお手本を薄く鳴らす</label><p class="lesson-caption">お手本を外すとドラムとベース中心になり、あなたが伴奏を担います。</p></div>'
 +'<ol class="rpm-flow">'+plan(s.chart.length).map(p=>'<li><b>'+p.title+'</b><span>'+p.bars+'小節</span></li>').join('')+'</ol><p class="lesson-caption">約<span id="rpm-duration"></span>分。カウントは4拍。復帰練習中はどちらのモードでもコードと小節数が消えます。最後は1拍目で鳴らし、2拍目で切る練習用アレンジです。</p>'
 +'<button type="button" class="action-button" id="rpm-start">バンドと通して練習する</button>'
 +(last?'<p class="rpm-record">前回：'+last.bpm+' BPM、'+modes[last.mode]+'。自己チェック '+last.checks.length+' / 4'+(last.assisted?'。途中でコードを確認。':'。')+'</p>':'')
 +'<details class="rpm-notes"><summary>初参加のための、ひと言と準備</summary><p>「セッション初参加でギターです。まず伴奏から参加したいです。できる進行はEのワンコードかAのブルースです。合いそうな曲はありますか。」</p><p>演奏前に、キー、テンポ、何小節で1周するか、テーマを誰が弾くか、ソロの順番、終わり方をホストに確認。知らない曲は見学や伴奏から相談して大丈夫。演奏中はホストやソリストの目線も見る。</p><p>チューニング、シールド、ピック、控えめな音量を準備。家ではイヤホンと実際のギターで通す。</p></details>'
 +'<p class="lesson-caption rpm-source">練習用の進行と合図で、合奏の基本を身につけます。実際のセッションでは、曲・キー・ソロの順番・終わり方をホストと確認しましょう。演奏音の録音・自動採点は行わず、終わった後に自分で振り返ります。</p></div>';
 const duration=()=>{$('#rpm-duration').textContent=((plan(s.chart.length).at(-1).start*4+8)*60/tempo/60).toFixed(1);};duration();
 el.querySelectorAll('[data-rpm-track]').forEach(b=>b.onclick=()=>{selected=b.dataset.rpmTrack;tempo=J.sessions.find(x=>x.id===selected).bpm;lobby();});
 el.querySelectorAll('[data-rpm-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.rpmMode;el.querySelectorAll('[data-rpm-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.rpmMode===mode)));});
 $('#rpm-tempo').oninput=e=>{tempo=Number(e.target.value);$('#rpm-tempo-label').textContent=tempo+' BPM';duration();};
 $('#rpm-guide').onchange=e=>{showGuide=e.target.checked;};
 $('#rpm-solo-drill').onclick=()=>J.lobby(s,{back:lobby});
 $('#rpm-start').onclick=start;$('#modal-title').tabIndex=-1;$('#modal-title').focus({preventScroll:true});$('.modal-dialog').scrollTop=0;
 });}
function stop(){if(!run)return;const r=run;run=null;cancelAnimationFrame(r.raf);r.audio.stop();document.removeEventListener('visibilitychange',r.onHide);}
function schedule(r,beat){const p=phaseAt(r.plan,beat);if(!p)return;
 const local=beat-p.start*4,t=r.t0+beat*r.spb;
 if(p.id==='ending'){
  if(local===0){const ch=r.s.chart[0][0];r.b.kick(t);r.b.keys(t,J.voicing(ch),r.spb*.8);r.b.bass(t,28+(ch.root-4+12)%12,r.spb*.8);r.audio.master.gain.setValueAtTime(.9,t);r.audio.master.gain.linearRampToValueAtTime(0,t+r.spb);}
  return;
 }
 const comp=p.id==='comp'||p.id==='return',base=r.b;
 const b=comp?{...base,keys:(t,n,d,v)=>{if(r.guide)base.keys(t,n,d,(v||.045)*.45);}}:base;
 J.scheduleBeat({...r,b,t0:r.t0+p.start*4*r.spb},local);
}
function viewState(r,beat){
 const p=phaseAt(r.plan,Math.max(0,beat))||r.plan.at(-1),local=beat-p.start*4,bar=Math.floor(local/4),inBar=((Math.floor(local)%4)+4)%4;
 const next=r.plan[r.plan.indexOf(p)+1],remaining=(p.start+p.bars)*4-beat;
 const hidden=beat>=0&&p.id!=='ending'&&(r.mode==='blind'||p.id==='recover')&&!r.revealed;
 return {p,bar,inBar,hidden,next,remaining};
}
async function start(){const gen=F.generation();$('#rpm-start').disabled=true;
 try{await F.ensureAudio();}catch{if(gen===F.generation()){F.notify('音を開始できません。もう一度試してください。');lobby();}return;}
 if(gen!==F.generation())return;
 const ctx=F.audioContext();if(!ctx||ctx.state!=='running'){F.notify('音を開始できません。端末の音量を確認して再試行してください。');lobby();return;}
 const s=J.sessions.find(x=>x.id===selected),spb=60/tempo,audio=K.synth(ctx),p=plan(s.chart.length);
 const r={s,ctx,spb,audio,b:J.band(ctx,audio),plan:p,bpm:tempo,mode,guide:showGuide,assisted:false,revealed:false,t0:ctx.currentTime+.25+4*spb,nextBeat:0,beats:(p.at(-1).start+1)*4,lastPhase:'',lastView:'',finished:false};
 run=r;F.setCleanup(stop);for(let i=0;i<4;i++)audio.click(r.t0-(4-i)*spb,i===0);
 $('#modal-inner').innerHTML='<div class="rpm-play"><div class="lesson-progress">SESSION REHEARSAL / '+r.bpm+' BPM</div><h2 id="modal-title">'+track().tag+'</h2><div class="stage-track"><span id="rpm-progress"></span></div><div class="rpm-conductor" aria-live="polite"><small id="rpm-phase-count">準備</small><h3 id="rpm-phase">4拍のカウント</h3><p id="rpm-tip">ギターを構えて、バンドを待とう。</p><b id="rpm-cue"></b></div><div class="rpm-position"><b id="rpm-chord">準備</b><span id="rpm-bar"></span></div><div class="jam-beats rpm-beats" id="rpm-beats" aria-label="拍"><i></i><i></i><i></i><i></i></div><div class="rpm-chart" id="rpm-chart">'+chart(s)+'</div><p class="rpm-help" id="rpm-hidden" hidden>コードと小節数を隠しています。音を聴いて、4小節ずつ数えよう。</p><button type="button" class="action-button secondary-action" id="rpm-reveal">迷ったら、現在地を確認する</button><p class="lesson-caption">弾きながら画面を操作する必要はありません。音数より、拍と合図を大事に。</p><button type="button" class="action-button secondary-action" id="rpm-stop">中断して戻る</button></div>';
 $('#rpm-reveal').onclick=()=>{r.revealed=true;r.assisted=true;r.lastView='';$('#rpm-reveal').disabled=true;$('#rpm-reveal').textContent='この区間のコードを表示中';};
 $('#rpm-stop').onclick=lobby;
 r.onHide=()=>{if(document.hidden&&run===r){stop();lobby();F.notify('画面が閉じたため練習を中断しました。最初から再開できます。');}};
 document.addEventListener('visibilitychange',r.onHide);
 const frame=()=>{
  if(run!==r)return;F.keepAudio(ctx);
  if(ctx.state!=='running'){stop();lobby();F.notify('音声が中断されたため練習を止めました。もう一度開始してください。');return;}
  /* Do not burst old scheduled notes after a long foreground stall. */
  if(ctx.currentTime>r.t0+r.nextBeat*spb+.5){stop();lobby();F.notify('再生が途切れたため練習を中断しました。もう一度開始してください。');return;}
  while(r.nextBeat<r.beats&&r.t0+r.nextBeat*spb<ctx.currentTime+.3)schedule(r,r.nextBeat++);
  const beat=(ctx.currentTime-r.t0-(ctx.outputLatency||ctx.baseLatency||0))/spb;
  if(beat>=r.beats){finish(r);return;}
  const v=viewState(r,beat),phase=beat<0?'count':v.p.id;
  if(phase!==r.lastPhase){r.lastPhase=phase;r.revealed=false;r.lastView='';$('#rpm-reveal').disabled=false;$('#rpm-reveal').textContent='迷ったら、現在地を確認する';
   $('#rpm-phase').textContent=beat<0?'4拍のカウント':v.p.title;$('#rpm-tip').textContent=beat<0?'まずは4小節、バンドを聴こう。':v.p.tip;
   $('#rpm-phase-count').textContent=beat<0?'準備':(r.plan.indexOf(v.p)+1)+' / '+r.plan.length;
  }
  const state=viewState(r,beat),key=[phase,Math.floor(beat),r.revealed].join('|');
  if(key!==r.lastView){r.lastView=key;
   const idx=((state.bar%s.chart.length)+s.chart.length)%s.chart.length,ch=beat<0?s.chart[0][0]:s.chart[idx][0];
   $('#rpm-chord').textContent=beat<0?String(Math.max(1,4+Math.floor(beat)+1)):state.hidden?'耳で数える':ch.sym;
   $('#rpm-bar').textContent=beat<0?'拍目':state.hidden?'':state.p.id==='ending'?(state.inBar===0?'鳴らす':'音を切る'):(state.bar+1)+' / '+state.p.bars+'小節';
   $('#rpm-chart').hidden=beat<0||state.hidden||state.p.id==='ending';$('#rpm-hidden').hidden=!state.hidden;
   $('#rpm-reveal').hidden=beat<0||state.p.id==='ending'||(!state.hidden&&!r.revealed);
   $('#rpm-chart').querySelectorAll('[data-rpm-bar]').forEach(e=>e.classList.toggle('on',Number(e.dataset.rpmBar)===idx));
   $('#rpm-cue').textContent=beat<0?'次：まず聴く':state.next&&state.remaining<=4?'次の1拍目：'+state.next.title:state.next?'次：'+state.next.title:'2拍目で音を切って、そのまま待つ。';
   $('.rpm-conductor').classList.toggle('rpm-cue-now',beat>=0&&state.remaining<=4);
   $('#rpm-beats').querySelectorAll('i').forEach((e,i)=>e.classList.toggle('on',i===((Math.floor(beat)%4)+4)%4));
  }
  $('#rpm-progress').style.width=Math.max(0,beat/r.beats*100)+'%';r.raf=requestAnimationFrame(frame);
 };r.raf=requestAnimationFrame(frame);
}
function finish(r){if(run!==r||r.finished)return;r.finished=true;stop();
 F.show(el=>{ $('.modal-dialog').classList.add('is-stage');
 el.innerHTML='<div class="rpm-result"><div class="lesson-progress">REHEARSAL COMPLETE</div><h2 id="modal-title">最後まで通せた。</h2><p>'+r.bpm+' BPM、'+modes[r.mode]+'。'+(r.assisted?'迷ったところでコードを確認しました。次はその区間をもう一度。':'できたことを、自分で振り返ろう。')+'</p><div class="rpm-checks">'+checks.map(([id,label])=>'<label><input type="checkbox" value="'+id+'">'+label+'</label>').join('')+'</div><p class="lesson-caption">できたことと次の課題を確認する自己チェックです。</p><p id="rpm-next-step" role="status">できなかった項目は、次の練習の目標に。</p><button type="button" class="action-button" id="rpm-save">振り返りを記録する</button><button type="button" class="action-button secondary-action" id="rpm-again">もう一度練習する</button></div>';
 $('#rpm-save').onclick=()=>{const chosen=[...el.querySelectorAll('.rpm-checks input:checked')].map(x=>x.value);records.push({id:r.s.id,mode:r.mode,bpm:r.bpm,at:Date.now(),checks:chosen,assisted:r.assisted});records=valid(records);if(!persist()){records.pop();return;}
 const earned=F.recordActivity('jam:rpm-'+r.s.id);$('#rpm-save').disabled=true;$('#rpm-save').textContent='記録しました'+(earned?'。＋'+earned+' XP':'。');
 const missing=checks.find(([id])=>!chosen.includes(id));$('#rpm-next-step').textContent=missing?'次は「'+missing[1]+'」を目標に。テンポを10下げてもう一度。':r.mode==='guide'?'次はコードを隠して、同じテンポで通してみよう。':r.assisted?'次は途中でコードを確認せず、同じテンポでもう一度。':'この進行を初参加の相談候補に。実際の曲と終わり方はホストと確認しよう。';el.querySelectorAll('.rpm-checks input').forEach(x=>x.disabled=true);overview();};
 $('#rpm-again').onclick=lobby;$('#rpm-save').focus();
 });}
window.FQRehearsal={lobby,plan,phaseAt,viewState,tracks,exportData:()=>records.map(r=>({...r,checks:[...r.checks]})),importData:rows=>{const unique=new Map([...records,...valid(rows)].map(r=>[[r.at,r.id,r.mode].join(':'),r]));records=valid([...unique.values()].sort((a,b)=>a.at-b.at));persist();overview();}};
overview();
})();

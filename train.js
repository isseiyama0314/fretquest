/* FRET QUEST off-guitar training: ear, rhythm, fretboard and theory games playable with only the screen and sound.
   Nine modes, five levels each. A run is five quick questions; four correct opens the next level. */
(()=>{'use strict';
const F=window.FretQuest,K=window.FQStage.kit,$=s=>document.querySelector(s);
const pick=a=>a[Math.floor(Math.random()*a.length)],shuffle=a=>{const c=[...a];for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}return c;};
/* A run is 5 questions and passes at 4. Three passing runs (not necessarily in a row) open the next level. */
const QUESTIONS=5,PASS=4,CLEARS=3;

/* ---------- Music data ---------- */
const INTERVALS=[[1,'短2度'],[2,'長2度'],[3,'短3度'],[4,'長3度'],[5,'完全4度'],[6,'増4度・減5度'],[7,'完全5度'],[8,'短6度'],[9,'長6度'],[10,'短7度'],[11,'長7度'],[12,'オクターブ']];
const INTERVAL_LEVELS=[[3,4,7,12],[2,3,4,5,7,9,12],[1,2,3,4,5,7,8,9,10,11,12],[1,2,3,4,5,6,7,8,9,10,11,12],[1,2,3,4,5,6,7,8,9,10,11,12]];
const CHORDS={maj:['メジャー',[0,4,7]],min:['マイナー',[0,3,7]],dom7:['セブンス（7）',[0,4,7,10]],maj7:['メジャー7th',[0,4,7,11]],m7:['マイナー7th',[0,3,7,10]],dim:['ディミニッシュ',[0,3,6]],m7b5:['マイナー7th♭5',[0,3,6,10]],aug:['オーギュメント',[0,4,8]],sus4:['サス4',[0,5,7]],six:['シックス（6）',[0,4,7,9]]};
const CHORD_LEVELS=[['maj','min'],['maj','min','dom7'],['maj7','m7','dom7','min'],['maj7','m7','dom7','m7b5','dim','aug'],['maj7','m7','dom7','m7b5','dim','aug','sus4','six']];
/* Degrees in a major key (semitones from the tonic and chord shape). */
const DEG={I:[0,'maj'],ii:[2,'min'],iii:[4,'min'],IV:[5,'maj'],V:[7,'maj'],vi:[9,'min'],Imaj7:[0,'maj7'],ii7:[2,'m7'],V7:[7,'dom7'],vi7:[9,'m7'],i:[0,'min'],iv:[5,'min'],bVI:[8,'maj'],bVII:[10,'maj']};
const PROG_LEVELS=[['I','IV','V'],['I','IV','V','vi'],['I','ii','iii','IV','V','vi'],['Imaj7','ii7','V7','vi7','IV'],['i','iv','V','bVI','bVII']];
const KEYS={C:['C','D','E','F','G','A','B'],G:['G','A','B','C','D','E','F♯'],D:['D','E','F♯','G','A','B','C♯'],A:['A','B','C♯','D','E','F♯','G♯'],E:['E','F♯','G♯','A','B','C♯','D♯'],F:['F','G','A','B♭','C','D','E'],'B♭':['B♭','C','D','E♭','F','G','A'],'E♭':['E♭','F','G','A♭','B♭','C','D']};
const SIGS={C:'なし',G:'♯1つ',D:'♯2つ',A:'♯3つ',E:'♯4つ',F:'♭1つ','B♭':'♭2つ','E♭':'♭3つ'};
const ROMAN=['I','ii','iii','IV','V','vi','vii°'],TRIAD=['','m','m','','','m','dim'],MODES=['アイオニアン','ドリアン','フリジアン','リディアン','ミクソリディアン','エオリアン','ロクリアン'];
const NOTE_NAMES=['C','C♯/D♭','D','D♯/E♭','E','F','F♯/G♭','G','G♯/A♭','A','A♯/B♭','B'],OPEN=window.FQInst.get().open;
/* Bass: 4 strings, and melodies sit two octaves lower (from E1 up). */
const BASS=window.FQInst.isBass(),INST=window.FQInst.get(),TOP=OPEN.length-1;
const flat=n=>n.endsWith('♯')?n.slice(0,-1):n+'♭';
/* Meters as eighth-note bars: kick and snare positions give each meter its feel. */
const METERS={'4/4':{n:8,kick:[0,4],snare:[2,6]},'3/4':{n:6,kick:[0],snare:[2,4]},'6/8':{n:6,kick:[0],snare:[3]},'5/4':{n:10,kick:[0,6],snare:[2,4,8]},'7/8':{n:7,kick:[0],snare:[2,4]},'9/8':{n:9,kick:[0],snare:[2,4,6]},'12/8':{n:12,kick:[0,6],snare:[3,9]}};
const METER_LEVELS=[['4/4','3/4'],['4/4','3/4','6/8'],['4/4','3/4','6/8','5/4'],['4/4','3/4','6/8','5/4','7/8'],['3/4','6/8','5/4','7/8','9/8','12/8']];
const SHIFT_MS=[90,60,40,28,18];
/* Melody pools: C major around the middle of the neck, A minor pentatonic, A blues. */
const C_MAJOR=[48,50,52,53,55,57,59,60,62,64,65,67,69,71],PENTA=[57,60,62,64,67,69],BLUES=[57,60,62,63,64,67,69];
const SOLFA=['ド','ド♯','レ','ミ♭','ミ','ファ','ファ♯','ソ','ソ♯','ラ','シ♭','シ'];

/* ---------- Sound ---------- */
let audio=null,current=null;
/* One synth per audio context: a new sound (a tap, a replay) must not cut off one that is still playing. */
async function sound(){await F.ensureAudio();const ctx=F.audioContext();if(!ctx||ctx.state!=='running')return null;if(!audio||audio.ctx!==ctx){audio?.stop();audio=K.synth(ctx);audio.ctx=ctx;}return {ctx,a:audio};}
async function playNotes(seq){/* seq: [[offsetSec, midi[], dur]] */const s=await sound();if(!s)return false;const t=s.ctx.currentTime+.08;seq.forEach(([o,ms,d])=>ms.forEach(m=>s.a.pluck(t+o,m,d,ms.length>1?.09:.16)));return true;}
const chordMidis=(root,shape)=>shape.map(i=>root+i);

/* ---------- Interval review: shown after a wrong answer ---------- */
const IV_DEG=['R','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','7','8'];
const INTERVAL_FEEL={1:'隣の音。ぶつかる強い緊張',2:'ドレの距離。音階の1歩',3:'ラド。暗く切ない（マイナーの3度）',4:'ドミ。明るい（メジャーの3度）',5:'ドファ。開けて、少し宙ぶらりん',6:'ドファ♯。不安定で、解決したくなる',7:'ドソ。空っぽで力強い（パワーコード）',8:'ドラ♭。切なく甘い',9:'ドラ。明るく開いた響き',10:'ドシ♭。ブルージー（7thコードの♭7）',11:'ドシ。オクターブの半音手前、浮遊感',12:'ドド。同じ音名が重なる'};
/* Where an interval sits from a root on the lowest string: the same string, or one or two strings up
   (those pairs are tuned a 4th apart on both guitar and bass), whichever keeps the hand closest. */
const IV_ROOT=5;
function intervalSpot(n){let best=null;for(const k of [0,1,2]){const d=n-5*k;if(!best||Math.abs(d)<Math.abs(best.d)||Math.abs(d)===Math.abs(best.d)&&k>best.k)best={k,d};}return {up:best.k,fret:IV_ROOT+best.d};}
function intervalBoard(right,wrong){
 const strings=OPEN.length-1,W=340,H=28+(strings-1)*24,fx=f=>20+(f-.5)*(W-24)/12,y=s=>14+(s-1)*24;
 let svg='<svg viewBox="0 0 '+W+' '+(H+14)+'" class="jam-board interval-board" role="img" aria-label="正解と答えの位置">';
 for(let f=0;f<=12;f++){const x=20+f*(W-24)/12;svg+='<line x1="'+x+'" x2="'+x+'" y1="4" y2="'+(H-2)+'" stroke="#ffffff'+(f===0?'66':'1a')+'" stroke-width="'+(f===0?3:1)+'"/>';if(f>0)svg+='<text x="'+fx(f)+'" y="'+(H+10)+'" text-anchor="middle" class="fret-no">'+f+'</text>';}
 for(let s=1;s<=strings;s++)svg+='<line x1="18" x2="'+W+'" y1="'+y(s)+'" y2="'+y(s)+'" stroke="#ffffff30" stroke-width="'+(1+s*.25)+'"/>';
 const dot=(f,s,cls,label)=>'<circle cx="'+fx(f)+'" cy="'+y(s)+'" r="11" class="'+cls+'"/><text x="'+fx(f)+'" y="'+(y(s)+4)+'" text-anchor="middle" class="'+cls+'-t">'+label+'</text>';
 const at=(n,cls,label)=>{const p=intervalSpot(n);return dot(p.fret,strings-p.up,cls,label);};
 return svg+dot(IV_ROOT,strings,'iv-root','R')+(wrong!==right?at(wrong,'iv-wrong',IV_DEG[wrong]):'')+at(right,'iv-right',IV_DEG[right])+'</svg>';
}
function intervalReview(n,m,seqFor){
 const name=i=>INTERVALS.find(x=>x[0]===i)[1],diff=m-n;
 const where=i=>{const p=intervalSpot(i),d=p.fret-IV_ROOT;return p.up===0?'同じ弦で'+i+'フレット先':(p.up===1?'1本':'2本')+'上の弦の'+(d===0?'同じフレット':Math.abs(d)+'フレット'+(d>0?'先':'手前'));};
 return {html:'<div class="interval-review"><div class="iv-legend"><span><i class="iv-right"></i>正解 '+name(n)+'</span><span><i class="iv-wrong"></i>あなた '+name(m)+'</span></div>'
  +intervalBoard(n,m)
  +'<p><b>'+name(n)+'</b>：'+INTERVAL_FEEL[n]+'。Rから'+where(n)+'。<br><b>'+name(m)+'</b>：'+INTERVAL_FEEL[m]+'。正解より半音'+Math.abs(diff)+'個分'+(diff>0?'広い':'狭い')+'。</p>'
  +'<div class="iv-play"><button type="button" data-iv="right">▶ 正解を聴く</button><button type="button" data-iv="wrong">▶ あなたの答えを聴く</button></div></div>',
  bind(el){el.querySelector('[data-iv="right"]').onclick=()=>playNotes(seqFor(n));el.querySelector('[data-iv="wrong"]').onclick=()=>playNotes(seqFor(m));}};
}

/* ---------- Question generators per mode and level ---------- */
const MODES_DEF={
 interval:{title:'音程当て',tag:'2つの音の距離を聴き分ける',icon:'music',about:'2つの音を聴いて、何度離れているかを答えます。ソロで「次に弾く音」を耳で選べるようになる、いちばんの基礎です。',
  levels:['3度・5度・オクターブ','4度・6度・2度を追加','7度・半音まで','増4度（トライトーン）も','下降と同時に鳴る音も'],
  make(lv){const n=pick(INTERVAL_LEVELS[lv-1]),root=52+Math.floor(Math.random()*12),mode=lv===5?pick(['up','down','both']):'up';
   const lo=mode==='down'?root+n:root,hi=mode==='down'?root:root+n,seq=mode==='both'?[[0,[root,root+n],1.4]]:[[0,[lo],.7],[.75,[hi],.9]];
   /* The same root and direction for the review, so the two intervals can be compared directly. */
   const seqFor=k=>mode==='both'?[[0,[root,root+k],1.4]]:mode==='down'?[[0,[root+k],.7],[.75,[root],.9]]:[[0,[root],.7],[.75,[root+k],.9]];
   const opts=INTERVAL_LEVELS[lv-1];return {prompt:mode==='both'?'同時に鳴った2音の音程は？':mode==='down'?'下がった音程は？':'上がった音程は？',play:()=>playNotes(seq),
    review:c=>{const m=INTERVALS.find(x=>x[1]===c)?.[0];return m?intervalReview(n,m,seqFor):null;},choices:opts.map(i=>INTERVALS.find(x=>x[0]===i)[1]),answer:INTERVALS.find(x=>x[0]===n)[1],explain:INTERVALS.find(x=>x[0]===n)[1]+'（半音'+n+'個分）'};}},
 chord:{title:'コード聴き分け',tag:'響きでコードの種類を当てる',icon:'fret',about:'鳴ったコードの「種類」を当てます。セッションで次のコードを耳で予想したり、聴いた曲をコピーしたりする力になります。',
  levels:['メジャーとマイナー','セブンスを追加','7thコード4種','ディミニッシュ・オーギュメントも','サス4・6thも'],
  make(lv){const set=CHORD_LEVELS[lv-1],k=pick(set),root=48+Math.floor(Math.random()*12),ms=chordMidis(root,CHORDS[k][1]);
   return {prompt:'このコードの種類は？',play:()=>playNotes([...ms.map((m,i)=>[i*.22,[m],.9]),[ms.length*.22+.15,ms,1.6]]),choices:set.map(x=>CHORDS[x][0]),answer:CHORDS[k][0],explain:CHORDS[k][0]+'：'+CHORDS[k][1].map(i=>['R','♭2','2','♭3','3','4','♭5','5','♯5','6','♭7','7'][i]).join('・')};}},
 prog:{title:'進行聴き取り',tag:'コード進行を度数で聴く',icon:'map',about:'最初に鳴るのがキーの I（主和音）。そのあとの3つのコードが、キーの何番目のコードかを順番に答えます。セッションで初見の曲についていく力です。',
  levels:['I・IV・V','vi を追加','ii・iii も','7thコードの進行（ii7–V7–Imaj7）','マイナー・キー（i・iv・V・♭VI・♭VII）'],
  make(lv){const set=PROG_LEVELS[lv-1],tonic=48+Math.floor(Math.random()*7),home=set[0],seq=[home,...Array.from({length:3},()=>pick(set.slice(1).concat(set[0])))];
   const sounds=seq.map((d,i)=>{const [off,shape]=DEG[d];return [i*1.1,[tonic+off-12,...chordMidis(tonic+off,CHORDS[shape][1])],1];});
   return {prompt:'最初が '+home+'。続く3つのコードは？',play:()=>playNotes(sounds),choices:set,answer:seq.slice(1),multi:3,explain:seq.join(' → ')};}},
 rhythm:{title:'リズム聴き取り',tag:'1小節を聴いて譜面を選ぶ',icon:'rhythm',about:'4カウントのあとに鳴る1小節のリズムを、4つの譜面から選びます。間違えたリズムは「苦手リズム帳」に入り、リミックスで復習できます。',
  levels:['4分音符と8分音符','裏拍・休符','シンコペーション','16分音符','16分のシンコペーション'],
  make(lv){const pools=window.FQGames.calls,pool=pools[Math.min(pools.length-1,lv-1)],p=pick(pool),bpm=84,spb=60/bpm;
   const wrongs=new Set();let guard=0;while(wrongs.size<3&&guard++<200){const c=[...p],h=c.map((x,i)=>x==='x'?i:-1).filter(i=>i>=0),r=Math.random();
    if(r<.5&&h.length>1){const i=pick(h.slice(1)),j=Math.max(1,Math.min(15,i+pick([-2,-1,1,2])));if(c[j]==='.'){c[i]='.';c[j]='x';}}else if(r<.75){const j=1+Math.floor(Math.random()*15);c[j]=c[j]==='x'&&h.length>2?'.':'x';}else{const alt=pick(pool.concat(pools[Math.min(pools.length-1,lv)]));alt.split('').forEach((x,i)=>c[i]=x);}
    const s=c.join('');if(s!==p&&s.includes('x'))wrongs.add(s);}
   const seq=[...[0,1,2,3].map(k=>[k*spb,[96],.05]),...p.split('').map((x,i)=>x==='x'?[4*spb+i*spb/4,[72],.12]:null).filter(Boolean)];
   return {prompt:'4カウントのあとのリズムは？',play:()=>playNotes(seq),choices:shuffle([p,...wrongs]),answer:p,grid:true,explain:'',onResult:ok=>K.rhythmBook.record(p,bpm,'リズム聴き取り',ok)};}},
 fret:{title:'指板マップ',tag:'音名から押さえる場所へ',icon:'fret',about:(BASS?'「3弦でD」':'「5弦でD」')+'のように出た音を、その弦のどこで押さえるかタップします。指板が見えると、ソロでもコードでも迷いが減ります。',
  levels:BASS?['4弦の幹音（♯♭なし）','3弦の幹音','4弦と3弦','全部の弦の幹音','♯・♭も含めて全部']:['6弦の幹音（♯♭なし）','5弦の幹音','6弦と5弦','全部の弦の幹音','♯・♭も含めて全部'],
  make(lv){const strings=lv===1?[TOP]:lv===2?[TOP-1]:lv===3?[TOP,TOP-1]:OPEN.slice(1).map((_,i)=>i+1),s=pick(strings),naturals=[0,2,4,5,7,9,11],pcs=lv===5?[...Array(12).keys()]:naturals,pc=pick(pcs);
   const frets=[...Array(13).keys()].filter(f=>(OPEN[s]+f)%12===pc);
   return {prompt:s+'弦で「'+NOTE_NAMES[pc]+'」はどこ？',fretString:s,answerFrets:frets,answer:frets[0],explain:s+'弦 '+frets.join('・')+'フレット'};}},

 melody:{title:'メロディ耳コピ',tag:'聴いたメロディを指板で再現',icon:'music',about:'短いメロディを聴いて、画面の指板をタップして再現するソルフェージュ。最初の音は教えます。タップした音はその場で鳴るので、耳で確かめながら探しましょう。同じ高さならどの弦で押さえてもOK。',
  levels:['3音・となりの音へ','4音・3度の跳躍も','5音・Cメジャー','Aマイナーペンタのリック','ブルーノート入りのフレーズ'],
  make(lv){let notes;
   if(lv<=3){const len=lv+2,maxStep=lv===1?1:lv===2?2:4;let i=3+Math.floor(Math.random()*6);notes=[C_MAJOR[i]];
    while(notes.length<len){const d=(Math.random()<.5?-1:1)*(1+Math.floor(Math.random()*maxStep)),j=i+d;if(j<(BASS?2:0)||j>=C_MAJOR.length)continue;i=j;notes.push(C_MAJOR[i]);}}
   else{const pool=lv===4?PENTA:BLUES,len=lv===4?4:5;let i=Math.floor(Math.random()*pool.length);notes=[pool[i]];
    while(notes.length<len){const j=i+(Math.random()<.5?-1:1)*(1+Math.floor(Math.random()*2));if(j<0||j>=pool.length)continue;i=j;notes.push(pool[i]);}}
   if(BASS)notes=notes.map(m=>m-24);
   return {prompt:'聴いた'+notes.length+'音のメロディを指板で再現しよう',play:()=>playNotes(notes.map((m,k)=>[k*.55,[m],.5])),melody:notes,answer:notes,explain:notes.map(m=>SOLFA[m%12]).join(' ')};}},
 meter:{title:'拍子当て',tag:'グルーヴから拍子を聴き取る',icon:'rhythm',about:'ドラムのパターンを聴いて、何拍子かを当てます。3拍子と6/8拍子の違い、5拍子や7/8拍子の「あと1つ多い・少ない」感覚が身につきます。',
  levels:['4拍子と3拍子','6/8拍子を追加','5/4拍子も','7/8拍子も','9/8・12/8も'],
  make(lv){const set=METER_LEVELS[lv-1],m=pick(set),d=METERS[m],e=.2;
   const play=async()=>{const s=await sound();if(!s)return false;const t=s.ctx.currentTime+.1;for(let bar=0;bar<3;bar++)for(let i=0;i<d.n;i++){const at=t+(bar*d.n+i)*e;s.a.hat(at,i===0);if(d.kick.includes(i))s.a.kick(at);if(d.snare.includes(i))s.a.snare(at);}return true;};
   return {prompt:'このグルーヴは何拍子？',play,choices:set,answer:m,explain:m+'：8分音符'+d.n+'個で1小節'};}},
 timing:{title:'ズレ探し',tag:'1つだけずれたクリックを探す',icon:'clock',about:'8つ並んだクリックのうち、1つだけタイミングがずれています。何番目かを当てよう。ずれは90msから18msまで小さくなり、細かいリズムのズレを聴き分ける耳が育ちます。',
  levels:['90msのずれ','60msのずれ','40msのずれ','28msのずれ','18msのずれ'],
  make(lv){const n=2+Math.floor(Math.random()*7),shift=SHIFT_MS[lv-1]/1000*(Math.random()<.5?-1:1),spb=.55;
   const play=async()=>{const s=await sound();if(!s)return false;const t=s.ctx.currentTime+.1;for(let i=1;i<=8;i++)s.a.click(t+(i-1)*spb+(i===n?shift:0),i===1||i===5);return true;};
   return {prompt:'ずれていたのは何番目？',play,choices:[2,3,4,5,6,7,8].map(i=>i+'番目'),answer:n+'番目',explain:n+'番目が'+Math.round(Math.abs(shift)*1000)+'ms'+(shift<0?'早かった':'遅かった')};}},
 theory:{title:'理論ドリル',tag:'キー・コード・スケールの基礎知識',icon:'star',about:'ダイアトニック・コード、コードの構成音、調号、コードに合うモード。セッションで「今どこにいるか」を頭で理解するための知識です。',
  levels:['キーのダイアトニック・コード','コードの3度・5度・7度','マイナーとペンタトニック','調号','コードに合うモード'],
  make(lv){const key=pick(Object.keys(KEYS)),sc=KEYS[key];
   if(lv===1){const d=1+Math.floor(Math.random()*6),ans=sc[d]+TRIAD[d],opts=shuffle([ans,...shuffle(sc.map((n,i)=>n+TRIAD[i]).filter(x=>x!==ans)).slice(0,3)]);return {prompt:key+'メジャー・キーの '+ROMAN[d]+'（'+(d+1)+'番目）のコードは？',choices:opts,answer:ans,explain:key+'のダイアトニック：'+sc.map((n,i)=>n+TRIAD[i]).join(' ')};}
   if(lv===2){const kind=pick(['3度','5度','♭7度']),ans=kind==='3度'?sc[2]:kind==='5度'?sc[4]:flat(sc[6]),name=key+(kind==='♭7度'?'7':''),opts=shuffle([ans,...shuffle(sc.filter(n=>n!==ans)).slice(0,3)]);return {prompt:name+' コードの '+kind+'の音は？',choices:opts,answer:ans,explain:name+'＝'+sc[0]+'・'+sc[2]+'・'+sc[4]+(kind==='♭7度'?'・'+flat(sc[6]):'')};}
   if(lv===3){const minor=sc[5],pent=[sc[5],sc[0],sc[1],sc[2],sc[4]],out=pick([sc[3],sc[6]]),q=pick(['pent','rel']);
    if(q==='rel'){const opts=shuffle([minor+'m',...shuffle(sc.filter(n=>n!==minor)).slice(0,3).map(n=>n+'m')]);return {prompt:key+'メジャーの平行調（同じ音を使うマイナー・キー）は？',choices:opts,answer:minor+'m',explain:key+'メジャーの6番目の音 '+minor+' から始まるマイナー'};}
    return {prompt:minor+'マイナー・ペンタトニックに含まれない音は？',choices:shuffle([out,...shuffle(pent).slice(0,3)]),answer:out,explain:minor+'マイナー・ペンタ＝'+pent.join('・')};}
   if(lv===4){const ans=SIGS[key],opts=shuffle([ans,...shuffle(Object.values(SIGS).filter(x=>x!==ans)).slice(0,3)]);return {prompt:key+'メジャー・キーの調号は？',choices:opts,answer:ans,explain:key+'メジャー＝'+sc.join(' ')};}
   const d=Math.floor(Math.random()*7),chord=sc[d]+['maj7','m7','m7','maj7','7','m7','m7♭5'][d];return {prompt:key+'メジャー・キーで、'+chord+'（'+ROMAN[d]+'）の上で使うモードは？',choices:shuffle([MODES[d],...shuffle(MODES.filter(m=>m!==MODES[d])).slice(0,3)]),answer:MODES[d],explain:ROMAN[d]+'の上では、キーの'+(d+1)+'番目の音から始まる '+MODES[d]};}}
};
const ORDER=['melody','interval','chord','prog','rhythm','meter','timing','fret','theory'];

/* ---------- Progress ---------- */
const KEY='fretQuestTrain';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}};
const saveMode=(id,patch)=>{const all=load();all[id]={...(all[id]||{unlocked:1,best:{}}),...patch};try{localStorage.setItem(KEY,JSON.stringify(all));}catch{}};
const prog=id=>{const p=load()[id]||{unlocked:1,best:{}};p.clears=p.clears||{};return p;};
/* Passing runs counted on a level; levels below the unlocked one count as done (records from before the clear count). */
const clearsOn=(pr,lv)=>lv<pr.unlocked?CLEARS:Math.min(CLEARS,pr.clears[lv]||0);
const pips=n=>'<span class="train-clears" aria-label="'+n+' / '+CLEARS+'回クリア">'+Array.from({length:CLEARS},(_,i)=>'<i class="'+(i<n?'on':'')+'"></i>').join('')+'</span>';

/* ---------- Screens ---------- */
/* Six strings by frets 0–7, high string on top; the first note's position is marked. */
function melodyHtml(q){
 const first=q.melody[0];let marked=false;
 return '<div class="train-slots melody" id="train-slots">'+q.melody.map(()=>'<span></span>').join('')+'</div>'
  +'<div class="train-board" role="group" aria-label="指板">'+OPEN.slice(1).map((_,i)=>i+1).map(s=>'<div class="train-string"><b>'+s+'</b>'+[...Array(8).keys()].map(f=>{const m=OPEN[s]+f,mark=!marked&&m===first;if(mark)marked=true;return '<button type="button" data-midi="'+m+'" class="'+(mark?'start':'')+'" aria-label="'+s+'弦'+f+'フレット"></button>';}).join('')+'</div>').join('')
  +'<div class="train-frets"><b></b>'+[...Array(8).keys()].map(f=>'<span>'+f+'</span>').join('')+'</div></div>'
  +'<button type="button" class="train-undo" id="train-undo">1音もどす</button>';
}
const gridHtml=p=>'<div class="mini-grid big">'+[...p].map((c,i)=>'<i class="'+(c==='x'?'on':'')+(i%4===0?' beat':'')+'"></i>').join('')+'</div>';
function lobby(id,level){
 const m=MODES_DEF[id],pr=prog(id);level=Math.min(level||pr.unlocked,pr.unlocked);
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="train-lobby"><div class="lesson-progress">'+INST.name+'なしトレーニング</div><h2 id="modal-title">'+m.title+'</h2><p>'+m.about+'</p>'
   +'<div class="train-levels">'+m.levels.map((t,i)=>{const lv=i+1,open=lv<=pr.unlocked,b=pr.best[lv];return '<button type="button" data-lv="'+lv+'" '+(open?'':'disabled')+' aria-pressed="'+(lv===level)+'"><b>Lv'+lv+'</b><span>'+t+'</span><small>'+(open?(lv<pr.unlocked||lv===5&&clearsOn(pr,lv)>=CLEARS?'CLEAR ・ BEST '+(b??0)+' / '+QUESTIONS:pips(clearsOn(pr,lv))+(b!=null?' BEST '+b+' / '+QUESTIONS:'')):'🔒 前のレベルを'+CLEARS+'回クリア')+'</small></button>';}).join('')+'</div>'
   +'<button type="button" class="action-button" id="train-start">Lv'+level+' をはじめる '+F.icon('arrow')+'</button>'
   +'<p class="lesson-caption">'+QUESTIONS+'問中'+PASS+'問正解で1クリア。'+CLEARS+'回クリアで次のレベルが開きます。早く答えるほどスコアが伸びます。'+INST.name+'もマイクも使いません。</p></div>';
  el.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>lobby(id,Number(b.dataset.lv)));
  $('#train-start').onclick=()=>run(id,level);$('#train-start').focus();
 });
}
function run(id,level){
 const m=MODES_DEF[id],st={i:0,correct:0,score:0,combo:0,best:0};
 const next=()=>{
  if(st.i>=QUESTIONS){finish(id,level,st);return;}
  const q=m.make(level),picked=[];let answered=false,shownAt=0;current=q;
  const el=$('#modal-inner');
  el.innerHTML='<div class="train-play"><div class="stage-hud"><div><small>QUESTION</small><strong>'+(st.i+1)+'<span class="hud-of"> / '+QUESTIONS+'</span></strong></div><div class="stage-title"><small>Lv'+level+'</small><b id="modal-title">'+m.title+'</b></div><div class="stage-combo'+(st.combo>=5?' hot':'')+'"><small>COMBO</small><strong>'+st.combo+'</strong></div></div>'
   +'<div class="train-prompt">'+q.prompt+'</div>'
   +(q.multi?'<div class="train-slots" id="train-slots">'+Array.from({length:q.multi},(_,k)=>'<span>'+(k+1)+'</span>').join('')+'</div>':'')
   +(q.play?'<button type="button" class="train-listen" id="train-listen">'+F.icon('music')+' もう一度聴く</button>':'')
   +(q.melody?melodyHtml(q):'')
   +(q.fretString?'<div class="train-fret" role="group" aria-label="フレット">'+[...Array(13).keys()].map(f=>'<button type="button" data-fret="'+f+'"><span>'+f+'</span>'+([3,5,7,9].includes(f)?'<i></i>':f===12?'<i></i><i></i>':'')+'</button>').join('')+'</div>':'')
   +(q.choices?'<div class="train-choices'+(q.grid?' grids':'')+'">'+q.choices.map((c,k)=>'<button type="button" data-choice="'+k+'">'+(q.grid?gridHtml(c):c)+'</button>').join('')+'</div>':'')
   +'<div class="train-feedback" id="train-feedback" aria-live="polite"></div><button type="button" class="action-button" id="train-next" hidden>次へ '+F.icon('arrow')+'</button></div>';
  const done=(ok,choice)=>{
   answered=true;st.i++;const fast=Math.max(0,Math.round((6000-(performance.now()-shownAt))/60));
   if(ok){st.correct++;st.combo++;st.best=Math.max(st.best,st.combo);st.score+=100+fast+Math.min(50,st.combo*5);}else st.combo=0;
   q.onResult?.(ok);
   const fb=$('#train-feedback');fb.className='train-feedback '+(ok?'ok':'ng');fb.innerHTML='<b>'+(ok?'正解！':'ざんねん')+'</b> '+(q.grid?(ok?'':'正解は下の譜面')+(ok?'':gridHtml(q.answer)):'正解：'+(q.melody?q.explain:Array.isArray(q.answer)?q.answer.join(' → '):q.fretString?q.explain:q.answer))+(q.explain&&!q.fretString&&!q.grid&&!q.melody?'<small>'+q.explain+'</small>':'');
   /* A wrong answer can come with a review that contrasts it with the right one. */
   const rv=!ok&&choice!=null&&q.review?.(choice);if(rv){fb.insertAdjacentHTML('beforeend',rv.html);rv.bind(fb);}
   el.querySelectorAll('[data-choice],[data-fret]').forEach(b=>b.disabled=true);
   const nx=$('#train-next');nx.hidden=false;nx.onclick=next;nx.focus();
  };
  el.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{
   if(answered)return;const c=q.choices[Number(b.dataset.choice)];
   if(q.multi){picked.push(c);const slots=el.querySelectorAll('#train-slots span');slots[picked.length-1].textContent=c;slots[picked.length-1].classList.add(c===q.answer[picked.length-1]?'ok':'ng');if(picked.length<q.multi)return;done(picked.every((x,k)=>x===q.answer[k]));return;}
   const ok=c===q.answer;b.classList.add(ok?'correct':'wrong');if(!ok)el.querySelectorAll('[data-choice]').forEach(x=>{if(q.choices[Number(x.dataset.choice)]===q.answer)x.classList.add('correct');});done(ok,c);});
  el.querySelectorAll('[data-fret]').forEach(b=>b.onclick=()=>{if(answered)return;const f=Number(b.dataset.fret),ok=q.answerFrets.includes(f);b.classList.add(ok?'correct':'wrong');el.querySelectorAll('[data-fret]').forEach(x=>{if(q.answerFrets.includes(Number(x.dataset.fret)))x.classList.add('correct');});done(ok);});
  if(q.melody){
   /* The first note is given; each tap sounds and fills the next slot; the answer is checked once every slot is filled. */
   const slots=el.querySelectorAll('#train-slots span'),entered=[q.melody[0]],show=()=>slots.forEach((x,k)=>{x.textContent=entered[k]!=null?SOLFA[entered[k]%12]:'？';x.classList.toggle('filled',entered[k]!=null);});
   show();
   el.querySelectorAll('[data-midi]').forEach(b=>b.onclick=async()=>{if(answered)return;const m=Number(b.dataset.midi);
    entered.push(m);show();b.classList.add('tapped');setTimeout(()=>b.classList.remove('tapped'),180);
    if(entered.length===q.melody.length){const ok=entered.every((x,k)=>x===q.melody[k]);slots.forEach((x,k)=>x.classList.add(entered[k]===q.melody[k]?'ok':'ng'));done(ok);}
    const s=await sound();s?.a.pluck(s.ctx.currentTime+.02,m,.6,.16);});
   $('#train-undo').onclick=()=>{if(!answered&&entered.length>1){entered.pop();show();}};
  }
  const listen=$('#train-listen');if(listen)listen.onclick=()=>q.play();
  if(q.play)q.play().then(ok=>{if(!ok)F.notify('音が出せません。消音設定と音量を確認してください。');});
  shownAt=performance.now()+(q.play?1500:0);
 };
 F.show(()=>{$('.modal-dialog').classList.add('is-stage');next();});
 F.setCleanup(()=>{audio?.stop();audio=null;});
}
function finish(id,level,st){
 const m=MODES_DEF[id],pr=prog(id),passed=st.correct>=PASS,newBest=st.correct>(pr.best[level]??-1);
 const count=passed&&level===pr.unlocked?(pr.clears[level]||0)+1:pr.clears[level]||0,opened=passed&&level===pr.unlocked&&level<5&&count>=CLEARS;
 saveMode(id,{best:{...pr.best,[level]:Math.max(st.correct,pr.best[level]??0)},clears:{...pr.clears,[level]:count},unlocked:opened?level+1:pr.unlocked});
 const onTop=level===pr.unlocked,left=CLEARS-Math.min(CLEARS,count);
 const earned=F.recordActivity('game:train-'+id);render();
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="stage-result'+(passed?' passed':'')+'">'+(opened?'<div class="confetti" aria-hidden="true">'+Array.from({length:20},(_,i)=>'<i style="--x:'+(5+i*4.5)+'%;--delay:'+(i%4*.07)+'s;--r:'+(i%2?200:-160)+'deg"></i>').join('')+'</div>':'')
   +'<div class="lesson-progress">'+m.title+' / Lv'+level+'</div><h2 id="modal-title">'+(opened?'Lv'+(level+1)+' 解放！':passed?(onTop&&level<5?'クリア '+Math.min(CLEARS,count)+' / '+CLEARS:'クリア！'):'あと少し！')+'</h2>'
   +'<div class="result-score"><strong>'+st.correct+'</strong><small>/ '+QUESTIONS+'</small></div>'
   +'<div class="result-grid"><div><b>'+st.score+'</b><small>SCORE</small></div><div><b>'+st.best+'</b><small>MAX COMBO</small></div></div>'
   +(onTop&&!opened&&level<5?'<div class="train-progress">'+pips(Math.min(CLEARS,count))+'<span>'+(left>0?'あと'+left+'回クリアで Lv'+(level+1):'')+'</span></div>':'')
   +'<p>'+(passed?'':PASS+'問正解で1クリア。')+(newBest&&!passed?'自己ベスト更新。':'')+'</p>'
   +(earned?'<div class="success-xp">+'+earned+' XP</div>':'')
   +(opened?'<button type="button" class="action-button" id="train-up">Lv'+(level+1)+' へ進む '+F.icon('arrow')+'</button>':'')
   +'<button type="button" class="action-button '+(opened?'secondary-action':'')+'" id="train-again">もう一度</button><button type="button" class="action-button secondary-action" id="train-close">閉じる</button></div>';
  $('#train-up')?.addEventListener('click',()=>run(id,level+1));$('#train-again').onclick=()=>run(id,level);$('#train-close').onclick=F.close;($('#train-up')||$('#train-again')).focus();
 });
}
function render(){
 const el=$('#train-cards');if(!el)return;
 el.innerHTML=ORDER.map(id=>{const m=MODES_DEF[id],pr=prog(id);return '<button type="button" class="game-card train-card tc-'+id+'" data-train="'+id+'"><span class="jam-genre">Lv'+pr.unlocked+' / 5</span><strong>'+m.title+'</strong><span class="jam-changes">'+m.tag+'</span><span class="dojo-pips">'+[1,2,3,4,5].map(l=>'<i class="'+(clearsOn(pr,l)>=CLEARS?'on':'')+'"></i>').join('')+'</span></button>';}).join('');
 el.querySelectorAll('[data-train]').forEach(b=>b.onclick=()=>lobby(b.dataset.train));
}
render();
/* current() exposes the open question for automated tests. */
window.FQTrain={modes:MODES_DEF,lobby,run,current:()=>current};
})();

/* FRET QUEST instrument setting: guitar (6 strings) or bass (4 strings, E1 A1 D2 G2).
   Every screen reads this once when it renders; switching reloads the page so all of them follow. */
(()=>{'use strict';
const KEY='fretQuestInstrument';
const KINDS={
 guitar:{id:'guitar',name:'ギター',player:'ギタリスト',open:[0,64,59,55,50,45,40],minHz:70,fft:2048},
 /* Bass fundamentals go down to 41 Hz. The longer analysis window holds two periods of the low E. */
 bass:{id:'bass',name:'ベース',player:'ベーシスト',open:[0,43,38,33,28],minHz:35,fft:4096}
};
let id='guitar';try{if(KINDS[localStorage.getItem(KEY)])id=localStorage.getItem(KEY);}catch{}
/* Playback only: keep chart pitches, frets and microphone targets at concert pitch. */
const VOICE_KEY='fretQuestBassVoice';
let bassVoice='clear';try{if(localStorage.getItem(VOICE_KEY)==='natural')bassVoice='natural';}catch{}
const voice=midi=>id==='bass'&&bassVoice==='clear'?midi+24:midi;
function setVoice(next){if(!['clear','natural'].includes(next))return;bassVoice=next;try{localStorage.setItem(VOICE_KEY,next);}catch{}mountVoice();}
function mountVoice(){const box=document.getElementById('bass-voice');if(!box)return;box.hidden=id!=='bass';
 box.innerHTML='<span>ベースのお手本音</span><div role="group" aria-label="ベースのお手本音"><button type="button" data-bass-voice="clear" aria-pressed="'+(bassVoice==='clear')+'">聴きやすい（2オクターブ上）</button><button type="button" data-bass-voice="natural" aria-pressed="'+(bassVoice==='natural')+'">原音</button></div><small>再生するお手本音の設定です。譜面と判定は実音のまま。同じ音名の、表示されたフレットを弾こう。</small>';
 box.querySelectorAll('[data-bass-voice]').forEach(b=>b.onclick=()=>setVoice(b.dataset.bassVoice));}
const cur=()=>KINDS[id];
const NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const ROOT={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
/* Root pitch class of a chord symbol such as "Bbmaj7", "F#m" or "^A7". */
const rootPc=sym=>{const m=/([A-G])([#b♯♭]?)/.exec(sym||'');if(!m)return null;return (ROOT[m[1]]+(/[#♯]/.test(m[2])?1:/[b♭]/.test(m[2])?-1:0)+12)%12;};

/* Places a run of pitches on the bass: each note goes to the string that keeps the hand closest to where it is,
   preferring the low frets. Returns {string,fret} per note. */
function layout(midis,open){
 let hand=3;
 return midis.map(m=>{
  let best=null;
  for(let s=1;s<open.length;s++){const f=m-open[s];if(f<0||f>15)continue;const cost=Math.abs(f-hand)+(f>9?2:0)+(f===0?.5:0);if(!best||cost<best.cost)best={string:s,fret:f,cost};}
  if(!best){const s=open.length-1;best={string:s,fret:Math.max(0,m-open[s])};}
  if(best.fret>0)hand=best.fret;return {string:best.string,fret:best.fret};
 });
}
/* Turns a guitar exercise into a bass line.
   Melodies drop two octaves (one if that would fall below the low E); strum charts become roots on the same rhythm. */
function adapt(lesson){
 const e=lesson.exercise,open=KINDS.bass.open,low=open[open.length-1];
 if(e.inst==='bass')return {type:'song',exercise:e};
 if(lesson.type==='song'){
  const lo=Math.min(...e.notes.map(n=>n.midi));let d=-24;while(lo+d<low)d+=12;
  const midis=e.notes.map(n=>n.midi+d),pos=layout(midis,open);
  return {type:'song',exercise:{...e,notes:e.notes.map((n,i)=>({beat:n.beat,len:n.len,midi:midis[i],...pos[i]}))}};
 }
 const midis=e.strums.map(s=>{const pc=rootPc(s.chord);return low+((pc-low%12+12)%12);}),pos=layout(midis,open);
 return {type:'song',fromStrum:true,exercise:{...e,notes:e.strums.map((s,i)=>({beat:s.beat,len:s.len,midi:midis[i],chord:s.chord,...pos[i]}))}};
}
function set(next){if(!KINDS[next]||next===id)return;try{localStorage.setItem(KEY,next);}catch{}location.reload();}
/* The header switch. */
function mount(){
 mountVoice();
 const box=document.getElementById('inst-switch');if(!box)return;
 box.innerHTML=Object.values(KINDS).map(k=>'<button type="button" data-inst="'+k.id+'" aria-pressed="'+(k.id===id)+'">'+k.name+'</button>').join('');
 box.querySelectorAll('[data-inst]').forEach(b=>b.onclick=()=>set(b.dataset.inst));
 const title=document.querySelector('.topbar-title');if(title&&title.firstChild)title.firstChild.textContent='おかえり、'+cur().player+'。';
 document.documentElement.dataset.inst=id;
 document.querySelectorAll('[data-inst-name]').forEach(x=>x.textContent=cur().name);
 if(id!=='bass')return;
 const text=(sel,t)=>{const x=document.querySelector(sel);if(x)x.textContent=t;};
 text('#courses .section-heading p','曲とストロークのステージは、ベース用の譜面（メロディは低い音域、コードはルート弾き）に変えて出題します。コードの押さえ方など、ギター向けの解説はそのままです。');
 text('#dojo-section .section-heading p','ブルース・ジャズ・ポップスの定番ベースラインを、3ステップで実戦投入。');
 text('#jam .section-heading p','ベース抜きのバンドに合わせて、あなたがベースを弾く。コードに合う音を弾くとポイント。');
}
window.FQInst={get:cur,isBass:()=>id==='bass',set,adapt,layout,rootPc,kinds:KINDS,mount,voice,bassVoice:()=>bassVoice,setVoice,
 /* Strings from the lowest-numbered (thinnest) up: [1,2,...]. */
 strings:()=>cur().open.slice(1).map((_,i)=>i+1),
 noteName:m=>NAMES[((m%12)+12)%12]+(Math.floor(m/12)-1)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

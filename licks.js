/* FRET QUEST phrase dojo: learn concrete licks and comping patterns, fit them to the band, then use them in a session.
   Every module has three steps: 1 learn (tab or strum chart), 2 groove (at tempo over drums, with space between),
   3 use (a session mission for solos, the full form for comping). Licks are original or common idioms; no song melodies. */
(()=>{'use strict';
const F=window.FretQuest,{tab,strum}=window.FQChart,$=s=>document.querySelector(s);
const A=9,C=0,G=7,PENTA_A=[9,0,2,4,7],BLUES_A=[9,0,2,3,4,7],MAJ_PENTA_C=[0,2,4,7,9],MAJOR_C=[0,2,4,5,7,9,11];
/* Repeat a phrase with rest bars between, for the groove step. */
const spaced=(src,rest=4,times=2)=>Array.from({length:times},()=>src+(rest?' | -:'+rest:'')).join(' | ');
const bars=(pattern,chords)=>chords.map(c=>pattern.split(' ').map(t=>t.replace('X',c)).join(' ')).join(' | ');

const MODULES=[
/* ---------------- BLUES / SOLO ---------------- */
{id:'pent-box1',genre:'BLUES',kind:'solo',title:'ペンタ第1ボックス',tag:'Aマイナーペンタ・5フレット',
 about:['ブルースとロックのソロの出発点。5フレットを人差し指で押さえ、4本の指で1フレットずつ担当します。','A C D E G の5音だけ。どの音もほぼ外れないので、まずは指が迷わないことが目標です。'],
 learn:{bpm:76,src:'6.5:.5 6.8:.5 5.5:.5 5.7:.5 4.5:.5 4.7:.5 3.5:.5 3.7:.5 | 2.5:.5 2.8:.5 1.5:.5 1.8:.5 1.5:.5 2.8:.5 2.5:.5 3.7:.5 | 3.5 4.7 4.5:.5 5.7:.5 5.5 | 6.5:4'},
 groove:{bpm:88},
 use:{session:'blues-a',text:'12小節ブルースで、ボックスの音だけを使ってソロ。小節の頭でAに着地しよう。',goals:[{type:'notes',min:24,label:'24音以上弾く'},{type:'inSet',pcs:PENTA_A,ratio:.8,label:'ペンタの音が80%以上'},{type:'land',pcs:[A],min:3,label:'小節の頭でAに3回着地'}]}},
{id:'bb-box',genre:'BLUES',kind:'solo',title:'B.B.ボックス',tag:'2弦10フレットのAが中心',
 about:['B.B.キングが多用した、1〜3弦10〜13フレットの小さなエリア。2弦10フレットのA（ルート）を軸に、上下の音で歌います。','2弦12フレットのB（9th）と3弦11フレットのF♯（6th）が、明るく甘い響きを作ります。音数は少なく、1音を長く。'],
 learn:{bpm:72,src:'2.13:.5 2.10:.5 1.10 2.10:.5 2.12:.5 2.10 | 3.11:.5 2.10:.5 1.10:.5 1.12:.5 2.10:2 | 2.12:.5 2.13:.5 1.10:.5 2.13:.5 2.10 3.11 | 2.10:4'},
 groove:{bpm:84},
 use:{session:'blues-a',text:'B.B.ボックスの高い音域だけでソロ。音を詰め込まず、Aに帰ってくる感覚で。',goals:[{type:'notes',min:20,label:'20音以上弾く'},{type:'range',lo:64,hi:79,ratio:.7,label:'高音域（B.B.ボックス付近）が70%以上'},{type:'land',pcs:[A],min:3,label:'小節の頭でAに3回着地'}]}},
{id:'blue-note',genre:'BLUES',kind:'solo',title:'ブルーノート（♭5）',tag:'ペンタ＋E♭でブルース・スケール',
 about:['ペンタにE♭（♭5）を1音足すとブルース・スケール。E♭は「通り道」の音で、止まらずにDかEへ抜けるのがコツです。','3弦8フレット（E♭）を薬指で。D→E♭→Dのように、ぶつけてすぐ戻ると一気にブルースらしくなります。'],
 learn:{bpm:76,src:'4.7:.5 3.5:.5 3.7:.5 3.8:.5 3.7:.5 3.5:.5 4.7 | 4.5:.5 4.7:2 -:1.5 | 3.5:.5 3.7:.5 3.8 3.7:.5 3.5:.5 4.7 | 4.7:4'},
 groove:{bpm:88},
 use:{session:'blues-a',text:'ブルーノートE♭を4回以上入れてソロ。E♭で止まらず、すぐ隣の音へ抜けよう。',goals:[{type:'notes',min:20,label:'20音以上弾く'},{type:'pc',pc:3,min:4,label:'E♭（♭5）を4回使う'},{type:'inSet',pcs:BLUES_A,ratio:.8,label:'ブルース・スケールの音が80%以上'}]}},
{id:'turnaround',genre:'BLUES',kind:'solo',title:'ターンアラウンド',tag:'11〜12小節目でE7へ戻る',
 about:['12小節の最後で「次のコーラスへ」と合図するフレーズ。高いAから降りて、G♯（E7の3度）を通ってEで止まります。','G♯は普段のペンタにない音。E7の上でだけ使うと、ぴたっと決まります。'],
 learn:{bpm:76,src:'1.5:.5 1.8:.5 1.5:.5 2.8:.5 2.5:.5 3.7:.5 3.5:.5 4.7:.5 | 4.6 4.5 5.7:2'},
 groove:{bpm:88},
 use:{session:'blues-a',text:'ソロの中で、各小節の頭はコードの音（大きい丸）に着地。12小節目はEで締めよう。',goals:[{type:'notes',min:24,label:'24音以上弾く'},{type:'land',min:6,label:'小節の頭でコードの音に6回着地'}]}},
{id:'blues-qa',genre:'BLUES',kind:'solo',title:'問いかけと答え',tag:'2小節で問い、2小節で答える',
 about:['ブルースの会話は「問い→答え」。問いはDやGなど落ち着かない音で終わり、答えはルートAで終わります。','弾かない2小節も演奏のうち。休符で、聴いている人に考える時間をあげましょう。'],
 learn:{bpm:76,src:'3.5:.5 3.7:.5 2.5:.5 2.8:.5 2.5 3.7 | 3.7:2 -:2 | 2.5:.5 3.7:.5 3.5:.5 4.7:.5 4.5 4.7 | 4.7:2 -:2'},
 groove:{bpm:88,rest:0},
 use:{session:'blues-a',text:'4小節ごとに問いと答え。音数は控えめに、答えの最後はAで。',goals:[{type:'notes',min:16,label:'16音以上弾く'},{type:'maxNotes',max:70,label:'弾きすぎない（70音以下）'},{type:'land',pcs:[A],min:4,label:'小節の頭でAに4回着地'}]}},
/* ---------------- BLUES / COMP ---------------- */
{id:'boogie',genre:'BLUES',kind:'comp',title:'シャッフル・ブギー',tag:'5度と6度を往復する定番リフ',
 about:['ルート＋5度（A5）と、ルート＋6度（A6）を交互に。ブルースの伴奏で一番よく使われる刻みです。','人差し指は2フレットに置いたまま、薬指（または小指）で4フレットを足し引きするだけ。D、Eでも同じ形です。'],
 learn:{bpm:72,src:bars('X:.5 X:.5 X6:.5 X6:.5 X:.5 X:.5 X6:.5 X6:.5',['A5','A5','D5','A5']).replace(/A56/g,'A6').replace(/D56/g,'D6')},
 groove:{bpm:84,src:bars('X:.5 X:.5 X6:.5 X6:.5 X:.5 X:.5 X6:.5 X6:.5',['A5','D5','A5','A5','D5','D5','A5','A5','E5','D5','A5','E5']).replace(/([ADE])56/g,'$16')},
 use:{form:'12小節ブルース・2コーラス',bpm:92,src:null}},
{id:'seventh-shuffle',genre:'BLUES',kind:'comp',title:'7thコードで裏打ち',tag:'A7・D7・E7のシャッフル伴奏',
 about:['ブルースのコードは全部セブンス。A7、D7、E7の3つで12小節が弾けます。','1拍目はダウン、2拍目の裏をアップで軽く。腕は止めず、空振りでリズムを保ちます。'],
 learn:{bpm:72,src:bars('X -:.5 ^X:.5 X -:.5 ^X:.5',['A7','D7','A7','E7'])},
 groove:{bpm:84,src:bars('X -:.5 ^X:.5 X -:.5 ^X:.5',['A7','D7','A7','A7','D7','D7','A7','A7','E7','D7','A7','E7'])},
 use:{form:'12小節ブルース・2コーラス',bpm:92,src:null}},
/* ---------------- JAZZ / SOLO ---------------- */
{id:'arp-251',genre:'JAZZ',kind:'solo',title:'コードトーン・アルペジオ',tag:'Dm7–G7–Cmaj7 を分散和音で',
 about:['ジャズのソロの土台は、スケールよりコードの音（1・3・5・7度）。各コードの4音を上がって下がります。','コードが変わる瞬間に、新しいコードの音へ乗り換える感覚をつかみましょう。'],
 learn:{bpm:72,src:'4.0:.5 4.3:.5 3.2:.5 2.1:.5 3.2:.5 4.3:.5 4.0 | 6.3:.5 5.2:.5 4.0:.5 4.3:.5 4.0:.5 5.2:.5 6.3 | 5.3:.5 4.2:.5 4.5:.5 3.4:.5 4.5:.5 4.2:.5 5.3 | 5.3:4'},
 groove:{bpm:92},
 use:{session:'ii-v-i',text:'ii–V–I で、コードの音（大きい丸）を中心にソロ。',goals:[{type:'notes',min:24,label:'24音以上弾く'},{type:'tones',ratio:.6,label:'コードの音が60%以上'},{type:'land',min:4,label:'小節の頭でコードの音に4回着地'}],choruses:2}},
{id:'guide-tones',genre:'JAZZ',kind:'solo',title:'ガイドトーン',tag:'3度と7度だけで進行を描く',
 about:['コードの性格を決めるのは3度と7度。Dm7のF・C → G7のF・B → Cmaj7のE・B と、ほとんど動かずにつながります。','たった2音ずつなのに、伴奏なしでも進行が聴こえる。これがジャズの「線」の考え方です。'],
 learn:{bpm:84,src:'2.6:2 3.5:2 | 2.6:2 3.4:2 | 2.5:2 3.4:2 | 2.5:4'},
 groove:{bpm:100},
 use:{session:'ii-v-i',text:'3度と7度を狙ってソロ。全音の半分以上を3度か7度に。',goals:[{type:'notes',min:16,label:'16音以上弾く'},{type:'guide',min:10,label:'3度・7度を10回弾く'},{type:'tones',ratio:.5,label:'コードの音が50%以上'}],choruses:2}},
{id:'enclosure',genre:'JAZZ',kind:'solo',title:'エンクロージャー',tag:'目標音を上下からはさむ',
 about:['狙った音（例：Cmaj7の3度E）の半音上と半音下を先に弾いてから着地する技。F→D♯→E のように「囲んで」入ります。','外れた音を一瞬通るので、ぐっとジャズらしい緊張と解決が生まれます。着地は必ず拍の頭に。'],
 learn:{bpm:72,src:'2.6:.5 2.4:.5 2.5 1.4:.5 1.2:.5 1.3 | 2.6:.5 2.4:.5 2.5:3'},
 groove:{bpm:92},
 use:{session:'ii-v-i',text:'半音で囲んでから、小節の頭でコードの音に着地。',goals:[{type:'notes',min:24,label:'24音以上弾く'},{type:'land',min:6,label:'小節の頭でコードの音に6回着地'}],choruses:2}},
{id:'lick-251',genre:'JAZZ',kind:'solo',title:'ii–V–I リック',tag:'8分音符でつなぐ定番の流れ',
 about:['Dm7でスケールを上がり、G7でコードの音を下り、Cmaj7の3度Eに解決する、オリジナルの練習フレーズ。','G7の最後のA→Bは、Cへ向かう「導音」。ここで勢いをつけて、Eに着地します。'],
 learn:{bpm:76,src:'4.0:.5 4.2:.5 4.3:.5 3.2:.5 2.1:.5 3.2:.5 4.3:.5 4.2:.5 | 4.0:.5 4.3:.5 3.0:.5 3.4:.5 2.3:.5 2.1:.5 3.4:.5 3.2:.5 | 3.4:.5 2.1:.5 2.5:3'},
 groove:{bpm:96},
 use:{session:'ii-v-i',text:'リックを丸ごと使っても、一部だけでもOK。コードの音を60%以上に。',goals:[{type:'notes',min:32,label:'32音以上弾く'},{type:'tones',ratio:.6,label:'コードの音が60%以上'}],choruses:2}},
{id:'minor-251',genre:'JAZZ',kind:'solo',title:'マイナー ii–V（枯葉）',tag:'Am7♭5–D7–Gm',
 about:['枯葉の後半で何度も出てくるマイナーの解決。Am7♭5のE♭、D7のF♯、GmのB♭が、それぞれの「色」の音です。','D7の上でE♭を弾くと（♭9）、切なさが強まります。最後はGmのGかB♭に着地。'],
 learn:{bpm:72,src:'3.2:.5 2.1:.5 2.4:.5 1.3:.5 2.4:.5 2.1:.5 3.2 | 2.3:.5 1.2:.5 1.5:.5 1.2:.5 2.4:.5 2.3:.5 2.1 | 1.3:.5 1.6:.5 2.3 1.3:2'},
 groove:{bpm:92},
 use:{session:'autumn',text:'枯葉の進行でソロ。コードが変わったら、その色の音を探そう。',goals:[{type:'notes',min:32,label:'32音以上弾く'},{type:'tones',ratio:.5,label:'コードの音が50%以上'},{type:'land',min:6,label:'小節の頭でコードの音に6回着地'}]}},
/* ---------------- JAZZ / COMP ---------------- */
{id:'shells',genre:'JAZZ',kind:'comp',title:'シェル・ボイシング',tag:'ルート＋3度＋7度の3音',
 about:['ジャズ・ギターの伴奏は、ルート・3度・7度の3音だけ（シェル）。5度は省いてOK。','6弦ルートと5弦ルートの形を交互に使うと、指の移動が最小になります。Dm7（5弦）→G7（6弦）→Cmaj7（5弦）。'],
 learn:{bpm:72,src:'Dm7:2 Dm7:2 | G7:2 G7:2 | Cmaj7:2 Cmaj7:2 | Cmaj7:4'},
 groove:{bpm:100,src:bars('X X X X',['Dm7','G7','Cmaj7','Cmaj7','Dm7','G7','Cmaj7','Cmaj7'])},
 use:{form:'枯葉（前半16小節）',bpm:104,src:bars('X:1.5 X:.5 -:2',['Cm7','F7','Bbmaj7','Ebmaj7','Am7b5','D7','Gm6','Gm6','Cm7','F7','Bbmaj7','Ebmaj7','Am7b5','D7','Gm6','Gm6'])}},
{id:'freddie',genre:'JAZZ',kind:'comp',title:'4つ切り（フレディ・グリーン）',tag:'4分音符で淡々と刻む',
 about:['ビッグバンドのギターの基本。4分音符をすべてダウンで、短く切って刻みます。','2拍目と4拍目を少しだけ強く。左手の力を抜くと音が短くなり、リズムが前に進みます。'],
 learn:{bpm:84,src:bars('X X X X',['Dm7','G7','Cmaj7','Cmaj7'])},
 groove:{bpm:120,src:bars('X X X X',['Dm7','G7','Cmaj7','Cmaj7','Dm7','G7','Cmaj7','Cmaj7'])},
 use:{form:'ii–V–I を4周',bpm:132,src:bars('X X X X',Array(4).fill(['Dm7','G7','Cmaj7','Cmaj7']).flat())}},
{id:'charleston',genre:'JAZZ',kind:'comp',title:'チャールストン',tag:'1拍目と2拍目の裏',
 about:['「ジャッ、ジャ」の定番コンピング。1拍目と、2拍目の裏（2と）の2回だけ弾きます。','残りの2拍は休み。ソリストの邪魔をしない、ジャズ伴奏らしい「間」がポイントです。'],
 learn:{bpm:80,src:bars('X:1.5 X:.5 -:2',['Dm7','G7','Cmaj7','Cmaj7'])},
 groove:{bpm:104,src:bars('X:1.5 X:.5 -:2',['Dm7','G7','Cmaj7','Cmaj7','Dm7','G7','Cmaj7','Cmaj7'])},
 use:{form:'枯葉（前半16小節）',bpm:112,src:bars('X:1.5 X:.5 -:2',['Cm7','F7','Bbmaj7','Ebmaj7','Am7b5','D7','Gm6','Gm6','Cm7','F7','Bbmaj7','Ebmaj7','Am7b5','D7','Gm6','Gm6'])}},
{id:'bossa-comp',genre:'JAZZ',kind:'comp',title:'ボサノバ伴奏',tag:'2小節でひとまわりするリズム',
 about:['ボサノバのギターは2小節パターン。1小節目は「1・2と・4」、2小節目は「2・3と」。','親指で低音を4分で刻む奏法もありますが、まずはコードのタイミングだけを正確に。'],
 learn:{bpm:84,src:'Cm7:1.5 Cm7:1.5 Cm7 | -:1 Cm7:1.5 Cm7:1.5 | Fm7:1.5 Fm7:1.5 Fm7 | -:1 Fm7:1.5 Fm7:1.5'},
 groove:{bpm:112,src:'Cm7:1.5 Cm7:1.5 Cm7 | -:1 Cm7:1.5 Cm7:1.5 | Fm7:1.5 Fm7:1.5 Fm7 | -:1 Fm7:1.5 Fm7:1.5 | Dm7b5:1.5 Dm7b5:1.5 Dm7b5 | -:1 G7:1.5 G7:1.5 | Cm7:1.5 Cm7:1.5 Cm7 | -:1 Cm7:1.5 Cm7:1.5'},
 use:{form:'Blue Bossa（前半8小節×2）',bpm:120,src:null}},
/* ---------------- POPS / SOLO ---------------- */
{id:'major-pent',genre:'POPS',kind:'solo',title:'メジャー・ペンタ',tag:'C D E G A の明るい5音',
 about:['ポップスやロックのバラードで、明るく歌うソロの基本。Cメジャーペンタは、Aマイナーペンタと同じ5音です。','違いは「どこで止まるか」。Cで終われば明るく、Aで終われば切なく聴こえます。'],
 learn:{bpm:76,src:'2.1:.5 2.3:.5 1.0:.5 1.3:.5 1.5 1.3 | 1.0:.5 1.3:.5 1.5:.5 1.8:.5 1.5 1.3 | 1.0:.5 2.3:.5 2.1 2.3 1.0 | 2.1:4'},
 groove:{bpm:88},
 use:{session:'ballad',text:'バラードの上で、メジャーペンタの音で歌うソロ。小節の頭はコードの音に。',goals:[{type:'notes',min:16,label:'16音以上弾く'},{type:'inSet',pcs:MAJ_PENTA_C,ratio:.8,label:'メジャーペンタの音が80%以上'},{type:'land',min:3,label:'小節の頭でコードの音に3回着地'}]}},
{id:'sing-line',genre:'POPS',kind:'solo',title:'歌うメロディ',tag:'長い音とコードの音で「歌」にする',
 about:['ギターソロを歌のように聴かせるコツは、音を減らして長く伸ばすこと。王道進行の各コードの音を、2拍ずつ置いていきます。','F→Gでは同じ音を伸ばし、Em→Amで1音だけ動く。少ない動きほど、メロディは耳に残ります。'],
 learn:{bpm:80,src:'1.5:2 1.3 1.1 | 1.3:2 2.3 2.0 | 2.0:2 1.0:2 | 2.1 1.0 1.5:2'},
 groove:{bpm:96},
 use:{session:'oudou',text:'王道進行で、音数をしぼって歌うソロ。弾きすぎず、コードの音に着地。',goals:[{type:'notes',min:12,label:'12音以上弾く'},{type:'maxNotes',max:48,label:'弾きすぎない（48音以下）'},{type:'land',min:4,label:'小節の頭でコードの音に4回着地'},{type:'inSet',pcs:MAJOR_C,ratio:.9,label:'Cメジャーの音が90%以上'}],choruses:2}},
/* ---------------- POPS / COMP ---------------- */
{id:'eight-beat',genre:'POPS',kind:'comp',title:'8ビート・ストローク',tag:'王道進行を定番パターンで',
 about:['ダウン、ダウンアップ、（空振り）アップ、ダウンアップ。J-POPの弾き語りで一番使う形です。','Fはセーハが苦しければ、Fmaj7（1〜4弦だけ）で代用OK。響きもおしゃれになります。'],
 learn:{bpm:72,src:bars('X X:.5 ^X:.5 -:.5 ^X:.5 X:.5 ^X:.5',['Fmaj7','G','Em','Am'])},
 groove:{bpm:92,src:bars('X X:.5 ^X:.5 -:.5 ^X:.5 X:.5 ^X:.5',['Fmaj7','G','Em','Am','Fmaj7','G','Em','Am'])},
 use:{form:'王道進行・16小節',bpm:96,src:bars('X X:.5 ^X:.5 -:.5 ^X:.5 X:.5 ^X:.5',Array(4).fill(['Fmaj7','G','Em','Am']).flat())}},
{id:'sixteen',genre:'POPS',kind:'comp',title:'16ビート・カッティング',tag:'細かく刻んで、裏で弾く',
 about:['腕は16分音符で上下に動かし続け、弾く所だけ弦に当てます。ファンクやシティポップの基本。','弾かない所は空振り。左手を軽く浮かせて音を切ると、歯切れのいいカッティングになります。'],
 learn:{bpm:72,src:bars('X:.25 -:.25 ^X:.25 -:.25 X:.25 -:.25 ^X:.25 -:.25 X:.25 -:.25 ^X:.25 -:.25 X:.25 -:.25 ^X:.25 -:.25',['Am7','Am7','D7','D7'])},
 groove:{bpm:88,src:bars('X:.25 -:.25 ^X:.25 X:.25 -:.25 X:.25 ^X:.25 -:.25 X:.25 -:.25 ^X:.25 X:.25 -:.25 X:.25 ^X:.25 -:.25',['Am7','Am7','D7','D7','Am7','Am7','D7','D7'])},
 use:{form:'Am7–D7 を16小節',bpm:96,src:bars('X:.25 -:.25 ^X:.25 X:.25 -:.25 X:.25 ^X:.25 -:.25 X:.25 -:.25 ^X:.25 X:.25 -:.25 X:.25 ^X:.25 -:.25',Array(8).fill(['Am7','D7']).flat())}},
{id:'arpeggio',genre:'POPS',kind:'comp',title:'アルペジオ伴奏',tag:'カノン進行を1音ずつ',
 about:['コードを押さえたまま、低い弦から1本ずつ弾く伴奏。バラードの定番です。','押さえたコードは最後まで離さない。右手は親指が低音、人差し指〜薬指が高音を担当します。'],
 learn:{bpm:72,type:'song',src:'5.3:.5 4.2:.5 3.0:.5 2.1:.5 1.0:.5 2.1:.5 3.0:.5 4.2:.5 | 6.3:.5 5.2:.5 4.0:.5 3.0:.5 2.0:.5 3.0:.5 4.0:.5 5.2:.5 | 5.0:.5 4.2:.5 3.2:.5 2.1:.5 1.0:.5 2.1:.5 3.2:.5 4.2:.5 | 6.0:.5 5.2:.5 4.2:.5 3.0:.5 2.0:.5 3.0:.5 4.2:.5 5.2:.5'},
 groove:{bpm:84,type:'song',src:'5.3:.5 4.2:.5 3.0:.5 2.1:.5 1.0:.5 2.1:.5 3.0:.5 4.2:.5 | 6.3:.5 5.2:.5 4.0:.5 3.0:.5 2.0:.5 3.0:.5 4.0:.5 5.2:.5 | 5.0:.5 4.2:.5 3.2:.5 2.1:.5 1.0:.5 2.1:.5 3.2:.5 4.2:.5 | 6.0:.5 5.2:.5 4.2:.5 3.0:.5 2.0:.5 3.0:.5 4.2:.5 5.2:.5 | 4.3:.5 3.2:.5 2.1:.5 1.1:.5 2.1:.5 3.2:.5 4.3:.5 3.2:.5 | 5.3:.5 4.2:.5 3.0:.5 2.1:.5 1.0:.5 2.1:.5 3.0:.5 4.2:.5 | 4.3:.5 3.2:.5 2.1:.5 1.1:.5 2.1:.5 3.2:.5 4.3:.5 3.2:.5 | 6.3:.5 5.2:.5 4.0:.5 3.0:.5 2.0:.5 3.0:.5 4.0:.5 5.2:.5'},
 use:{session:'canon',text:'カノン進行で、アルペジオ伴奏か歌うソロ。各小節の頭はコードの音に。',goals:[{type:'notes',min:32,label:'32音以上弾く'},{type:'tones',ratio:.7,label:'コードの音が70%以上'},{type:'land',min:6,label:'小節の頭でコードの音に6回着地'}],choruses:2}}
];
/* ---------------- BASS LINES (shown when the instrument is bass) ----------------
   Tab strings for bass: 1 = G, 2 = D, 3 = A, 4 = E. */
const BASS_MODULES=[
{id:'b-root',genre:'BLUES',kind:'line',root:A,title:'ルートで支える',tag:'12小節ブルースを4分のルートで',
 about:['ベースの一番大事な仕事は、コードが変わる瞬間にルート（根音）を鳴らすこと。A7ならA、D7ならD、E7ならE。','4弦5フレットのA、3弦5フレットのD、4弦開放のE。音を切らず、次の音の直前まで伸ばします。'],
 learn:{bpm:76,src:'4.5 4.5 4.5 4.5 | 3.5 3.5 3.5 3.5 | 4.5 4.5 4.5 4.5 | 4.0 4.0 4.0 4.0'},
 groove:{bpm:88,rest:0},
 use:{session:'blues-a',text:'12小節ブルースのベースを担当。小節の頭は必ずルートで。',goals:[{type:'notes',min:32,label:'32音以上弾く'},{type:'roots',min:8,label:'小節の頭でルートを8回'},{type:'tones',ratio:.7,label:'コードの音が70%以上'}]}},
{id:'b-boogie',genre:'BLUES',kind:'line',root:A,title:'ブギー・ウォーク',tag:'R–3–5–6–♭7 を上って下りる',
 about:['ブルースのベースといえばこれ。ルートから3度・5度・6度・♭7度と上がり、同じ道を下ります。','Aは4弦5フレットから、Dは3弦5フレットから。形はまったく同じなので、一度覚えれば平行移動するだけです。'],
 learn:{bpm:72,src:'4.5 3.4 3.7 2.4 | 2.5 2.4 3.7 3.4 | 3.5 2.4 2.7 1.4 | 1.5 1.4 2.7 2.4'},
 groove:{bpm:84,rest:0},
 use:{session:'blues-a',text:'ブギーの形で12小節を歩こう。コードが変わったら、新しいルートから同じ形。',goals:[{type:'notes',min:40,label:'40音以上弾く'},{type:'roots',min:8,label:'小節の頭でルートを8回'},{type:'tones',ratio:.55,label:'コードの音が55%以上'}]}},
{id:'b-eighth',genre:'POPS',kind:'line',root:C,title:'ルート8分弾き',tag:'王道進行を8分で刻む',
 about:['J-POPやロックのベースの基本は、ルートを8分音符で刻むこと。音程よりも、音の長さと粒のそろい方が命です。','4弦の1・3・0・5フレット。指弾きなら人差し指と中指を交互に、ピックならダウンだけで。全部を同じ長さ・同じ強さで。'],
 learn:{bpm:80,src:'4.1:.5 4.1:.5 4.1:.5 4.1:.5 4.1:.5 4.1:.5 4.1:.5 4.1:.5 | 4.3:.5 4.3:.5 4.3:.5 4.3:.5 4.3:.5 4.3:.5 4.3:.5 4.3:.5 | 4.0:.5 4.0:.5 4.0:.5 4.0:.5 4.0:.5 4.0:.5 4.0:.5 4.0:.5 | 4.5:.5 4.5:.5 4.5:.5 4.5:.5 4.5:.5 4.5:.5 4.5:.5 4.5:.5'},
 groove:{bpm:92,rest:0},
 use:{session:'oudou',text:'王道進行のベース。8分で刻み続けて、コードが変わる瞬間にルートを乗り換えよう。',goals:[{type:'notes',min:48,label:'48音以上弾く'},{type:'roots',min:10,label:'小節の頭でルートを10回'},{type:'tones',ratio:.7,label:'コードの音が70%以上'}],choruses:2}},
{id:'b-octave',genre:'POPS',kind:'line',root:C,title:'ルート・5度・オクターブ',tag:'カノン進行を R–5–8–5 で',
 about:['ルートだけに慣れたら、5度とオクターブを足して線を動かします。形は「ルート→1本上の弦の2フレット上（5度）→2本上の弦の2フレット上（オクターブ）」。','この形はどのコードでも同じ。Cでも、Gでも、Amでも、指の形を保ったまま移動するだけです。'],
 learn:{bpm:76,src:'3.3 2.5 1.5 2.5 | 4.3 3.5 2.5 3.5 | 4.5 3.7 2.7 3.7 | 4.0 4.7 3.7 4.7'},
 groove:{bpm:88,rest:0},
 use:{session:'canon',text:'カノン進行で、R–5–8 の形を使ってベースを弾こう。1拍目はルート。',goals:[{type:'notes',min:32,label:'32音以上弾く'},{type:'roots',min:8,label:'小節の頭でルートを8回'},{type:'tones',ratio:.7,label:'コードの音が70%以上'}],choruses:2}},
{id:'b-sync',genre:'POPS',kind:'line',root:C,title:'シンコペーション',tag:'16分の「タッ・タ」で前に進む',
 about:['付点8分＋16分の「タッ・タ」で始まり、裏拍のオクターブで跳ねるライン。8分だけのときより、ぐっと前に転がります。','休符もリズムの一部。2拍目の頭と4拍目の裏は、左手を軽く浮かせて音を止めます。'],
 learn:{bpm:72,src:'3.3:.75 3.3:.25 -:.5 3.3:.5 1.5:.5 3.3:.5 2.5:.5 -:.5 | 4.5:.75 4.5:.25 -:.5 4.5:.5 2.7:.5 4.5:.5 3.7:.5 -:.5 | 4.1:.75 4.1:.25 -:.5 4.1:.5 2.3:.5 4.1:.5 3.3:.5 -:.5 | 4.3:.75 4.3:.25 -:.5 4.3:.5 2.5:.5 4.3:.5 3.5:.5 -:.5'},
 groove:{bpm:84,rest:0},
 use:{session:'ballad',text:'バラード進行で、シンコペーションのラインを。小節の頭のルートは強めに。',goals:[{type:'notes',min:40,label:'40音以上弾く'},{type:'roots',min:8,label:'小節の頭でルートを8回'},{type:'tones',ratio:.7,label:'コードの音が70%以上'}],choruses:2}},
{id:'b-two',genre:'JAZZ',kind:'line',root:C,title:'2ビート',tag:'1拍目にルート、3拍目に5度',
 about:['ジャズのベースは、テーマや静かな場面では2分音符の「2ビート」から。1拍目にルート、3拍目に5度。','5度は「1本下の弦の同じフレット」か「1本上の弦の2フレット上」。この2つの形で、どのキーでもすぐ見つかります。'],
 learn:{bpm:92,src:'3.5:2 4.5:2 | 4.3:2 3.5:2 | 3.3:2 4.3:2 | 3.3:2 2.5:2'},
 groove:{bpm:104,rest:0},
 use:{session:'autumn',text:'枯葉を2ビートで。1拍目は必ずルート、3拍目は5度かコードの音。',goals:[{type:'notes',min:24,label:'24音以上弾く'},{type:'roots',min:12,label:'小節の頭でルートを12回'},{type:'tones',ratio:.7,label:'コードの音が70%以上'}]}},
{id:'b-walk',genre:'JAZZ',kind:'line',root:C,title:'ウォーキング・ベース',tag:'4分で歩く ii–V–I',
 about:['ジャズの4ビートを支える「歩く」ベース。1拍目はルート、2・3拍目はコードの音、4拍目は次のルートの半音となり。','F♯→G、B→C、E♭→D。4拍目から半音で次のコードへ吸い込まれる瞬間が、ウォーキングの気持ちよさです。'],
 learn:{bpm:84,src:'3.5 2.3 2.7 2.4 | 2.5 2.3 2.0 3.2 | 3.3 2.2 2.5 1.4 | 1.5 2.7 2.5 2.1'},
 groove:{bpm:100,rest:0},
 use:{session:'ii-v-i',text:'ii–V–I を4周、4分音符で歩こう。1拍目はルート、4拍目は半音で次へ。',goals:[{type:'notes',min:48,label:'48音以上弾く'},{type:'roots',min:10,label:'小節の頭でルートを10回'},{type:'tones',ratio:.55,label:'コードの音が55%以上'}],choruses:4}},
{id:'b-bossa',genre:'JAZZ',kind:'line',root:C,title:'ボサノバ・ベース',tag:'付点4分の R–5 パターン',
 about:['ボサノバのベースは「ルート（付点4分）→5度→5度（付点4分）→ルート」。2拍目の裏と4拍目の裏で、次の拍を先取りします。','5度はルートの1本下の弦・同じフレット。Cm7ならC（3弦3フレット）とG（4弦3フレット）を行き来するだけです。'],
 learn:{bpm:100,src:'3.3:1.5 4.3:.5 4.3:1.5 3.3:.5 | 4.1:1.5 3.3:.5 3.3:1.5 4.1:.5 | 3.5:1.5 4.4:.5 4.4:1.5 3.5:.5 | 4.3:1.5 3.5:.5 3.5:1.5 4.3:.5'},
 groove:{bpm:112,rest:0},
 use:{session:'bossa',text:'Blue Bossa のベースを担当。付点4分のパターンで、1拍目はルート。',goals:[{type:'notes',min:32,label:'32音以上弾く'},{type:'roots',min:10,label:'小節の頭でルートを10回'},{type:'tones',ratio:.6,label:'コードの音が60%以上'}]}}
];
BASS_MODULES.forEach(m=>m.inst='bass');
/* Comping modules without their own full form reuse the groove chart twice. */
MODULES.forEach(m=>{if(m.kind==='comp'&&m.use.form&&!m.use.src)m.use.src=m.groove.src+' | '+m.groove.src;});
const GENRES=[['BLUES','ブルース'],['JAZZ','ジャズ'],['POPS','ポップス']];
const STEPS=[['learn','覚える','タブ譜どおりに弾く'],['groove','合わせる','テンポを上げてバンドと'],['use','使う','実践で使いこなす']];
/* Bass players see the bass lines instead of the guitar modules; each instrument keeps its own count. */
const BASS=window.FQInst.isBass(),BASS_OPEN=window.FQInst.kinds.bass.open,LIST=BASS?BASS_MODULES:MODULES;
const RANKS=BASS?[[0,'フレーズ見習い'],[2,'ジャム・ルーキー'],[4,'セッション・プレイヤー'],[6,'バンドの要'],[LIST.length,'フレーズ・マスター']]
 :[[0,'フレーズ見習い'],[3,'ジャム・ルーキー'],[8,'セッション・プレイヤー'],[14,'バンドの要'],[MODULES.length,'フレーズ・マスター']];

/* Progress per module: s1/s2 best stage score, s3 true once the use step is passed. Kept in this browser. */
const KEY='fretQuestLicks';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}};
const store=(id,patch)=>{const all=load();all[id]={...(all[id]||{}),...patch};try{localStorage.setItem(KEY,JSON.stringify(all));}catch{}render();};
const status=m=>{const p=load()[m.id]||{};return [(p.s1||0)>=60,(p.s2||0)>=60,!!p.s3];};
const mastered=()=>LIST.filter(m=>status(m).every(Boolean)).length;
const rank=()=>RANKS.filter(([n])=>mastered()>=n).pop()[1];
let genre='BLUES';try{genre=localStorage.getItem('fretQuestDojoGenre')||'BLUES';}catch{}

/* ---------- Charts for the stage engine ---------- */
function chartFor(m,step){
 const solo=m.kind==='solo'||m.kind==='line',spec=step===1?m.learn:step===2?m.groove:m.use,type=spec.type||m.learn.type||(solo?'song':'strum');
 let src=step===1?m.learn.src:step===2?(m.groove.src||spaced(m.learn.src,m.groove.rest===0?0:4)):m.use.src;
 const exercise={bpm:spec.bpm,...(type==='song'?tab(src,m.inst==='bass'?BASS_OPEN:undefined):strum(src))};if(m.inst==='bass')exercise.inst='bass';
 return {id:'lick-'+m.id+'-'+step,title:m.title+(step===1?'':step===2?'（合わせる）':'（'+m.use.form+'）'),type,minutes:2,goal:'',tips:[],exercise};
}
function runStage(m,step){
 const lesson=chartFor(m,step),session={lesson,course:{title:'フレーズ道場'}};
 window.FQStage.lobby(session,{next:null,back:()=>open(m),
  done:({score,passed})=>{const p=load()[m.id]||{},k=step===3?'s3':'s'+step;
   if(step===3){if(passed&&!p.s3){const before=rank();store(m.id,{s3:true});award(m,step,before);}}
   else if(score>(p[k]||0)){const before=rank();store(m.id,{[k]:score});if(passed&&(p[k]||0)<60)award(m,step,before);}}});
}
/* XP for each first clear of a step on a day; mastery shows progress and announces a new title when one is reached. */
function award(m,step,before){const xp=F.recordActivity('lick:'+m.id+'-'+step);if(status(m).every(Boolean)){const now=rank();F.notify('「'+m.title+'」をマスター！（'+mastered()+' / '+LIST.length+'）'+(now!==before?' 新しい称号：'+now:''));}else if(xp)F.notify('+'+xp+' XP');}
function runMission(m){
 const s=window.FQJam.sessions.find(x=>x.id===m.use.session);
 window.FQJam.lobby(s,{mission:{text:m.use.text,goals:m.use.goals,choruses:m.use.choruses||1},back:()=>open(m),onDone:passed=>{if(passed&&!load()[m.id]?.s3){const before=rank();store(m.id,{s3:true});award(m,3,before);}}});
}

/* ---------- Screens ---------- */
function board(m){
 /* Positions used by a solo lick, on a 15-fret board. */
 const open=m.inst==='bass'?BASS_OPEN:undefined,lines=m.inst==='bass'?4:6;
 const pts=new Map();for(const n of tab(m.learn.src,open).notes)pts.set(n.string+'.'+n.fret,n);
 const maxF=Math.max(5,...[...pts.values()].map(n=>n.fret)),lo=Math.max(0,Math.min(...[...pts.values()].map(n=>n.fret))-1),hi=Math.max(lo+5,maxF+1),W=340,H=110,fx=f=>f===0?14:24+(f-lo-.5)*(W-30)/(hi-lo),y=s=>12+(s-1)*17;
 let svg='<svg viewBox="0 0 '+W+' '+H+'" class="jam-board" role="img" aria-label="'+m.title+'の押さえる位置">';
 for(let f=lo;f<=hi;f++){const x=24+(f-lo)*(W-30)/(hi-lo);svg+='<line x1="'+x+'" x2="'+x+'" y1="10" y2="'+(H-14)+'" stroke="#ffffff'+(f===0?'66':'1a')+'" stroke-width="'+(f===0?3:1)+'"/>';if(f>lo)svg+='<text x="'+(x-(W-30)/(hi-lo)/2)+'" y="'+(H-2)+'" text-anchor="middle" class="fret-no">'+f+'</text>';}
 for(let s=1;s<=lines;s++)svg+='<line x1="20" x2="'+W+'" y1="'+y(s)+'" y2="'+y(s)+'" stroke="#ffffff30" stroke-width="'+(1+(lines===4?s+2:s)*.2)+'"/>';
 for(const n of pts.values()){const pc=n.midi%12,root=m.root!=null?m.root:m.genre==='BLUES'?A:m.genre==='JAZZ'&&m.id==='minor-251'?G:C;svg+='<circle cx="'+fx(n.fret)+'" cy="'+y(n.string)+'" r="7.5" class="tone '+(pc===root?'d0':'d7')+'"/><text x="'+fx(n.fret)+'" y="'+(y(n.string)+3)+'" text-anchor="middle">'+n.fret+'</text>';}
 return svg+'</svg>';
}
function chords(m){const names=[...new Set(strum(m.learn.src).strums.map(x=>x.chord))];return '<div class="dojo-chords">'+names.map(c=>'<div><b>'+c.replace('b','♭').replace('m7♭5','m7♭5')+'</b>'+F.chordDiagram(c)+'</div>').join('')+'</div>';}
function open(m){
 const st=status(m);
 F.show(el=>{
  $('.modal-dialog').classList.add('is-stage');
  el.innerHTML='<div class="dojo-module"><div class="lesson-progress">フレーズ道場 / '+m.genre+' '+(m.kind==='solo'?'ソロ':m.kind==='line'?'ベースライン':'伴奏')+'</div><h2 id="modal-title">'+m.title+'</h2><div class="stage-meta"><span>'+m.tag+'</span></div>'
   +m.about.map(t=>'<p>'+t+'</p>').join('')
   +((m.learn.type||(m.kind!=='comp'?'song':'strum'))==='song'?'<div class="jam-board-wrap">'+board(m)+'</div><div class="jam-legend"><span><i class="lg dojo-root"></i>ルート</span><span>数字はフレット番号</span></div>':chords(m))
   +'<div class="dojo-steps">'+STEPS.map(([k,label,sub],i)=>{const locked=i>0&&!st[i-1];return '<button type="button" class="dojo-step'+(st[i]?' done':'')+'" data-step="'+(i+1)+'" '+(locked?'disabled':'')+'><span class="dojo-pip">'+(st[i]?'✓':i+1)+'</span><span><b>'+label+'</b><small>'+(i===2?(m.use.session?'セッションでミッション':m.use.form):sub)+(locked?' ・ 前のステップをクリアで解放':'')+'</small></span><span class="dojo-go">'+(st[i]?'もう一度':'挑戦')+' →</span></button>';}).join('')+'</div>'
   +'<p class="lesson-caption">ステップ1・2は★1（60点）でクリア。ステップ3は'+(m.use.session?'ミッションの全項目達成':'★1')+'でクリア。3つそろえばマスター。</p></div>';
  el.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const step=Number(b.dataset.step);if(step===3&&m.use.session)runMission(m);else runStage(m,step);});
 });
}
function render(){
 const el=$('#dojo');if(!el)return;
 const list=LIST.filter(m=>m.genre===genre);
 $('#dojo-rank').textContent=rank();$('#dojo-count').textContent=mastered()+' / '+LIST.length;
 $('#dojo-tabs').innerHTML=GENRES.map(([g,label])=>'<button type="button" data-genre="'+g+'" aria-pressed="'+(g===genre)+'">'+label+'<small>'+LIST.filter(m=>m.genre===g&&status(m).every(Boolean)).length+' / '+LIST.filter(m=>m.genre===g).length+'</small></button>').join('');
 $('#dojo-tabs').querySelectorAll('[data-genre]').forEach(b=>b.onclick=()=>{genre=b.dataset.genre;try{localStorage.setItem('fretQuestDojoGenre',genre);}catch{}render();});
 el.innerHTML=[['solo','ソロ・アドリブ'],['comp','伴奏'],['line','ベースライン']].map(([kind,label])=>{const ms=list.filter(m=>m.kind===kind);return ms.length?'<div class="dojo-group"><h3>'+label+'</h3><div class="dojo-grid">'+ms.map(m=>{const st=status(m),done=st.every(Boolean);return '<button type="button" class="dojo-card'+(done?' mastered':'')+'" data-module="'+m.id+'"><span class="jam-genre">'+(done?'MASTERED':kind==='solo'?'SOLO':kind==='line'?'BASS':'COMP')+'</span><strong>'+m.title+'</strong><span class="jam-changes">'+m.tag+'</span><span class="dojo-pips">'+st.map((d,i)=>'<i class="'+(d?'on':'')+'" title="'+STEPS[i][1]+'"></i>').join('')+'</span></button>';}).join('')+'</div></div>':'';}).join('');
 el.querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>open(LIST.find(m=>m.id===b.dataset.module)));
}
window.addEventListener('fq:progress',render);
render();
window.FQDojo={modules:LIST,guitarModules:MODULES,bassModules:BASS_MODULES,open,status,chartFor};
})();

/* Play screens block text selection and the long-press menu, so fast taps on the screen fretboard cannot start a
   selection (iOS). Checks the CSS on the board and labels and that selectstart/contextmenu are cancelled; the lobby's
   tempo slider stays usable. Usage as stage-playthrough.cjs. Real iOS long-press behaviour needs a device. */
const { chromium } = require(process.env.PW||'playwright');
const BASE=process.env.BASE||'http://localhost:8765/fretquest/';
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:390,height:844}});let failed=0;
const errs=[];p.on('pageerror',e=>errs.push(e.message));const check=(n,ok,d)=>{if(!ok)failed++;console.log(ok?'ok  ':'FAIL',n,'=>',d);};
await p.goto(BASE,{waitUntil:'networkidle'});await p.evaluate(()=>window.FretQuest.ensureAudio());
await p.evaluate(()=>window.FQJam.lobby(window.FQJam.sessions.find(s=>s.id==='blues-a'),{air:true}));await p.click('[data-ch="1"]');await p.click('#jam-start');await p.waitForSelector('#jam-board .air-cell');
const r=await p.evaluate(()=>{const css=sel=>{const el=document.querySelector(sel);const cs=getComputedStyle(el);return [cs.userSelect||cs.webkitUserSelect,cs.webkitTouchCallout||'n/a'].join('/');};
 const legend=document.querySelector('.jam-legend span').firstChild||document.querySelector('.jam-legend span');
 const ev=t=>{const e=new Event(t,{bubbles:true,cancelable:true});(t==='selectstart'?legend:document.querySelector('#jam-board .air-cell')).dispatchEvent(e);return e.defaultPrevented;};
 return {board:css('#jam-board .air-cell'),legend:css('.jam-legend span'),selectstart:ev('selectstart'),contextmenu:ev('contextmenu')};});
check('play screen blocks selection and the long-press menu',r.board.startsWith('none')&&r.legend.startsWith('none')&&r.selectstart&&r.contextmenu,JSON.stringify(r));
await p.click('#jam-stop');await p.waitForSelector('.stage-result');await p.evaluate(()=>window.FretQuest.close());
/* Outside play screens, text stays selectable. */
const home=await p.evaluate(()=>{const e=new Event('selectstart',{bubbles:true,cancelable:true});document.querySelector('#today-title').dispatchEvent(e);return e.defaultPrevented;});
check('home text stays selectable',home===false,home);
if(errs.length){failed++;console.log(errs);}console.log(failed?failed+' failed':'all passed');await b.close();process.exit(failed?1:0);})();

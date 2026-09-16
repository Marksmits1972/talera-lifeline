export const FRESH_VERTEL_REV = 'fresh-vertel-v1-20260916';

const HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0f2747">
<title>TALERA — frisse vertelbouw</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,sans-serif;--ink:#0f2747;--cream:#f7f4ef;--muted:rgba(255,255,255,.72)}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#0f2747;overflow:hidden}body{-webkit-text-size-adjust:100%}button,input{font:inherit}.stage{position:relative;width:100%;height:100svh;overflow:hidden;background:linear-gradient(180deg,#607e91 0%,#3e6279 42%,#0f2747 100%);color:white}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none}.photo.show{display:block}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,24,39,.58) 0%,rgba(7,24,39,.10) 34%,rgba(7,24,39,.05) 58%,rgba(7,24,39,.72) 100%);pointer-events:none}.top{position:absolute;z-index:4;left:0;right:0;top:0;padding:max(26px,env(safe-area-inset-top)) 24px 0}.brand{font-size:14px;font-weight:900;letter-spacing:.24em}.title{appearance:none;width:min(90vw,560px);margin-top:13px;padding:0;border:0;outline:none;background:transparent;color:white;font-size:clamp(27px,7.4vw,36px);font-weight:820;line-height:1.05;letter-spacing:-.035em;text-shadow:0 2px 18px rgba(0,0,0,.24)}.title::placeholder{color:rgba(255,255,255,.88)}.date{position:relative;margin-top:17px;display:inline-flex;align-items:center;gap:9px;padding:11px 15px;border:1px solid rgba(255,255,255,.48);border-radius:999px;background:rgba(10,31,50,.20);font-weight:800;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}.date input{position:absolute;inset:0;width:100%;height:100%;opacity:0}.date svg{width:18px;height:18px}.add{position:absolute;z-index:5;right:24px;top:max(28px,env(safe-area-inset-top));min-width:92px;height:52px;border:1px solid rgba(255,255,255,.38);border-radius:999px;background:rgba(10,31,50,.25);color:white;font-weight:850;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}.add input{position:absolute;inset:0;width:100%;height:100%;opacity:0}.empty{position:absolute;z-index:3;left:28px;right:28px;top:200px;bottom:235px;display:grid;place-content:center;text-align:center}.empty.hide{display:none}.plus{position:relative;width:122px;height:122px;margin:0 auto 22px;border-radius:50%;display:grid;place-items:center;background:var(--cream);color:var(--ink);font-size:58px;font-weight:300}.plus input{position:absolute;inset:0;width:100%;height:100%;opacity:0}.empty h1{margin:0 auto;max-width:380px;font-size:28px;line-height:1.08;letter-spacing:-.03em}.empty p{margin:15px auto 0;max-width:330px;color:var(--muted);font-size:16px;line-height:1.45}.dots{position:absolute;z-index:5;left:50%;bottom:218px;transform:translateX(-50%);display:flex;gap:7px;padding:7px 10px;border-radius:999px;background:rgba(8,31,50,.28);backdrop-filter:blur(8px)}.dots:empty{display:none}.dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.44)}.dot.active{background:white;transform:scale(1.28)}.mic{position:absolute;z-index:6;left:50%;bottom:118px;transform:translateX(-50%);width:108px;height:108px;border:1px solid rgba(255,255,255,.62);border-radius:50%;background:rgba(247,244,239,.94);color:var(--ink);display:grid;place-items:center;box-shadow:0 18px 45px rgba(0,0,0,.18)}.mic svg{width:38px;height:38px}.micLabel{position:absolute;z-index:6;left:0;right:0;bottom:89px;text-align:center;font-size:14px;font-weight:820;text-shadow:0 2px 10px rgba(0,0,0,.28)}.sheet{position:absolute;z-index:7;left:0;right:0;bottom:0;height:94px;border-radius:28px 28px 0 0;background:var(--cream);color:var(--ink);padding:10px 22px 16px;box-shadow:0 -12px 40px rgba(0,0,0,.16)}.handle{width:64px;height:6px;border-radius:99px;background:#bdc5ce;margin:0 auto 12px}.sheetRow{display:flex;align-items:center;justify-content:space-between;gap:16px}.sheet strong{font-size:14px;color:#5b6c80}.preview{max-width:48vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#8a96a4;font-size:13px}.gesture{position:absolute;z-index:2;left:0;right:0;top:150px;bottom:210px;touch-action:none}@media(min-width:700px){.stage{max-width:520px;margin:0 auto;box-shadow:0 0 70px rgba(0,0,0,.28)}}
</style>
</head>
<body>
<main class="stage" id="stage">
  <img id="photo" class="photo" alt="Foto bij deze herinnering">
  <div class="shade"></div>
  <div id="gesture" class="gesture" aria-hidden="true"></div>
  <header class="top">
    <div class="brand">TALERA</div>
    <input id="title" class="title" maxlength="140" autocomplete="off" placeholder="Titel van deze herinnering" aria-label="Titel van deze herinnering">
    <label class="date"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg><span id="dateLabel">Wanneer was dit?</span><input id="dateInput" type="date" aria-label="Datum van deze herinnering"></label>
  </header>
  <label class="add">+ foto<input id="addInput" type="file" accept="image/*" multiple aria-label="Voeg foto's toe"></label>
  <section id="empty" class="empty">
    <label class="plus">+<input id="firstInput" type="file" accept="image/*" multiple aria-label="Kies foto's"></label>
    <h1>Kies een foto die je herinnering oproept</h1>
    <p>De foto wordt het hoofdbeeld. Daarna bouwen we de vertelactie er stap voor stap betrouwbaar omheen.</p>
  </section>
  <div id="dots" class="dots"></div>
  <button id="mic" class="mic" type="button" aria-label="Microfoon — volgt in de volgende bouwstap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3M9 21h6"></path></svg></button>
  <div class="micLabel">Vertel wat je herinnert</div>
  <div class="sheet"><div class="handle"></div><div class="sheetRow"><strong>Veeg omhoog voor je verhaal</strong><span class="preview">Transcript / tekst</span></div></div>
</main>
<script>
(()=>{
  'use strict';
  const state={photos:[],active:0};
  const photo=document.getElementById('photo');
  const empty=document.getElementById('empty');
  const dots=document.getElementById('dots');
  const firstInput=document.getElementById('firstInput');
  const addInput=document.getElementById('addInput');
  const dateInput=document.getElementById('dateInput');
  const dateLabel=document.getElementById('dateLabel');
  const gesture=document.getElementById('gesture');
  let start=null;
  function localToday(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function formatDate(v){if(!v)return'Wanneer was dit?';const p=v.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric'}).format(d)}
  function render(){
    empty.classList.toggle('hide',state.photos.length>0);
    if(state.photos.length){photo.src=state.photos[state.active].url;photo.classList.add('show')}else{photo.removeAttribute('src');photo.classList.remove('show')}
    dots.innerHTML='';state.photos.forEach((_,i)=>{const d=document.createElement('span');d.className='dot'+(i===state.active?' active':'');dots.appendChild(d)});
  }
  function addFiles(list){const files=[...list].filter(f=>f&&f.type&&f.type.startsWith('image/')).slice(0,12-state.photos.length);for(const file of files)state.photos.push({file,url:URL.createObjectURL(file)});if(files.length)state.active=Math.max(0,state.photos.length-files.length);firstInput.value='';addInput.value='';render()}
  function move(step){if(state.photos.length<2)return;state.active=(state.active+step+state.photos.length)%state.photos.length;render()}
  firstInput.addEventListener('change',()=>addFiles(firstInput.files));
  addInput.addEventListener('change',()=>addFiles(addInput.files));
  dateInput.max=localToday();dateInput.addEventListener('change',()=>{if(dateInput.value>localToday()){dateInput.value='';dateLabel.textContent='Wanneer was dit?';return}dateLabel.textContent=formatDate(dateInput.value)});
  gesture.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY,id:e.pointerId};try{gesture.setPointerCapture(e.pointerId)}catch{}});
  gesture.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.15)move(dx<0?1:-1)});
  gesture.addEventListener('pointercancel',()=>{start=null});
  window.addEventListener('pagehide',()=>state.photos.forEach(p=>{try{URL.revokeObjectURL(p.url)}catch{}}));
  render();
})();
</script>
</body>
</html>`;

export async function handleFreshVertelV1(request) {
  const url = new URL(request.url);
  if (url.pathname !== '/fresh' && url.pathname !== '/fresh/') return null;
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  return new Response(request.method === 'HEAD' ? null : HTML, {
    status: 200,
    headers: {
      'content-type':'text/html; charset=UTF-8',
      'cache-control':'no-store, max-age=0',
      'x-talera-fresh-vertel':FRESH_VERTEL_REV
    }
  });
}

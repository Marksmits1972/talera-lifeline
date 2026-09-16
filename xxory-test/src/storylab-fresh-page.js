export const STORYLAB_FRESH_PAGE_REV = 'storylab-fresh-visual-20260916-r1';

export const STORYLAB_FRESH_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0b2740">
<title>TALERA — Vertellen</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,sans-serif;--ink:#0d2b49;--cream:#f7f4ef;--glass:rgba(10,34,53,.22)}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b2740}body{-webkit-text-size-adjust:100%;color:#fff}.screen{position:relative;width:100%;height:100svh;min-height:100svh;overflow:hidden;background:linear-gradient(180deg,#56758a 0%,#486c84 35%,#173c58 68%,#09263e 100%)}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .24s ease}.photo.show{opacity:1}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,23,38,.28) 0%,rgba(4,23,38,.05) 43%,rgba(4,23,38,.04) 58%,rgba(5,24,39,.44) 100%);pointer-events:none}.photo.show+.shade{background:linear-gradient(180deg,rgba(4,23,38,.42) 0%,rgba(4,23,38,.05) 40%,rgba(4,23,38,.02) 62%,rgba(5,24,39,.50) 100%)}.top{position:absolute;z-index:5;left:24px;right:24px;top:max(31px,env(safe-area-inset-top));display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start}.brand{font-size:13px;font-weight:900;letter-spacing:.28em;text-shadow:0 2px 14px rgba(0,0,0,.20)}.title{display:block;width:min(86vw,520px);margin:13px 0 0;padding:0;border:0;outline:0;background:transparent;color:#fff;font-size:clamp(24px,6.1vw,31px);font-weight:820;letter-spacing:-.035em;line-height:1.05;text-shadow:0 2px 18px rgba(0,0,0,.22)}.title::placeholder{color:rgba(255,255,255,.92);opacity:1}.date{margin-top:17px;display:inline-flex;align-items:center;gap:10px;min-height:51px;padding:0 16px;border:1px solid rgba(255,255,255,.45);border-radius:999px;background:rgba(10,34,53,.14);color:#fff;font-weight:820;backdrop-filter:blur(11px);-webkit-backdrop-filter:blur(11px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.03)}.date svg{width:19px;height:19px;flex:0 0 auto}.photoButton{position:relative;min-height:56px;padding:0 19px;border:1px solid rgba(255,255,255,.42);border-radius:999px;background:rgba(10,34,53,.13);color:#fff;font-size:16px;font-weight:860;backdrop-filter:blur(11px);-webkit-backdrop-filter:blur(11px);overflow:hidden}.photoButton input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.empty{position:absolute;z-index:3;left:32px;right:32px;top:39%;transform:translateY(-10%);text-align:center}.empty.hidden{display:none}.plus{width:126px;height:126px;margin:0 auto 26px;border-radius:50%;display:grid;place-items:center;background:rgba(250,248,244,.98);color:var(--ink);font-size:58px;font-weight:300;line-height:1;box-shadow:0 16px 44px rgba(0,0,0,.09)}.empty h1{margin:0 auto;max-width:370px;font-size:28px;font-weight:850;line-height:1.08;letter-spacing:-.036em}.empty p{margin:20px auto 0;max-width:345px;color:rgba(255,255,255,.70);font-size:16px;line-height:1.42;font-weight:560}.micZone{position:absolute;z-index:7;left:0;right:0;bottom:112px;text-align:center;pointer-events:none}.micHalo{display:inline-grid;place-items:center;width:168px;height:168px;border-radius:50%;background:rgba(173,206,229,.13);box-shadow:0 0 0 1px rgba(255,255,255,.02);pointer-events:auto}.micRing{display:grid;place-items:center;width:136px;height:136px;border-radius:50%;background:rgba(123,166,198,.30);box-shadow:inset 0 0 0 2px rgba(225,238,248,.28)}.mic{display:grid;place-items:center;width:112px;height:112px;border:1px solid rgba(255,255,255,.56);border-radius:50%;background:#3f79a7;color:#fff;box-shadow:0 13px 34px rgba(4,20,32,.20),inset 0 0 0 1px rgba(255,255,255,.13)}.mic svg{width:39px;height:39px}.micLabel{margin-top:3px;font-size:14px;font-weight:820;color:rgba(255,255,255,.88);text-shadow:0 2px 10px rgba(0,0,0,.25)}.sheet{position:absolute;z-index:8;left:0;right:0;bottom:0;height:95px;border-radius:30px 30px 0 0;background:var(--cream);color:#60738a;box-shadow:0 -12px 34px rgba(0,0,0,.13)}.handle{width:65px;height:6px;border-radius:999px;background:#bec6cf;margin:12px auto 14px}.sheetText{padding:0 23px;font-size:14px;font-weight:820;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dateOverlay{position:fixed;z-index:20;inset:0;display:none;align-items:flex-end;background:rgba(3,16,27,.28);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}.dateOverlay.open{display:flex}.dateCard{width:100%;padding:18px 18px calc(18px + env(safe-area-inset-bottom));border-radius:28px 28px 0 0;background:#fffdfa;color:var(--ink);box-shadow:0 -20px 60px rgba(0,0,0,.22)}.dateCard h2{margin:0;font-size:23px;letter-spacing:-.03em}.dateCard p{margin:6px 0 16px;color:#708091;font-size:13px}.wheels{display:grid;grid-template-columns:.8fr 1.35fr 1fr;gap:8px}.wheel{height:162px;overflow-y:auto;padding:58px 0;border-radius:18px;background:#f0f3f6;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch}.wheel button{display:block;width:100%;height:46px;border:0;background:transparent;color:#87929d;font-size:18px;font-weight:720;scroll-snap-align:center}.wheel button.active{color:var(--ink);font-size:21px;font-weight:850}.dateActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.dateActions button{min-height:50px;border:0;border-radius:16px;font-weight:830}.cancel{background:#eef1f4;color:#697786}.use{background:var(--ink);color:#fff}@media(min-width:700px){.screen{max-width:520px;margin:0 auto;box-shadow:0 0 70px rgba(0,0,0,.25)}.dateCard{max-width:520px;margin:0 auto}}
</style>
</head>
<body>
<main class="screen">
  <img id="photo" class="photo" alt="Foto bij deze herinnering">
  <div class="shade"></div>
  <header class="top">
    <div>
      <div class="brand">TALERA</div>
      <input id="title" class="title" type="text" maxlength="140" autocomplete="off" placeholder="Titel van deze herinnering" aria-label="Titel van deze herinnering">
      <button id="dateButton" class="date" type="button" aria-label="Kies datum"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg><span id="dateText">Wanneer was dit?</span></button>
    </div>
    <label class="photoButton">+ foto<input id="photoInput" type="file" accept="image/*" aria-label="Kies een foto"></label>
  </header>

  <section id="empty" class="empty">
    <div class="plus">+</div>
    <h1>Kies een foto die je herinnering oproept</h1>
    <p>Daarna kun je gewoon naar de foto kijken en je verhaal vertellen.</p>
  </section>

  <section class="micZone">
    <div class="micHalo"><div class="micRing"><button class="mic" type="button" aria-label="Microfoon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3M9 21h6"></path></svg></button></div></div>
    <div class="micLabel">Je vertelt nu · swipe gerust door je foto’s</div>
  </section>

  <section class="sheet"><div class="handle"></div><div class="sheetText">Veeg omlaag om terug te gaan naar je foto</div></section>
</main>

<div id="dateOverlay" class="dateOverlay" role="dialog" aria-modal="true" aria-label="Datum kiezen">
  <section class="dateCard">
    <h2>Wanneer was dit?</h2><p>Kies dag, maand en jaar.</p>
    <div class="wheels"><div id="dayWheel" class="wheel"></div><div id="monthWheel" class="wheel"></div><div id="yearWheel" class="wheel"></div></div>
    <div class="dateActions"><button id="cancelDate" class="cancel" type="button">Annuleren</button><button id="useDate" class="use" type="button">Gebruik deze datum</button></div>
  </section>
</div>
<script>
(()=>{
  const photo=document.getElementById('photo');
  const empty=document.getElementById('empty');
  const input=document.getElementById('photoInput');
  const overlay=document.getElementById('dateOverlay');
  const dateText=document.getElementById('dateText');
  const months=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  const now=new Date();
  let objectUrl='';
  let chosen={day:now.getDate(),month:now.getMonth(),year:now.getFullYear()};
  input.addEventListener('change',()=>{const file=input.files&&input.files[0];if(!file)return;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);photo.src=objectUrl;photo.classList.add('show');empty.classList.add('hidden');});
  function fill(id,items,current){const el=document.getElementById(id);el.innerHTML='';items.forEach(item=>{const b=document.createElement('button');b.type='button';b.textContent=item.label;b.dataset.value=String(item.value);if(item.value===current)b.className='active';b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(id==='dayWheel')chosen.day=Number(item.value);if(id==='monthWheel')chosen.month=Number(item.value);if(id==='yearWheel')chosen.year=Number(item.value);});el.appendChild(b)});setTimeout(()=>{const a=el.querySelector('.active');if(a)a.scrollIntoView({block:'center'});},20)}
  function openDate(){fill('dayWheel',Array.from({length:31},(_,i)=>({label:String(i+1),value:i+1})),chosen.day);fill('monthWheel',months.map((m,i)=>({label:m,value:i})),chosen.month);fill('yearWheel',Array.from({length:127},(_,i)=>({label:String(now.getFullYear()-i),value:now.getFullYear()-i})),chosen.year);overlay.classList.add('open')}
  document.getElementById('dateButton').addEventListener('click',openDate);
  document.getElementById('cancelDate').addEventListener('click',()=>overlay.classList.remove('open'));
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('open')});
  document.getElementById('useDate').addEventListener('click',()=>{dateText.textContent=chosen.day+' '+months[chosen.month]+' '+chosen.year;overlay.classList.remove('open')});
  window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl)});
})();
</script>
</body>
</html>`;

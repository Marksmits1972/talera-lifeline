export const STORYLAB_PAGE_REV = 'storylab-screenshot-lock-20260916-r2';

export const STORYLAB_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0b2740">
<title>TALERA — Vertellen</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,sans-serif;--ink:#0f2747;--cream:#f7f4ef;--blue:#2f6f9f;--muted:rgba(255,255,255,.72)}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b2740}body{-webkit-text-size-adjust:100%;color:#fff}.stage{position:relative;width:100%;height:100svh;min-height:100svh;overflow:hidden;background:linear-gradient(180deg,#58788d 0%,#416982 40%,#0b2740 100%)}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .24s ease}.photo.show{opacity:1}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,24,40,.38) 0%,rgba(5,24,40,.10) 35%,rgba(5,24,40,.03) 60%,rgba(5,24,40,.72) 100%);pointer-events:none}.top{position:absolute;z-index:5;left:25px;right:25px;top:max(34px,env(safe-area-inset-top));display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start}.brand{font-size:13px;font-weight:900;letter-spacing:.23em}.title{display:block;width:min(86vw,520px);margin-top:12px;padding:0;border:0;outline:0;background:transparent;color:#fff;font-size:clamp(27px,7vw,34px);font-weight:820;line-height:1.05;letter-spacing:-.038em;text-shadow:0 2px 18px rgba(0,0,0,.25)}.title::placeholder{color:rgba(255,255,255,.88);opacity:1}.datePill{display:inline-flex;align-items:center;gap:9px;margin-top:16px;min-height:50px;padding:0 16px;border:1px solid rgba(255,255,255,.44);border-radius:999px;background:rgba(8,31,50,.19);color:#fff;font-weight:800;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}.datePill svg{width:19px;height:19px}.addPhoto{position:relative;min-height:70px;min-width:108px;padding:0 18px;border:1px solid rgba(255,255,255,.42);border-radius:999px;background:rgba(8,31,50,.18);color:#fff;font-size:18px;font-weight:850;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow:hidden;display:grid;place-items:center}.addPhoto input{position:absolute;inset:0;width:100%;height:100%;opacity:0}.empty{position:absolute;z-index:3;left:24px;right:24px;top:32%;text-align:center}.empty.hide{display:none}.emptyPlus{position:relative;width:128px;height:128px;margin:0 auto 23px;border-radius:50%;display:grid;place-items:center;background:rgba(248,245,239,.97);color:var(--ink);font-size:58px;font-weight:280;box-shadow:0 18px 46px rgba(0,0,0,.14)}.empty h1{margin:0 auto;max-width:370px;font-size:29px;line-height:1.08;letter-spacing:-.034em}.empty p{margin:16px auto 0;max-width:350px;color:rgba(255,255,255,.70);font-size:16px;line-height:1.42}.micZone{position:absolute;z-index:7;left:0;right:0;bottom:121px;text-align:center;pointer-events:none}.micHalo{display:inline-grid;place-items:center;width:168px;height:168px;border-radius:50%;background:rgba(255,255,255,.09);box-shadow:0 0 0 11px rgba(255,255,255,.06)}.mic{pointer-events:auto;width:136px;height:136px;border:1px solid rgba(255,255,255,.56);border-radius:50%;background:rgba(47,111,159,.97);color:#fff;display:grid;place-items:center;box-shadow:0 14px 34px rgba(0,0,0,.22),inset 0 0 0 1px rgba(255,255,255,.22)}.mic svg{width:39px;height:39px}.micLabel{margin-top:16px;font-size:15px;font-weight:820;text-shadow:0 2px 10px rgba(0,0,0,.30)}.sheet{position:absolute;z-index:9;left:0;right:0;bottom:0;height:96px;background:var(--cream);color:var(--ink);border-radius:29px 29px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.17)}.handle{width:66px;height:6px;border-radius:99px;background:#c3cad2;margin:12px auto 13px}.sheetText{padding:0 23px;font-size:15px;font-weight:850;color:#5c6f84;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dateOverlay{position:fixed;z-index:20;inset:0;display:none;align-items:flex-end;background:rgba(5,17,28,.30);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}.dateOverlay.open{display:flex}.dateCard{width:100%;background:#fffdfa;color:var(--ink);border-radius:30px 30px 0 0;padding:18px 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -18px 60px rgba(0,0,0,.24)}.dateHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.dateCard h2{margin:0;font-size:23px;letter-spacing:-.03em}.dateCard p{margin:5px 0 0;color:#718090;font-size:13px}.dateClose{border:0;border-radius:999px;background:#eef1f4;color:#5f6f80;font-weight:850;min-width:44px;height:44px}.wheelFrame{position:relative;margin-top:16px;border-radius:22px;background:#f0f3f6;overflow:hidden}.wheelFrame:before{content:"";position:absolute;z-index:2;left:10px;right:10px;top:50%;height:48px;transform:translateY(-50%);border-radius:14px;background:#fff;box-shadow:0 1px 0 rgba(15,39,71,.05),0 5px 18px rgba(15,39,71,.06);pointer-events:none}.wheels{position:relative;z-index:3;display:grid;grid-template-columns:.8fr 1.35fr 1fr;gap:4px}.wheel{height:174px;overflow:auto;scroll-snap-type:y mandatory;padding:63px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none}.wheel::-webkit-scrollbar{display:none}.wheel button{display:block;width:100%;height:48px;border:0;background:transparent;color:#8994a0;font-size:18px;font-weight:700;scroll-snap-align:center}.wheel button.active{color:var(--ink);font-size:21px;font-weight:850}.dateActions{display:grid;grid-template-columns:1fr 1.25fr;gap:10px;margin-top:14px}.dateActions button{min-height:52px;border:0;border-radius:17px;font-weight:830}.cancel{background:#eef1f4;color:#667485}.use{background:var(--ink);color:#fff}@media(min-width:700px){.stage{max-width:520px;margin:0 auto;box-shadow:0 0 70px rgba(0,0,0,.28)}.dateCard{max-width:520px;margin:0 auto}}
</style>
</head>
<body>
<main class="stage">
  <img id="photo" class="photo" alt="Foto bij deze herinnering">
  <div class="shade"></div>

  <header class="top">
    <div>
      <div class="brand">TALERA</div>
      <input id="title" class="title" maxlength="140" placeholder="Titel van deze herinnering" aria-label="Titel van deze herinnering">
      <button id="dateButton" class="datePill" type="button" aria-label="Kies datum"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg><span id="dateText">Wanneer was dit?</span></button>
    </div>
    <label class="addPhoto">+ foto<input id="photoInput" type="file" accept="image/*" aria-label="Kies een foto"></label>
  </header>

  <section id="empty" class="empty">
    <div class="emptyPlus">+</div>
    <h1>Kies een foto die je herinnering oproept</h1>
    <p>Daarna kun je gewoon naar de foto kijken en je verhaal vertellen.</p>
  </section>

  <section class="micZone">
    <div class="micHalo"><button class="mic" type="button" aria-label="Microfoon — visuele basis"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3M9 21h6"></path></svg></button></div>
    <div class="micLabel">Je vertelt nu · swipe gerust door je foto’s</div>
  </section>

  <section class="sheet" aria-label="Tekstlaag"><div class="handle"></div><div class="sheetText">Veeg omhoog voor je verhaal</div></section>
</main>

<div id="dateOverlay" class="dateOverlay" role="dialog" aria-modal="true" aria-label="Datum kiezen">
  <section class="dateCard">
    <div class="dateHead"><div><h2>Wanneer was dit?</h2><p>Kies dag, maand en jaar.</p></div><button id="closeDate" class="dateClose" type="button" aria-label="Sluiten">×</button></div>
    <div class="wheelFrame"><div class="wheels"><div id="dayWheel" class="wheel"></div><div id="monthWheel" class="wheel"></div><div id="yearWheel" class="wheel"></div></div></div>
    <div class="dateActions"><button id="cancelDate" class="cancel" type="button">Annuleren</button><button id="useDate" class="use" type="button">Gebruik deze datum</button></div>
  </section>
</div>

<script>
(()=>{
  const photo=document.getElementById('photo');
  const empty=document.getElementById('empty');
  const photoInput=document.getElementById('photoInput');
  const dateOverlay=document.getElementById('dateOverlay');
  const dateText=document.getElementById('dateText');
  const now=new Date();
  let objectUrl='';
  let chosen={day:now.getDate(),month:now.getMonth(),year:now.getFullYear()};
  photoInput.addEventListener('change',()=>{const file=photoInput.files&&photoInput.files[0];if(!file)return;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);photo.src=objectUrl;photo.classList.add('show');empty.classList.add('hide');});
  const months=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  function fill(id,items,selected){const el=document.getElementById(id);el.innerHTML='';items.forEach(item=>{const b=document.createElement('button');b.type='button';b.textContent=item.label;b.dataset.value=item.value;b.className=item.value===selected?'active':'';b.onclick=()=>{el.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(id==='dayWheel')chosen.day=Number(item.value);if(id==='monthWheel')chosen.month=Number(item.value);if(id==='yearWheel')chosen.year=Number(item.value);};el.appendChild(b);});requestAnimationFrame(()=>{const a=el.querySelector('.active');if(a)a.scrollIntoView({block:'center'});});}
  function openDate(){fill('dayWheel',Array.from({length:31},(_,i)=>({label:String(i+1),value:i+1})),chosen.day);fill('monthWheel',months.map((m,i)=>({label:m,value:i})),chosen.month);fill('yearWheel',Array.from({length:126},(_,i)=>({label:String(now.getFullYear()-i),value:now.getFullYear()-i})),chosen.year);dateOverlay.classList.add('open');}
  document.getElementById('dateButton').onclick=openDate;
  document.getElementById('closeDate').onclick=()=>dateOverlay.classList.remove('open');
  document.getElementById('cancelDate').onclick=()=>dateOverlay.classList.remove('open');
  dateOverlay.addEventListener('click',e=>{if(e.target===dateOverlay)dateOverlay.classList.remove('open');});
  document.getElementById('useDate').onclick=()=>{const candidate=new Date(chosen.year,chosen.month,chosen.day,12);if(candidate>now){chosen={day:now.getDate(),month:now.getMonth(),year:now.getFullYear()};dateText.textContent=now.getDate()+' '+months[now.getMonth()]+' '+now.getFullYear();}else{dateText.textContent=chosen.day+' '+months[chosen.month]+' '+chosen.year;}dateOverlay.classList.remove('open');};
  window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);});
})();
</script>
</body>
</html>`;

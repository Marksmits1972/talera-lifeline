export const STORYLAB_PAGE_REV = 'storylab-visual-shell-20260916-r1';

export const STORYLAB_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0b2740">
<title>TALERA — Story Lab</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,sans-serif;--ink:#0f2747;--cream:#f8f5ef;--glass:rgba(8,31,50,.34)}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b2740}body{-webkit-text-size-adjust:100%;color:#fff}.stage{position:relative;width:100%;height:100svh;overflow:hidden;background:linear-gradient(180deg,#58758a 0%,#3f627a 43%,#0b2740 100%)}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .28s ease}.photo.show{opacity:1}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,20,33,.56) 0%,rgba(4,20,33,.13) 34%,rgba(4,20,33,.04) 58%,rgba(4,20,33,.72) 100%);pointer-events:none}.top{position:absolute;z-index:5;left:24px;right:24px;top:max(28px,env(safe-area-inset-top));display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start}.brand{font-size:14px;font-weight:900;letter-spacing:.23em}.title{display:block;margin-top:12px;width:min(86vw,520px);border:0;outline:0;background:transparent;color:#fff;font-size:clamp(25px,7.4vw,35px);font-weight:820;line-height:1.04;letter-spacing:-.04em;text-shadow:0 2px 18px rgba(0,0,0,.26)}.title::placeholder{color:rgba(255,255,255,.88);opacity:1}.datePill{display:inline-flex;align-items:center;gap:9px;margin-top:16px;padding:11px 15px;border:1px solid rgba(255,255,255,.44);border-radius:999px;background:rgba(8,31,50,.20);color:#fff;font-weight:780;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}.datePill svg{width:18px;height:18px}.addPhoto{position:relative;min-height:46px;padding:0 17px;border:1px solid rgba(255,255,255,.42);border-radius:999px;background:rgba(8,31,50,.25);color:#fff;font-weight:850;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow:hidden}.addPhoto input{position:absolute;inset:0;width:100%;height:100%;opacity:0}.empty{position:absolute;z-index:3;left:28px;right:28px;top:29%;text-align:center}.empty.hide{display:none}.emptyPlus{width:126px;height:126px;margin:0 auto 22px;border-radius:50%;display:grid;place-items:center;background:rgba(248,245,239,.96);color:var(--ink);font-size:58px;font-weight:280;box-shadow:0 18px 46px rgba(0,0,0,.16)}.empty h1{margin:0 auto;max-width:360px;font-size:28px;line-height:1.08;letter-spacing:-.035em}.empty p{margin:14px auto 0;max-width:335px;color:rgba(255,255,255,.70);font-size:16px;line-height:1.42}.micZone{position:absolute;z-index:6;left:0;right:0;bottom:125px;text-align:center;pointer-events:none}.mic{pointer-events:auto;width:108px;height:108px;border:1px solid rgba(255,255,255,.62);border-radius:50%;background:rgba(248,245,239,.96);color:var(--ink);display:inline-grid;place-items:center;box-shadow:0 16px 44px rgba(0,0,0,.18)}.mic svg{width:37px;height:37px}.micLabel{margin-top:11px;font-size:14px;font-weight:820;text-shadow:0 2px 10px rgba(0,0,0,.30)}.sheet{position:absolute;z-index:8;left:0;right:0;bottom:0;height:92px;background:var(--cream);color:var(--ink);border-radius:28px 28px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.17)}.handle{width:66px;height:6px;border-radius:99px;background:#c3cad2;margin:11px auto 10px}.sheetRow{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 22px}.sheetTitle{font-size:14px;font-weight:850;color:#5b6d82}.sheetPreview{max-width:46vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#8b96a3;font-size:13px}.dateOverlay{position:fixed;z-index:20;inset:0;display:none;align-items:flex-end;background:rgba(5,17,28,.32);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}.dateOverlay.open{display:flex}.dateCard{width:100%;background:#fffdfa;color:var(--ink);border-radius:28px 28px 0 0;padding:18px 20px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -18px 60px rgba(0,0,0,.24)}.dateCard h2{margin:0 0 5px;font-size:23px;letter-spacing:-.03em}.dateCard p{margin:0 0 18px;color:#718090;font-size:13px}.wheels{display:grid;grid-template-columns:1fr 1.35fr 1.15fr;gap:8px}.wheel{height:154px;overflow:auto;scroll-snap-type:y mandatory;border-radius:18px;background:#f0f3f6;padding:54px 0}.wheel button{display:block;width:100%;height:46px;border:0;background:transparent;color:#73808d;font-size:18px;font-weight:720;scroll-snap-align:center}.wheel button.active{color:var(--ink);font-size:21px;font-weight:850}.dateActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.dateActions button{min-height:50px;border:0;border-radius:16px;font-weight:820}.cancel{background:#eef1f4;color:#667485}.use{background:var(--ink);color:#fff}.phaseTag{position:absolute;z-index:10;left:14px;top:max(8px,env(safe-area-inset-top));padding:5px 8px;border-radius:999px;background:rgba(0,0,0,.28);font-size:9px;letter-spacing:.08em;font-weight:800;color:rgba(255,255,255,.76);pointer-events:none}
@media(min-width:700px){.stage{max-width:520px;margin:0 auto;box-shadow:0 0 70px rgba(0,0,0,.28)}.dateCard{max-width:520px;margin:0 auto}}
</style>
</head>
<body>
<main class="stage">
  <img id="photo" class="photo" alt="Voorbeeld van je herinneringsfoto">
  <div class="shade"></div>
  <div class="phaseTag">STORY LAB · VISUELE BASIS</div>
  <header class="top">
    <div>
      <div class="brand">TALERA</div>
      <input id="title" class="title" maxlength="140" placeholder="Titel van deze herinnering" aria-label="Titel van deze herinnering">
      <button id="dateButton" class="datePill" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg><span id="dateText">Wanneer was dit?</span></button>
    </div>
    <label class="addPhoto">+ foto<input id="photoInput" type="file" accept="image/*" aria-label="Kies een foto"></label>
  </header>

  <section id="empty" class="empty">
    <div class="emptyPlus">+</div>
    <h1>Kies een foto die je herinnering oproept</h1>
    <p>De foto wordt straks het hoofdbeeld terwijl jij je verhaal vertelt.</p>
  </section>

  <section class="micZone">
    <button class="mic" type="button" aria-label="Microfoon — in deze stap alleen visueel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3M9 21h6"></path></svg></button>
    <div class="micLabel">Vertel wat je herinnert</div>
  </section>

  <section class="sheet" aria-label="Voorbeeld van tekstlaag"><div class="handle"></div><div class="sheetRow"><span class="sheetTitle">Veeg omhoog voor je verhaal</span><span class="sheetPreview">Je tekst verschijnt hier straks…</span></div></section>
</main>

<div id="dateOverlay" class="dateOverlay" role="dialog" aria-modal="true" aria-label="Datum kiezen">
  <section class="dateCard">
    <h2>Wanneer was dit?</h2><p>Kies rustig dag, maand en jaar. Toekomstige datums komen later niet door de validatie.</p>
    <div class="wheels"><div id="dayWheel" class="wheel"></div><div id="monthWheel" class="wheel"></div><div id="yearWheel" class="wheel"></div></div>
    <div class="dateActions"><button id="cancelDate" class="cancel" type="button">Annuleren</button><button id="useDate" class="use" type="button">Gebruik deze datum</button></div>
  </section>
</div>

<script>
(()=>{
  const photo=document.getElementById('photo');
  const empty=document.getElementById('empty');
  const photoInput=document.getElementById('photoInput');
  const dateOverlay=document.getElementById('dateOverlay');
  const dateButton=document.getElementById('dateButton');
  const dateText=document.getElementById('dateText');
  let objectUrl='';
  let chosen={day:new Date().getDate(),month:new Date().getMonth(),year:new Date().getFullYear()};
  photoInput.addEventListener('change',()=>{
    const file=photoInput.files&&photoInput.files[0];if(!file)return;
    if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);photo.src=objectUrl;photo.classList.add('show');empty.classList.add('hide');
  });
  const months=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  function fill(id,items,selected){const el=document.getElementById(id);el.innerHTML='';items.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.textContent=item.label;b.dataset.value=item.value;b.className=item.value===selected?'active':'';b.onclick=()=>{el.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(id==='dayWheel')chosen.day=Number(item.value);if(id==='monthWheel')chosen.month=Number(item.value);if(id==='yearWheel')chosen.year=Number(item.value);};el.appendChild(b);});setTimeout(()=>{const a=el.querySelector('.active');if(a)a.scrollIntoView({block:'center'});},20);}
  function openDate(){const now=new Date();fill('dayWheel',Array.from({length:31},(_,i)=>({label:String(i+1),value:i+1})),chosen.day);fill('monthWheel',months.map((m,i)=>({label:m,value:i})),chosen.month);fill('yearWheel',Array.from({length:127},(_,i)=>({label:String(now.getFullYear()-i),value:now.getFullYear()-i})),chosen.year);dateOverlay.classList.add('open');}
  dateButton.onclick=openDate;document.getElementById('cancelDate').onclick=()=>dateOverlay.classList.remove('open');dateOverlay.addEventListener('click',e=>{if(e.target===dateOverlay)dateOverlay.classList.remove('open');});
  document.getElementById('useDate').onclick=()=>{dateText.textContent=chosen.day+' '+months[chosen.month]+' '+chosen.year;dateOverlay.classList.remove('open');};
  window.addEventListener('pagehide',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);});
})();
</script>
</body>
</html>`;

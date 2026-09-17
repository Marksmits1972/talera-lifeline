export const STORYLAB_CLEAN_PAGE_REVISION = 'storylab-clean-reference-20260917-r7';

export const STORYLAB_CLEAN_PAGE_HTML = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="theme-color" content="#0b2740" />
<title>TALERA — Vertelpagina</title>
<style>
:root{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",system-ui,sans-serif;
  --ink:#0d2b49;
  --cream:#f7f4ef;
  --sheet-text:#60738a;
}
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b2740}
body{-webkit-text-size-adjust:100%;color:#fff;-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
.screen{
  position:relative;
  width:100%;
  height:100dvh;
  min-height:100dvh;
  overflow:hidden;
  background:linear-gradient(180deg,#5f7f95 0%,#507389 33%,#24506a 63%,#0d3048 100%);
}
.shade{
  position:absolute;
  inset:0;
  pointer-events:none;
  background:linear-gradient(180deg,rgba(4,23,38,.045) 0%,rgba(4,23,38,0) 46%,rgba(4,23,38,.02) 62%,rgba(5,24,39,.13) 100%);
}
.top{
  position:absolute;
  z-index:3;
  left:5.8vw;
  right:5.8vw;
  top:3.2dvh;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:12px;
  align-items:start;
}
.brand{
  margin:0;
  font-size:clamp(11px,3.2vw,13px);
  line-height:1;
  font-weight:900;
  letter-spacing:.28em;
  color:rgba(255,255,255,.94);
}
.title{
  margin:12px 0 0;
  max-width:58vw;
  font-size:clamp(25px,7.3vw,30px);
  line-height:1.03;
  font-weight:820;
  letter-spacing:-.038em;
  color:#fff;
}
.date{
  margin-top:15px;
  min-height:40px;
  padding:0 14px;
  border:1px solid rgba(255,255,255,.38);
  border-radius:999px;
  background:rgba(10,34,53,.075);
  display:inline-flex;
  align-items:center;
  gap:9px;
  font-size:clamp(14px,4vw,16px);
  line-height:1;
  font-weight:800;
}
.date svg{width:18px;height:18px;flex:0 0 auto}
.photo-button{
  min-height:45px;
  padding:0 17px;
  border:1px solid rgba(255,255,255,.37);
  border-radius:999px;
  background:rgba(10,34,53,.075);
  font-size:clamp(14px,4vw,16px);
  line-height:1;
  font-weight:850;
  white-space:nowrap;
}
.empty{
  position:absolute;
  z-index:2;
  left:6vw;
  right:6vw;
  top:25.5dvh;
  text-align:center;
}
.plus{
  width:27vw;
  max-width:108px;
  aspect-ratio:1;
  margin:0 auto 21px;
  border:0;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:rgba(250,248,244,.98);
  color:var(--ink);
  font-size:clamp(48px,14vw,58px);
  line-height:1;
  font-weight:300;
  box-shadow:0 10px 28px rgba(0,0,0,.055);
}
.empty h2{
  margin:0 auto;
  max-width:82vw;
  font-size:clamp(24px,7vw,28px);
  line-height:1.08;
  font-weight:850;
  letter-spacing:-.038em;
  text-wrap:balance;
}
.empty p{
  margin:17px auto 0;
  max-width:79vw;
  color:rgba(255,255,255,.66);
  font-size:clamp(14px,4.15vw,16px);
  line-height:1.4;
  font-weight:540;
  text-wrap:balance;
}
.mic-zone{
  position:absolute;
  z-index:4;
  left:0;
  right:0;
  top:67dvh;
  text-align:center;
}
.mic-halo{
  display:inline-grid;
  place-items:center;
  width:21vw;
  max-width:84px;
  aspect-ratio:1;
  border-radius:50%;
  background:rgba(173,206,229,.12);
}
.mic-ring{
  display:grid;
  place-items:center;
  width:17.5vw;
  max-width:70px;
  aspect-ratio:1;
  border-radius:50%;
  background:rgba(123,166,198,.25);
  box-shadow:inset 0 0 0 1.25px rgba(225,238,248,.34);
}
.mic{
  width:15vw;
  max-width:60px;
  aspect-ratio:1;
  border:1px solid rgba(255,255,255,.57);
  border-radius:50%;
  background:#4682b2;
  color:#fff;
  display:grid;
  place-items:center;
  box-shadow:0 7px 18px rgba(4,20,32,.13),inset 0 0 0 1px rgba(255,255,255,.10);
}
.mic svg{width:43%;height:43%}
.mic-label{
  margin-top:11px;
  font-size:clamp(11.5px,3.35vw,14px);
  line-height:1.2;
  font-weight:790;
  color:rgba(255,255,255,.80);
}
.sheet{
  position:absolute;
  z-index:5;
  left:0;
  right:0;
  bottom:0;
  height:14dvh;
  min-height:76px;
  border-radius:29px 29px 0 0;
  background:var(--cream);
  color:var(--sheet-text);
  box-shadow:0 -7px 22px rgba(0,0,0,.065);
}
.handle{
  width:58px;
  height:5px;
  margin:11px auto 18px;
  border-radius:999px;
  background:#c5cbd1;
}
.sheet-text{
  padding:0 5.8vw;
  font-size:clamp(13px,3.7vw,15px);
  line-height:1.3;
  font-weight:790;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
@media(max-width:360px){
  .top{left:5vw;right:5vw}
  .title{max-width:61vw}
  .date{padding:0 12px;gap:8px}
  .photo-button{padding:0 15px}
}
@media(min-width:700px){
  body{background:#082238}
  .screen{max-width:520px;margin:0 auto;box-shadow:0 0 70px rgba(0,0,0,.25)}
}
</style>
</head>
<body>
<main class="screen" data-revision="${STORYLAB_CLEAN_PAGE_REVISION}">
  <div class="shade"></div>
  <header class="top">
    <div>
      <p class="brand">TALERA</p>
      <h1 class="title">Titel van deze herinnering</h1>
      <button class="date" type="button" aria-label="Wanneer was dit?">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2"></rect>
          <path d="M16 3v4M8 3v4M3 10h18"></path>
        </svg>
        <span>Wanneer was dit?</span>
      </button>
    </div>
    <button class="photo-button" type="button">+ foto</button>
  </header>
  <section class="empty" aria-label="Foto kiezen">
    <button class="plus" type="button" aria-label="Kies een foto">+</button>
    <h2>Kies een foto die je herinnering oproept</h2>
    <p>Daarna kun je gewoon naar de foto kijken en je verhaal vertellen.</p>
  </section>
  <section class="mic-zone" aria-label="Vertellen">
    <div class="mic-halo">
      <div class="mic-ring">
        <button class="mic" type="button" aria-label="Microfoon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3"></rect>
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"></path>
          </svg>
        </button>
      </div>
    </div>
    <div class="mic-label">Je vertelt nu · swipe gerust door je foto’s</div>
  </section>
  <section class="sheet" aria-label="Verhaaltekst">
    <div class="handle"></div>
    <div class="sheet-text">Veeg omlaag om terug te gaan naar je foto</div>
  </section>
</main>
</body>
</html>`;

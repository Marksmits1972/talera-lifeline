export const STORYLAB_CLEAN_PAGE_REVISION = 'storylab-clean-reference-20260917-r6';

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
button{font:inherit;color:inherit}
.screen{
  position:relative;
  width:100%;
  height:100dvh;
  min-height:100dvh;
  overflow:hidden;
  background:linear-gradient(180deg,#5b7b91 0%,#4c7087 34%,#1b4561 66%,#0b2c45 100%);
}
.shade{
  position:absolute;
  inset:0;
  pointer-events:none;
  background:linear-gradient(180deg,rgba(4,23,38,.08) 0%,rgba(4,23,38,.015) 43%,rgba(4,23,38,.015) 60%,rgba(5,24,39,.18) 100%);
}
.top{
  position:absolute;
  z-index:3;
  left:24px;
  right:24px;
  top:max(30px,env(safe-area-inset-top));
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:14px;
  align-items:start;
}
.brand{
  margin:0;
  font-size:13px;
  line-height:1;
  font-weight:900;
  letter-spacing:.28em;
  color:rgba(255,255,255,.94);
}
.title{
  margin:13px 0 0;
  max-width:330px;
  font-size:clamp(23px,5.9vw,30px);
  line-height:1.05;
  font-weight:820;
  letter-spacing:-.035em;
  color:#fff;
}
.date{
  margin-top:17px;
  min-height:50px;
  padding:0 16px;
  border:1px solid rgba(255,255,255,.42);
  border-radius:999px;
  background:rgba(10,34,53,.10);
  display:inline-flex;
  align-items:center;
  gap:10px;
  font-size:16px;
  font-weight:820;
}
.date svg{width:19px;height:19px;flex:0 0 auto}
.photo-button{
  min-height:55px;
  padding:0 19px;
  border:1px solid rgba(255,255,255,.40);
  border-radius:999px;
  background:rgba(10,34,53,.10);
  font-size:16px;
  font-weight:860;
  white-space:nowrap;
}
.empty{
  position:absolute;
  z-index:2;
  left:28px;
  right:28px;
  top:40%;
  transform:translateY(-22%);
  text-align:center;
}
.plus{
  width:116px;
  height:116px;
  margin:0 auto 24px;
  border:0;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:rgba(250,248,244,.98);
  color:var(--ink);
  font-size:54px;
  line-height:1;
  font-weight:300;
  box-shadow:0 12px 34px rgba(0,0,0,.07);
}
.empty h2{
  margin:0 auto;
  max-width:365px;
  font-size:27px;
  line-height:1.09;
  font-weight:850;
  letter-spacing:-.034em;
}
.empty p{
  margin:18px auto 0;
  max-width:355px;
  color:rgba(255,255,255,.67);
  font-size:16px;
  line-height:1.4;
  font-weight:550;
}
.mic-zone{
  position:absolute;
  z-index:4;
  left:0;
  right:0;
  bottom:102px;
  text-align:center;
}
.mic-halo{
  display:inline-grid;
  place-items:center;
  width:142px;
  height:142px;
  border-radius:50%;
  background:rgba(173,206,229,.12);
}
.mic-ring{
  display:grid;
  place-items:center;
  width:116px;
  height:116px;
  border-radius:50%;
  background:rgba(123,166,198,.27);
  box-shadow:inset 0 0 0 1.5px rgba(225,238,248,.28);
}
.mic{
  width:94px;
  height:94px;
  border:1px solid rgba(255,255,255,.54);
  border-radius:50%;
  background:#4682b2;
  color:#fff;
  display:grid;
  place-items:center;
  box-shadow:0 10px 26px rgba(4,20,32,.16),inset 0 0 0 1px rgba(255,255,255,.11);
}
.mic svg{width:34px;height:34px}
.mic-label{
  margin-top:7px;
  font-size:14px;
  line-height:1.2;
  font-weight:800;
  color:rgba(255,255,255,.82);
}
.sheet{
  position:absolute;
  z-index:5;
  left:0;
  right:0;
  bottom:0;
  height:88px;
  border-radius:30px 30px 0 0;
  background:var(--cream);
  color:var(--sheet-text);
  box-shadow:0 -8px 26px rgba(0,0,0,.09);
}
.handle{
  width:62px;
  height:6px;
  margin:12px auto 15px;
  border-radius:999px;
  background:#c3c9d0;
}
.sheet-text{
  padding:0 23px;
  font-size:14px;
  line-height:1.3;
  font-weight:800;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
@media(max-height:760px){
  .top{top:max(18px,env(safe-area-inset-top))}
  .brand{font-size:11px}
  .title{margin-top:10px;font-size:22px;max-width:290px}
  .date{margin-top:14px;min-height:44px;font-size:15px}
  .photo-button{min-height:48px;font-size:15px}
  .empty{top:34.5%;transform:translateY(-4%);left:24px;right:24px}
  .plus{width:96px;height:96px;margin-bottom:18px;font-size:48px}
  .empty h2{max-width:340px;font-size:23px;line-height:1.1}
  .empty p{margin-top:13px;max-width:335px;font-size:14.5px;line-height:1.38}
  .mic-zone{bottom:72px}
  .mic-halo{width:118px;height:118px}
  .mic-ring{width:98px;height:98px}
  .mic{width:80px;height:80px}
  .mic svg{width:30px;height:30px}
  .mic-label{margin-top:6px;font-size:12.5px}
  .sheet{height:64px;border-radius:26px 26px 0 0}
  .handle{width:54px;height:5px;margin:9px auto 10px}
  .sheet-text{padding:0 18px;font-size:12.5px}
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

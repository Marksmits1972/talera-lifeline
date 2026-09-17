export const STORYLAB_CLEAN_PAGE_REVISION = 'storylab-clean-reference-20260917-r9';

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
body{-webkit-text-size-adjust:100%;color:#fff;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
button{font:inherit;color:inherit}
.screen{
  position:relative;
  width:100%;
  height:100dvh;
  min-height:100dvh;
  overflow:hidden;
  background:linear-gradient(180deg,#5d7d92 0%,#4f7187 34%,#1d4661 66%,#0c2c44 100%);
}
.shade{
  position:absolute;
  inset:0;
  pointer-events:none;
  background:linear-gradient(180deg,rgba(4,23,38,.055) 0%,rgba(4,23,38,.01) 44%,rgba(4,23,38,.01) 61%,rgba(5,24,39,.15) 100%);
}
.top{
  position:absolute;
  z-index:3;
  left:18px;
  right:18px;
  top:max(30px,env(safe-area-inset-top));
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:12px;
  align-items:start;
}
.brand{
  margin:0;
  font-size:10.8px;
  line-height:1;
  font-weight:800;
  letter-spacing:.30em;
  color:rgba(255,255,255,.88);
}
.title{
  margin:9px 0 0;
  max-width:282px;
  font-size:clamp(18.2px,4.75vw,22.5px);
  line-height:1.06;
  font-weight:760;
  letter-spacing:-.028em;
  color:rgba(255,255,255,.96);
}
.date{
  margin-top:13px;
  min-height:37px;
  padding:0 10px;
  border:.85px solid rgba(255,255,255,.34);
  border-radius:999px;
  background:rgba(10,34,53,.055);
  display:inline-flex;
  align-items:center;
  gap:7px;
  font-size:12.5px;
  font-weight:720;
}
.date svg{width:15px;height:15px;flex:0 0 auto;opacity:.92}
.photo-button{
  min-height:42px;
  padding:0 13px;
  border:.85px solid rgba(255,255,255,.32);
  border-radius:999px;
  background:rgba(10,34,53,.055);
  font-size:13.5px;
  font-weight:780;
  white-space:nowrap;
}
.empty{
  position:absolute;
  z-index:2;
  left:24px;
  right:24px;
  top:40%;
  transform:translateY(-22%);
  text-align:center;
}
.plus{
  width:70px;
  height:70px;
  margin:0 auto 19px;
  border:0;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:rgba(250,248,244,.985);
  color:var(--ink);
  font-size:36px;
  line-height:1;
  font-weight:280;
  box-shadow:0 7px 20px rgba(0,0,0,.045);
}
.empty h2{
  margin:0 auto;
  max-width:314px;
  font-size:19.6px;
  line-height:1.11;
  font-weight:780;
  letter-spacing:-.026em;
}
.empty p{
  margin:14px auto 0;
  max-width:322px;
  color:rgba(255,255,255,.58);
  font-size:13.2px;
  line-height:1.43;
  font-weight:450;
}
.mic-zone{
  position:absolute;
  z-index:4;
  left:0;
  right:0;
  bottom:88px;
  text-align:center;
}
.mic-halo{
  display:inline-grid;
  place-items:center;
  width:100px;
  height:100px;
  border-radius:50%;
  background:rgba(173,206,229,.10);
}
.mic-ring{
  display:grid;
  place-items:center;
  width:84px;
  height:84px;
  border-radius:50%;
  background:rgba(123,166,198,.22);
  box-shadow:inset 0 0 0 1px rgba(225,238,248,.22);
}
.mic{
  width:70px;
  height:70px;
  border:.9px solid rgba(255,255,255,.48);
  border-radius:50%;
  background:#4682b2;
  color:#fff;
  display:grid;
  place-items:center;
  box-shadow:0 7px 18px rgba(4,20,32,.11),inset 0 0 0 1px rgba(255,255,255,.08);
}
.mic svg{width:26px;height:26px;opacity:.96}
.mic-label{
  margin-top:6px;
  font-size:11.2px;
  line-height:1.2;
  font-weight:730;
  color:rgba(255,255,255,.75);
}
.sheet{
  position:absolute;
  z-index:5;
  left:0;
  right:0;
  bottom:0;
  height:70px;
  border-radius:27px 27px 0 0;
  background:var(--cream);
  color:var(--sheet-text);
  box-shadow:0 -5px 18px rgba(0,0,0,.055);
}
.handle{
  width:52px;
  height:4px;
  margin:10px auto 12px;
  border-radius:999px;
  background:#c5cbd1;
}
.sheet-text{
  padding:0 17px;
  font-size:11.2px;
  line-height:1.3;
  font-weight:720;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
@media(max-height:760px){
  .top{top:max(18px,env(safe-area-inset-top));left:17px;right:17px}
  .brand{font-size:9.8px}
  .title{margin-top:8px;font-size:17.8px;max-width:252px}
  .date{margin-top:11px;min-height:33px;padding:0 9px;gap:6px;font-size:12.1px}
  .date svg{width:14px;height:14px}
  .photo-button{min-height:37px;padding:0 11px;font-size:13px}
  .empty{top:34.5%;transform:translateY(-4%);left:22px;right:22px}
  .plus{width:68px;height:68px;margin-bottom:15px;font-size:34px}
  .empty h2{max-width:296px;font-size:19px;line-height:1.11}
  .empty p{margin-top:11px;max-width:296px;font-size:12.4px;line-height:1.42}
  .mic-zone{bottom:58px}
  .mic-halo{width:88px;height:88px}
  .mic-ring{width:74px;height:74px}
  .mic{width:62px;height:62px}
  .mic svg{width:24px;height:24px}
  .mic-label{margin-top:5px;font-size:10.7px}
  .sheet{height:46px;border-radius:24px 24px 0 0}
  .handle{width:48px;height:4px;margin:7px auto 7px}
  .sheet-text{padding:0 14px;font-size:10.7px}
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

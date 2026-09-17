export const STORYLAB_CLEAN_PAGE_REVISION = 'storylab-clean-reference-20260917-r8';

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
  font-size:11.5px;
  line-height:1;
  font-weight:900;
  letter-spacing:.28em;
  color:rgba(255,255,255,.93);
}
.title{
  margin:10px 0 0;
  max-width:288px;
  font-size:clamp(19px,5vw,24px);
  line-height:1.05;
  font-weight:810;
  letter-spacing:-.035em;
  color:#fff;
}
.date{
  margin-top:14px;
  min-height:40px;
  padding:0 11px;
  border:1px solid rgba(255,255,255,.40);
  border-radius:999px;
  background:rgba(10,34,53,.08);
  display:inline-flex;
  align-items:center;
  gap:7px;
  font-size:13.2px;
  font-weight:800;
}
.date svg{width:16px;height:16px;flex:0 0 auto}
.photo-button{
  min-height:45px;
  padding:0 14px;
  border:1px solid rgba(255,255,255,.38);
  border-radius:999px;
  background:rgba(10,34,53,.08);
  font-size:14.2px;
  font-weight:840;
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
  width:78px;
  height:78px;
  margin:0 auto 20px;
  border:0;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:rgba(250,248,244,.98);
  color:var(--ink);
  font-size:40px;
  line-height:1;
  font-weight:300;
  box-shadow:0 9px 24px rgba(0,0,0,.055);
}
.empty h2{
  margin:0 auto;
  max-width:318px;
  font-size:21px;
  line-height:1.1;
  font-weight:840;
  letter-spacing:-.032em;
}
.empty p{
  margin:15px auto 0;
  max-width:326px;
  color:rgba(255,255,255,.62);
  font-size:13.5px;
  line-height:1.42;
  font-weight:530;
}
.mic-zone{
  position:absolute;
  z-index:4;
  left:0;
  right:0;
  bottom:92px;
  text-align:center;
}
.mic-halo{
  display:inline-grid;
  place-items:center;
  width:106px;
  height:106px;
  border-radius:50%;
  background:rgba(173,206,229,.11);
}
.mic-ring{
  display:grid;
  place-items:center;
  width:88px;
  height:88px;
  border-radius:50%;
  background:rgba(123,166,198,.25);
  box-shadow:inset 0 0 0 1.25px rgba(225,238,248,.26);
}
.mic{
  width:72px;
  height:72px;
  border:1px solid rgba(255,255,255,.52);
  border-radius:50%;
  background:#4682b2;
  color:#fff;
  display:grid;
  place-items:center;
  box-shadow:0 8px 20px rgba(4,20,32,.14),inset 0 0 0 1px rgba(255,255,255,.10);
}
.mic svg{width:27px;height:27px}
.mic-label{
  margin-top:6px;
  font-size:11.5px;
  line-height:1.2;
  font-weight:790;
  color:rgba(255,255,255,.79);
}
.sheet{
  position:absolute;
  z-index:5;
  left:0;
  right:0;
  bottom:0;
  height:76px;
  border-radius:28px 28px 0 0;
  background:var(--cream);
  color:var(--sheet-text);
  box-shadow:0 -7px 22px rgba(0,0,0,.08);
}
.handle{
  width:55px;
  height:5px;
  margin:10px auto 13px;
  border-radius:999px;
  background:#c3c9d0;
}
.sheet-text{
  padding:0 17px;
  font-size:11.5px;
  line-height:1.3;
  font-weight:790;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
@media(max-height:760px){
  .top{top:max(18px,env(safe-area-inset-top));left:17px;right:17px}
  .brand{font-size:10.2px}
  .title{margin-top:8px;font-size:18.7px;max-width:258px}
  .date{margin-top:12px;min-height:36px;padding:0 10px;gap:6px;font-size:12.8px}
  .date svg{width:15px;height:15px}
  .photo-button{min-height:40px;padding:0 12px;font-size:13.8px}
  .empty{top:34.5%;transform:translateY(-4%);left:22px;right:22px}
  .plus{width:76px;height:76px;margin-bottom:16px;font-size:38px}
  .empty h2{max-width:300px;font-size:19.8px;line-height:1.1}
  .empty p{margin-top:12px;max-width:300px;font-size:12.8px;line-height:1.4}
  .mic-zone{bottom:62px}
  .mic-halo{width:92px;height:92px}
  .mic-ring{width:77px;height:77px}
  .mic{width:64px;height:64px}
  .mic svg{width:25px;height:25px}
  .mic-label{margin-top:5px;font-size:11px}
  .sheet{height:54px;border-radius:25px 25px 0 0}
  .handle{width:50px;height:5px;margin:8px auto 8px}
  .sheet-text{padding:0 15px;font-size:11px}
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

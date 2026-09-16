export const STORYLAB_CLEAN_PAGE_REVISION = 'storylab-clean-foundation-20260916-r2';

export const STORYLAB_CLEAN_PAGE_HTML = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#16384f" />
  <title>TALERA — Vertelpagina</title>
  <style>
    :root {
      --bg-top: #607f95;
      --bg-mid: #355f7b;
      --bg-bottom: #102c43;
      --white: #ffffff;
      --muted: rgba(255,255,255,.64);
      --line: rgba(255,255,255,.34);
      --orb: #3f78a6;
      --sheet: #f8f6f2;
      --sheet-text: #667b8f;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      min-height: 100%;
      background: #102c43;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    }

    body {
      min-height: 100dvh;
      overflow: hidden;
      color: var(--white);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    button {
      font: inherit;
      color: inherit;
      -webkit-tap-highlight-color: transparent;
    }

    .app {
      position: relative;
      width: 100%;
      max-width: 540px;
      min-height: 100dvh;
      margin: 0 auto;
      overflow: hidden;
      isolation: isolate;
      background:
        radial-gradient(circle at 48% 32%, rgba(255,255,255,.055), rgba(255,255,255,0) 38%),
        linear-gradient(180deg, var(--bg-top) 0%, var(--bg-mid) 39%, var(--bg-bottom) 100%);
    }

    .app::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(7,22,33,.07), rgba(7,22,33,0) 26%, rgba(4,16,27,.15) 100%);
    }

    .content {
      position: relative;
      z-index: 2;
      min-height: 100dvh;
      padding:
        calc(env(safe-area-inset-top) + 18px)
        16px
        calc(96px + env(safe-area-inset-bottom))
        16px;
    }

    .top {
      display: grid;
      grid-template-columns: minmax(0,1fr) auto;
      gap: 12px;
      align-items: start;
    }

    .brand {
      margin: 0 0 9px;
      font-size: 11px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: .28em;
      color: rgba(255,255,255,.84);
    }

    .title {
      margin: 0;
      font-size: clamp(19px, 5.2vw, 22px);
      line-height: 1.08;
      font-weight: 760;
      letter-spacing: -.025em;
      white-space: nowrap;
    }

    .date-pill,
    .photo-pill {
      appearance: none;
      border: 1.25px solid var(--line);
      background: rgba(18,46,66,.12);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.025);
      backdrop-filter: blur(2px);
    }

    .date-pill {
      margin-top: 11px;
      min-height: 40px;
      padding: 0 14px;
      border-radius: 21px;
      display: inline-flex;
      align-items: center;
      gap: 9px;
      font-size: 15px;
      line-height: 1;
      font-weight: 690;
    }

    .photo-pill {
      margin-top: -1px;
      min-width: 94px;
      min-height: 48px;
      padding: 0 16px;
      border-radius: 25px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      font-size: 15.5px;
      line-height: 1;
      font-weight: 760;
    }

    .date-icon {
      width: 17px;
      height: 17px;
      flex: 0 0 auto;
    }

    .empty-state {
      position: absolute;
      left: 18px;
      right: 18px;
      top: 47.5%;
      transform: translateY(-50%);
      text-align: center;
    }

    .add-photo-large {
      width: 76px;
      height: 76px;
      margin: 0 auto 14px;
      border: 0;
      border-radius: 50%;
      background: rgba(255,255,255,.93);
      color: #12314b;
      display: grid;
      place-items: center;
      font-size: 42px;
      line-height: 1;
      font-weight: 300;
      box-shadow: 0 8px 22px rgba(0,0,0,.07);
    }

    .empty-title {
      max-width: 330px;
      margin: 0 auto;
      font-size: clamp(22px, 6vw, 25px);
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: -.03em;
      text-wrap: balance;
    }

    .empty-copy {
      max-width: 350px;
      margin: 14px auto 0;
      color: var(--muted);
      font-size: clamp(15px, 4.1vw, 17px);
      line-height: 1.36;
      font-weight: 470;
      text-wrap: balance;
    }

    .voice-block {
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: calc(91px + env(safe-area-inset-bottom));
      text-align: center;
    }

    .orb-shell {
      width: 82px;
      height: 82px;
      margin: 0 auto 9px;
      border-radius: 50%;
      padding: 8px;
      background: rgba(255,255,255,.17);
      display: grid;
      place-items: center;
    }

    .orb {
      width: 66px;
      height: 66px;
      border: 1.25px solid rgba(255,255,255,.72);
      border-radius: 50%;
      background: var(--orb);
      display: grid;
      place-items: center;
      box-shadow: 0 8px 20px rgba(3,14,24,.16);
    }

    .orb svg {
      width: 30px;
      height: 30px;
      stroke: #fff;
    }

    .voice-caption {
      margin: 0;
      font-size: clamp(13px, 3.8vw, 15px);
      line-height: 1.25;
      font-weight: 720;
      color: rgba(255,255,255,.76);
      white-space: nowrap;
    }

    .sheet {
      position: absolute;
      z-index: 4;
      left: 0;
      right: 0;
      bottom: 0;
      height: calc(82px + env(safe-area-inset-bottom));
      border-radius: 30px 30px 0 0;
      background: var(--sheet);
      box-shadow: 0 -6px 22px rgba(3,18,28,.07);
      color: var(--sheet-text);
      padding: 12px 18px calc(13px + env(safe-area-inset-bottom));
    }

    .grabber {
      width: 54px;
      height: 5px;
      margin: 0 auto 14px;
      border-radius: 10px;
      background: #c7ccd1;
    }

    .sheet-hint {
      margin: 0;
      text-align: left;
      font-size: 13px;
      line-height: 1.3;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-height: 740px) {
      .content {
        padding-top: calc(env(safe-area-inset-top) + 14px);
        padding-bottom: calc(88px + env(safe-area-inset-bottom));
      }
      .brand { margin-bottom: 7px; }
      .date-pill { margin-top: 9px; min-height: 37px; }
      .photo-pill { min-height: 44px; }
      .empty-state { top: 45.5%; }
      .add-photo-large { width: 68px; height: 68px; font-size: 38px; margin-bottom: 12px; }
      .empty-copy { margin-top: 11px; }
      .voice-block { bottom: calc(84px + env(safe-area-inset-bottom)); }
      .orb-shell { width: 74px; height: 74px; padding: 7px; margin-bottom: 7px; }
      .orb { width: 60px; height: 60px; }
      .orb svg { width: 27px; height: 27px; }
      .sheet { height: calc(76px + env(safe-area-inset-bottom)); }
    }

    @media (max-width: 360px) {
      .content { padding-left: 14px; padding-right: 14px; }
      .top { gap: 9px; }
      .title { font-size: 18px; }
      .photo-pill { min-width: 88px; padding: 0 13px; font-size: 14.5px; }
      .date-pill { padding: 0 12px; font-size: 14px; }
      .empty-title { font-size: 22px; }
      .empty-copy { font-size: 15px; }
      .voice-caption { font-size: 12.5px; }
    }

    @media (min-width: 541px) {
      body { background: #0b2437; }
      .app { box-shadow: 0 0 70px rgba(0,0,0,.28); }
    }
  </style>
</head>
<body>
  <main class="app" data-revision="${STORYLAB_CLEAN_PAGE_REVISION}">
    <section class="content" aria-label="Vertelpagina">
      <header class="top">
        <div>
          <p class="brand">TALERA</p>
          <h1 class="title">Titel van deze herinnering</h1>
          <button class="date-pill" type="button" aria-label="Datum kiezen">
            <svg class="date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>
            </svg>
            <span>Wanneer was dit?</span>
          </button>
        </div>
        <button class="photo-pill" type="button" aria-label="Foto toevoegen">+ foto</button>
      </header>

      <section class="empty-state" aria-label="Foto toevoegen">
        <button class="add-photo-large" type="button" aria-label="Kies een foto">+</button>
        <h2 class="empty-title">Kies een foto die je herinnering oproept</h2>
        <p class="empty-copy">Daarna kun je gewoon naar de foto kijken en je verhaal vertellen.</p>
      </section>

      <section class="voice-block" aria-label="Vertellen">
        <div class="orb-shell" aria-hidden="true">
          <div class="orb">
            <svg viewBox="0 0 48 48" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="18" y="8" width="12" height="23" rx="6"/>
              <path d="M13 23v2a11 11 0 0 0 22 0v-2M24 36v5M19 41h10"/>
            </svg>
          </div>
        </div>
        <p class="voice-caption">Je vertelt nu · swipe gerust door je foto’s</p>
      </section>
    </section>

    <section class="sheet" aria-label="Verhaaltekst">
      <div class="grabber" aria-hidden="true"></div>
      <p class="sheet-hint">Veeg omlaag om terug te gaan naar je foto</p>
    </section>
  </main>
</body>
</html>`;

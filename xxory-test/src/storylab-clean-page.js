export const STORYLAB_CLEAN_PAGE_REVISION = 'storylab-clean-foundation-20260916-r1';

export const STORYLAB_CLEAN_PAGE_HTML = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#173851" />
  <title>TALERA — Vertelpagina</title>
  <style>
    :root {
      --bg-top: #607e94;
      --bg-mid: #315b78;
      --bg-bottom: #102c43;
      --white: #ffffff;
      --soft-white: rgba(255,255,255,.78);
      --line: rgba(255,255,255,.34);
      --orb: #3f78a6;
      --sheet: #f8f6f2;
      --sheet-text: #64788c;
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
        radial-gradient(circle at 48% 33%, rgba(255,255,255,.08), rgba(255,255,255,0) 36%),
        linear-gradient(180deg, var(--bg-top) 0%, var(--bg-mid) 38%, var(--bg-bottom) 100%);
    }

    .app::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(6,20,31,.08), rgba(6,20,31,0) 28%, rgba(4,16,27,.18) 100%);
      z-index: 0;
    }

    .content {
      position: relative;
      z-index: 2;
      min-height: 100dvh;
      padding:
        calc(env(safe-area-inset-top) + 28px)
        24px
        calc(118px + env(safe-area-inset-bottom))
        24px;
    }

    .top {
      display: grid;
      grid-template-columns: minmax(0,1fr) auto;
      gap: 18px;
      align-items: start;
    }

    .brand {
      margin: 0 0 12px;
      font-size: 15px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: .26em;
      color: rgba(255,255,255,.86);
    }

    .title {
      margin: 0;
      font-size: clamp(26px, 7vw, 34px);
      line-height: 1.04;
      font-weight: 760;
      letter-spacing: -.035em;
      text-shadow: 0 1px 10px rgba(0,0,0,.08);
    }

    .date-pill,
    .photo-pill {
      appearance: none;
      border: 1.5px solid var(--line);
      background: rgba(18,46,66,.16);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.03);
      backdrop-filter: blur(3px);
    }

    .date-pill {
      margin-top: 18px;
      min-height: 50px;
      padding: 0 18px;
      border-radius: 25px;
      display: inline-flex;
      align-items: center;
      gap: 11px;
      font-size: 17px;
      font-weight: 690;
    }

    .photo-pill {
      margin-top: -3px;
      min-width: 112px;
      min-height: 62px;
      padding: 0 20px;
      border-radius: 32px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      white-space: nowrap;
      font-size: 18px;
      font-weight: 760;
    }

    .date-icon {
      width: 20px;
      height: 20px;
      flex: 0 0 auto;
    }

    .empty-state {
      position: absolute;
      left: 24px;
      right: 24px;
      top: 47%;
      transform: translateY(-50%);
      text-align: center;
    }

    .add-photo-large {
      width: 128px;
      height: 128px;
      margin: 0 auto 22px;
      border: 0;
      border-radius: 50%;
      background: rgba(255,255,255,.91);
      color: #12314b;
      display: grid;
      place-items: center;
      font-size: 64px;
      line-height: 1;
      font-weight: 300;
      box-shadow: 0 10px 30px rgba(0,0,0,.08);
    }

    .empty-title {
      max-width: 430px;
      margin: 0 auto;
      font-size: clamp(27px, 7.6vw, 38px);
      line-height: 1.08;
      font-weight: 800;
      letter-spacing: -.035em;
      text-wrap: balance;
    }

    .empty-copy {
      max-width: 450px;
      margin: 22px auto 0;
      color: rgba(255,255,255,.66);
      font-size: clamp(18px, 4.8vw, 24px);
      line-height: 1.35;
      font-weight: 470;
      text-wrap: balance;
    }

    .voice-block {
      position: absolute;
      left: 24px;
      right: 24px;
      bottom: calc(108px + env(safe-area-inset-bottom));
      text-align: center;
    }

    .orb-shell {
      width: 118px;
      height: 118px;
      margin: 0 auto 14px;
      border-radius: 50%;
      padding: 12px;
      background: rgba(255,255,255,.18);
      display: grid;
      place-items: center;
    }

    .orb {
      width: 94px;
      height: 94px;
      border: 1.5px solid rgba(255,255,255,.72);
      border-radius: 50%;
      background: var(--orb);
      display: grid;
      place-items: center;
      box-shadow: 0 12px 28px rgba(3,14,24,.18);
    }

    .orb svg {
      width: 42px;
      height: 42px;
      stroke: white;
    }

    .voice-caption {
      margin: 0;
      font-size: clamp(15px, 4.2vw, 20px);
      line-height: 1.25;
      font-weight: 720;
      color: rgba(255,255,255,.78);
    }

    .sheet {
      position: absolute;
      z-index: 4;
      left: 0;
      right: 0;
      bottom: 0;
      height: calc(94px + env(safe-area-inset-bottom));
      border-radius: 34px 34px 0 0;
      background: var(--sheet);
      box-shadow: 0 -8px 28px rgba(3,18,28,.08);
      color: var(--sheet-text);
      padding: 15px 22px calc(16px + env(safe-area-inset-bottom));
    }

    .grabber {
      width: 68px;
      height: 7px;
      margin: 0 auto 18px;
      border-radius: 10px;
      background: #c8ccd1;
    }

    .sheet-hint {
      margin: 0;
      text-align: left;
      font-size: 15px;
      line-height: 1.3;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-height: 740px) {
      .content { padding-top: calc(env(safe-area-inset-top) + 20px); }
      .brand { margin-bottom: 8px; }
      .date-pill { margin-top: 12px; min-height: 44px; }
      .photo-pill { min-height: 54px; }
      .empty-state { top: 44%; }
      .add-photo-large { width: 108px; height: 108px; font-size: 54px; margin-bottom: 16px; }
      .empty-copy { margin-top: 14px; }
      .orb-shell { width: 96px; height: 96px; padding: 9px; margin-bottom: 8px; }
      .orb { width: 78px; height: 78px; }
      .orb svg { width: 34px; height: 34px; }
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

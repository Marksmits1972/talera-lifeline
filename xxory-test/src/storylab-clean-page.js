export const STORYLAB_CLEAN_PAGE_REVISION = 'storylab-clean-reference-20260917-r4';

export const STORYLAB_CLEAN_PAGE_HTML = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#123b59" />
  <title>TALERA — Vertelpagina</title>
  <style>
    :root {
      --blue: #123b59;
      --blue-deep: #103650;
      --white: #ffffff;
      --sheet: #fbfaf7;
      --ring: rgba(150, 190, 217, .11);
      --ring-near: rgba(173, 207, 229, .24);
      --orb-top: #4e8fc0;
      --orb-bottom: #397aa7;
      --orb-edge: rgba(184, 220, 244, .38);
      --control-bg: rgba(12, 49, 75, .22);
    }

    * { box-sizing: border-box; }

    html,
    body {
      margin: 0;
      width: 100%;
      min-height: 100%;
      background: var(--blue-deep);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    body {
      min-height: 100dvh;
      overflow: hidden;
      color: var(--white);
    }

    button {
      appearance: none;
      border: 0;
      padding: 0;
      margin: 0;
      font: inherit;
      color: inherit;
      background: none;
      -webkit-tap-highlight-color: transparent;
    }

    .app {
      position: relative;
      width: 100%;
      max-width: 540px;
      height: 100dvh;
      min-height: 100svh;
      margin: 0 auto;
      overflow: hidden;
      isolation: isolate;
      background:
        radial-gradient(circle at 50% 46%, rgba(54, 105, 139, .17), rgba(54, 105, 139, 0) 43%),
        linear-gradient(180deg, #123c5a 0%, #123b59 55%, #113953 100%);
    }

    .topbar {
      position: absolute;
      z-index: 10;
      top: calc(env(safe-area-inset-top) + 24px);
      left: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      pointer-events: none;
    }

    .top-button {
      pointer-events: auto;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--control-bg);
    }

    .top-button svg {
      width: 27px;
      height: 27px;
      stroke: rgba(255,255,255,.96);
    }

    .dots {
      width: 30px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 5px;
    }

    .dots i {
      display: block;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(255,255,255,.94);
    }

    .stage {
      position: absolute;
      inset: 0 0 92px;
      z-index: 1;
      overflow: hidden;
    }

    .ring-field {
      position: absolute;
      left: 50%;
      top: 48.5%;
      width: min(122vw, 650px);
      aspect-ratio: 1;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 1px solid var(--ring);
    }

    .ring-field::before,
    .ring-field::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 1px solid var(--ring);
    }

    .ring-field::before {
      width: 74%;
      height: 74%;
    }

    .ring-field::after {
      width: 43%;
      height: 43%;
      border-color: rgba(162, 198, 221, .17);
    }

    .orb-zone {
      position: absolute;
      z-index: 4;
      left: 50%;
      top: 48.5%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .orb-rings {
      position: relative;
      width: 166px;
      height: 166px;
      display: grid;
      place-items: center;
    }

    .orb-rings::before,
    .orb-rings::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 1.2px solid var(--ring-near);
    }

    .orb-rings::before {
      width: 138px;
      height: 138px;
    }

    .orb-rings::after {
      width: 154px;
      height: 154px;
      border-color: rgba(173, 207, 229, .18);
    }

    .near-ring {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 126px;
      height: 126px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 1.2px solid rgba(173, 207, 229, .27);
    }

    .orb {
      position: relative;
      z-index: 2;
      width: 108px;
      height: 108px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      border: 1.3px solid var(--orb-edge);
      background: linear-gradient(180deg, var(--orb-top), var(--orb-bottom));
      box-shadow: 0 6px 20px rgba(4, 23, 37, .10);
    }

    .orb svg {
      width: 45px;
      height: 45px;
      stroke: #fff;
    }

    .photo-button {
      margin-top: 40px;
      width: 58px;
      height: 58px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      background: rgba(12, 49, 75, .18);
    }

    .photo-button svg {
      width: 35px;
      height: 35px;
      stroke: rgba(255,255,255,.90);
    }

    .sheet {
      position: absolute;
      z-index: 20;
      left: 0;
      right: 0;
      bottom: 0;
      height: calc(105px + env(safe-area-inset-bottom));
      border-radius: 38px 38px 0 0;
      background: var(--sheet);
      box-shadow: 0 -2px 8px rgba(3,18,28,.025);
    }

    .grabber {
      width: 60px;
      height: 6px;
      margin: 24px auto 0;
      border-radius: 999px;
      background: #315a73;
    }

    .sheet-ghost {
      margin-top: 68px;
      text-align: center;
      font-size: 19px;
      font-weight: 650;
      color: rgba(75, 101, 118, .30);
      user-select: none;
    }

    @media (max-height: 760px) {
      .topbar { top: calc(env(safe-area-inset-top) + 17px); }
      .ring-field,
      .orb-zone { top: 47%; }
      .photo-button { margin-top: 32px; }
      .sheet { height: calc(92px + env(safe-area-inset-bottom)); }
      .grabber { margin-top: 19px; }
    }

    @media (max-width: 380px) {
      .topbar { left: 17px; right: 17px; }
      .top-button { width: 52px; height: 52px; }
      .ring-field { width: 132vw; }
      .orb-rings { width: 158px; height: 158px; }
      .orb-rings::before { width: 132px; height: 132px; }
      .orb-rings::after { width: 148px; height: 148px; }
      .near-ring { width: 120px; height: 120px; }
      .orb { width: 104px; height: 104px; }
    }

    @media (min-width: 541px) {
      body { background: #0b2639; }
      .app { box-shadow: 0 0 60px rgba(0,0,0,.28); }
    }
  </style>
</head>
<body>
  <main class="app" data-revision="${STORYLAB_CLEAN_PAGE_REVISION}">
    <div class="topbar" aria-label="Navigatie">
      <button class="top-button" type="button" aria-label="Terug">
        <svg viewBox="0 0 32 32" fill="none" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19.5 8.5 12 16l7.5 7.5"/>
        </svg>
      </button>
      <button class="top-button" type="button" aria-label="Meer opties">
        <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
    </div>

    <section class="stage" aria-label="Vertelruimte">
      <div class="ring-field" aria-hidden="true"></div>

      <div class="orb-zone">
        <div class="orb-rings" aria-hidden="true">
          <div class="near-ring"></div>
          <button class="orb" type="button" aria-label="Vertellen">
            <svg viewBox="0 0 48 48" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="18" y="8" width="12" height="23" rx="6"/>
              <path d="M13 23v2a11 11 0 0 0 22 0v-2M24 36v5M19 41h10"/>
            </svg>
          </button>
        </div>

        <button class="photo-button" type="button" aria-label="Foto toevoegen">
          <svg viewBox="0 0 40 40" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="7" y="9" width="23" height="20" rx="3"/>
            <circle cx="14" cy="16" r="3"/>
            <path d="m9 27 7-8 5 5 3-3 6 6M32 14v10M27 19h10"/>
          </svg>
        </button>
      </div>
    </section>

    <section class="sheet" aria-label="Verhaaltekst">
      <div class="grabber" aria-hidden="true"></div>
      <div class="sheet-ghost" aria-hidden="true">Je verhaal verschijnt hier</div>
    </section>
  </main>
</body>
</html>`;

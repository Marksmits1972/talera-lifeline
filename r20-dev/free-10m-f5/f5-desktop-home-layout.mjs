// TALERA Free /mijn-leven only. Desktop layout, not a new page or player.
// Injection is scoped to the existing generated Home document.
import assert from 'node:assert/strict';
export const DESKTOP_HOME_MEDIA = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
export const desktopHomeStyle = `<style id="talera-f5-desktop-home-layout">
@media ${DESKTOP_HOME_MEDIA} {
  :root { --talera-home-control-width: clamp(350px, 35vw, 620px); }
  .hero {
    left: var(--talera-home-control-width) !important;
    right: 0 !important;
    top: 0 !important;
    bottom: 0 !important;
    width: auto !important;
    height: auto !important;
  }
  /* Preserve the existing white logo on its dark brand background. */
  .mast { background: linear-gradient(to right,
    #0b1e39 0, #0b1e39 var(--talera-home-control-width),
    transparent var(--talera-home-control-width)) !important; }
  #sheet.life-sheet {
    position: fixed !important;
    left: 0 !important; right: auto !important;
    top: 62px !important; bottom: 0 !important;
    width: var(--talera-home-control-width) !important;
    height: auto !important; max-height: none !important;
    transform: none !important;
    border-radius: 0 !important;
    overflow: hidden !important;
  }
  /* The original handle still provides a larger overview on demand. */
  #sheet.life-sheet.expanded { width: min(65vw, 980px) !important; }
  #sheetBody {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    min-width: 0 !important;
    overflow-y: auto !important;
    padding-bottom: 84px !important;
    box-sizing: border-box !important;
  }
  .flow-nav {
    left: calc(var(--talera-home-control-width) / 2) !important;
    right: auto !important;
    width: calc(var(--talera-home-control-width) - 24px) !important;
    max-width: none !important;
    bottom: 12px !important;
    transform: translateX(-50%) !important;
  }
  body:has(#sheet.expanded) .flow-nav {
    left: calc(min(65vw, 980px) / 2) !important;
  }
  @media (prefers-reduced-motion: reduce) {
    #sheet.life-sheet, .flow-nav { transition: none !important; }
  }
}
</style>`;

export function installDesktopHomeLayout(html, route) {
  if (route !== '/mijn-leven') return html;
  assert.equal(typeof html, 'string', 'DESKTOP_HOME_INVALID_HTML');
  assert.equal(html.split('</head>').length, 2, 'DESKTOP_HOME_HEAD_DRIFT');
  assert.ok(!html.includes('id="talera-f5-desktop-home-layout"'), 'DESKTOP_HOME_DUPLICATE');
  for (const token of ['id="heroImage"', 'id="sheet"', 'id="sheetBody"', 'id="v17-timebox"', 'id="v18-phases"', 'id="navMore"']) {
    assert.ok(html.includes(token), 'DESKTOP_HOME_SOURCE_DRIFT: ' + token);
  }
  return html.replace('</head>', () => desktopHomeStyle + '</head>');
}

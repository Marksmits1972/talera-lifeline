// TALERA Free /mijn-leven only. Desktop layout, not a new page or player.
// Injection is scoped to the existing generated Home document.
import assert from 'node:assert/strict';
export const DESKTOP_HOME_MEDIA = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
// Shared visual rules for the existing runtime menu on Home and Presentation.
// No menu actions, hidden state, routes, or content are changed.
export const desktopMenuRules = `
  body:not(.talera-recipient-presentation) #talera-more-menu {
    align-items: center !important;
    padding: 24px !important;
    box-sizing: border-box !important;
  }
  body:not(.talera-recipient-presentation) #talera-more-menu > .panel {
    width: min(620px, 100%) !important;
    height: auto !important;
    max-height: min(760px, calc(100dvh - 48px)) !important;
    min-height: 0 !important;
    border-radius: 24px !important;
    box-shadow: 0 16px 52px rgba(11, 30, 57, .24) !important;
  }
  body:not(.talera-recipient-presentation) #talera-more-menu > .panel > .body {
    flex: 0 1 auto !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    padding-bottom: 22px !important;
  }
`;
// An explicit native link to the existing presentation overview, not a new route.
export const desktopPresentationLink = '<a id="talera-desktop-present-link" href="/present" data-i18n="core.present.presentationTab" style="display:none">Presentatie</a>';
export const desktopHomeStyle = `<style id="talera-f5-desktop-home-layout">
@media ${DESKTOP_HOME_MEDIA} {
  ${desktopMenuRules}
  :root { --talera-home-control-width: clamp(350px, 35vw, 620px); }
  /* The explicit overview entry is visible only on desktop Home. The original
     photo and caption still open the selected memory as before. */
  body[data-tab="mine"] #sheetBody #talera-desktop-present-link {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 10px !important;
    width: 100% !important;
    min-height: 48px !important;
    margin: 2px 0 12px !important;
    padding: 10px 16px !important;
    box-sizing: border-box !important;
    border-radius: 12px !important;
    border: 1px solid #0b1e39 !important;
    background: #0b1e39 !important;
    color: #fff !important;
    text-decoration: none !important;
    font-size: 15px !important;
    font-weight: 700 !important;
  }
  #talera-desktop-present-link::before {
    content: '' !important;
    border: 7px solid transparent;
    border-left: 11px solid currentColor;
    border-right: 0;
  }
  #talera-desktop-present-link:focus-visible { outline: 3px solid #6ea3e7; outline-offset: 3px; }
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
  /* Keep the existing language picker beside the desktop controls. */
  .mast .talera-v23-language {
    position: absolute !important;
    left: auto !important;
    right: calc(100% - var(--talera-home-control-width) + 16px) !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
  }
  .mast #talera-v23-language { font-size: 13px !important; }
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
  /* Desktop reading sizes: retain the existing font family, controls and layout. */
  #sheetBody .sheet-sub,
  #sheetBody .v17-empty-year,
  #sheetBody .v17-guide,
  #sheetBody .v18-era-note,
  #sheetBody #v17-year-summary,
  #sheetBody #myCount,
  #sheetBody #v17-go-year {
    font-size: 14px !important;
    line-height: 1.45 !important;
  }
  #sheetBody #v17-min-year,
  #sheetBody #v17-mid-year,
  #sheetBody #v17-max-year {
    font-size: 13px !important;
  }
  #sheetBody .action-start > span:first-child { font-size: 16px !important; }
  .flow-nav {
    left: calc(var(--talera-home-control-width) / 2) !important;
    right: auto !important;
    width: calc(var(--talera-home-control-width) - 24px) !important;
    max-width: none !important;
    bottom: 12px !important;
    transform: translateX(-50%) !important;
  }
  .flow-nav { border-radius: 12px !important; }
  .flow-nav a { font-size: 13px !important; }
  /* Only wide desktop panels have room for icon and localized label in a row.
     Keep the original hidden items hidden and all original links untouched. */
  @media (min-width: 1320px) {
    .flow-nav a:not([hidden]) {
      flex-direction: row !important;
      justify-content: center !important;
      gap: 6px !important;
      min-width: 0 !important;
    }
    .flow-nav a:not([hidden]) svg { flex: 0 0 18px !important; }
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
  const anchor = '<section id="v17-timebox"';
  assert.equal(html.split(anchor).length, 2, 'DESKTOP_HOME_PRESENT_LINK_ANCHOR_DRIFT');
  assert.ok(!html.includes('id="talera-desktop-present-link"'), 'DESKTOP_HOME_PRESENT_LINK_DUPLICATE');
  return html.replace(anchor, () => desktopPresentationLink + anchor)
    .replace('</head>', () => desktopHomeStyle + '</head>');
}

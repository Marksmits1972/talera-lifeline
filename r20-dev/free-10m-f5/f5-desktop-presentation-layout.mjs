// TALERA Free existing /present route: desktop screen geometry only.
// The native timeline canvas, date, dots and loupe remain in their original DOM.
import assert from 'node:assert/strict';
import {DESKTOP_HOME_MEDIA} from './f5-desktop-home-layout.mjs';

export const desktopPresentationStyle = `<style id="talera-f5-desktop-presentation-layout">
@media ${DESKTOP_HOME_MEDIA} {
  #surface.timeline {
    left: 50% !important;
    right: auto !important;
    width: min(62vw, 960px) !important;
    transform: translateX(-50%) !important;
  }
  #surface #timelineCanvas { width: 100% !important; }
  /* The visible 34px circle is the native ::after layer, not the transparent
     45px hit area. Keep reading and shared presentation modes untouched. */
  html body:not(.talera-recipient-presentation):not(.talera-v18-reading)
    :is(#talera-flow-home,#talera-v5-editor-pencil):is([data-talera-photo-contrast],:not([data-talera-photo-contrast]))::after {
    background-color: rgba(11, 30, 57, .88) !important;
    border-color: rgba(255, 255, 255, .82) !important;
  }
  html body:not(.talera-recipient-presentation):not(.talera-v18-reading)
    :is(#talera-flow-home,#talera-v5-editor-pencil):is([data-talera-photo-contrast],:not([data-talera-photo-contrast])) {
    color: #fff !important;
  }
  html body:not(.talera-recipient-presentation):not(.talera-v18-reading)
    #talera-flow-home:is([data-talera-photo-contrast],:not([data-talera-photo-contrast]))::before {
    border-left-color: #fff !important;
    border-bottom-color: #fff !important;
  }
  /* The zero-example shell deliberately has no initial image source.
     Hide only its empty native image elements; loading an original source
     automatically removes this rule without touching any player state. */
  img#memoryPhotoA:is(:not([src]),[src=""]):is(:not([srcset]),[srcset=""]),
  img#memoryPhotoB:is(:not([src]),[src=""]):is(:not([srcset]),[srcset=""]) {
    visibility: hidden !important;
  }
}
</style>`;

export function installDesktopPresentationLayout(html, route) {
  if (route !== '/present') return html;
  assert.equal(typeof html, 'string', 'DESKTOP_PRESENT_INVALID_HTML');
  assert.equal(html.split('</head>').length, 2, 'DESKTOP_PRESENT_HEAD_DRIFT');
  assert.ok(!html.includes('id="talera-f5-desktop-presentation-layout"'), 'DESKTOP_PRESENT_DUPLICATE');
  for (const token of ['id="surface"', 'id="timelineCanvas"', 'id="focusText"', 'id="photoStage"', 'talera-photo-dots', 'center-needle']) {
    assert.ok(html.includes(token), 'DESKTOP_PRESENT_SOURCE_DRIFT: ' + token);
  }
  return html.replace('</head>', () => desktopPresentationStyle + '</head>');
}

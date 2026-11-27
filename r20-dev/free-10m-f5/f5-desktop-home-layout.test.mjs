// Contract test for the real product's layout transform. No standalone UI.
import assert from 'node:assert/strict';
import {desktopHomeStyle, installDesktopHomeLayout, DESKTOP_HOME_MEDIA, desktopMenuRules} from './f5-desktop-home-layout.mjs';
const original = '<html><head><title>TALERA</title></head><body><img id="heroImage"><section id="sheet"><div id="sheetBody"><section id="v17-timebox"></section><section id="v18-phases"></section></div></section><a id="navMore"></a><script>/* existing event handlers */</script></body></html>';
const result = installDesktopHomeLayout(original, '/mijn-leven');
assert.equal(result.replace(desktopHomeStyle,''), original, 'Only one style block may be added');
assert.ok(desktopHomeStyle.includes('@media '+DESKTOP_HOME_MEDIA));
assert.ok(desktopHomeStyle.includes('35vw'));
assert.ok(desktopHomeStyle.includes(desktopMenuRules));
assert.ok(desktopMenuRules.includes('height: auto !important'));
assert.ok(desktopMenuRules.includes('max-height: min(760px, calc(100dvh - 48px))'));
assert.ok(desktopMenuRules.includes('overflow-y: auto !important'));
assert.ok(!/display\s*:/.test(desktopMenuRules), 'Do not override original menu visibility');
assert.ok(desktopMenuRules.includes('body:not(.talera-recipient-presentation)'));
assert.ok(desktopHomeStyle.includes('prefers-reduced-motion'));
assert.ok(desktopHomeStyle.includes('.mast .talera-v23-language'));
assert.ok(desktopHomeStyle.includes('right: calc(100% - var(--talera-home-control-width) + 16px)'));
assert.ok(desktopHomeStyle.includes('@media (min-width: 1320px)'));
assert.ok(desktopHomeStyle.includes('.flow-nav a:not([hidden])'));
assert.ok(!desktopHomeStyle.includes('display: flex !important'), 'Hidden navigation must not become visible');
for (const selector of ['.sheet-sub', '#v17-year-summary', '#v17-min-year', '#v17-mid-year', '#v17-max-year', '.v18-era-note', '.flow-nav a']) {
 assert.ok(desktopHomeStyle.includes(selector), `Missing desktop reading rule: ${selector}`);
}
assert.equal(installDesktopHomeLayout(original,'/present'),original);
assert.equal(installDesktopHomeLayout(original,'/tell'),original);
assert.throws(()=>installDesktopHomeLayout(result,'/mijn-leven'), /DUPLICATE/);
assert.throws(()=>installDesktopHomeLayout(original.replace('id="heroImage"','id="different"'),'/mijn-leven'), /SOURCE_DRIFT/);
console.log('TALERA_DESKTOP_HOME_STYLE_CONTRACT_PASS');

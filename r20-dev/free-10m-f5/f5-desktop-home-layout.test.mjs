// Contract test for the real product's layout transform. No standalone UI.
import assert from 'node:assert/strict';
import {desktopHomeStyle, installDesktopHomeLayout, DESKTOP_HOME_MEDIA} from './f5-desktop-home-layout.mjs';
const original = '<html><head><title>TALERA</title></head><body><img id="heroImage"><section id="sheet"><div id="sheetBody"><section id="v17-timebox"></section><section id="v18-phases"></section></div></section><a id="navMore"></a><script>/* existing event handlers */</script></body></html>';
const result = installDesktopHomeLayout(original, '/mijn-leven');
assert.equal(result.replace(desktopHomeStyle,''), original, 'Only one style block may be added');
assert.ok(desktopHomeStyle.includes('@media '+DESKTOP_HOME_MEDIA));
assert.ok(desktopHomeStyle.includes('35vw'));
assert.ok(desktopHomeStyle.includes('prefers-reduced-motion'));
assert.equal(installDesktopHomeLayout(original,'/present'),original);
assert.equal(installDesktopHomeLayout(original,'/tell'),original);
assert.throws(()=>installDesktopHomeLayout(result,'/mijn-leven'), /DUPLICATE/);
assert.throws(()=>installDesktopHomeLayout(original.replace('id="heroImage"','id="different"'),'/mijn-leven'), /SOURCE_DRIFT/);
console.log('TALERA_DESKTOP_HOME_STYLE_CONTRACT_PASS');

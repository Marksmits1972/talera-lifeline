import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const origin='https://talera-pwa-v62-mijn-profiel-20261101.mark-a39.workers.dev';
const legacy=await fetch(origin+'/app',{redirect:'manual',signal:AbortSignal.timeout(15000)});
assert.equal(legacy.status,302,'/app must redirect rather than return Core 404');
const location=legacy.headers.get('location');
assert.ok(location,'/app must provide a redirect destination');
const destination=new URL(location,origin);
assert.equal(destination.origin,origin,'redirect must remain on the same V62 PWA');
assert.equal(destination.pathname,'/present','redirect must open TALERA presentation');

const page=await fetch(destination,{redirect:'manual',signal:AbortSignal.timeout(15000)});
assert.equal(page.status,200,'/present should serve TALERA, not an API error');
assert.match(page.headers.get('content-type')||'',/text\/html/i);
const html=await page.text();
assert.match(html,/<html[\s>]/i);
assert.ok(!html.includes('{"error":"Niet gevonden"}'));
console.log('V62 /app -> /present redirect and TALERA page: OK');

const home=await fetch(origin+'/mijn-leven',{redirect:'manual',signal:AbortSignal.timeout(15000)});
assert.equal(home.status,200,'Mijn leven must serve the home page');
assert.match(home.headers.get('content-type')||'',/text\/html/i);
const homeHtml=await home.text();
assert.match(homeHtml,/id=["']navMore["']/,'Mijn leven must have its More navigation');
assert.match(homeHtml,/<style id="talera-v62-iphone-fit">/,
 'Mijn leven must include a single scoped iPhone layout fix');
assert.match(homeHtml,/touch-action:pan-y pinch-zoom/,
 'Pinch zoom must remain available on iPhone instead of being blocked');
assert.match(homeHtml,/--talera-v62-visual-width/,
 'Home sheet, hero and three-tab navigation must use the visual viewport');
assert.match(homeHtml,/<script id="talera-v62-iphone-fit-script">/,
 'iOS should resize the home layout when the visual viewport changes');
assert.doesNotMatch(html,/id="talera-v62-iphone-fit"/,
 'The main home layout fix must not modify the presentation page');
const getMenuTag=html=>{
 const tags=[...html.matchAll(/src=["'](\/__clean\/menu-integration\.mjs\?v=[a-z0-9]+)["']/g)].map(m=>m[1]);
 assert.equal(tags.length,1,'TALERA page must load one versioned menu; saw '+JSON.stringify((html.match(/.{0,90}menu-integration[.]mjs.{0,90}/g)||[]).slice(0,3)));
 return tags[0];
};
const homeTag=getMenuTag(homeHtml);
const presentTag=getMenuTag(html);
assert.equal(homeTag,presentTag,'Mijn leven and /present must load the same menu revision');
const menu=await fetch(origin+homeTag,{cache:'no-store',signal:AbortSignal.timeout(15000)});
assert.equal(menu.status,200,'The canonical More menu source must be served');
assert.match(menu.headers.get('content-type')||'',/javascript/i);
const menuSource=await menu.text();
assert.match(menuSource,/premium-cloud-consent/);
assert.match(menuSource,/data-action="premium-device-link"/,
 'Existing consent must offer one-time local account binding');
assert.match(menuSource,/rights\.accountId!==accountId/,
 'Local binding must first verify server-proven account identity');
assert.match(menuSource,/consent\.consent\?\.enabled!==true/,
 'Local binding must first verify the existing cloud consent');
assert.match(menuSource,/window\.visualViewport/,
 'iPhone menu must use the actual visible viewport when the page is zoomed');
assert.match(menuSource,/body\.scrollTop=preserveScroll/,
 'audit re-render must retain the current menu scroll position');
assert.match(menuSource,/data-premium-audit-status/,
 'the result of Controleer volledigheid must appear alongside its button');
assert.match(menuSource,/data-premium-audit-detail/,
 'V62 menu must include the latest local-only unsupported file diagnostics');
// New source-level UI copy must be tested at commit time: the staging
// deployment can occur after the GitHub push triggered this workflow.
const checkedInMenu=readFileSync(new URL('../src/mijn-talera/menu-integration.txt',import.meta.url),'utf8');
assert.match(checkedInMenu,/TALERA Free \+ Premium-testtoegang/,
 'Temporary Premium cloud access must not be mistaken for Free-only status');
assert.match(checkedInMenu,/Geen betaald abonnement/,
 'Test access must not be presented as a paid subscription');
assert.match(menuSource,/Controleren…/,
 'the completeness button must show visible progress');
console.log('V62 Mijn leven menu scales to mobile and displays audit progress/results: OK');


const updatedSource=readFileSync(new URL('../src/mijn-talera/menu-integration.txt',import.meta.url),'utf8');
assert.equal(menuSource,updatedSource,'the live V62 menu must match the new deployed source byte-for-byte');
assert.match(menuSource,/data-action="premium-cloud-integrity"/,'live menu must offer read-only cloud verification');
assert.match(menuSource,/data-premium-local-archive="empty"/,'live menu must hide relink in an empty browser');
assert.match(menuSource,/premiumSyncUi\.cloudIntegrity\?\.cloudBytesVerified===true/,'restore must be gated behind byte verification');
assert.doesNotMatch(menuSource,/De cloudtoestemming is al gegeven\. Koppel nu één keer de lokale herinneringen/,'stale pre-release menu must not be served');
const integrity=await fetch(origin+'/__clean/premium-cloud-integrity.mjs',{cache:'no-store',signal:AbortSignal.timeout(15000)});
assert.equal(integrity.status,200,'new read-only cloud verification module must be served');
assert.match(await integrity.text(),/verifyPremiumCloudBytesReadOnly/);
console.log('V62 live cloud-integrity module and canonical updated menu: OK');

import assert from 'node:assert/strict';

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
const getMenuTag=html=>{
 const tags=[...html.matchAll(/src=["'](\/__clean\/menu-integration\.mjs\?v=[a-z0-9]+)["']/g)].map(m=>m[1]);
 assert.equal(tags.length,1,'TALERA page must load exactly one versioned canonical menu');
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
assert.match(menuSource,/Controleren…/,
 'the completeness button must show visible progress');
console.log('V62 Mijn leven menu scales to mobile and displays audit progress/results: OK');

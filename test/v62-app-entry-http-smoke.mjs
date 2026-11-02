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
const integrations=homeHtml.match(/src=["']\/__clean\/menu-integration\.mjs["']/g)||[];
assert.equal(integrations.length,1,'Mijn leven must load exactly one canonical menu in-place');
const menu=await fetch(origin+'/__clean/menu-integration.mjs',{signal:AbortSignal.timeout(15000)});
assert.equal(menu.status,200,'The canonical More menu source must be served');
assert.match(menu.headers.get('content-type')||'',/javascript/i);
assert.match(await menu.text(),/premium-cloud-consent/);
console.log('V62 Mijn leven opens the canonical More menu in-place: OK');

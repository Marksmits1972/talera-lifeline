// Tests the exact 7-November Worker with its original account backend mocked.
// No new Worker/hostname, no personal memories, and no server media upload.
import assert from 'node:assert/strict';
import worker from './account-birthdate-worker.mjs';
import {localBackupPage,BACKUP_STATIC_MODULES} from './account-backup-bundle.mjs';
const acc='11111111-1111-4111-8111-111111111111';
const origin='https://talera-account-birthdate-test-20261107.mark-a39.workers.dev';
const legacy='talera-lifeline-dev-local-v1';
const cookie='talera_sid=local-test-only';
const upstream={fetch:async req=>{
 const path=new URL(req.url).pathname;
 if(path==='/api/me')return Response.json({account:{id:acc}});
 return new Response('ORIGINAL_UNTOUCHED_RESPONSE',{status:200,headers:{'content-type':'text/plain'}});
}};
const env={TALERA_BASE:upstream};
const get=(path,auth=true,method='GET')=>worker.fetch(new Request(origin+path,{
 method,headers:auth?{cookie}:{}
}),env);
assert.equal((await get('/__f5/backup',false)).status,401);
assert.equal((await get('/__f5/f5-portable-idb.mjs',false)).status,401);
assert.equal((await get('/__f5/backup?db=another')).status,404);
assert.equal((await get('/__f5/backup',true,'POST')).status,405);
const page=await get('/__f5/backup');
assert.equal(page.status,200);
const html=await page.text();
assert.ok(html.includes('data-database="'+legacy+'"'));
assert.ok(html.includes('data-account-id="'+acc+'"'));
assert.ok(html.includes('Back-up maken')&&html.includes('Herstel herinneringen'));
assert.ok(html.includes('niet versleuteld'));
assert.ok(html.includes('f5/backup-controller.mjs'));
assert.equal(page.headers.get('cache-control'),'private, no-store');
for(const [path,source] of Object.entries(BACKUP_STATIC_MODULES)){
 assert.equal((await get(path)).status,200,path);
 assert.equal(await (await get(path)).text(),source,path);
}
assert.equal((await get('/mijn-leven')).status,200);
assert.equal(await (await get('/mijn-leven')).text(),'ORIGINAL_UNTOUCHED_RESPONSE');
assert.ok(!BACKUP_STATIC_MODULES['/__f5/f5-portable-archive.mjs'].includes('/api/'));
assert.ok(!BACKUP_STATIC_MODULES['/__f5/f5-portable-idb.mjs'].includes('indexedDB.deleteDatabase'));
assert.ok(BACKUP_STATIC_MODULES['/__f5/f5-portable-idb.mjs'].includes("name!==SOURCE_LEGACY"));
assert.ok(BACKUP_STATIC_MODULES['/__f5/backup-controller.mjs'].includes("accountId.toLowerCase()!==initialAccount.toLowerCase()"));
assert.ok(html.includes('Je huidige herinneringen blijven op dit toestel staan'));
assert.throws(()=>localBackupPage('talera-free-local-fake-v1',acc),/TALERA_BACKUP_NO_VERIFIED_LOCAL_SCOPE/);
// Test the real original 7-Nov base-menu *before* touching the approved
// Worker: no second menu, no visual rework, exactly one new Storage action.
const upstreamMenuUrl='https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/__clean/menu-integration.mjs';
const upstreamMenuResponse=await fetch(upstreamMenuUrl,{redirect:'error',signal:AbortSignal.timeout(20000)});
assert.equal(upstreamMenuResponse.status,200,'Approved base menu source must be reachable');
const originalMenu=await upstreamMenuResponse.text();
assert.ok(originalMenu.includes("option('storage','▤','Opslag en back-up'"));
const menuEnv={TALERA_BASE:{fetch:async req=>{
 if(new URL(req.url).pathname==='/__clean/menu-integration.mjs')
  return new Response(originalMenu,{status:200,headers:{'content-type':'text/javascript'}});
 return upstream.fetch(req);
}}};
const actualMenuResponse=await worker.fetch(new Request(origin+'/__clean/menu-integration.mjs'),menuEnv);
assert.equal(actualMenuResponse.status,200,'Original source-exact menu linking must succeed');
const actualMenu=await actualMenuResponse.text();
new Function(actualMenu);
assert.equal(actualMenu.split('data-action="open-backup"').length-1,1);
assert.ok(actualMenu.includes("window.location.assign('/__f5/backup')"));
assert.ok(actualMenu.includes('data-action="storage-refresh"'));
assert.ok(actualMenu.includes('birthDate:data.birthDate'));
assert.ok(actualMenu.includes('Mijn abonnement'));
assert.ok(actualMenu.includes('Bekijk opslag en back-up')===false);
assert.ok(!actualMenu.includes('Reservekopie en herstel worden nog ontwikkeld.'));
console.log('TALERA_7NOV_ORIGINAL_MENU_EXACT_ONE_BACKUP_ACTION_PASS');
console.log('TALERA_7NOV_ONLY_STORAGE_BACKUP_BOUNDARY_PASS');

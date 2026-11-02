import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const cloud=readFileSync(new URL('../src/mijn-talera/premium-cloud-selection.txt',import.meta.url),'utf8');
const menu=readFileSync(new URL('../src/mijn-talera/menu-integration.txt',import.meta.url),'utf8');
const worker=readFileSync(new URL('../src/mijn-talera/worker.js',import.meta.url),'utf8');
const backup=readFileSync(new URL('../src/mijn-talera/free-backup.txt',import.meta.url),'utf8');

test('existing Mijn TALERA menu and Premium selection are syntactically valid',()=>{
 assert.doesNotThrow(()=>new Function(menu));
 assert.doesNotThrow(()=>new Function(cloud));
});
test('premium cloud code is only exposed from the existing PWA router',()=>{
 assert.match(worker,/import premiumCloudSource from "\.\/premium-cloud-selection\.txt"/);
 assert.match(worker,/url\.pathname === "\/__clean\/premium-cloud\.js"/);
 assert.match(menu,/script\.src='\/__clean\/premium-cloud\.js'/);
 assert.match(menu,/premiumState\.rights\?\.available\?\.cloud_storage!==true/);
 assert.match(menu,/premiumState\.rights\?\.permissions\?\.cloud_storage!==true/);
});
test('upload is only triggered by direct user action and deliberate consent',()=>{
 assert.match(cloud,/save\.addEventListener\('click'/);
 assert.match(cloud,/window\.confirm\(/);
 assert.match(cloud,/consent:true,memory:record,media/);
 assert.match(cloud,/const res=await fetch\(url,options\)/);
 assert.doesNotMatch(cloud,/addEventListener\('load',.+fetch/);
});
test('no copy of Free and no writes to local IndexedDB',()=>{
 assert.match(cloud,/const DB='talera-lifeline-dev-local-v1'/);
 assert.match(cloud,/db\.transaction\('stories','readonly'\)/);
 assert.doesNotMatch(cloud,/indexedDB\.deleteDatabase|objectStore\('stories'\)\.(put|add|delete)|'readwrite'/);
 assert.match(cloud,/record\.id!==id/);
 assert.match(cloud,/record\.items\.length>7/);
 assert.match(cloud,/saveOriginalMedia\(id,item\)/);
 assert.match(cloud,/TaleraMemories\?\.blob\?\./);
});
test('Free backup still exposes local archive and restore, untouched by Premium',()=>{
 assert.match(worker,/import backupSource from "\.\/free-backup\.txt"/);
 assert.match(worker,/url\.pathname === "\/__clean\/free-backup\.js"/);
 assert.match(backup,/TALERA_FREE_BACKUP/);
 assert.doesNotMatch(backup,/premium-private-memory|premium-cloud-selection/);
});
test('account switching invalidates pending Premium UI operations',()=>{
 assert.match(menu,/window\.TaleraPremiumCloud\?\.reset\?\.\(\)/);
 assert.match(cloud,/generation===epoch/);
 assert.match(cloud,/if\(!valid\(\)\)return/);
});

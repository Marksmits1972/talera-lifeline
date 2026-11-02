import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const client=readFileSync(new URL('../src/mijn-talera/premium-cloud-selection.txt',import.meta.url),'utf8');
const server=readFileSync(new URL('../src/core/premium-private-memory.js',import.meta.url),'utf8');
const media=readFileSync(new URL('../src/core/premium-private-media.js',import.meta.url),'utf8');
const menu=readFileSync(new URL('../src/mijn-talera/menu-integration.txt',import.meta.url),'utf8');

test('second-device restore modules are syntactically valid',()=>{
 assert.doesNotThrow(()=>new Function(client));
 assert.doesNotThrow(()=>new Function(server));
 assert.doesNotThrow(()=>new Function(media));
});
test('account-scoped cloud list is gated, paginated and only includes complete manifests',()=>{
 assert.match(server,/const privateMemoryListRoute='\/api\/me\/premium\/cloud\/memories'/);
 assert.match(server,/PREMIUM_PRIVATE_MEMORY_ENABLED!=='true'/);
 assert.match(server,/privateMemoryList\(env,user,u\)/);
 assert.match(server,/prefix='private\/v1\/'\+user\.id\+'\/'/);
 assert.match(server,/delimiter:'\/',limit:20/);
 assert.match(server,/privateMemoryManifestMatches\(saved\.memory,saved\.media\)/);
 assert.match(server,/privateMediaConfirmed\(env,user,saved\.memoryId,saved\.media\)/);
});
test('restore is user-initiated, confirms consent and verifies all original media',()=>{
 assert.match(client,/list\.addEventListener\('click'/);
 assert.match(client,/restore\.addEventListener\('click'/);
 assert.match(client,/window\.confirm\('Deze cloudherinnering/);
 assert.match(client,/restoreManifestValid\(payload,id\)/);
 assert.match(client,/blob\.size!==item\.size\|\|await checksum\(blob\)!==item\.sha256/);
 assert.match(client,/RESTORE_LIMIT=160\*1048576/);
});
test('local restoration is atomic and refuses duplicate memories or blobs',()=>{
 assert.match(client,/db\.transaction\(\['stories','files'\],'readwrite'\)/);
 assert.match(client,/stories\.add\(memory\)/);
 assert.match(client,/files\.add\(\{key:file\.key,blob:file\.blob\}\)/);
 assert.doesNotMatch(client,/stories\.put\(memory\)|files\.put\(/);
 assert.match(client,/if\(existing\)throw Error\('Deze herinnering staat al op dit toestel/);
});
test('same TALERA database, Free backup untouched and inactive until server ready',()=>{
 assert.match(client,/const DB='talera-lifeline-dev-local-v1'/);
 assert.match(menu,/premiumState\.rights\?\.available\?\.cloud_storage!==true/);
 assert.match(menu,/TaleraFreeBackup\?\.render\(body\)/);
 assert.doesNotMatch(client,/indexedDB\.deleteDatabase/);
});
test('uploaded media cannot be returned as executable inline web content',()=>{
 assert.match(media,/content-disposition':'attachment/);
 assert.match(media,/content-security-policy':'sandbox'/);
 assert.match(media,/\(\?:svg\|xml\|html\|javascript/);
 assert.match(client,/\(\?:svg\|xml\|html\|javascript/);
});

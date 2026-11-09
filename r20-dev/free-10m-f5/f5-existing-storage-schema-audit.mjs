// Read-only approved local memory schema/IO audit. Public HTML source only.
// Never opens any customer's database; never changes app/player/Worker.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync('r20-dev/free-10m-delivery/generated/reference-tell.html','utf8');
const count=t=>source.split(t).length-1;
assert.equal(count('talera-memory-store-v1'),1);
for(const label of [
 'var DB_NAME=','createObjectStore(','.createObjectStore(',
 'async function save(', 'async function list(', 'async function get(',
 'window.TaleraMemories=','TaleraMemories =','function fileStore(',
 "transaction(['stories'","transaction('stories'",
 'objectStore("stories")',"objectStore('stories')",
 'objectStore("files")',"objectStore('files')",
 'getAll(', 'async function blob(',
 'async function dbOpen('
]){
 const positions=[];
 let at=-1;
 while((at=source.indexOf(label,at+1))>=0){positions.push(at);if(positions.length>=15)break}
 console.log('TALERA_F5_SOURCE_SCHEMA',JSON.stringify({label,hits:positions.length,contexts:positions.slice(0,8).map(p=>source.slice(Math.max(0,p-230),Math.min(source.length,p+1050)).replace(/\s+/g,' '))}));
}
console.log('TALERA_F5_SOURCE_STORAGE_AUDIT_COMPLETE');

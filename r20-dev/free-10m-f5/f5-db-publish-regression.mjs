// Regression for the ACTUAL iPhone publish error: V61 media-ID writer and
// TaleraMemories.get() must refer to the same per-account IndexedDB database.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {scopeLocalMemories} from './f5-local-scope.mjs';
const basename='talera-lifeline-dev-local-v1';
const privateA='talera-free-local-'+('a'.repeat(32))+'-v1';
const privateB='talera-free-local-'+('b'.repeat(32))+'-v1';
const count=(source,needle)=>source.split(needle).length-1;
for(const page of ['mijn-leven','present','tell']){
 const html=readFileSync('r20-dev/free-10m-delivery/generated/reference-'+page+'.html','utf8');
 const original=count(html,basename);
 assert.ok(original>=1,'Original PWA must contain the memory store DB marker: '+page);
 const a=scopeLocalMemories(html,'a'.repeat(64));
 const b=scopeLocalMemories(html,'b'.repeat(64));
 assert.equal(count(a,basename),0,'No legacy shared DB access in account A: '+page);
 assert.equal(count(b,basename),0,'No legacy shared DB access in account B: '+page);
 assert.equal(count(a,privateA),original,'All independent IndexedDB references must be rewritten in '+page);
 assert.equal(count(b,privateB),original,'All independent IndexedDB references must be rewritten in '+page);
 assert.ok(a.includes("var DB_NAME='"+privateA+"'"),'Story save/get store must be account-scoped');
 assert.ok(!a.includes(privateB),'Account A must never link to account B store');
 if(page==='tell'){
  assert.equal(original,3,'Approved Tell page must use exactly 3 local DB handles');
  assert.ok(a.includes("const DB='"+privateA+"'"),'Editor and its dbOpen must use the scoped store');
  assert.ok(a.includes("narrationSchema:'media-id-v1'"),'Original ID-cue writer must be retained');
  assert.ok(a.includes("Het tijdschema met media-ID’s kon niet worden teruggelezen."),
    'Original strict media-ID readback verification must remain in place');
  const components=[
   a.includes('talera-v9-complete-delete'),
   a.includes('talera-memory-store-v1'),
   a.includes('async function taleraV61PersistMediaIds(')
  ];
  assert.ok(components.every(Boolean),'Legacy deletion, private story store and cue writer must remain intact');
 }
 console.log('TALERA_FREE_SCOPED_DB_ALIGNMENT',JSON.stringify({
   page,approvedDbReferences:original,allReferencesPrivate:true,
   noSharedLegacyDatabase:true,otherAccountIsolated:true
 }));
}

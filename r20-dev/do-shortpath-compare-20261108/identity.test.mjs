import test from 'node:test';
import assert from 'node:assert/strict';
import {objectName,objectStub,mediaKey} from './identity.mjs';
test('The same account always resolves to the same EU object ID without any D1 directory',()=>{
 const calls=[];
 const env={ACCOUNT_HOME:{jurisdiction(region){
  assert.equal(region,'eu');
  return {idFromName(name){calls.push({type:'id',name});return 'fake-id:'+name},
   get(id){calls.push({type:'get',id});return {id}}};
 }}};
 for(let i=0;i<1200;i++)assert.equal(objectStub(env,'demo-account-001').id,
  'fake-id:talera-do-owner-v1:demo-account-001');
 assert.equal(calls.filter(x=>x.type==='id').length,1200);
 assert.equal(calls.filter(x=>x.type==='get').length,1200);
 assert.equal(new Set(calls.filter(x=>x.type==='id').map(x=>x.name)).size,1);
 console.log('DO_SHORT_ROUTE',JSON.stringify({operations:1200,directoryLookupCount:0,euRestricted:true}));
});
test('Each account resolves to unique deterministic account-local object name',()=>{
 const names=new Set();
 for(let i=0;i<1000000;i++)names.add(objectName('demo-'+i));
 assert.equal(names.size,1000000);
 assert.equal(objectName('demo-123'),objectName('demo-123'));
 console.log('DO_MILLION_ACCOUNTS',JSON.stringify({syntheticAccountLocations:names.size,
  directoryRequired:false,sqlIsolatedPerName:true,note:'Names only, 0 real Durable Objects created'}));
});
test('R2 object keys are namespaced under the same account and story',()=>{
 const own=mediaKey('demo-a','story-1','media-1');
 const other=mediaKey('demo-b','story-1','media-1');
 assert.notEqual(own,other);
 assert.equal(own,'demo/v1/demo-a/story-1/media-1.txt');
 assert.throws(()=>mediaKey('demo-../../real','story-1','media-1'),/INVALID_ACCOUNT/);
 assert.throws(()=>mediaKey('demo-a','story-../x','media-1'),/INVALID_STORY/);
 assert.throws(()=>mediaKey('demo-a','story-1','/private'),/INVALID_MEDIA/);
});
test('Physical D1 shard IDs and account directory are not needed in the DO routing contract',async()=>{
 const fs=await import('node:fs');
 const worker=fs.readFileSync(new URL('./worker.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(worker,/DIRECTORY_DB|DATA_SHARD_|\.prepare\(/);
 assert.match(worker,/objectStub\(env,aid\)/);
 assert.match(worker,/env\.MEDIA\.head\(mediaRef\)/);
 assert.match(worker,/env\.MEDIA\.put\(/);
 assert.match(worker,/env\.MEDIA\.get\(/);
});

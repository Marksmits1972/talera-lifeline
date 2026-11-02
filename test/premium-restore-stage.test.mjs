import test from 'node:test';
import assert from 'node:assert/strict';
import {createPremiumRestoreStage} from '../src/mijn-talera/premium-restore-stage.mjs';
const id='2fb6aa18-b2c1-49b5-a287-e33f384a9042',account='a8f08aa9-a0a2-4ce3-a179-44fb758d1102';
function storageFixture(){
 const dirs=new Map();
 const makeDir=()=>{
  const sub=new Map(),files=new Map();
  return {
   async getDirectoryHandle(name,{create}={}){
    if(!sub.has(name)&&create)sub.set(name,makeDir());
    if(!sub.has(name))throw Error('not_found');return sub.get(name);
   },
   async getFileHandle(name,{create}={}){
    if(!files.has(name)&&create)files.set(name,{blob:new Blob([])});
    if(!files.has(name))throw Error('not_found');
    const item=files.get(name);
    return {
     async getFile(){return item.blob},
     async createWritable(){
      const chunks=[];return {async write(data){chunks.push(data)},async close(){item.blob=new Blob(chunks)},async abort(){}};
     }
    };
   },
   async removeEntry(name){if(!files.delete(name)&&!sub.delete(name))throw Error('not_found')},
   files,sub
  };
 };
 const root=makeDir();
 return {storage:{getDirectory:async()=>root},root};
}
test('a completed private staging file is reverified and reused without redownloading',async()=>{
 const source=new Uint8Array([1,2,3,4,5]);
 const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',source))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const item={media_id:id,source_key:'photo-1',content_type:'image/jpeg',byte_size:source.length,sha256:sha,digest_kind:'full-sha256'};
 const fs=storageFixture();let calls=0;
 const fetcher=async(_url,{headers})=>{
  calls++;assert.equal(headers.range,'bytes=0-4');
  return new Response(source,{status:206,headers:{'content-range':'bytes 0-4/5'}});
 };
 const stage=await createPremiumRestoreStage({storage:fs.storage,crypto,fetcher,accountId:account,active:()=>true});
 const first=await stage.stage(item);
 assert.equal(first.value.blob.size,5);assert.equal(calls,1);
 const again=await stage.stage(item);
 assert.equal(again.value.blob.size,5);assert.equal(calls,1);
 // Tamper with the retained stage without changing its size: never trust a cached file.
 const folder=fs.root.sub.get('talera-premium-restore-stage-v1').sub.get(account);
 folder.files.get(id).blob=new Blob([new Uint8Array([9,9,9,9,9])]);
 const repaired=await stage.stage(item);
 assert.equal(repaired.value.blob.size,5);assert.equal(calls,2);
 await stage.cleanup([item]);
 assert.equal(folder.files.size,0);
});
test('account change blocks staging before contacting private cloud',async()=>{
 let calls=0;
 const fs=storageFixture();
 const stage=await createPremiumRestoreStage({storage:fs.storage,crypto,
  fetcher:async()=>{calls++;throw Error('unexpected')},accountId:account,active:()=>false});
 await assert.rejects(stage.stage({media_id:id,source_key:'photo',content_type:'image/jpeg',
  byte_size:1,sha256:'0'.repeat(64),digest_kind:'full-sha256'}),/account_changed/);
 assert.equal(calls,0);
});

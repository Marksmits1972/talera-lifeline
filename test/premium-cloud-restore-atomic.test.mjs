import test from 'node:test';
import assert from 'node:assert/strict';
import {restorePremiumCloudAtomic,CLOUD_RESTORE_ATOMIC_LIMIT} from '../src/mijn-talera/premium-cloud-restore-atomic.mjs';
import {createPremiumRecordSnapshot} from '../src/mijn-talera/premium-records-bridge.mjs';
import {createPremiumManifest} from '../src/mijn-talera/premium-indexeddb-bridge.mjs';
import {createLargeMediaManifest} from '../src/mijn-talera/premium-large-media.mjs';

const account='a8f08aa9-a0a2-4ce3-a179-44fb758d1102';
const sha=async(bytes)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
function localDatabase({stories=[],files=[]}={}){
 const data={stories:new Map(stories.map(x=>[x.id,x])),files:new Map(files.map(x=>[x.key,x]))};
 let writes=0,aborts=0;
 const requests={};
 const reqResult=value=>{const r={};queueMicrotask(()=>{r.result=value;r.onsuccess?.()});return r};
 const local={
  open(_name,version){
   assert.equal(version,1);
   const req={};queueMicrotask(()=>{
    const db={
     objectStoreNames:{contains:name=>Object.hasOwn(data,name)},
     createObjectStore(name){data[name]=new Map();return {}},
     transaction(names,mode){
      const staged=[],tx={};
      tx.objectStore=name=>({
       count(){return reqResult(data[name].size)},
       add(record){
        if(mode!=='readwrite')throw Error('read_only');
        staged.push({name,record});
       }
      });
      if(mode==='readwrite')queueMicrotask(()=>{
       if(tx.aborted)return;
       const seen=new Set(),collision=staged.some(({name,record})=>{
        const key=record[name==='stories'?'id':'key'];const ix=name+':'+key;
        if(data[name].has(key)||seen.has(ix))return true;
        seen.add(ix);return false;
       });
       if(collision){tx.error=Error('duplicate_key');aborts++;tx.onabort?.()}
       else{for(const {name,record} of staged){const key=record[name==='stories'?'id':'key'];data[name].set(key,record);writes++}tx.oncomplete?.()}
      });
      tx.abort=()=>{tx.aborted=true;aborts++;tx.onabort?.()};
      return tx;
     },
     close(){}
    };
    req.result=db;
    if(!requests.ever){requests.ever=true;req.onupgradeneeded?.()}
    req.onsuccess?.();
   });return req;
  }
 };
 return {indexedDB:local,data,stats:()=>({writes,aborts})};
}
async function fixture({mismatch=false,broken=false,orphan=false,oversize=false}={}){
 const photoBytes=new Uint8Array([1,2,3,4,5,6]);
 const media={key:'photo-1',blob:new Blob([photoBytes],{type:'image/jpeg'}),size:photoBytes.length,mime:'image/jpeg'};
 const mid=(await createPremiumManifest(media,{crypto})).mediaId;
 const comment={localId:'story-1',comment:{id:'comment-1',body:'Een herinnering',display_name:'Tester',created_at:123,guest:false}};
 const story={id:'story-1',title:'Mijn verhaal',items:[{key:orphan?'missing-photo':'photo-1'}]};
 const recordList=await Promise.all([
  createPremiumRecordSnapshot({kind:'story',sourceKey:'story:'+story.id,record:story},{crypto}),
  createPremiumRecordSnapshot({kind:'comment_archive',sourceKey:'talera-thread-archive-v1:story-1:comment-1',record:comment},{crypto})
 ]);
 const remoteMedia={media_id:mid,source_key:'photo-1',byte_size:oversize?CLOUD_RESTORE_ATOMIC_LIMIT+1:photoBytes.length,
  content_type:'image/jpeg',sha256:await sha(photoBytes),digest_kind:'full-sha256'};
 const remoteRecords=recordList.map(x=>({record_id:x.id,kind:x.kind,sha256:x.sha256,byte_size:x.bytes.length}));
 const fetcher=async(path,opt={})=>{
  const body=path==='/api/me/entitlements'?{accountId:mismatch?'f5cbaefc-d7d8-4a3a-a334-b93d0a08d170':account,
   rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}}:
   path==='/api/premium/cloud/consent'?{consent:{enabled:true}}:
   path==='/api/premium/cloud/media'?{ok:true,items:[remoteMedia],next:null}:
   path==='/api/premium/cloud/records'?{ok:true,items:remoteRecords,next:null}:null;
  if(body)return Response.json(body);
  if(path==='/api/premium/cloud/media/'+mid){
   const bytes=broken?new Uint8Array([1,2,3,4,5,8]):photoBytes;
   return new Response(bytes,{status:206,headers:{'content-range':'bytes 0-5/6'}});
  }
  for(const snap of recordList){
   if(path==='/api/premium/cloud/records/'+snap.kind+'/'+snap.id)return new Response(snap.bytes,{status:200});
  }
  throw Error('unexpected API call '+path);
 };
 return {fetcher,remoteMedia,remoteRecords};
}
test('explicitly approved restore atomically adds one story, one comment and one photo into empty Free DB',async()=>{
 const db=localDatabase(),fx=await fixture();
 const result=await restorePremiumCloudAtomic({indexedDB:db.indexedDB,crypto,fetcher:fx.fetcher,
  expectedAccountId:account,accountMatches:()=>true,approval:true});
 assert.deepEqual(result,{phase:'restored',restored:true,stories:1,comments:1,media:1});
 assert.equal(db.data.stories.get('story-1').title,'Mijn verhaal');
 assert.equal(db.data.files.get('photo-1').blob.size,6);
 const comment=JSON.parse(await db.data.files.get('talera-thread-archive-v1:story-1:comment-1').blob.text());
 assert.equal(comment.comment.body,'Een herinnering');assert.equal(db.stats().writes,3);
});
test('without user approval, no network or database is accessed',async()=>{
 let n=0;
 const r=await restorePremiumCloudAtomic({indexedDB:{open(){n++}},crypto,fetcher:async()=>{n++},expectedAccountId:account,accountMatches:()=>true});
 assert.equal(r.phase,'approval_required');assert.equal(n,0);
});
test('never overwrites nonempty Free archive',async()=>{
 const db=localDatabase({stories:[{id:'existing'}]}),fx=await fixture();
 await assert.rejects(restorePremiumCloudAtomic({indexedDB:db.indexedDB,crypto,fetcher:fx.fetcher,
  expectedAccountId:account,accountMatches:()=>true,approval:true}),/local_archive_not_empty/);
 assert.equal(db.stats().writes,0);assert.equal(db.data.stories.size,1);
});
test('damaged remote photo causes no partial writes',async()=>{
 const db=localDatabase(),fx=await fixture({broken:true});
 await assert.rejects(restorePremiumCloudAtomic({indexedDB:db.indexedDB,crypto,fetcher:fx.fetcher,
  expectedAccountId:account,accountMatches:()=>true,approval:true}),/cloud_checksum_mismatch/);
 assert.equal(db.stats().writes,0);assert.equal(db.data.stories.size,0);
});
test('missing media referenced by a story is rejected before any writes',async()=>{
 const db=localDatabase(),fx=await fixture({orphan:true});
 await assert.rejects(restorePremiumCloudAtomic({indexedDB:db.indexedDB,crypto,fetcher:fx.fetcher,
  expectedAccountId:account,accountMatches:()=>true,approval:true}),/story_media_missing/);
 assert.equal(db.stats().writes,0);
});
test('a falsely declared 64 MiB full-hash photo is rejected without touching Free data',async()=>{
 const db=localDatabase(),fx=await fixture({oversize:true});
 await assert.rejects(restorePremiumCloudAtomic({indexedDB:db.indexedDB,crypto,fetcher:fx.fetcher,
  expectedAccountId:account,accountMatches:()=>true,approval:true}),/cloud_restore_not_supported/);
 assert.equal(db.stats().writes,0);
});
test('wrong signed-in account is denied before IndexedDB is opened',async()=>{
 const db=localDatabase(),fx=await fixture({mismatch:true});
 const result=await restorePremiumCloudAtomic({indexedDB:db.indexedDB,crypto,fetcher:fx.fetcher,
  expectedAccountId:account,accountMatches:()=>true,approval:true});
 assert.equal(result.phase,'not_ready');assert.equal(db.stats().writes,0);
});
test('account switch aborts before any writes even after preflight',async()=>{
 const db=localDatabase(),fx=await fixture();let visits=0;
 await assert.rejects(restorePremiumCloudAtomic({indexedDB:db.indexedDB,crypto,fetcher:fx.fetcher,
  expectedAccountId:account,accountMatches:()=>++visits<3,approval:true}),/account_changed/);
 assert.equal(db.stats().writes,0);
});

function fakePrivateFileStorage(){
 let writes=0,cleaned=0;
 function folder(){
  const subfolders=new Map(),files=new Map();
  return {
   async getDirectoryHandle(name,{create}={}){if(!subfolders.has(name)&&create)subfolders.set(name,folder());if(!subfolders.has(name))throw Error('not_found');return subfolders.get(name)},
   async getFileHandle(name,{create}={}){if(!files.has(name)&&create)files.set(name,{blob:new Blob([])});
    if(!files.has(name))throw Error('not_found');
    const data=files.get(name);
    return {
     async getFile(){return data.blob},
     async createWritable(){
      const parts=[];
      return {
       async write(value){writes++;parts.push(new Uint8Array(value))},
       async close(){data.blob=new Blob(parts)},
       async abort(){}
      };
     }
    };
   },
   async removeEntry(name){if(files.delete(name)||subfolders.delete(name)){cleaned++;return}throw Error('not_found')}
  };
 }
 const root=folder();
 return {storage:{getDirectory:async()=>root},stats:()=>({writes,cleaned})};
}
test('26 MiB multipart video is staged privately, verified and atomically restored to Free',async()=>{
 const size=26*1024*1024+47;
 const contents=new Uint8Array(size);
 for(let i=0;i<contents.length;i+=32768)contents[i]=(i/32768)%255;
 const video={key:'movie-mp4',size,mime:'video/mp4',blob:new Blob([contents],{type:'video/mp4'})};
 const manifest=await createLargeMediaManifest(video,{crypto});
 const story={id:'movie-story',title:'A long movie',items:[{key:'movie-mp4'}]};
 const snapshot=await createPremiumRecordSnapshot({kind:'story',sourceKey:'story:movie-story',record:story},{crypto});
 const media={media_id:manifest.mediaId,source_key:video.key,byte_size:size,
  content_type:video.mime,sha256:manifest.fingerprint,digest_kind:'part-sha256-v1'};
 const record={record_id:snapshot.id,kind:'story',sha256:snapshot.sha256,byte_size:snapshot.bytes.byteLength};
 let downloaded=0;
 const fetcher=async(path,options={})=>{
  if(path==='/api/me/entitlements')return Response.json({accountId:account,rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}});
  if(path==='/api/premium/cloud/consent')return Response.json({consent:{enabled:true}});
  if(path==='/api/premium/cloud/media')return Response.json({ok:true,items:[media],next:null});
  if(path==='/api/premium/cloud/records')return Response.json({ok:true,items:[record],next:null});
  if(path==='/api/premium/cloud/records/story/'+snapshot.id)return new Response(snapshot.bytes);
  if(path==='/api/premium/cloud/media/'+manifest.mediaId){
   const range=/bytes=(\d+)-(\d+)/.exec(options.headers?.range||'');
   assert.ok(range);const from=Number(range[1]),to=Number(range[2]);downloaded++;
   return new Response(video.blob.slice(from,to+1),{status:206,
    headers:{'content-range':'bytes '+from+'-'+to+'/'+size}});
  }
  throw Error('unexpected cloud request '+path);
 };
 const db=localDatabase(),fs=fakePrivateFileStorage();
 const result=await restorePremiumCloudAtomic({indexedDB:db.indexedDB,crypto,fetcher,
  expectedAccountId:account,accountMatches:()=>true,storage:fs.storage,approval:true});
 assert.equal(result.phase,'restored');assert.equal(result.mode,'disk_staged');
 assert.equal(result.stories,1);assert.equal(result.media,1);
 assert.equal(db.data.files.get('movie-mp4').blob.size,size);
 assert.equal(db.data.stories.get('movie-story').id,'movie-story');
 assert.equal(db.stats().writes,2);
 assert.equal(downloaded,Math.ceil(size/(8*1024*1024)));
 assert.ok(fs.stats().cleaned>=1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {runPremiumMediaSync} from '../src/mijn-talera/premium-sync-coordinator.mjs';
import {runPremiumRecordSync} from '../src/mijn-talera/premium-records-coordinator.mjs';
const account='a8f08aa9-a0a2-4ce3-a179-44fb758d1102';
function local(){
 const data={stories:[{id:'life',title:'Version A',items:[{key:'photo'}]}],
  files:[{key:'photo',blob:new Blob([new Uint8Array([1,2,3])],{type:'image/jpeg'})}]};
 const db={objectStoreNames:{contains:key=>['stories','files'].includes(key)},
  transaction(_names,mode){
   assert.equal(mode,'readonly','sync must never mutate Free IndexedDB');
   return {objectStore:name=>({getAll(){
    const req={};queueMicrotask(()=>{req.result=data[name];req.onsuccess?.()});return req;
   }})};
  },close(){}};
 const indexedDB={open(_name,version){
  assert.equal(version,1);
  const req={};queueMicrotask(()=>{req.result=db;req.onsuccess?.()});return req;
 }};
 return {data,indexedDB};
}
function server(){
 const media=new Map(),records=new Map(),current=new Map(),calls=[];
 const getCurrent=(kind,key)=>current.get(kind+':'+key)||null;
 const items=(map,kind)=>[...map.values()].filter(row=>getCurrent(kind,row.sourceKey)?.id===row.id)
 .map(row=>kind==='media'?{
  media_id:row.id,source_key:row.sourceKey,content_type:'image/jpeg',byte_size:row.size,
  sha256:row.sha256,digest_kind:'full-sha256'
 }:{record_id:row.id,kind,byte_size:row.size,sha256:row.sha256});
 const fetcher=async(path,opts={})=>{
  calls.push({path,method:opts.method||'GET'});
  if(path==='/api/me/entitlements')return Response.json({accountId:account,
   rights:{permissions:{cloud_storage:true},available:{cloud_storage:true}}});
  if(path==='/api/premium/cloud/consent')return Response.json({consent:{enabled:true}});
  if(path==='/api/premium/cloud/media')return Response.json({ok:true,items:items(media,'media'),next:null});
  if(path==='/api/premium/cloud/records')return Response.json({ok:true,
   items:[...items(records,'story'),...items(records,'comment_archive')],next:null});
  if(path.startsWith('/api/premium/cloud/current?')){
   const kind=new URL('https://test.local'+path).searchParams.get('kind');
   return Response.json({ok:true,items:[...current].filter(([id])=>id.startsWith(kind+':'))
    .map(([id,row])=>({kind,source_key:id.slice(kind.length+1),current_id:row.id,revision:row.rev})),next:null});
  }
  if(path==='/api/premium/cloud/current'&&opts.method==='POST'){
   const request=JSON.parse(opts.body);
   const key=request.kind+':'+request.sourceKey,old=current.get(key)||null;
   if(old?.id===request.snapshotId)return Response.json({ok:true,reason:'already_current',revision:old.rev});
   if((old?.id||null)!==(request.expectedCurrentId||null))
    return Response.json({ok:false,reason:'current_changed'},{status:409});
   const available=request.kind==='media'?media:records;
   if(!available.has(request.snapshotId))return Response.json({ok:false,reason:'unregistered_source'},{status:409});
   const rev=(old?.rev||0)+1;
   current.set(key,{id:request.snapshotId,rev});
   return Response.json({ok:true,reason:old?'current_updated':'current_created',revision:rev});
  }
  const mp=/^\/api\/premium\/cloud\/media\/([0-9a-f-]{36})$/i.exec(path);
  if(mp&&opts.method==='PUT'){
   const bytes=new Uint8Array(opts.body);
   media.set(mp[1],{id:mp[1],sourceKey:decodeURIComponent(opts.headers['x-talera-local-key']),
    sha256:opts.headers['x-content-sha256'],size:bytes.length});
   return Response.json({ok:true,reason:'stored'});
  }
  const rp=/^\/api\/premium\/cloud\/records\/(story|comment_archive)\/([0-9a-f-]{36})$/i.exec(path);
  if(rp&&opts.method==='PUT'){
   const row=JSON.parse(new TextDecoder().decode(opts.body));
   records.set(rp[2],{id:rp[2],kind:rp[1],sourceKey:row.sourceKey,
    sha256:opts.headers['x-content-sha256'],size:opts.body.byteLength});
   return Response.json({ok:true,reason:'stored'});
  }
  throw Error('Unexpected route '+path+' '+(opts.method||'GET'));
 };
 return {fetcher,current,media,records,calls};
}
function device(source,cloud){
 const known=new Map();
 const getLastConfirmed=(kind,key)=>known.get(kind+':'+key)||null;
 const rememberLastConfirmed=(kind,key,id)=>known.set(kind+':'+key,id);
 const opts={indexedDB:source.indexedDB,crypto,fetcher:cloud.fetcher,
  expectedAccountId:account,ownerMatches:()=>true,getLastConfirmed,rememberLastConfirmed};
 return {opts,known};
}
test('create Free memory, cloud sync, edit same photo and story twice, still only one CURRENT per source',async()=>{
 const source=local(),cloud=server(),dev=device(source,cloud);
 let m=await runPremiumMediaSync(dev.opts),r=await runPremiumRecordSync(dev.opts);
 assert.equal(m.phase,'ready');assert.equal(r.phase,'ready');
 assert.equal(m.uploaded,1);assert.equal(r.uploaded,1);
 const beforePhoto=cloud.current.get('media:photo').id;
 const beforeStory=cloud.current.get('story:life').id;
 source.data.files[0].blob=new Blob([new Uint8Array([1,2,4])],{type:'image/jpeg'});
 source.data.stories[0].title='Version B';
 m=await runPremiumMediaSync(dev.opts);r=await runPremiumRecordSync(dev.opts);
 assert.equal(m.phase,'ready');assert.equal(r.phase,'ready');
 assert.equal(m.uploaded,1);assert.equal(r.uploaded,1);
 assert.notEqual(cloud.current.get('media:photo').id,beforePhoto);
 assert.notEqual(cloud.current.get('story:life').id,beforeStory);
 assert.equal(cloud.current.get('media:photo').rev,2);
 assert.equal(cloud.current.get('story:life').rev,2);
 source.data.files[0].blob=new Blob([new Uint8Array([9,8,7])],{type:'image/jpeg'});
 source.data.stories[0].title='Version C';
 m=await runPremiumMediaSync(dev.opts);r=await runPremiumRecordSync(dev.opts);
 assert.equal(m.phase,'ready');assert.equal(r.phase,'ready');
 assert.equal(cloud.current.get('media:photo').rev,3);
 assert.equal(cloud.current.get('story:life').rev,3);
 assert.equal(cloud.current.size,2);
 assert.equal(cloud.media.size,3,'old immutable history stays available');
 assert.equal(cloud.records.size,3);
 m=await runPremiumMediaSync(dev.opts);r=await runPremiumRecordSync(dev.opts);
 assert.equal(m.uploaded,0);assert.equal(r.uploaded,0);
});
test('second device with older Free photo/story cannot roll back current cloud memory',async()=>{
 const source=local(),cloud=server(),first=device(source,cloud);
 await runPremiumMediaSync(first.opts);await runPremiumRecordSync(first.opts);
 const staleSource=local(),stale=device(staleSource,cloud);
 source.data.files[0].blob=new Blob([new Uint8Array([8,8,8])],{type:'image/jpeg'});
 source.data.stories[0].title='New version';
 await runPremiumMediaSync(first.opts);await runPremiumRecordSync(first.opts);
 const old=Object.fromEntries([...cloud.current].map(([k,v])=>[k,v.id]));
 const m=await runPremiumMediaSync(stale.opts),r=await runPremiumRecordSync(stale.opts);
 assert.equal(m.phase,'attention');assert.equal(r.phase,'attention');
 assert.equal(m.reason,'remote_newer_version');assert.equal(r.reason,'remote_newer_version');
 assert.deepEqual(Object.fromEntries([...cloud.current].map(([k,v])=>[k,v.id])),old);
});
test('device with no baseline can adopt matching cloud version without writing',async()=>{
 const source=local(),cloud=server(),first=device(source,cloud);
 await runPremiumMediaSync(first.opts);await runPremiumRecordSync(first.opts);
 const second=device(source,cloud),writes=cloud.calls.filter(x=>x.method==='PUT').length;
 const m=await runPremiumMediaSync(second.opts),r=await runPremiumRecordSync(second.opts);
 assert.equal(m.uploaded,0);assert.equal(r.uploaded,0);
 assert.equal(second.known.size,2);
 assert.equal(cloud.calls.filter(x=>x.method==='PUT').length,writes);
});

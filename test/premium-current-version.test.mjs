import test from 'node:test';
import assert from 'node:assert/strict';
import {publishCurrentPremiumVersion,readCurrentPremiumVersion,validateCurrentVersion} from '../src/core/premium-current-version.mjs';

const account='a8f08aa9-a0a2-4ce3-a179-44fb758d1102';
const other='f5cbaefc-d7d8-4a3a-a334-b93d0a08d170';
const a='00000000-0000-4000-8000-000000000001';
const b='00000000-0000-4000-8000-000000000002';
const c='00000000-0000-4000-8000-000000000003';
function fakeD1(){
 const data=new Map(),queries=[];
 let onUpdate=null;
 const key=(accountId,kind,sourceKey)=>accountId+'|'+kind+'|'+sourceKey;
 const db={prepare(sql){return {bind(...args){return {
   async first(){
     queries.push({method:'first',sql,args});
     const row=data.get(key(...args));
     return row?{...row}:null;
   },
   async run(){
     queries.push({method:'run',sql,args});
     if(sql.startsWith('INSERT OR IGNORE')){
       const [accountId,kind,sourceKey,id,now]=args,k=key(accountId,kind,sourceKey);
       if(data.has(k))return {meta:{changes:0}};
       data.set(k,{current_id:id,revision:1,updated_at:now});
       return {meta:{changes:1}};
     }
     if(sql.startsWith('UPDATE talera_premium_current')){
       const [id,now,accountId,kind,sourceKey,expected,revision]=args;
       const k=key(accountId,kind,sourceKey);
       if(onUpdate){const update=onUpdate;onUpdate=null;update(data,k);}
       const row=data.get(k);
       if(row?.current_id!==expected||row?.revision!==revision)
        return {meta:{changes:0}};
       data.set(k,{current_id:id,revision:revision+1,updated_at:now});
       return {meta:{changes:1}};
     }
     throw Error('unexpected SQL');
   }
 };}}}};
 return {db,data,queries,setOnUpdate:fn=>{onUpdate=fn}};
}
const record=(db,snapshotId,expectedCurrentId=null,kind='story',sourceKey='story:life-1')=>
 publishCurrentPremiumVersion({db,accountId:account,kind,sourceKey,snapshotId,expectedCurrentId,now:1000});

test('first Free story creates one stable logical current pointer',async()=>{
 const fx=fakeD1();
 assert.deepEqual(await record(fx.db,a),{ok:true,reason:'current_created',revision:1});
 assert.deepEqual(await readCurrentPremiumVersion({db:fx.db,accountId:account,kind:'story',sourceKey:'story:life-1'}),{snapshotId:a,revision:1});
 assert.equal(fx.data.size,1);
});
test('replaying identical content is idempotent and revision remains unchanged',async()=>{
 const fx=fakeD1();
 await record(fx.db,a);
 assert.deepEqual(await record(fx.db,a),{ok:true,reason:'already_current',revision:1});
 assert.equal(fx.data.size,1);
});
test('edited story retains source key but switches exactly one current version',async()=>{
 const fx=fakeD1();
 await record(fx.db,a);
 assert.deepEqual(await record(fx.db,b,a),{ok:true,reason:'current_updated',revision:2});
 assert.deepEqual(await record(fx.db,c,b),{ok:true,reason:'current_updated',revision:3});
 assert.deepEqual(await readCurrentPremiumVersion({db:fx.db,accountId:account,kind:'story',sourceKey:'story:life-1'}),{snapshotId:c,revision:3});
 assert.equal(fx.data.size,1,'history can remain in immutable snapshots without creating extra current entries');
});
test('outdated device may not overwrite a newer photo',async()=>{
 const fx=fakeD1();
 const p=(id,expected)=>record(fx.db,id,expected,'media','photo-1');
 await p(a,null);
 await p(b,a);
 assert.deepEqual(await p(c,a),{ok:false,reason:'current_changed'});
 assert.deepEqual(await readCurrentPremiumVersion({db:fx.db,accountId:account,kind:'media',sourceKey:'photo-1'}),{snapshotId:b,revision:2});
});
test('lost update during compare-and-swap is rejected',async()=>{
 const fx=fakeD1();await record(fx.db,a);
 fx.setOnUpdate((state,key)=>state.set(key,{current_id:c,revision:2,updated_at:1001}));
 assert.deepEqual(await record(fx.db,b,a),{ok:false,reason:'current_changed'});
 assert.equal(fx.data.values().next().value.current_id,c);
});
test('two accounts can reuse same local story ID without sharing pointers',async()=>{
 const fx=fakeD1();await record(fx.db,a);
 const x=await publishCurrentPremiumVersion({db:fx.db,accountId:other,kind:'story',sourceKey:'story:life-1',snapshotId:b});
 assert.equal(x.ok,true);assert.equal(fx.data.size,2);
 assert.deepEqual(await readCurrentPremiumVersion({db:fx.db,accountId:other,kind:'story',sourceKey:'story:life-1'}),{snapshotId:b,revision:1});
});
test('media, story and comment archive are separated by kind',async()=>{
 const fx=fakeD1();
 await record(fx.db,a,null,'story','story:life-1');
 await record(fx.db,b,null,'media','story:life-1');
 await record(fx.db,c,null,'comment_archive','talera-thread-archive-v1:life-1:a');
 assert.equal(fx.data.size,3);
});
test('new version requires current id when a current pointer already exists',async()=>{
 const fx=fakeD1();await record(fx.db,a);
 assert.deepEqual(await record(fx.db,b),{ok:false,reason:'current_changed'});
 assert.deepEqual(await record(fx.db,b,c),{ok:false,reason:'current_changed'});
 assert.equal(fx.data.size,1);
});
test('invalid account, source, kind, control characters and id never touch D1',async()=>{
 const fx=fakeD1();
 const invalid=[
  {accountId:'not-account',kind:'story',sourceKey:'story:x',snapshotId:a},
  {accountId:account,kind:'video',sourceKey:'story:x',snapshotId:a},
  {accountId:account,kind:'story',sourceKey:'media:x',snapshotId:a},
  {accountId:account,kind:'story',sourceKey:'story:\u0000',snapshotId:a},
  {accountId:account,kind:'story',sourceKey:'story:x',snapshotId:'bad'},
  {accountId:account,kind:'media',sourceKey:'x'.repeat(241),snapshotId:a},
  {accountId:account,kind:'story',sourceKey:'story:x',snapshotId:a,expectedCurrentId:'bad'}
 ];
 for(const item of invalid){
  assert.equal(validateCurrentVersion(item),false);
  await assert.rejects(publishCurrentPremiumVersion({...item,db:fx.db}),/invalid_current_version/);
 }
 assert.equal(fx.queries.length,0);
});
test('unknown original test data returns no current pointer, without migration writes',async()=>{
 const fx=fakeD1();
 assert.equal(await readCurrentPremiumVersion({db:fx.db,accountId:account,kind:'story',sourceKey:'story:legacy'}),null);
 assert.equal(fx.queries.filter(x=>x.method==='run').length,0);
});

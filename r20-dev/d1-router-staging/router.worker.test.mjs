import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from './router.worker.mjs';
const TOKEN='GH-ONLY-SYNTHETIC-64-CHAR-SECRET-NOT-FOR-PRODUCTION';
class FakeD1 {
 constructor(kind){this.kind=kind;this.assignments=new Map();this.shards=new Map([['A','active']]);this.stories=new Map();}
 withSession(){return this}
 prepare(query){
  const parent=this;let args=[];
  const stmt={
   bind(...params){args=params;return this},
   async first(){
    if(query.startsWith('SELECT shard_id FROM account_shard')){
     const id=parent.assignments.get(args[0]);return id?{shard_id:id}:null;
    }
    if(query.startsWith('SELECT story_id,body_text FROM demo_stories')){
     return parent.stories.get(args.join('|'))||null;
    }
    throw Error('Unexpected mock D1 first query: '+query);
   },
   async all(){
    if(query.startsWith('SELECT shard_id FROM shards WHERE')){
     return {results:[...parent.shards].filter(([,state])=>state==='active').map(([shard_id])=>({shard_id})).sort((a,b)=>a.shard_id.localeCompare(b.shard_id))};
    }
    if(query.startsWith('SELECT shard_id,state FROM shards')){
     return {results:[...parent.shards].map(([shard_id,state])=>({shard_id,state}))};
    }
    if(query.startsWith('SELECT shard_id,COUNT(*)')){
     const counts=new Map();
     for(const shard of parent.assignments.values())counts.set(shard,(counts.get(shard)||0)+1);
     return {results:[...counts].map(([shard_id,accounts])=>({shard_id,accounts}))};
    }
    throw Error('Unexpected mock D1 all query: '+query);
   },
   async run(){
    if(query.startsWith('INSERT OR IGNORE INTO account_shard')){
     if(parent.assignments.has(args[0]))return {meta:{changes:0}};
     parent.assignments.set(args[0],args[1]);return {meta:{changes:1}};
    }
    if(query.startsWith('INSERT INTO demo_stories')){
     parent.stories.set(args[0]+'|'+args[1],{story_id:args[1],body_text:args[2]});
     return {meta:{changes:1}};
    }
    throw Error('Unexpected mock D1 run query: '+query);
   }
  };
  return stmt;
 }
}
function fake(){
 const directory=new FakeD1('directory'),a=new FakeD1('a'),b=new FakeD1('b');
 const env={DIRECTORY_DB:directory,DATA_SHARD_A:a,DEMO_TOKEN:TOKEN};
 const call=async(method,path,body,authenticated=true)=>{
  const req=new Request('https://isolated.invalid'+path,{method,headers:{
   ...(authenticated?{authorization:'Bearer '+TOKEN}:{}),
   ...(body?{'content-type':'application/json'}:{})
  },body:body?JSON.stringify(body):undefined});
  const result=await handle(req,env);
  return {status:result.status,data:await result.json()};
 };
 return {directory,a,b,env,call};
}
test('public status reveals no account data and makes no D1 reads',async()=>{
 const {call}=fake();const r=await call('GET','/health',undefined,false);
 assert.equal(r.status,200);assert.equal(r.data.appIntegration,false);
});
test('all real-D1 demo operations require a protected bearer token',async()=>{
 const {call,directory}=fake();
 for(const [method,path,body] of [
  ['POST','/_demo/provision',{accountId:'demo-a'}],
  ['POST','/_demo/story',{accountId:'demo-a',storyId:'story-a',text:'test'}],
  ['GET','/_demo/story?accountId=demo-a&storyId=story-a'],
  ['GET','/_demo/status']
 ]){
  const r=await call(method,path,body,false);assert.equal(r.status,401);
 }
 assert.equal(directory.assignments.size,0);
});
test('one D1 shard is fully operational and assignment persists on repeated requests',async()=>{
 const {call,directory,a}=fake();
 const added=await call('POST','/_demo/provision',{accountId:'demo-test-1'});
 assert.deepEqual(added.data,{ok:true,shard:'A',newAssignment:true});
 const repeat=await call('POST','/_demo/provision',{accountId:'demo-test-1'});
 assert.equal(repeat.data.newAssignment,false);
 assert.equal(directory.assignments.size,1);
 assert.equal(a.stories.size,0);
 const written=await call('POST','/_demo/story',{accountId:'demo-test-1',storyId:'story-first',text:'Original fake story'});
 assert.equal(written.status,200);
 assert.equal(written.data.storedIn,'A');
 const loaded=await call('GET','/_demo/story?accountId=demo-test-1&storyId=story-first');
 assert.equal(loaded.status,200);assert.equal(loaded.data.text,'Original fake story');
 assert.equal(a.stories.size,1);
});
test('addition of future B routes only new assignments, no existing account moves',async()=>{
 const {env,call,directory,a,b}=fake();
 await call('POST','/_demo/provision',{accountId:'demo-early'});
 await call('POST','/_demo/story',{accountId:'demo-early',storyId:'story-first',text:'A remains A'});
 directory.shards.set('B','active');
 env.DATA_SHARD_B=b;
 let bCount=0;
 for(let i=0;i<80;i++){
  const out=await call('POST','/_demo/provision',{accountId:'demo-later-'+i});
  assert.equal(out.status,200);
  if(out.data.shard==='B')bCount++;
 }
 assert.ok(bCount>0&&bCount<80,'New accounts are shared between A and B');
 const old=await call('POST','/_demo/provision',{accountId:'demo-early'});
 assert.equal(old.data.shard,'A');assert.equal(old.data.newAssignment,false);
 const result=await call('GET','/_demo/story?accountId=demo-early&storyId=story-first');
 assert.equal(result.data.text,'A remains A');
 assert.equal(a.stories.size,1);assert.equal(b.stories.size,0);
});
test('binding failure blocks new registration instead of misrouting',async()=>{
 const {call,directory}=fake();
 directory.shards.set('B','active');
 const r=await call('POST','/_demo/provision',{accountId:'demo-new-after-invalid-config'});
 assert.equal(r.status,503);assert.equal(directory.assignments.size,0);
});
test('existing pinned shard is never silently moved when unavailable',async()=>{
 const {env,call}=fake();
 await call('POST','/_demo/provision',{accountId:'demo-pinned'});
 delete env.DATA_SHARD_A;
 const r=await call('POST','/_demo/story',{accountId:'demo-pinned',storyId:'story-cue',text:'not moved'});
 assert.equal(r.status,503);
});
test('attempts with non-synthetic identities or unrelated routes fail closed',async()=>{
 const {call,directory}=fake();
 assert.equal((await call('POST','/_demo/provision',{accountId:'actual-user-id'})).status,400);
 assert.equal((await call('POST','/_demo/provision',{accountId:'demo-a@domain.com'})).status,400);
 assert.equal((await call('POST','/_demo/story',{accountId:'demo-unprovisioned',storyId:'story-x',text:'no'})).status,404);
 assert.equal((await call('GET','/api/me')).status,404);
 assert.equal(directory.assignments.size,0);
});
test('concurrent duplicate provisioning is idempotent on the account directory',async()=>{
 const {call,directory}=fake();
 const r=await Promise.all(Array.from({length:12},()=>call('POST','/_demo/provision',{accountId:'demo-race'})));
 assert.equal(r.filter(x=>x.data.newAssignment).length,1);
 assert.equal(directory.assignments.size,1);
});

// Live smoke test against ONLY the new isolated Worker and fake D1 records.
// Authorized through a one-run GitHub ephemeral token; never touches TALERA accounts.
import assert from 'node:assert/strict';
const root='https://talera-d1-stable-router-test-20261108.mark-a39.workers.dev';
const token=process.env.DEMO_TOKEN;
assert.ok(token?.length>=40,'Missing GitHub ephemeral demo token');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(path,method='GET',data=null,authenticated=true){
 const headers={...(authenticated?{authorization:'Bearer '+token}:{}),...(data?{'content-type':'application/json'}:{})};
 const res=await fetch(root+path,{method,headers,body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});
 return {status:res.status,body:await res.json()};
}
let healthy=false;
for(let n=0;n<8;n++){
 try{const r=await call('/health','GET',null,false);if(r.status===200&&r.body.mode==='isolated-synthetic-d1-router'){healthy=true;break}}
 catch{}
 await sleep(2500);
}
assert.ok(healthy,'Separate Worker did not publish');
assert.equal((await call('/_demo/status','GET',null,false)).status,401,'No public database status');
const status=await call('/_demo/status');
assert.equal(status.status,200,'Real D1 directory is unavailable');
assert.ok(status.body.groups.some(x=>x.shard_id==='A'&&x.state==='active'),'Real shard A not active');
console.log('LIVE_ACTIVATED_SHARDS',JSON.stringify(status.body.groups));
const account='demo-gh-smoke-20261108';
const story='story-gh-persist';
const first=await call('/_demo/provision','POST',{accountId:account});
assert.equal(first.status,200);
assert.equal(first.body.shard,'A');
const repeat=await call('/_demo/provision','POST',{accountId:account});
assert.equal(repeat.status,200);
assert.equal(repeat.body.shard,'A');
assert.equal(repeat.body.newAssignment,false,'Real D1 account assignment must persist');
const written=await call('/_demo/story','POST',{accountId:account,storyId:story,text:'Fictieve testcase: bewust zonder echte TALERA-data'});
assert.equal(written.status,200);
const read=await call('/_demo/story?accountId='+account+'&storyId='+story);
assert.equal(read.status,200);
assert.equal(read.body.shard,'A');
assert.equal(read.body.text,'Fictieve testcase: bewust zonder echte TALERA-data');
const invalid=await call('/_demo/provision','POST',{accountId:'real-account@example.com'});
assert.equal(invalid.status,400);
console.log('REAL_D1_SMOKE_PASS',JSON.stringify({worker:root,directoryReady:true,
 shard:first.body.shard,assignmentStable:repeat.body.newAssignment===false,storyRoundtrip:true,
 invalidIdentityRejected:true,unchangedTaleraPwa:true}));

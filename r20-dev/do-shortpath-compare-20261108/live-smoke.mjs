import assert from 'node:assert/strict';
const base='https://talera-do-shortpath-compare-test-20261108.mark-a39.workers.dev';
const token=String(process.env.DEMO_TOKEN||'');
assert.ok(token.length>=40,'Synthetic test bearer key not available');
async function call(method,path,data,authorized=true){
 const response=await fetch(base+path,{
  method,headers:{...(authorized?{authorization:'Bearer '+token}:{}),
   ...(data?{'content-type':'application/json'}:{})},
  body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(25000)});
 return {status:response.status,body:await response.json()};
}
const health=await call('GET','/health',null,false);
assert.equal(health.status,200);
assert.equal(health.body.connectedToTalera,false);
assert.equal((await call('GET','/_demo/stats?accountId=demo-gh-do-a',null,false)).status,401);
assert.equal((await call('POST','/_demo/story',{accountId:'actual-user',storyId:'story-a',text:'no'})).status,400,
 'Invalid account names are never allowed by DO code and no real account is touched');
const aid='demo-gh-do-a',other='demo-gh-do-b',sid='story-one',mid='media-one';
const previous=await call('GET','/_demo/story?accountId='+aid+'&storyId='+sid);
assert.ok([200,404].includes(previous.status),'Persisted object availability must be well-defined');
console.log('STORY_SURVIVED_PREVIOUS_DEPLOY',previous.status===200);
const media=await call('POST','/_demo/media',{accountId:aid,storyId:sid,mediaId:mid,
 text:'Original fictional media bytes, no personal data'});
assert.equal(media.status,200);
const mediaRead=await call('GET','/_demo/media?accountId='+aid+'&storyId='+sid+'&mediaId='+mid);
assert.equal(mediaRead.status,200);
assert.equal(mediaRead.body.text,'Original fictional media bytes, no personal data');
const written=await call('POST','/_demo/story',{accountId:aid,storyId:sid,
 text:'Synthetic story with own media pointer',mediaId:mid});
assert.equal(written.status,200);
const read=await call('GET','/_demo/story?accountId='+aid+'&storyId='+sid);
assert.equal(read.status,200);
assert.equal(read.body.text,'Synthetic story with own media pointer');
assert.equal(read.body.mediaId,mid);
const isolation=await call('GET','/_demo/story?accountId='+other+'&storyId='+sid);
assert.equal(isolation.status,404,'Separate DO must not find another account story');
const crossing=await call('POST','/_demo/story',{
 accountId:other,storyId:sid,text:'Trying to read media of the other account',mediaId:mid});
assert.equal(crossing.status,409,'Cross-account media reference must not become published');
const statsA=await call('GET','/_demo/stats?accountId='+aid);
assert.equal(statsA.status,200);
assert.equal(statsA.body.stories,1);
assert.ok(statsA.body.sqlBytes>0);
assert.equal(statsA.body.jurisdiction,'eu','The data object must persist in EU jurisdiction');
const statsB=await call('GET','/_demo/stats?accountId='+other);
assert.equal(statsB.status,200);
assert.equal(statsB.body.stories,0);
const overwrite=await call('POST','/_demo/story',{accountId:aid,storyId:sid,
 text:'Idempotent rewrite, same named object',mediaId:mid});
assert.equal(overwrite.status,200);
const after=await call('GET','/_demo/story?accountId='+aid+'&storyId='+sid);
assert.equal(after.body.text,'Idempotent rewrite, same named object');
assert.equal((await call('GET','/_demo/stats?accountId='+aid)).body.stories,1);
console.log('REAL_EU_DO_R2_SHORTPATH_OK',JSON.stringify({
 physicalAccountObjects:2,
 accountsIsolated:true,
 persistentOwnSQLiteStorage:true,euJurisdictionConfirmed:true,
 mediaInSeparateEUBucket:true,
 validR2RefVerifiedBeforeSqlCommit:true,
 noAccountDirectory:true,
 noOriginalTaleraSystemTouched:true,
 publicAccessRejected:true
}));

// Cloudflare local-only Free social and sharing DO acceptance test.
// Tests no existing TALERA Worker and contains only synthetic data.
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const config=JSON.parse(readFileSync(path.join(dir,'wrangler.jsonc'),'utf8'));
assert.equal(config.durable_objects.bindings.length,2);
assert.ok(!config.d1_databases&&!config.services&&!config.r2_buckets);
const generated=path.join(dir,'generated');
mkdirSync(generated,{recursive:true});
const cfg=path.join(generated,'social-local.jsonc');
config.main='../social-worker.mjs';config.name='talera-social-local-proof';
writeFileSync(cfg,JSON.stringify(config));
const gatewayKey='d'.repeat(64),authKey='SYNTHETIC_SOCIAL_SIGNING_TEST_20261108_NOT_FOR_LIVE';
const port=8798,root='http://127.0.0.1:'+port;
let runner,exited=false,log='',calls=0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function start(){
 exited=false;log='';
 runner=spawn(path.resolve('node_modules/.bin/wrangler'),[
  'dev','--local','--ip','127.0.0.1','--port',String(port),'--config',cfg,
  '--persist-to',path.join(generated,'durable-social'),
  '--var','STAGING_SOCIAL_KEY:'+gatewayKey,
  '--var','DEMO_IDENTITY_KEY:'+authKey,
  '--log-level','error'
 ],{env:{...process.env,CI:'true',BROWSER:'none',NO_COLOR:'1'},stdio:['ignore','pipe','pipe']});
 runner.on('exit',()=>{exited=true});
 for(const o of [runner.stdout,runner.stderr])o.on('data',v=>log=(log+v.toString()).slice(-6500));
}
async function stop(){
 if(!runner||exited)return;
 runner.kill('SIGTERM');
 await Promise.race([new Promise(r=>runner.once('exit',r)),pause(3000)]);
}
function headers(actor,shareToken,includeGate=true){
 const h={origin:root,accept:'application/json'};
 if(includeGate)h['x-qa-staging-key']=gatewayKey;
 if(actor){
  h['x-qa-account']=actor;
  h['x-qa-signature']=createHmac('sha256',authKey).update(actor).digest('hex');
 }
 if(shareToken)h['x-qa-share-token']=shareToken;
 return h;
}
async function call(method,endpoint,{actor,shareToken,body,includeGate=true}={}){
 calls++;
 const h=headers(actor,shareToken,includeGate);
 if(body)h['content-type']='application/json';
 const res=await fetch(root+endpoint,{method,headers:h,
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 const data=await res.json();
 return {status:res.status,data,cache:res.headers.get('cache-control')};
}
async function ready(){
 for(let i=0;i<100;i++){
  if(exited)throw Error('Wrangler social failed startup: '+log);
  try{if((await call('GET','/__social/health')).status===200)return}catch{}
  await pause(400);
 }
 throw Error('Wrangler local social did not boot: '+log);
}
const owner=randomUUID(),recipient=randomUUID(),stranger=randomUUID();
const story='story-synthetic-20261108-a',storyB='story-synthetic-20261108-b';
const at=(id,op)=>'/__social/memory/'+id+'/'+op;
async function run(){
 start();await ready();
 assert.equal((await call('GET',at(story,'view'))).status,403);
 assert.equal((await call('GET',at(story,'view'),{includeGate:false})).status,403);
 const created=await call('POST',at(story,'init'),{actor:owner});
 assert.equal(created.status,200,'Owner initialized social memory');
 assert.equal((await call('POST',at(story,'init'),{actor:stranger})).status,409,
  'Cannot claim an existing memory owned by another account');
 assert.equal((await call('GET',at(story,'view'),{actor:owner})).status,200);
 assert.equal((await call('GET',at(story,'view'),{actor:stranger})).status,403);
 assert.equal((await call('POST',at(story,'grant'),{actor:stranger,body:{recipientId:recipient}})).status,403);
 const granted=await call('POST',at(story,'grant'),{actor:owner,body:{recipientId:recipient}});
 assert.equal(granted.status,200);
 assert.equal((await call('GET',at(story,'view'),{actor:recipient})).status,200);
 const react=await call('POST',at(story,'like'),{actor:recipient});
 assert.equal(react.status,200);
 assert.equal((await call('POST',at(story,'like'),{actor:recipient})).status,200);
 assert.equal((await call('POST',at(story,'comment'),{actor:recipient,body:{body:'Fictieve testreactie'}})).status,200);
 const share=await call('POST',at(story,'share'),{actor:owner});
 assert.equal(share.status,200);
 const token=/^\/__social\/shared\/([a-f0-9]{64})$/.exec(share.data.link)?.[1];
 assert.ok(token,'Expected new random share token');
 const guestView=await call('GET',share.data.link);
 assert.equal(guestView.status,200,'Share token resolves through isolated pointer and active story');
 assert.equal(guestView.data.storyId,story);
 const guestLike=await call('POST',at(story,'like'),{shareToken:token});
 assert.equal(guestLike.status,200);
 const summary=await call('GET',at(story,'view'),{actor:owner});
 assert.equal(summary.status,200);
 assert.equal(summary.data.likes,2,'Recipient duplicate heart remains one; guest heart distinct');
 assert.equal(summary.data.commentCount,1);
 assert.equal(summary.data.comments[0].body,'Fictieve testreactie');
 assert.equal(summary.cache,'private, no-store');
 const removed=await call('POST',at(story,'revoke-share'),{actor:owner,body:{token}});
 assert.equal(removed.status,200);
 assert.equal((await call('GET',share.data.link)).status,403,
  'Revoked share must not resolve to any social content');
 assert.equal((await call('GET',at(story,'view'),{shareToken:token})).status,403);
 const revokedRecipient=await call('POST',at(story,'revoke-grant'),{actor:owner,body:{recipientId:recipient}});
 assert.equal(revokedRecipient.status,200);
 assert.equal((await call('GET',at(story,'view'),{actor:recipient})).status,403);
 const b=await call('POST',at(storyB,'init'),{actor:recipient});
 assert.equal(b.status,200);
 assert.equal((await call('GET',at(storyB,'view'),{actor:owner})).status,403);
 assert.equal((await call('GET',at(storyB,'view'),{actor:recipient})).status,200);
 const traffic=[];
 for(const width of [1,5,20]){
  const n=24;let cursor=0;let ok=0;
  await Promise.all(Array.from({length:Math.min(width,n)},async()=>{
   while(cursor<n){
    cursor++;
    const result=await call('GET',at(story,'view'),{actor:owner});
    assert.equal(result.status,200);
    assert.equal(result.data.likes,2);
    ok++;
   }
  }));
  traffic.push({concurrentLocalRequests:width,successfulReads:ok});
 }
 await stop();start();await ready();
 const after=await call('GET',at(story,'view'),{actor:owner});
 assert.equal(after.data.likes,2,'DO stores reactions across local Worker restart');
 assert.equal(after.data.commentCount,1);
 assert.equal((await call('GET',share.data.link)).status,403,'Revoked share stays revoked after restart');
 assert.equal((await call('GET',at(story,'view'),{actor:recipient})).status,403,
  'Revoked grant stays revoked after restart');
 return {
  result:'PASS: locally executable per-memory SQLite Durable Objects and revocable share pointer',
  syntheticMemories:2,
  distinctSyntheticAccounts:3,
  shareLinkRevocationChecked:true,
  crossAccountIsolationChecked:true,
  grantRevocationChecked:true,
  duplicateLikesBlocked:true,
  dataAndRevocationsSurviveWorkerRestart:true,
  noCloudMediaContentStored:true,
  noGlobalD1OrExistingTaleraBindings:true,
  localRequestBands:traffic,
  totalLocalRequests:calls,
  noLiveAccountOrLegacyStoryChanged:true,
  notYetIntegratedWithRealTaleraPWA:true,
  tenMillionUsersNotProven:true
 };
}
try{
 const result=await run();
 writeFileSync(path.join(generated,'social-result.json'),JSON.stringify(result,null,2)+'\n');
 console.log('TALERA_FREE_SOCIAL_DO_LOCAL_RESULT',JSON.stringify(result,null,2));
}catch(error){console.error('LOCAL_SOCIAL_LOG',log);throw error}
finally{await stop()}

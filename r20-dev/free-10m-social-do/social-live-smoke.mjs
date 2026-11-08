// Bounded isolated LIVE Cloudflare EU social DO proof. Synthetic accounts/story.
// No requests to existing TALERA app or user databases.
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const host='talera-free-social-do-staging-20261108.mark-a39.workers.dev';
const root='https://'+host;
const gateway=process.env.STAGING_SOCIAL_KEY;
const identity=process.env.DEMO_IDENTITY_KEY;
assert.match(gateway||'',/^[a-f0-9]{64}$/);
assert.ok(identity?.length>=40);
const owner=randomUUID(),recipient=randomUUID(),stranger=randomUUID();
const story='synthetic-free-social-'+randomUUID().replaceAll('-','');
const endpoint=op=>'/__social/memory/'+story+'/'+op;
let checked=0;
async function call(method,pathname,{actor,token,body,auth=true}={}){
 const u=new URL(pathname,root);
 assert.equal(u.hostname,host,'No traffic to customer TALERA Worker');
 const headers={accept:'application/json'};
 if(auth)headers['x-qa-staging-key']=gateway;
 if(actor){
  headers['x-qa-account']=actor;
  headers['x-qa-signature']=createHmac('sha256',identity).update(actor).digest('hex');
 }
 if(token)headers['x-qa-share-token']=token;
 if(method==='POST')headers.origin=root;
 if(body)headers['content-type']='application/json';
 const t=performance.now();
 const response=await fetch(u,{method,headers,body:body?JSON.stringify(body):undefined,
  redirect:'error',signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 checked++;
 return {status:response.status,result,latencyMs:performance.now()-t};
}
const health=await call('GET','/__social/health',{auth:false});
assert.equal(health.status,200);
assert.equal(health.result.linkedToProduction,false);
assert.equal((await call('GET',endpoint('view'),{auth:false})).status,403);
assert.equal((await call('POST',endpoint('init'),{actor:owner})).status,200);
assert.equal((await call('GET',endpoint('view'),{actor:stranger})).status,403);
assert.equal((await call('POST',endpoint('grant'),{actor:owner,body:{recipientId:recipient}})).status,200);
assert.equal((await call('GET',endpoint('view'),{actor:recipient})).status,200);
assert.equal((await call('POST',endpoint('like'),{actor:recipient})).status,200);
assert.equal((await call('POST',endpoint('comment'),{actor:recipient,body:{body:'Synthetische reactie'}})).status,200);
const share=await call('POST',endpoint('share'),{actor:owner});
assert.equal(share.status,200,'Expected real Cloudflare share pointer: '+JSON.stringify(share.result));
const match=/^\/__social\/shared\/([a-f0-9]{64})$/.exec(share.result.link||'');
assert.ok(match);
const shareLink=share.result.link;
const token=match[1];
assert.equal((await call('GET',shareLink)).status,200);
assert.equal((await call('POST',endpoint('revoke-share'),{actor:owner,body:{token}})).status,200);
assert.equal((await call('GET',shareLink)).status,403,'Revoked shared URL cannot open after revocation');
const latencies=[];
for(const concurrency of [1,5,10]){
 const iterations=12;let next=0,success=0;const sample=[];
 await Promise.all(Array.from({length:Math.min(concurrency,iterations)},async()=>{
  while(next<iterations){
   next++;
   const r=await call('GET',endpoint('view'),{actor:owner});
   assert.equal(r.status,200);assert.equal(r.result.commentCount,1);
   sample.push(r.latencyMs);success++;
  }
 }));
 sample.sort((a,b)=>a-b);
 latencies.push({concurrentRequests:concurrency,successes:success,
  p95Ms:Number(sample[Math.ceil(.95*sample.length)-1].toFixed(1))});
}
const result={
 result:'PASS: real EU Cloudflare Free social memory and revoked share pointer',
 syntheticStoryCount:1,syntheticAccountCount:3,
 isolatedFromOriginalD1:true,
 noOriginalUserDataReadOrModified:true,
 shareLinkRevocationWorksRemotely:true,
 originalStoryMediaNotStored:true,
 boundedReadBands:latencies,
 totalCloudRequests:checked,
 notIntegratedWithOfficialPwa:true,
 tenMillionSimultaneousUsersNotProven:true
};
mkdirSync('r20-dev/free-10m-social-do/generated',{recursive:true});
writeFileSync('r20-dev/free-10m-social-do/generated/social-remote-result.json',JSON.stringify(result,null,2)+'\n');
console.log('TALERA_FREE_SOCIAL_EU_CLOUD_RESULT',JSON.stringify(result,null,2));

// Create at most ONE uniquely named test-only EU R2 bucket, idempotently.
// Never deletes, moves or references original TALERA R2 media.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const account=String(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim();
const token=String(process.env.CLOUDFLARE_API_TOKEN||'').trim();
const name='talera-do-shortpath-media-test-20261108';
assert.match(account,/^[0-9a-f]{32}$/i);
assert.ok(token.length>20);
async function inspect(){
 const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+
  '/r2/buckets/'+name,{headers:{authorization:'Bearer '+token,'cf-r2-jurisdiction':'eu'},
   signal:AbortSignal.timeout(25000)});
 if(response.status===404)return {exists:false};
 const body=await response.json();
 if(!response.ok||body.success!==true||body.result?.name!==name)
  throw new Error('EU test bucket inspection failed HTTP '+response.status);
 if(body.result.jurisdiction!=='eu')
  throw new Error('Refusing non-EU test bucket or unverifiable jurisdiction');
 return {exists:true};
}
const before=await inspect();
if(!before.exists){
 console.log('CREATING_ONE_NEW_ISOLATED_EU_R2_BUCKET',name);
 execFileSync('npx',['--no-install','wrangler','r2','bucket','create',name,
  '--jurisdiction','eu'],{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']});
}
assert.equal((await inspect()).exists,true);
console.log('EXCLUSIVE_EU_R2_READY',JSON.stringify({bucket:name,created:!before.exists,connectedToTalera:false}));

/**
 * Idempotent provisioning of exactly ONE dedicated EU D1, ONE dedicated EU R2
 * bucket, and a generated Wrangler config bound only to those resources.
 * No TALERA production databases, buckets, workers, sessions, or media.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const account=String(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim();
const token=String(process.env.CLOUDFLARE_API_TOKEN||'').trim();
const d1Name='talera-photo-speed-d1-test-20261108';
const r2Name='talera-photo-speed-r2-test-20261108';
assert.match(account,/^[a-f0-9]{32}$/i);
assert.ok(token.length>20,'Cloudflare token missing');
function wrangler(...args){
 return execFileSync('npx',['--no-install','wrangler',...args],{
  encoding:'utf8',timeout:90000,stdio:['ignore','pipe','pipe']
 });
}
function d1List(){
 const obj=JSON.parse(wrangler('d1','list','--json'));
 return Array.isArray(obj)?obj:obj.result||obj.databases||[];
}
let available=d1List().filter(x=>x.name===d1Name);
assert.ok(available.length<=1,'Ambiguous dedicated test database');
if(available.length===0){
 console.log('CREATING_ISOLATED_EU_D1_BENCHMARK',d1Name);
 wrangler('d1','create',d1Name,'--jurisdiction','eu');
 available=d1List().filter(x=>x.name===d1Name);
}
assert.equal(available.length,1,'EU bench D1 missing');
const d1Id=available[0].uuid||available[0].id||available[0].database_id;
assert.match(d1Id,/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
async function request(path,headers={}){
 const res=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+path,{
  headers:{authorization:'Bearer '+token,...headers},signal:AbortSignal.timeout(22000)});
 if(res.status===404)return null;
 const body=await res.json();
 if(!res.ok||body.success!==true)throw Error('Read-only resource confirmation failed HTTP '+res.status);
 return body.result;
}
const d1=await request('/d1/database/'+d1Id);
assert.equal(d1?.name,d1Name);
assert.equal(d1?.jurisdiction,'eu','D1 must be EU locked');

async function executeIsolatedSql(sql){
 const endpoint='https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'+d1Id+'/query';
 const response=await fetch(endpoint,{
  method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({sql,params:[]}),signal:AbortSignal.timeout(25000)
 });
 const body=await response.json();
 if(!response.ok||body.success!==true||!body.result?.[0]?.success)
  throw Error('Unable to create dedicated EU benchmark D1 schema HTTP '+response.status);
}
await executeIsolatedSql('CREATE TABLE IF NOT EXISTS photo_manifest ('+
 'account_id TEXT NOT NULL,photo_id TEXT NOT NULL,object_key TEXT NOT NULL,'+
 'display_order INTEGER NOT NULL, PRIMARY KEY(account_id,photo_id))');
await executeIsolatedSql('CREATE INDEX IF NOT EXISTS ix_photo_manifest_account_order '+
 'ON photo_manifest(account_id,display_order)');
console.log('ISOLATED_EU_D1_PHOTOBAND_SCHEMA_READY',d1Name);

let r2=await request('/r2/buckets/'+r2Name,{'cf-r2-jurisdiction':'eu'});
if(!r2){
 console.log('CREATING_ISOLATED_EU_R2_BENCHMARK',r2Name);
 wrangler('r2','bucket','create',r2Name,'--jurisdiction','eu');
 r2=await request('/r2/buckets/'+r2Name,{'cf-r2-jurisdiction':'eu'});
}
assert.equal(r2?.name,r2Name);
assert.equal(r2?.jurisdiction,'eu','Photo benchmark R2 must remain EU locked');
const config={
 name:'talera-photo-strip-speed-test-20261108',
 main:'./worker.mjs',compatibility_date:'2026-11-08',
 workers_dev:true,
 d1_databases:[{binding:'BENCH_D1',database_name:d1Name,database_id:d1Id,jurisdiction:'eu'}],
 durable_objects:{bindings:[{name:'BENCH_HOME',class_name:'PhotoStripBenchHome'}]},
 migrations:[{tag:'v1',new_sqlite_classes:['PhotoStripBenchHome']}],
 r2_buckets:[{binding:'BENCH_PHOTOS',bucket_name:r2Name,jurisdiction:'eu'}]
};
writeFileSync(join(here,'wrangler.generated.jsonc'),JSON.stringify(config,null,2)+'\n');
console.log('EU_PHOTO_BENCH_READY',JSON.stringify({
 d1:d1Name,r2:r2Name,worker:config.name,eu:true,noTaleraBindings:true
}));

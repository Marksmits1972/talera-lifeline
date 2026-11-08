// GitHub Actions ONLY: enable D1 read replicas on exclusively named staging
// databases. Does not modify original TALERA account or memory databases.
// See https://developers.cloudflare.com/d1/best-practices/read-replication/
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const dir=dirname(fileURLToPath(import.meta.url));
const catalog=JSON.parse(readFileSync(join(dir,'shard-catalog.json'),'utf8'));
const account=(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim();
const token=(process.env.CLOUDFLARE_API_TOKEN||'').trim();
assert.match(account,/^[a-f0-9]{32}$/i,'Invalid Cloudflare account ID');
assert.ok(token.length>20,'GitHub Cloudflare token unavailable');
const prefix='talera-d1-router-';
const permitted=[catalog.directory_database,...catalog.shards.map(x=>x.database_name)];
const result=execFileSync('npx',['--no-install','wrangler','d1','list','--json'],{
 cwd:join(dir,'../..'),encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000
});
const parsed=JSON.parse(result);
const arr=Array.isArray(parsed)?parsed:(parsed.result||parsed.databases);
assert.ok(Array.isArray(arr));
for(const name of permitted){
 assert.ok(name.startsWith(prefix)&&name.endsWith('-test-20261108'),'Non-staging DB rejected');
 const matches=arr.filter(x=>x.name===name);
 assert.equal(matches.length,1,'Exactly one matching isolated staging database required');
 const databaseId=matches[0].uuid||matches[0].id||matches[0].database_id;
 assert.match(databaseId,/^[a-f0-9-]{36}$/i);
 const api='https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'+databaseId;
 const req=await fetch(api,{method:'PUT',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({read_replication:{mode:'auto'}}),signal:AbortSignal.timeout(30000)});
 const data=await req.json();
 if(!req.ok||data.success!==true){
  throw new Error('Isolated D1 read replication could not be enabled for '+name+
    ' (HTTP '+req.status+', Cloudflare API permission / feature availability).');
 }
 console.log('D1_READ_REPLICA_AUTO_ENABLED',name);
}

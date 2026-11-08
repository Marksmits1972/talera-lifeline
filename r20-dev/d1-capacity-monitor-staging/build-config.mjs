// Generate a private, staging-only Cron Worker binding inventory via GitHub CI.
// No access to the live TALERA accounts, memories or media.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const folder=dirname(fileURLToPath(import.meta.url));
const dataFolder=join(folder,'../d1-router-staging');
const c=JSON.parse(readFileSync(join(dataFolder,'shard-catalog.json'),'utf8'));
assert.equal(c.worker_name,'talera-d1-stable-router-test-20261108');
assert.equal(c.directory_database,'talera-d1-router-directory-test-20261108');
assert.ok(c.shards.length>=2&&c.shards.length<=16);
const raw=execFileSync('npx',['--no-install','wrangler','d1','list','--json'],{
 cwd:join(folder,'../..'),encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:50000});
const p=JSON.parse(raw),databases=Array.isArray(p)?p:(p.result||p.databases);
assert.ok(Array.isArray(databases));
function getId(name){
 assert.match(name,/^talera-d1-router-[a-z0-9-]+-test-20261108$/);
 const results=databases.filter(x=>x.name===name);
 assert.equal(results.length,1,'Only exactly one uniquely named staging D1 is supported');
 const id=results[0].uuid||results[0].id||results[0].database_id;
 assert.match(id,/^[a-f0-9-]{36}$/i);return id.toLowerCase();
}
const map=Object.fromEntries(c.shards.map(x=>[x.id,getId(x.database_name)]));
const config={
 name:'talera-d1-capacity-monitor-staging-20261108',
 main:'./monitor.worker.mjs',compatibility_date:'2026-11-08',
 workers_dev:false,
 triggers:{crons:['*/5 * * * *']},
 analytics:{binding:'ANALYTICS_SQL'},
 d1_databases:[{binding:'DIRECTORY_DB',database_name:c.directory_database,
  database_id:getId(c.directory_database)}],
 vars:{STAGING_SHARD_IDS_JSON:JSON.stringify(map)}
};
writeFileSync(join(folder,'wrangler.generated.jsonc'),JSON.stringify(config,null,2)+'\n');
console.log('PRIVATE_CAPACITY_MONITOR_CONFIG_READY',JSON.stringify({shards:Object.keys(map),trigger:'every-5-min',
 worker:config.name,analyticsBinding:true,onlyTestResources:true}));

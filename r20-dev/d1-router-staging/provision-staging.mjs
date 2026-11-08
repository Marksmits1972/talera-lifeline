/* GitHub-only resource preparation for an ISOLATED TALERA staging router.
   No production database names, deletion, account import or migration. */
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';

const folder=dirname(fileURLToPath(import.meta.url));
const phase=process.argv[2];
if(!['prepare','activate'].includes(phase))throw Error('Specify prepare or activate');
const catalog=JSON.parse(readFileSync(join(folder,'shard-catalog.json'),'utf8'));
const fixedPrefix='talera-d1-router-';
const safeDatabase=name=>typeof name==='string'&&name.startsWith(fixedPrefix)&&
 /^[a-z0-9-]{20,90}$/.test(name)&&name.endsWith('-test-20261108');
const safeShard=id=>typeof id==='string'&&/^[A-Z][A-Z0-9]{0,7}$/.test(id);
if(catalog.worker_name!=='talera-d1-stable-router-test-20261108')throw Error('Unexpected Worker target');
if(!safeDatabase(catalog.directory_database))throw Error('Invalid directory name');
if(!Array.isArray(catalog.shards)||!catalog.shards.length||catalog.shards.length>16)throw Error('Invalid shard catalog');
const allNames=[catalog.directory_database,...catalog.shards.map(q=>q.database_name)];
if(new Set(allNames).size!==allNames.length)throw Error('Duplicate database name');
const shardIds=catalog.shards.map(x=>x.id);
if(new Set(shardIds).size!==shardIds.length)throw Error('Duplicate shard ID');
for(const entry of catalog.shards){
 if(!safeShard(entry.id)||!safeDatabase(entry.database_name))throw Error('Invalid shard entry');
}
const run=(...args)=>execFileSync('npx',['--no-install','wrangler',...args],{
 cwd:resolve(folder,'../..'),encoding:'utf8',timeout:120000,
 stdio:['ignore','pipe','pipe'],env:process.env
}).trim();

function dbList(){
 const raw=run('d1','list','--json');
 let result;
 try{result=JSON.parse(raw)}catch{throw Error('Could not parse JSON from Wrangler D1 list')}
 const values=Array.isArray(result)?result:Array.isArray(result?.result)?result.result:result?.databases;
 if(!Array.isArray(values))throw Error('Unexpected Wrangler D1 list format');
 return values.map(x=>({name:x.name,id:x.uuid||x.id||x.database_id})).filter(x=>x.name&&x.id);
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function databaseId(name,existing){
 const matches=existing.filter(x=>x.name===name);
 if(matches.length!==1||!uuid.test(matches[0].id))throw Error('Missing or duplicate staging D1 '+name);
 return matches[0].id;
}
if(phase==='prepare'){
 let known=dbList();
 for(const name of allNames){
  if(known.some(x=>x.name===name))continue;
  // EU jurisdiction for new synthetic records. Never use an existing TALERA DB.
  console.log('CREATING_NEW_ISOLATED_D1',name);
  run('d1','create',name,'--jurisdiction','eu');
  known=dbList();
  databaseId(name,known);
 }
 const bindings=[
  {binding:'DIRECTORY_DB',database_name:catalog.directory_database,
   database_id:databaseId(catalog.directory_database,known)}
 ];
 for(const item of catalog.shards){
  bindings.push({binding:'DATA_SHARD_'+item.id,database_name:item.database_name,
   database_id:databaseId(item.database_name,known)});
 }
 // Write an ephemeral, deterministic config into the checked-out staging folder.
 const config={name:catalog.worker_name,main:'./router.worker.mjs',
   compatibility_date:'2026-11-08',workers_dev:true,d1_databases:bindings};
 writeFileSync(join(folder,'wrangler.generated.jsonc'),JSON.stringify(config,null,2)+'\n');
 for(const item of catalog.shards){
  run('d1','execute',item.database_name,'--remote',
    '--file',join(folder,'sql/001-data-shard.sql'),'--yes');
  console.log('SCHEMA_READY',item.id);
 }
 run('d1','execute',catalog.directory_database,'--remote',
   '--file',join(folder,'sql/001-directory.sql'),'--yes');
 console.log('DIRECTORY_SCHEMA_READY');
 console.log('PROVISION_PREPARED',catalog.worker_name,bindings.map(x=>x.binding).join(','));
}
if(phase==='activate'){
 for(const item of catalog.shards){
  const id=item.id;
  // After deploy, set new write shard ACTIVE for future synthetic accounts only.
  // Existing account_shard rows remain pinned for their lifetime.
  const sql="INSERT OR IGNORE INTO shards(shard_id,state) VALUES ('"+id+"','active')";
  run('d1','execute',catalog.directory_database,'--remote','--command',sql,'--yes');
  console.log('STAGING_SHARD_ENABLED',id);
 }
}

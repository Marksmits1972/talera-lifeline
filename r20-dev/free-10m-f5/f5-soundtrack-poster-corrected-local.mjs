// Exercise the same video+soundtrack thumbnail test against the corrected F5 Worker,
// not only the original anonymous source. All data synthetic/local, no deployment.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const dir='r20-dev/free-10m-f5/generated';
mkdirSync(dir,{recursive:true});
const port=8829,origin='http://127.0.0.1:'+port;
const key='1'.repeat(64);
const args=['dev','--local','--ip','127.0.0.1','--port',String(port),
 '--config','r20-dev/free-10m-f5/wrangler.jsonc',
 '--persist-to',dir+'/f5-media-local-qa',
 '--var','STAGING_F5_KEY:'+key,
 '--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
 '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
 '--var','AUTH_NAMESPACE_KEY:LOCAL_SYNTHETIC_ONLY_F5_MEDIA_TEST_ACCOUNT_KEY_2026',
 '--var','DEMO_IDENTITY_KEY:LOCAL_SYNTHETIC_ONLY_F5_MEDIA_TEST_SOCIAL_KEY_2026',
 '--log-level','error'];
const wr=spawn('node_modules/.bin/wrangler',args,{env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore','pipe','pipe']});
let logs='';
for(const pipe of [wr.stdout,wr.stderr])pipe.on('data',chunk=>logs=(logs+chunk.toString()).slice(-4500));
try{
 let ready=false;
 for(let i=0;i<140;i++){
  try{const r=await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(700)});if(r.status===200){ready=true;break}}catch{}
  if(wr.exitCode!==null)break;
  await new Promise(r=>setTimeout(r,250));
 }
 assert.ok(ready,'Local F5 Worker did not start: '+logs);
 const suffix=Date.now().toString(36),reg=await fetch(origin+'/api/register',{
  method:'POST',headers:{origin,'cf-connecting-ip':'192.0.2.135',
   'x-talera-f5-key':key,'content-type':'application/json'},
  body:JSON.stringify({
   email:'f5-poster-'+suffix+'@example.invalid',username:'f5poster'+suffix,
   displayName:'Synthetic Poster Test',
   password:'Only_Synthetic_Poster_Test_2026_'+suffix,birthDate:'1974-04-02'
  })
 });
 const body=await reg.json();
 assert.equal(reg.status,200,'Synthetic account creation '+JSON.stringify(body));
 const sid=/talera_sid=([a-f0-9]{64})/.exec(reg.headers.get('set-cookie')||'')?.[1];
 assert.ok(sid,'Synthetic session cookie required');
 const report=execFileSync('node',['r20-dev/free-10m-f5/f5-soundtrack-poster-original-browser.mjs'],{
  encoding:'utf8',timeout:110000,
  env:{...process.env,F5_POSTER_TEST_ORIGIN:origin,F5_POSTER_TEST_GATE:key,F5_POSTER_TEST_SID:sid}});
 console.log(report.trim());
 assert.match(report,/"frameMuted":true/,'Edited video must be muted immediately');
 console.log('TALERA_F5_SOUNDTRACK_POSTER_ORIGINAL_WORKER_PASS');
}finally{
 wr.kill('SIGTERM');
}

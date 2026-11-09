// Synthetic-only wrapper: real local Wrangler F5 gateway, exact original editor UI.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const port=8826,origin='http://127.0.0.1:'+port,gate='1'.repeat(64);
const worker=spawn('node_modules/.bin/wrangler',[
 'dev','--local','--ip','127.0.0.1','--port',String(port),
 '--config','r20-dev/free-10m-f5/wrangler.jsonc',
 '--persist-to','r20-dev/free-10m-f5/generated/sound-qa-local',
 '--var','STAGING_F5_KEY:'+gate,
 '--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
 '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
 '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_PRIVATE_STORY_AUDIO_POSTER_LOCAL_TEST_2026',
 '--var','DEMO_IDENTITY_KEY:SYNTHETIC_SOCIAL_IDENTITIES_AUDIO_POSTER_LOCAL_TEST_2026',
 '--log-level','error'
],{env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore','pipe','pipe']});
let output='';
for(const s of [worker.stdout,worker.stderr])
 s.on('data',d=>output=(output+d.toString()).slice(-2500));
try{
 let ready=false;
 for(let i=0;i<110;i++){
  try{
   const r=await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(800)});
   if(r.status===200){ready=true;break}
  }catch{}
  if(worker.exitCode!==null)break;
  await new Promise(ok=>setTimeout(ok,250));
 }
 assert.ok(ready,'Local F5 integration unavailable '+output);
 const id=Date.now().toString(36);
 const reg=await fetch(origin+'/api/register',{method:'POST',headers:{
  origin,'cf-connecting-ip':'192.0.2.215','x-talera-f5-key':gate,
  'content-type':'application/json'
 },body:JSON.stringify({
  email:'f5-audio-cover-'+id+'@example.invalid',
  username:'f5cover'+id,displayName:'Synthetic Audio Cover',
  password:'Synthetic_Only_Audio_Cover_F5_2026_Protected',
  birthDate:'1974-04-02'
 })});
 assert.equal(reg.status,200,'Synthetic F5 login must be available');
 const sid=/talera_sid=([a-f0-9]{64})/.exec(reg.headers.get('set-cookie')||'')?.[1];
 assert.ok(sid,'Correct authenticated synthetic cookie required');
 process.env.F5_POSTER_TEST_ORIGIN=origin;
 process.env.F5_POSTER_TEST_GATE=gate;
 process.env.F5_POSTER_TEST_SID=sid;
 await import('./f5-soundtrack-poster-original-browser.mjs');
 console.log('TALERA_F5_CORRECTED_REAL_LOCAL_SOUND_AND_POSTER_PASS');
}finally{
 if(worker&&!worker.killed)worker.kill('SIGTERM');
}

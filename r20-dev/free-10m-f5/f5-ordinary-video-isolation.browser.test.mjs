// Same approved TALERA Free candidate, local browser proof only.
// No customer media, no second app, no Cloudflare write, no narrated changes.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium,devices} from 'playwright';

const home=path.dirname(fileURLToPath(import.meta.url));
const generated=path.join(home,'generated');
mkdirSync(generated,{recursive:true});
const origin='http://127.0.0.1:8837',gate='1'.repeat(64);
let worker,browser,logs='';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  worker=spawn(path.resolve('node_modules/.bin/wrangler'),[
    'dev','--local','--ip','127.0.0.1','--port','8837',
    '--config',path.join(home,'wrangler.jsonc'),
    '--persist-to',path.join(generated,'ordinary-present-local'),
    '--var','STAGING_F5_KEY:'+gate,'--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
    '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
    '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_F5_PRESENTATION_ONLY_LOCAL_TEST_KEY',
    '--var','DEMO_IDENTITY_KEY:SYNTHETIC_F5_PRESENTATION_ONLY_LOCAL_SOCIAL_KEY',
    '--log-level','error'
  ],{env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore','pipe','pipe']});
  for(const output of [worker.stdout,worker.stderr])output.on('data',d=>logs=(logs+d.toString()).slice(-2500));
  let healthy=false;
  for(let i=0;i<120;i++){
    if(worker.exitCode!==null)throw Error('Local TALERA worker stopped '+logs);
    try{if((await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(600)})).status===200){healthy=true;break}}catch{}
    await wait(280);
  }
  assert.ok(healthy,'Same F5 TALERA candidate did not start '+logs);
  const tag=Date.now().toString(36);
  const result=await fetch(origin+'/api/register',{method:'POST',headers:{
    origin,'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.55',
    'content-type':'application/json'
  },body:JSON.stringify({email:'video-'+tag+'@example.invalid',
    username:'video'+tag.slice(-9),displayName:'Local ordinary video regression',
    password:'Synthetic_TALERA_Ordinary_Test_2026',birthDate:'1974-04-02'})});
  assert.equal(result.status,200,'Synthetic registration must succeed: '+(await result.text()).slice(0,400));
  const sid=/talera_sid=([a-f0-9]{64})/.exec(result.headers.get('set-cookie')||'')?.[1];
  assert.ok(sid,'Synthetic cookie missing');
  browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const ctx=await browser.newContext({...devices['iPhone 13'],extraHTTPHeaders:{'x-talera-f5-key':gate}});
  await ctx.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',
    path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/present',{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.TaleraMemories?.save,null,{timeout:18000});
  const clip=path.join(generated,'ordinary-original-video.mp4');
  execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=blue:s=160x120:d=1',
    '-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',clip],
    {timeout:20000,stdio:'ignore'});
  const id=await page.evaluate(async b64=>{
    const files=await Promise.all(['#ef1523','#27d128'].map(async(c,i)=>{
      const el=document.createElement('canvas');el.width=140;el.height=140;
      const p=el.getContext('2d');p.fillStyle=c;p.fillRect(0,0,140,140);
      const blob=await new Promise(resolve=>el.toBlob(resolve,'image/png'));
      return new File([blob],'test-'+i+'.png',{type:'image/png'});
    }));
    files.push(new File([Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0))],
      'source.mp4',{type:'video/mp4'}));
    const row=await window.TaleraMemories.save({
      title:'Ordinary only',date:'2026-11-11',text:'Non-narrated media',
      narrationCues:[],narrationDurationMs:0
    },files);
    return row.id;
  },readFileSync(clip).toString('base64'));
  await page.goto(origin+'/present?memory='+id,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(id=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    return m?.storyId===id&&!m._photoLoading&&m._zeroFrames?.length===3;
  },id,{timeout:18000});
  await page.evaluate(id=>window.__taleraOrdinarySelectPhoto?.('pwa:'+id,2,true),id);
  await page.waitForFunction(()=>!!document.querySelector('video.talera-v61-inline-video'),null,{timeout:11000});
  const info=()=>page.evaluate(()=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    const v=document.querySelector('video.talera-v61-inline-video');
    return {idx:m?._photoIndex,id:m?.storyId,kind:m?._zeroFrames?.[m?._photoIndex]?.kind,
      player:!!v,paused:v?.paused,ended:v?.ended,current:v?.currentTime,
      duration:v?.duration,ready:v?.readyState,network:v?.networkState,
      error:v?.error?.code,muted:v?.muted,src:v?.currentSrc?.startsWith('blob:'),
      voiceAudio:!!window.__taleraInlineSharedAudio};
  });
  const immediate=await info();await wait(2200);const after=await info();
  console.log('TALERA_ORDINARY_VIDEO_ISOLATION_DIAGNOSTIC',JSON.stringify({immediate,after,errors}));
  assert.equal(after.voiceAudio,false,'Ordinary player must not instantiate narrated audio');
  assert.equal(after.id,id,'Correct memory must stay selected');
  assert.equal(after.idx,0,'Original ordinary video must return to first photo after ending');
  assert.deepEqual(errors,[],'No presentation JS errors');
}finally{
  if(browser)await browser.close().catch(()=>{});
  if(worker&&!worker.killed)worker.kill('SIGTERM');
}

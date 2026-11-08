// F5 WebKit/mobile Safari emulation — REAL PWA, synthetic photos/video/audio,
// original TaleraMemories.store and both timeline pages, no customer media.
// This is automation in Linux WebKit; a physical iPhone still requires acceptance.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
import {webkit,devices} from 'playwright';
const origin='https://talera-free-f5-combined-stage-20261108.mark-a39.workers.dev';
const key=process.env.STAGING_F5_KEY;
assert.match(key||'',/^[a-f0-9]{64}$/);
const suffix=randomUUID().slice(0,8);
const fake=(n)=>({email:'f5-webkit-'+suffix+'-'+n+'@example.invalid',
 username:'webkit-'+suffix+'-'+n,displayName:'Synthetic WebKit '+n,
 password:'Only_Synthetic_WebKit_Test_2026_'+n,
 birthDate:n?'1983-08-03':'1974-04-02'});
const dir='r20-dev/free-10m-f5/generated';
mkdirSync(dir,{recursive:true});
// Deterministic SMALL audiovisual fixtures, not personal photographs/recordings.
// Source code is unchanged; these uploads travel only into IndexedDB.
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y',
 '-f','lavfi','-i','color=c=blue:s=320x180:r=12','-t','1.4',
 '-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',
 '-movflags','+faststart',dir+'/synthetic-video.mp4'],{timeout:20000});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y',
 '-f','lavfi','-i','sine=frequency=330:sample_rate=16000:duration=3',
 '-c:a','pcm_s16le',dir+'/synthetic-narration.wav'],{timeout:20000});
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/hJkAAAAASUVORK5CYII=';
const fixtures={
 photo:png,video:readFileSync(dir+'/synthetic-video.mp4').toString('base64'),
 audio:readFileSync(dir+'/synthetic-narration.wav').toString('base64')
};
let browser,context;
let result={};
try{
 browser=await webkit.launch({headless:true});
 context=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'allow'});
 const page=await context.newPage();
 const failures=[];
 page.on('pageerror',err=>failures.push(String(err?.message||err).slice(0,180)));
 await page.goto(origin+'/__f5/entry',{waitUntil:'domcontentloaded'});
 // Use the same-origin form POST without waiting for unrelated demo photos
 // to finish loading in WebKit; cookies remain HttpOnly and Secure.
 const entry=await page.evaluate(async secret=>{
  const res=await fetch('/__f5/entry',{method:'POST',credentials:'same-origin',
   headers:{'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({key:secret}),redirect:'follow'});
  return {status:res.status,path:new URL(res.url).pathname};
 },key);
 assert.equal(entry.status,200,'WebKit QA cookie must unlock the original Free PWA');
 assert.equal(entry.path,'/mijn-leven');
 await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
 // Only the browser issues the session cookie. No test headers in page scripts.
 const register=async user=>page.evaluate(async data=>{
  const r=await fetch('/api/register',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify(data),credentials:'same-origin'});
  return {status:r.status,result:await r.json()};
 },user);
 const first=await register(fake(0));
 assert.equal(first.status,200,'F5 browser signup must work with original secure cookies');
 const pageRoot=await page.goto(origin+'/tell',{waitUntil:'domcontentloaded'});
 assert.equal(pageRoot.status(),200);
 await page.waitForFunction(()=>!!window.TaleraMemories?.save,{timeout:20000});
 const saved=await page.evaluate(async data=>{
  const decode=str=>Uint8Array.from(atob(str),ch=>ch.charCodeAt(0));
  const uploads=[
   new File([decode(data.photo)],'synthetic-photo.png',{type:'image/png'}),
   new File([decode(data.video)],'synthetic-video.mp4',{type:'video/mp4'}),
   new File([decode(data.audio)],'synthetic-narration.wav',{type:'audio/wav'})
  ];
  const cues=[{t:0,index:0},{t:1000,index:1,videoAtMs:100},{t:2000,index:0}];
  const item=await window.TaleraMemories.save({
   title:'F5 WebKit fictieve audio-foto-video',
   date:'2000-04-02',text:'Fictieve lokale opname, geen persoonsgegevens',
   narrationDurationMs:3000,narrationCues:cues
  },uploads);
  const itemRead=await window.TaleraMemories.get(item.id);
  const blobReads=await Promise.all(item.items.map(async i=>{
   const blob=await window.TaleraMemories.blob(i.key);
   return {kind:i.kind,size:blob?.size,type:blob?.type};
  }));
  return {id:item.id,items:itemRead.items,cues:itemRead.narrationCues,
    duration:itemRead.narrationDurationMs,blobReads};
 },fixtures);
 assert.equal(saved.items.length,3);
 assert.deepEqual(saved.items.map(x=>x.kind),['photo','video','audio']);
 assert.deepEqual(saved.cues.map(x=>x.index),[0,1,0]);
 assert.deepEqual(saved.cues.map(x=>x.t),[0,1000,2000]);
 assert.equal(saved.cues[1].videoAtMs,100);
 assert.equal(saved.duration,3000);
 assert.ok(saved.blobReads.every(x=>x.size>10),'Media blobs must survive write');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.TaleraMemories?.get,{timeout:20000});
 const afterReload=await page.evaluate(async id=>{
  const row=await window.TaleraMemories.get(id);
  const clips=await Promise.all(row.items.map(async item=>{
   const blob=await window.TaleraMemories.blob(item.key);
   return {kind:item.kind,size:blob?.size};
  }));
  return {id:row.id,clips,cues:row.narrationCues};
 },saved.id);
 assert.equal(afterReload.id,saved.id);
 assert.deepEqual(afterReload.cues,saved.cues);
 assert.ok(afterReload.clips.every(x=>x.size>10));
 const present=await page.goto(origin+'/present',{waitUntil:'domcontentloaded'});
 assert.equal(present.status(),200);
 await page.waitForFunction(()=>!!window.TaleraMemories?.get,{timeout:20000});
 assert.equal(await page.evaluate(async id=>!!(await window.TaleraMemories.get(id)),saved.id),true,
  'Original presentation must resolve the same story with media timing');
 const mine=await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
 assert.equal(mine.status(),200);
 await page.waitForFunction(()=>!!window.TaleraMemories?.list,{timeout:20000});
 const firstOwn=await page.evaluate(async()=>await window.TaleraMemories.list());
 assert.ok(firstOwn.some(s=>s.id===saved.id));
 const logout=await page.evaluate(async()=>{
  const r=await fetch('/api/logout',{method:'POST',credentials:'same-origin'});
  return r.status;
 });
 assert.equal(logout,200);
 const second=await register(fake(1));
 assert.equal(second.status,200);
 await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.TaleraMemories?.list,{timeout:20000});
 const secondOwn=await page.evaluate(async()=>await window.TaleraMemories.list());
 assert.equal(secondOwn.some(s=>s.id===saved.id),false,
  'Second account on same emulated phone must not read first account memories');
 const back=await page.evaluate(async data=>{
  const r=await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({email:data.email,password:data.password}),credentials:'same-origin'});
  return r.status;
 },fake(0));
 assert.equal(back,200);
 await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.TaleraMemories?.list,{timeout:20000});
 assert.ok((await page.evaluate(async()=>window.TaleraMemories.list()))
  .some(s=>s.id===saved.id),'Original account media must survive switching accounts');
 result={pass:true,engine:'Playwright WebKit - iPhone 13 viewport and touch emulation',
  source:'separate real Cloudflare F5 EU staging',syntheticAccounts:2,
  originalRecorderMemoryStoreUsed:true,syntheticPhotoVideoAudioPersisted:true,
  originalNarrationCuesAndTimingPersisted:true,presentationUsesSameLocalStory:true,
  localMediaIsolatedByAccount:true,realMicrophoneCameraCaptureVerified:false,
  realPhysicalIphoneSafariVerified:false,fullLegacyUploadApiIntegrated:false,
  tenMillionUsersProven:false,pageErrors:failures.slice(0,5)};
 console.log('TALERA_F5_WEBKIT_BROWSER_VERDICT',JSON.stringify(result));
}finally{
 if(context)await context.close();
 if(browser)await browser.close();
}

// Targeted F5 Free browser regression for actual user-observed issue:
// 5 iPhone photos + 1 video must be visibly imported and survive reload;
// mixed and dedicated video pickers both use the original media store.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
const here=path.dirname(fileURLToPath(import.meta.url)),out=path.join(here,'generated');
mkdirSync(out,{recursive:true});
const port=8817,origin='http://127.0.0.1:'+port,gate='1'.repeat(64);
const work=path.resolve('node_modules/.bin/wrangler');
const name='f5-video-iphone-'+Date.now();
let proc=null,log='',browser=null;
const stop=async()=>{
 if(browser){await browser.close();browser=null}
 if(proc&&!proc.killed){proc.kill('SIGTERM')}
};
const start=async()=>{
 proc=spawn(work,[
  'dev','--local','--ip','127.0.0.1','--port',String(port),
  '--config',path.join(here,'wrangler.jsonc'),
  '--persist-to',path.join(out,'video-accept-local'),
  '--var','STAGING_F5_KEY:'+gate,
  '--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
  '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
  '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_F5_VIDEO_BROWSER_LOCAL_ONLY_TEST_KEY',
  '--var','DEMO_IDENTITY_KEY:SYNTHETIC_F5_VIDEO_SOCIAL_LOCAL_ONLY_TEST_KEY',
  '--log-level','error'
 ],{env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore','pipe','pipe']});
 for(const s of [proc.stdout,proc.stderr])
  s.on('data',d=>log=(log+d.toString()).slice(-10000));
 for(let i=0;i<130;i++){
  try{
   const r=await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(1000)});
   if(r.status===200)return;
  }catch{}
  if(proc.exitCode!==null)throw Error('Wrangler stopped: '+log);
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 throw Error('Wrangler not available: '+log);
};
const makeAccount=async i=>{
 const id=name+'-'+i,body={
  email:id+'@example.invalid',
  username:'iphonevid'+i+Date.now().toString(36).slice(-8),
  displayName:'Fictieve iPhone Video '+i,
  password:'Synthetic_F5_iPhone_Video_Only_'+i+'_2026',
  birthDate:'1974-04-02'
 };
 const r=await fetch(origin+'/api/register',{method:'POST',headers:{
  origin,'cf-connecting-ip':'192.0.2.'+(21+i),
  'x-talera-f5-key':gate,'content-type':'application/json'
 },body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const data=await r.json();
 assert.equal(r.status,200,'Synthetic login '+JSON.stringify(data));
 const cookie=/talera_sid=([a-f0-9]{64})/.exec(r.headers.get('set-cookie')||'')?.[1];
 assert.ok(cookie,'F5 private synthetic account session required');
 return cookie;
};
const prepare=async sid=>{
 const ctx=await browser.newContext({
  ...devices['iPhone 13'],
  extraHTTPHeaders:{'x-talera-f5-key':gate}
 });
 await ctx.addCookies([{
  name:'talera_sid',value:sid,domain:'127.0.0.1',path:'/',
  secure:false,httpOnly:true,sameSite:'Lax'
 }]);
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 const r=await page.goto(origin+'/tell',{waitUntil:'domcontentloaded',timeout:25000});
 assert.equal(r.status(),200);
 await page.locator('#photoInput').waitFor({state:'attached',timeout:18000});
 return {ctx,page,errors};
};
const upload=async(page,videoB64,withVideo)=>{
 await page.evaluate(async({withVideo,videoB64})=>{
  const input=document.querySelector('#photoInput');
  if(!input)throw Error('The original TALERA photo selection is missing');
  const transfer=new DataTransfer();
  const colors=['#cc1212','#12cc12','#1212cc','#cccc12','#cc12cc'];
  for(let i=0;i<5;i++){
   const canvas=document.createElement('canvas');
   canvas.width=64;canvas.height=64;
   const ctx=canvas.getContext('2d');
   ctx.fillStyle=colors[i];ctx.fillRect(0,0,64,64);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   transfer.items.add(new File([blob],'f5-foto-'+i+'.png',{type:'image/png'}));
  }
  if(withVideo)transfer.items.add(new File([
   Uint8Array.from(atob(videoB64),c=>c.charCodeAt(0))
  ],'f5-korte-video.mp4',{type:'video/mp4'}));
  input.files=transfer.files;
  input.dispatchEvent(new Event('change',{bubbles:true}));
 },{withVideo,videoB64});
};
const status=async(page,photo,video)=>{
 await page.waitForFunction(([p,v])=>{
  const el=document.getElementById('talera-f5-media-status');
  return !!el&&el.textContent.includes(p+' foto(’s) en '+v+' video(’s)')&&
   document.querySelectorAll('.talera-work-tiles .tile[data-id]').length===p+v;
 },[photo,video],{timeout:38000});
 const text=await page.locator('#talera-f5-media-status').innerText();
 assert.ok(text.includes(photo+' foto(’s) en '+video+' video(’s)'));
 return text;
};
const readVideoFiles=async page=>page.evaluate(async()=>{
 const names=await indexedDB.databases();
 const name=names.find(n=>n.name?.startsWith('talera-free-local-'))?.name;
 if(!name)throw Error('No per-account IndexedDB found');
 const db=await new Promise((resolve,reject)=>{
  const r=indexedDB.open(name);
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
 const rows=await new Promise((resolve,reject)=>{
  const req=db.transaction('files','readonly').objectStore('files').getAll();
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 db.close();
 const originals=rows.filter(x=>x.blob instanceof Blob && !String(x.key).includes('preview:'));
 return {dbName:name,files:originals.map(x=>({type:x.blob.type,size:x.blob.size}))};
});
try{
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y',
   '-f','lavfi','-i','color=c=blue:s=320x180:r=12','-t','1',
   '-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',
   '-movflags','+faststart',path.join(out,'f5-video-picker-test.mp4')],{timeout:20000});
 const videoB64=readFileSync(path.join(out,'f5-video-picker-test.mp4')).toString('base64');
 await start();
 browser=await chromium.launch({headless:true});
 const result=[];
 // Scenario one: five photos and the actual video selected together.
 for(const withVideo of [true,false]){
  const sid=await makeAccount(withVideo?1:2);
  const {ctx,page,errors}=await prepare(sid);
  await upload(page,videoB64,withVideo);
  result.push({scenario:withVideo?'combined-5-photos-1-video':'separate-video-after-5-photos',
   stage:await status(page,5,withVideo?1:0)});
  if(!withVideo){
   assert.equal(await page.locator('#taleraF5AddVideoButton').count(),1);
   const payload={name:'f5-video-added-separately.mp4',mimeType:'video/mp4',
     buffer:readFileSync(path.join(out,'f5-video-picker-test.mp4'))};
   await page.locator('#taleraF5AddVideoInput').setInputFiles(payload);
   result[result.length-1].stage=await status(page,5,1);
  }
  await page.reload({waitUntil:'domcontentloaded',timeout:25000});
  await status(page,5,1);
  const files=await readVideoFiles(page);
  assert.ok(files.files.some(f=>f.type.startsWith('video/')&&f.size>100),
    'An original video Blob must survive iPhone local IndexedDB storage and reload');
  assert.ok(files.files.filter(f=>f.type.startsWith('image/')).length>=5,
    'All five original photos must survive local persistence');
  assert.equal(errors.length,0,'No browser JS failures: '+errors.join(' / '));
  result[result.length-1].videosPersisted=files.files.filter(f=>f.type.startsWith('video/')).length;
  result[result.length-1].photosPersisted=files.files.filter(f=>f.type.startsWith('image/')).length;
  result[result.length-1].sameAccountPrivateDB=/^talera-free-local-/.test(files.dbName);
  await ctx.close();
 }
 console.log('TALERA_F5_IPHONE_VIDEO_IMPORT_PASS',JSON.stringify({
  passed:true,syntheticOnly:true,originalPhotosRetained:true,
  originalVideoPersisted:true,explicitPickerVisible:true,
  mixedPickerNoSilentDrop:true,realIphoneDeviceTested:false,
  scenarios:result
 }));
}finally{await stop()}

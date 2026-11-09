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
 // Test-only instrumentation, never shipped to TALERA or Cloudflare.
 await ctx.addInitScript(()=>{
   const events=[];
   window.__taleraF5PresentationEvents=events;
   const add=(kind,element)=>{
     if(element?.tagName==='IFRAME'||element?.className?.toString()?.includes('talera-zero-present'))
       events.push({t:Math.round(performance.now()),kind,tag:element.tagName,
         src:element.getAttribute?.('src')||'',cls:String(element.className||'')});
   };
   const oldAppend=Element.prototype.append;
   Element.prototype.append=function(...nodes){for(const n of nodes)add('append',n);return oldAppend.apply(this,nodes)};
   const oldRemove=Element.prototype.remove;
   Element.prototype.remove=function(){add('remove',this);return oldRemove.call(this)};
   const oldAppendChild=Node.prototype.appendChild;
   Node.prototype.appendChild=function(n){add('appendChild',n);return oldAppendChild.call(this,n)};
 });
 const page=await ctx.newPage(),errors=[],warnings=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 page.on('console',m=>{
   if(['warning','error'].includes(m.type()))
     warnings.push('console '+m.type()+': '+m.text().slice(0,380));
 });
 const r=await page.goto(origin+'/tell',{waitUntil:'domcontentloaded',timeout:25000});
 assert.equal(r.status(),200);
 await page.locator('#photoInput').waitFor({state:'attached',timeout:18000});
 return {ctx,page,errors,warnings};
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
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y',
   '-f','lavfi','-i','sine=frequency=440:duration=4',
   '-ac','1','-ar','16000','-c:a','pcm_s16le',
   path.join(out,'f5-presentation-voice.wav')],{timeout:20000});
 const wavB64=readFileSync(path.join(out,'f5-presentation-voice.wav')).toString('base64');
 await start();
 browser=await chromium.launch({headless:true,
  args:['--autoplay-policy=no-user-gesture-required']});
 const result=[];
 // Scenario one: five photos and the actual video selected together.
 for(const withVideo of [true,false]){
  const sid=await makeAccount(withVideo?1:2);
  const {ctx,page,errors,warnings}=await prepare(sid);
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
  // The original Free importer writes originals and draft asynchronously.
  // Never reload the page before its 'origins saved' gate has completed.
  await page.waitForFunction(()=>{
    const n=document.querySelector('#importNotice');
    return n&&!String(n.textContent).includes('Originele bestanden bewaren');
  },null,{timeout:40000});
  const beforeReload=await readVideoFiles(page);
  assert.ok(beforeReload.files.filter(f=>f.type.startsWith('video/')).length>=1,
    'Actual selected video must already be durably stored before reload');
  await page.reload({waitUntil:'domcontentloaded',timeout:25000});
  // TALERA deliberately starts in the memories OVERVIEW when saved drafts
  // exist. Reopen the same draft before asserting the six media tiles.
  await page.locator('[data-open]').first().waitFor({state:'visible',timeout:18000});
  await page.locator('[data-open]').first().click();
  try{await status(page,5,1);}
  catch(error){
   const diagnostic=await page.evaluate(()=>({
    location:location.pathname,
    tiles:document.querySelectorAll('.talera-work-tiles .tile[data-id]').length,
    mediaStatus:document.querySelector('#talera-f5-media-status')?.textContent||'',
    importNotice:document.querySelector('#importNotice')?.textContent||'',
    error:document.querySelector('#error')?.textContent||'',
    body:document.body.textContent.slice(0,300)
   }));
   throw Error('Free video reload acceptance: '+JSON.stringify(diagnostic)+
     '; '+String(error.message));
  }
  const files=await readVideoFiles(page);
  assert.ok(files.files.some(f=>f.type.startsWith('video/')&&f.size>100),
    'An original video Blob must survive iPhone local IndexedDB storage and reload');
  assert.ok(files.files.filter(f=>f.type.startsWith('image/')).length>=5,
    'All five original photos must survive local persistence');
  assert.equal(errors.length,0,'No browser JS failures: '+errors.join(' / '));
  result[result.length-1].videosPersisted=files.files.filter(f=>f.type.startsWith('video/')).length;
  result[result.length-1].photosPersisted=files.files.filter(f=>f.type.startsWith('image/')).length;
  result[result.length-1].sameAccountPrivateDB=/^talera-free-local-/.test(files.dbName);
  if(withVideo){
    // Reproduce the actual iPhone report: story is present in Mijn leven,
    // but opening its "Bekijk herinnering" href used to get a 404.
    const saved=await page.evaluate(async mediaData=>{
      const bytes=Uint8Array.from(atob(mediaData),c=>c.charCodeAt(0));
      const media=new File([bytes],'f5-own-memory-video.mp4',{type:'video/mp4'});
      const story=await window.TaleraMemories.save({
        title:'F5 fictief verhaal met bewegende video',
        date:'2026-11-09',text:'Alleen fictief verhaal',
        narrationCues:[{t:0,index:0}],narrationDurationMs:1000
      },[media]);
      return {id:story.id,mediaCount:story.items?.length||0};
    },videoB64);
    assert.match(saved.id,/^local-[a-z0-9-]{8,90}$/i);
    assert.equal(saved.mediaCount,1);
    const home=await page.goto(origin+'/mijn-leven',{
      waitUntil:'domcontentloaded',timeout:25000
    });
    assert.equal(home.status(),200);
    const link=page.locator('a[href="/present?memory='+saved.id+'"]').first();
    await link.waitFor({state:'attached',timeout:25000});
    const href=await link.getAttribute('href');
    assert.equal(href,'/present?memory='+saved.id,
      'Original Mijn leven must link to its own saved story player');
    const player=await page.goto(origin+href,{
      waitUntil:'domcontentloaded',timeout:25000
    });
    assert.equal(player.status(),200,
      'Clicking a published Free story must render, not show Niet gevonden');
    await page.waitForFunction(()=>!!window.TaleraMemories?.get,{
      timeout:22000
    });
    const onPlayer=await page.evaluate(async storyId=>{
      const row=await window.TaleraMemories.get(storyId);
      const m=window.__taleraTimelineRuntime?.currentMemory?.();
      return {videoCount:row?.items?.filter(x=>x.kind==='video').length||0,
        chosenId:m?.storyId||m?.localId||null,hasStory:!!row};
    },saved.id);
    assert.equal(onPlayer.videoCount,1,
      'The actual video Blob must be available on the presentation origin');
    assert.equal(onPlayer.hasStory,true);
    result[result.length-1].ownMemoryViewOpen=true;
    result[result.length-1].ownMemoryVideoVisibleToPlayer=true;
    // Real regression for the user's iPhone: timeline dots advance but the
    // full-screen photo remains fixed. The original parent loads an
    // authenticated /vertelmodus-embed iframe and passes actual media and
    // recorded narration cues. Check the visible DOM changes on the PLAYER.
    const narrated=await page.evaluate(async({videoB64,wavB64})=>{
      const files=[];
      for(const color of ['#ec1717','#165ff2']){
        const canvas=document.createElement('canvas');
        canvas.width=120;canvas.height=120;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle=color;ctx.fillRect(0,0,120,120);
        const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
        files.push(new File([blob],'kleur-'+files.length+'.png',{type:'image/png'}));
      }
      files.push(new File([Uint8Array.from(atob(videoB64),x=>x.charCodeAt(0))],
        'f5-bewegende-video.mp4',{type:'video/mp4'}));
      files.push(new File([Uint8Array.from(atob(wavB64),x=>x.charCodeAt(0))],
        'f5-gesproken-tekst.wav',{type:'audio/wav'}));
      const saved=await window.TaleraMemories.save({
        title:'F5 presentatie met wisselende beelden en gesproken tekst',
        date:'2026-11-09',text:'Vijf echte synthetic-only acceptatieframes',
        narrationCues:[{t:0,index:0},{t:900,index:1},
          {t:2200,index:2,videoAtMs:100}],
        narrationDurationMs:4000
      },files);
      return {id:saved.id,types:(saved.items||[]).map(x=>x.kind)};
    },{videoB64,wavB64});
    assert.deepEqual(narrated.types,['photo','photo','video','audio'],
      'Original local store must preserve exact narrated media order');
    // This is the CURRENT approved V61/R20 INLINE player, inherited by the
    // user-specified design-cleanup candidate. The obsolete iframe assertion
    // would ALWAYS fail because R20 deliberately removed that iframe.
    // Check the visible RH19 layer and the native video, not progress dots.
    const presentResponse=await page.goto(
      origin+'/present?memory='+narrated.id,
      {waitUntil:'domcontentloaded',timeout:25000});
    assert.equal(presentResponse.status(),200);
    await page.waitForFunction(()=>{
      const m=window.__taleraTimelineRuntime?.currentMemory?.();
      return !!m&&m._zeroItems?.length===4&&!m._photoLoading&&
        !!document.querySelector('#photoStage audio')&&
        document.body.classList.contains('talera-v61-narration-visual');
    },null,{timeout:22000});
    const currentImage=()=>page.evaluate(()=>{
      const e=document.getElementById('photoLayerA');
      const st=e&&getComputedStyle(e);
      return {
        background:st?.backgroundImage||'',
        image:e?.querySelector('img')?.currentSrc||e?.querySelector('img')?.src||'',
        inline:e?.style.backgroundImage||'',
        html:e?.outerHTML.slice(0,220)||'',
        visible:!!e&&st.display!=='none'&&st.visibility!=='hidden'&&Number(st.opacity)>0,
        index:window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex,
        elapsed:document.querySelector('#photoStage audio')?.currentTime||0,
        video:!!document.querySelector('video.talera-v61-inline-video')
      };
    });
    const img0=await currentImage();
    assert.equal(img0.index,0,'Narrator must begin on its first original photo');
    assert.ok(img0.visible,'The front RH19 photo layer must be visible');
    const sharedAudio=page.locator('#photoStage audio').first();
    // Mobile browsers require a gesture, not a second storytelling engine.
    await page.locator('#photoStage').click({force:true});
    await page.waitForFunction(()=>{
      const a=document.querySelector('#photoStage audio');
      return !!a&&!a.paused&&a.currentTime>0.08;
    },null,{timeout:12000}).catch(async error=>{
      const diag=await page.evaluate(()=>({
        audio:[...document.querySelectorAll('#photoStage audio')].map(x=>({
          paused:x.paused,currentTime:x.currentTime,readyState:x.readyState,
          duration:x.duration,muted:x.muted
        })),
        stage:document.getElementById('photoStage')?.outerHTML.slice(0,550),
        bodyClass:document.body.className
      }));
      throw Error('Current R20 inline narration did not start: '+
        JSON.stringify(diag)+'; '+error.message);
    });
    await page.waitForFunction(()=>{
      const a=document.querySelector('#photoStage audio');
      const m=window.__taleraTimelineRuntime?.currentMemory?.();
      return a&&a.currentTime>=1.1&&m?._photoIndex===1;
    },null,{timeout:11000});
    const img1=await currentImage();
    assert.ok(img1.visible,'Second photo must still be visibly presented');
    assert.notEqual(img0.background+'|'+img0.image+'|'+img0.inline,
      img1.background+'|'+img1.image+'|'+img1.inline,
      'The large visible photo must actually change, not only the dots');
    await page.waitForFunction(()=>{
      const a=document.querySelector('#photoStage audio');
      const m=window.__taleraTimelineRuntime?.currentMemory?.();
      const video=document.querySelector('video.talera-v61-inline-video');
      return a&&a.currentTime>=2.3&&m?._photoIndex===2&&
        !!video&&!!video.src&&video.isConnected;
    },null,{timeout:11000});
    const liveVideo=await page.locator('video.talera-v61-inline-video')
      .first().evaluate(v=>({
        hasSource:!!v.src,readyState:v.readyState,
        currentTime:v.currentTime,duration:v.duration,
        size:{width:v.clientWidth,height:v.clientHeight},
        visible:getComputedStyle(v).display!=='none'&&
          getComputedStyle(v).visibility!=='hidden',
        index:window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex
      }));
    assert.equal(liveVideo.index,2);
    assert.ok(liveVideo.visible&&liveVideo.size.width>0&&liveVideo.size.height>0,
      'Native original video must cover visible presentation, not only poster');
    result[result.length-1].narratedVideoPresentedOnSingleStage=true;
    result[result.length-1].actualImage0ToImage1ToVideo2=true;
    result[result.length-1].originalV61InlinePlayerTested=true;


  }
  await ctx.close();
 }
 console.log('TALERA_F5_IPHONE_VIDEO_IMPORT_PASS',JSON.stringify({
  passed:true,syntheticOnly:true,originalPhotosRetained:true,
  originalVideoPersisted:true,explicitPickerVisible:true,
  mixedPickerNoSilentDrop:true,originalOwnMemoryViewRouteChecked:true,originalVoiceAnd3CuePhotoVideoPresentationRegression:true,validatedLatestInlinePlayerNotLegacyIframe:true,realIphoneDeviceTested:false,
  scenarios:result
 }));
}finally{await stop()}

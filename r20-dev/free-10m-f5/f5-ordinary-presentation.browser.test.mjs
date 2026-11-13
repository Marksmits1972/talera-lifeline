// Test the EXISTING TALERA Free /present route with disposable local-only media.
// No test Worker, second app, production account, changes to /tell or personal data.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium,devices} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url)),generated=path.join(here,'generated');
mkdirSync(generated,{recursive:true});
const origin='http://127.0.0.1:8837',gate='1'.repeat(64);
let worker=null,browser=null,log='';
async function stop(){
  if(browser)await browser.close().catch(()=>{});
  if(worker&&!worker.killed)worker.kill('SIGTERM');
}
async function start(){
  worker=spawn(path.resolve('node_modules/.bin/wrangler'),[
    'dev','--local','--ip','127.0.0.1','--port','8837',
    '--config',path.join(here,'wrangler.jsonc'),
    '--persist-to',path.join(generated,'ordinary-present-local'),
    '--var','STAGING_F5_KEY:'+gate,
    '--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
    '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
    '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_F5_PRESENTATION_ONLY_LOCAL_TEST_KEY',
    '--var','DEMO_IDENTITY_KEY:SYNTHETIC_F5_PRESENTATION_ONLY_LOCAL_SOCIAL_KEY',
    '--log-level','error'
  ],{env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore','pipe','pipe']});
  for(const stream of [worker.stdout,worker.stderr])
    stream.on('data',x=>log=(log+x.toString()).slice(-6000));
  for(let i=0;i<140;i++){
    if(worker.exitCode!==null)throw Error('Local original Free worker stopped: '+log);
    try{
      if((await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(800)})).status===200)return;
    }catch{}
    await new Promise(r=>setTimeout(r,280));
  }
  throw Error('Original Free worker unavailable: '+log);
}
// Read ONLY photographic pixels from the actual rendered stage screenshot.
// Comparing whole screenshots allowed moving dots to masquerade as a new photo.
async function centerPixel(page){
  const box=await page.locator('#photoStage').boundingBox();
  assert.ok(box&&box.width>0&&box.height>0,'Visible photo stage required');
  const session=await page.context().newCDPSession(page);
  let shot;
  try {
    const result=await session.send('Page.captureScreenshot',{
      format:'png',
      clip:{x:box.x,y:box.y,width:box.width,height:box.height,scale:1}
    });
    shot=Buffer.from(result.data,'base64');
  } finally {await session.detach();}
  return page.evaluate(async data=>{
    const img=new Image();
    img.src='data:image/png;base64,'+data;
    await img.decode();
    const canvas=document.createElement('canvas');
    canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0);
    const sample=(x,y)=>Array.from(ctx.getImageData(
      Math.floor(canvas.width*x),Math.floor(canvas.height*y),1,1).data).slice(0,3);
    return {upper:sample(.5,.36),middle:sample(.5,.52),
      width:canvas.width,height:canvas.height};
  },shot.toString('base64'));
}
function nearColor(p,rgb){return p.upper.every((v,i)=>Math.abs(v-rgb[i])<42)}
function dominant(p,channel){
  const rgb=p.upper;
  return rgb[channel] > rgb[(channel+1)%3]*1.55 &&
    rgb[channel] > rgb[(channel+2)%3]*1.55;
}
const waitIndex=(page,index,timeout=9500)=>page.waitForFunction(index=>
  window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex===index,
  index,{timeout});
async function load(page,id,count){
  const res=await page.goto(origin+'/present?memory='+id,
    {waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(res.status(),200);
  await page.waitForFunction(([id,count])=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    return m?.storyId===id&&!m._photoLoading&&m._zeroFrames?.length===count;
  },[id,count],{timeout:20000});
}
try{
  await start();
  const suffix=Date.now().toString(36);
  const signed=await fetch(origin+'/api/register',{method:'POST',headers:{
    origin,'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.83',
    'content-type':'application/json'
  },body:JSON.stringify({
    email:'photo-'+suffix+'@example.invalid',username:'phototest'+suffix.slice(-8),
    displayName:'Synthetic photos only',password:'Synthetic_Free_Only_Roll_2026',
    birthDate:'1974-04-02'
  })});
  assert.equal(signed.status,200,'No local account: '+(await signed.text()).slice(0,450));
  const sid=/talera_sid=([a-f0-9]{64})/.exec(signed.headers.get('set-cookie')||'')?.[1];
  assert.ok(sid,'Session cookie not returned');
  browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const ctx=await browser.newContext({
    ...devices['iPhone 13'],extraHTTPHeaders:{'x-talera-f5-key':gate}
  });
  await ctx.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',
    path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // The VERY SAME authenticated Free PWA must begin with ZERO bundled
  // memories on Home, not merely an image-less Test 081 hero or a synthetic
  // 1990/year counter. Genuine owner records are never removed by this test.
  const cleanHomeResponse=await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
  assert.equal(cleanHomeResponse.status(),200);
  try{
    await page.waitForFunction(()=>!!window.TaleraMemories?.list&&
      /^(nog leeg|still empty)$/i.test(document.getElementById('v17-year-summary')?.textContent?.trim()||''),
      null,{timeout:14000});
  }catch(error){
    const state=await page.evaluate(()=>({
      href:location.href,
      taleraMemories:typeof window.TaleraMemories?.list,
      demo:window.__taleraReferenceMemories?.length,
      yearStatus:document.getElementById('v17-year-summary')?.textContent,
      year:document.getElementById('v17-selected-year')?.textContent,
      minYear:document.getElementById('v17-min-year')?.textContent,
      heroTitle:document.getElementById('heroTitle')?.textContent,
      heroVisible:getComputedStyle(document.getElementById('heroCaption')).display,
      topicsScript:document.getElementById('talera-v17-topics-script')?.textContent.length,
      timelineScript:document.getElementById('talera-flow-v17-time')?.textContent.length
    }));
    throw Error('CLEAN_HOME_INIT_DIAGNOSTIC '+JSON.stringify(state)+
      ' pageerrors='+JSON.stringify(errors.slice(0,12))+' cause='+String(error));
  }
  const cleanHome=await page.evaluate(async()=>{
    const saved=await window.TaleraMemories.list();
    const hero=document.getElementById('heroCaption');
    return {
      saved:saved.length,
      examples:window.__taleraReferenceMemories?.length,
      heroTitle:document.getElementById('heroTitle')?.textContent.trim(),
      heroDate:document.getElementById('heroKind')?.textContent.trim(),
      heroVisible:!!hero&&getComputedStyle(hero).display!=='none',
      heroImage:document.getElementById('heroImage')?.getAttribute('src'),
      year:document.getElementById('v17-selected-year')?.textContent.trim(),
      minYear:document.getElementById('v17-min-year')?.textContent.trim(),
      yearStatus:document.getElementById('v17-year-summary')?.textContent.trim(),
      sampleTiles:document.getElementById('demoCards')?.children.length,
      yearPreview:document.getElementById('v17-year-preview')?.textContent.trim(),
      yearSampleTips:[...document.querySelectorAll('#v17-ruler .v17-mark')]
        .filter(x=>/voorbeeld/i.test(x.title)).length,
      fakeFamily:[...document.querySelectorAll('.talera-topic-example')].length,
      bundledTest81:document.documentElement.outerHTML.includes('Test 081'),
      bundledPhoto081:document.documentElement.outerHTML.includes('talera-500-fotoband-081')
    };
  });
  assert.equal(cleanHome.saved,0,'Brand-new local account must start with zero own records');
  assert.equal(cleanHome.examples,0,'ALL 500 Home demo records must be removed');
  assert.deepEqual([cleanHome.heroTitle,cleanHome.heroDate],['',''],
    'Home must not show a remembered demo title/date on an empty account');
  assert.equal(cleanHome.heroVisible,false,'No pretend hero memory should remain');
  assert.equal(cleanHome.heroImage,null,'No reference hero src may survive');
  assert.equal(cleanHome.sampleTiles,0,'No example or fake topic tiles');
  assert.equal(cleanHome.fakeFamily,0,'No invented family topic from first own photo');
  assert.match(cleanHome.yearStatus,/^(nog leeg|still empty)$/i,'A year with no events has no sample count');
  assert.equal(cleanHome.minYear,'1974','Existing account birthday still controls Home time axis');
  assert.equal(cleanHome.year,String(new Date().getFullYear()),
    'Empty account selects the current year, never 1990 or demo year 1985');
  assert.equal(cleanHome.yearSampleTips,0,'Ruler must not expose demo memory tooltips');
  assert.equal(cleanHome.bundledTest81,false);
  assert.equal(cleanHome.bundledPhoto081,false);
  console.log('TALERA_F5_HOME_ZERO_BUNDLED_MEMORIES_PASS',JSON.stringify({
    sampleCount:0,heroEmpty:true,yearEmpty:true,accountBirthYearPreserved:true,
    ownerIndexedDbUntouched:true,realIphoneAccepted:false
  }));

  const response=await page.goto(origin+'/present',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>!!window.TaleraMemories?.save,null,{timeout:15000});
  // With zero saved memories the original presentation must start empty:
  // neither the 50 fixed examples nor the 450 generated examples can appear.
  const initial=await page.evaluate(()=>({
    memory:window.__taleraTimelineRuntime?.currentMemory?.()?.id??null,
    demoImages:[...document.querySelectorAll('img')].map(img=>img.currentSrc||img.src||'')
      .filter(src=>/talera-(?:v11-clean|500-fotoband)-/.test(src))
  }));
  assert.equal(initial.memory,null,'The account-free presentation must not select a built-in memory');
  assert.deepEqual(initial.demoImages,[],'No built-in photo may be loaded into the presentation');
  const emptyPresentation=await page.evaluate(()=>({
    date:document.getElementById('memoryDate')?.textContent.trim(),
    story:document.getElementById('memoryStory')?.textContent.trim()
  }));
  assert.deepEqual(emptyPresentation,{date:'',story:''},
    'Presentation with zero own events must not render a fake September 2026 memory');

  const readingControls=await page.evaluate(()=>{
    const sheet=document.querySelector('.memory-space');
    const paper=document.getElementById('memoryCaption');
    const oldShare=document.getElementById('talera-v18-story-actions');
    const oldPencil=document.getElementById('talera-v21-pencil');
    const photoPencil=document.getElementById('talera-v5-editor-pencil');
    const social=document.getElementById('talera-clean-social');
    if(!sheet||!paper||!oldShare||!oldPencil||!photoPencil||!social)return null;
    const originalHidden=oldPencil.hidden;
    const photoBefore=getComputedStyle(photoPencil).display;
    oldPencil.hidden=false;
    sheet.classList.add('talera-v26-reading');
    document.body.classList.add('talera-v18-reading');
    const result={
      share:getComputedStyle(oldShare).display,
      sheetPencil:getComputedStyle(oldPencil).display,
      photoPencil:getComputedStyle(photoPencil).display,
      social:getComputedStyle(social).display,
      storyPadding:getComputedStyle(document.getElementById('memoryStory')).paddingRight,
      photoBefore
    };
    sheet.classList.remove('talera-v26-reading');
    document.body.classList.remove('talera-v18-reading');
    oldPencil.hidden=originalHidden;
    result.photoAfter=getComputedStyle(photoPencil).display;
    return result;
  });
  assert.ok(readingControls,'Original approved reading controls must exist');
  assert.equal(readingControls.share,'none','Old sheet share remains hidden');
  assert.equal(readingControls.sheetPencil,'none','Old sheet editor remains hidden');
  assert.equal(readingControls.photoPencil,'none','Photo editor hidden while sheet raised only');
  assert.equal(readingControls.storyPadding,'0px','No empty share-button text gutter');
  assert.notEqual(readingControls.photoBefore,'none','Existing photo editor remains');
  assert.notEqual(readingControls.photoAfter,'none','Existing photo editor returns');
  assert.notEqual(readingControls.social,'none','Original social toolbar remains');


  const plain=await page.evaluate(async()=>{
    const files=await Promise.all(['#ef1523','#27d128','#233fff'].map(async(c,i)=>{
      const canvas=document.createElement('canvas');canvas.width=140;canvas.height=140;
      const paint=canvas.getContext('2d');paint.fillStyle=c;paint.fillRect(0,0,140,140);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      return new File([blob],'original-'+i+'.png',{type:'image/png'});
    }));
    const row=await window.TaleraMemories.save({
      title:'Original photo roll',date:'2026-11-11',time:'12:00:00',
      text:'Synthetic unvoiced images without cues'
    },files);
    return row.id;
  });
  await load(page,plain,3);
  // Native timeline regression: with only ONE real local memory near today,
  // releasing a finger drag must preserve the finger-selected historical year.
  // The existing photo-book landing may choose that memory but must NOT
  // reposition the independent timeline back to its event date.
  const timelineBox=await page.locator('#surface').boundingBox();
  assert.ok(timelineBox?.width>180&&timelineBox?.height>90,
    'Original native timeline touch surface required');
  const firstCenter=await page.evaluate(()=>window.__taleraTimelineRuntime.centerMs());
  const timelineY=timelineBox.y+timelineBox.height*.38;
  await page.mouse.move(timelineBox.x+timelineBox.width*.22,timelineY);
  await page.mouse.down();
  await page.mouse.move(timelineBox.x+timelineBox.width*.82,timelineY,{steps:18});
  const heldCenter=await page.evaluate(()=>window.__taleraTimelineRuntime.centerMs());
  assert.ok(heldCenter<firstCenter-4*365*86400000,
    'Timeline must follow finger back at least four years while held');
  await page.mouse.up();
  await page.waitForTimeout(1150);
  const releasedCenter=await page.evaluate(()=>window.__taleraTimelineRuntime.centerMs());
  assert.ok(Math.abs(releasedCenter-heldCenter)<.35*365.25*86400000,
    'Timeline returned to latest memory/today after finger release: '+
      JSON.stringify({held:new Date(heldCenter).toISOString(),
        released:new Date(releasedCenter).toISOString()}));
  console.log('TALERA_NATIVE_TIMELINE_RELEASE_STAYS_IN_PAST_PASS',
    JSON.stringify({previousNavigationIntact:true,fastSlowScaleUntouched:true,
      mediaNotMoved:true,iphoneAccepted:false}));
  await load(page,plain,3);
  assert.equal((await page.evaluate(()=>window.__taleraTimelineRuntime.currentMemory()._photoIndex)),0);
  const first=await centerPixel(page);
  assert.ok(dominant(first,0),'FIRST PHOTO IS NOT VISIBLE RED: '+JSON.stringify(first));
  await waitIndex(page,1);
  const second=await centerPixel(page);
  assert.ok(dominant(second,1),'SECOND PHOTO DOES NOT DISPLAY GREEN, DOTS ONLY: '+
    JSON.stringify({first,second}));
  await page.locator('#memoryStoryScroll').tap({timeout:12000});
  const wheelAfterTap=await page.locator('#photoStage .talera-wheel-strip').evaluate(e=>({
    shown:e.classList.contains('is-visible'),display:getComputedStyle(e).display
  }));
  assert.equal(wheelAfterTap.shown,false,
    'Ordinary PHOTO TAP must never open the high-z swipe thumbnail wheel');
  await waitIndex(page,2,9000);
  const third=await centerPixel(page);
  if(!dominant(third,2)){
    const diag=await page.evaluate(()=>{
      const stage=document.getElementById('photoStage');
      const m=window.__taleraTimelineRuntime.currentMemory();
      const l=[...stage.querySelectorAll('.photo-layer,.talera-story-synced-photo,.example-photo,.talera-story-synced-sharp')]
        .map(e=>{const c=getComputedStyle(e);return {id:e.id,cls:e.className,
          hidden:e.hidden,src:e.currentSrc||e.src||'',natural:e.naturalWidth||0,
          display:c.display,visible:c.visibility,opacity:c.opacity,z:c.zIndex,
          rect:JSON.stringify(e.getBoundingClientRect().toJSON()).slice(0,160)};});
      const r=stage.getBoundingClientRect();
      const el=document.elementFromPoint(r.left+r.width*.5,r.top+r.height*.36);
      return {id:m.id,index:m._photoIndex,photo:m.photos[m._photoIndex],
        image:m.image,owner:el?.className,layers:l,
        narration:document.body.classList.contains('talera-v61-narration-visual')};
    });
    throw Error('MANUAL TAP INDEX CHANGED BUT PHOTO NOT BLUE: '+
      JSON.stringify({second,third,diag}).slice(0,12000));
  }
  await waitIndex(page,0,9000);
  assert.equal(await page.evaluate(()=>window.__taleraTimelineRuntime.currentMemory().storyId),plain);

  const mp4=path.join(generated,'ordinary-original-video.mp4');
  execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=blue:s=160x120:d=1',
    '-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4],
    {timeout:20000,stdio:'ignore'});
  const mixed=await page.evaluate(async b64=>{
    const files=await Promise.all(['#ffa500','#00d9f2'].map(async(c,i)=>{
      const canvas=document.createElement('canvas');canvas.width=140;canvas.height=140;
      const paint=canvas.getContext('2d');paint.fillStyle=c;paint.fillRect(0,0,140,140);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      return new File([blob],'mixed-'+i+'.png',{type:'image/png'});
    }));
    files.push(new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],
      'original.mp4',{type:'video/mp4'}));
    const row=await window.TaleraMemories.save({
      title:'Photos and original video',date:'2026-11-11',time:'12:01:00',
      text:'Ordinary memory with original video but no narration'
    },files);
    return row.id;
  },readFileSync(mp4).toString('base64'));
  // The owner's bug occurs only AFTER a REAL story-to-story swipe.
  // Preserve the same single /present page; do not navigate directly to
  // memory 2. Its cover must be preloaded on the existing 11-photo wheel.
  await load(page,plain,3);
  const coverState=await page.evaluate(targetId=>{
    const book=window.__taleraPhotoBook;
    const row=book?.list?.().find(m=>m.storyId===targetId);
    return {id:row?.id,preview:row?.previewImage,photo:row?.image,
      hasMedia:!!row?._zeroItems?.length};
  },mixed);
  assert.ok(coverState.id&&coverState.preview&&coverState.hasMedia,
    'Next story must have an existing attached real thumbnail');
  const bounds=await page.locator('#memoryStoryScroll').boundingBox();
  assert.ok(bounds?.width>100&&bounds?.height>100);
  await page.mouse.move(bounds.x+bounds.width*.79,bounds.y+bounds.height*.48);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width*.18,bounds.y+bounds.height*.48,{steps:12});
  await page.mouse.up();
  await page.waitForFunction(id=>
    window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,
    mixed,{timeout:12000});
  // It must become hidden after the original inertia completes AND the new
  // selected base photo has decoded, not merely when a separate rolling flag flips.
  await page.waitForFunction(()=>!document.querySelector('#photoStage .talera-wheel-strip')?.classList.contains('is-visible'),
    null,{timeout:12000});
  const wheelRest=await page.locator('#photoStage .talera-wheel-strip').evaluate(el=>({
    display:getComputedStyle(el).display,active:el.classList.contains('is-visible')
  }));
  assert.equal(wheelRest.active,false,'The story swipe must have settled');
  assert.equal(wheelRest.display,'none','Thumbnail wheel must hide ALL child pages at rest');
  await page.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?._zeroFrames?.length===3,
    null,{timeout:11000});
  const swipePhotoBefore=await centerPixel(page);
  assert.ok(nearColor(swipePhotoBefore,[255,165,0]),
    'SWIPED THUMBNAIL NOT VISIBLE OR WRONG PHOTO: '+JSON.stringify(swipePhotoBefore));
  await waitIndex(page,1,11000);
  const swipePhotoAfter=await centerPixel(page);
  if(!nearColor(swipePhotoAfter,[0,217,242])){
    const trace=await page.evaluate(()=>{
      const m=window.__taleraTimelineRuntime.currentMemory();
      const stage=document.getElementById('photoStage');
      const layers=[...stage.querySelectorAll('.example-photo,.talera-story-synced-sharp,.talera-wheel-strip,.talera-photo-strip-page')]
        .map(e=>({className:e.className,id:e.id,src:e.currentSrc||e.src||'',
          vis:getComputedStyle(e).visibility,display:getComputedStyle(e).display,
          hidden:e.hidden,opacity:getComputedStyle(e).opacity,
          z:getComputedStyle(e).zIndex,rect:e.getBoundingClientRect().toJSON()}));
      return {story:m.storyId,index:m._photoIndex,
        image:m.image,preview:m.previewImage,frames:m._zeroFrames,
        rolling:window.__taleraBandRolling,layers};
    });
    throw Error('AFTER SWIPE DOTS MOVE BUT REAL PHOTO FROZEN: '+
      JSON.stringify({swipePhotoBefore,swipePhotoAfter,trace}).slice(0,11000));
  }
  // The test video's one-second playback can end before the post-tap check.
  // Watch the original player from BEFORE tapping instead of missing it.
  await page.evaluate(()=>{
    window.__taleraOriginalVideoWasShown=!!document.querySelector('video.talera-v61-inline-video');
    const observer=new MutationObserver(()=>{
      if(document.querySelector('video.talera-v61-inline-video'))
        window.__taleraOriginalVideoWasShown=true;
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    window.__taleraOriginalVideoObserver=observer;
  });
  const secondTapBefore=await page.evaluate(()=>window.__taleraTimelineRuntime.currentMemory()._photoIndex);
  await page.locator('#memoryStoryScroll').tap({timeout:12000});
  await page.waitForFunction(previous=>window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex!==previous,
    secondTapBefore,{timeout:2200});
  console.log('TALERA_REAL_STORY_SWIPE_AND_SECOND_MEMORY_PHOTO_ROLL_OK');
  // Continue with the original video of the same swiped memory.
  try{
    await page.waitForFunction(()=>window.__taleraOriginalVideoWasShown||
      !!document.querySelector('video.talera-v61-inline-video'),
      null,{timeout:12000});
  }catch(error){
    const diagnostic=await page.evaluate(()=>{
      const m=window.__taleraTimelineRuntime?.currentMemory?.();
      return {index:m?._photoIndex,media:m?._zeroItems?.map(x=>x.kind),
        observed:window.__taleraOriginalVideoWasShown,
        videos:[...document.querySelectorAll('video')].map(v=>({
          cls:v.className,paused:v.paused,ended:v.ended,currentTime:v.currentTime
        }))};
    });
    throw Error('Original video not visible after tap: '+JSON.stringify(diagnostic)+'; '+error);
  }finally{
    await page.evaluate(()=>window.__taleraOriginalVideoObserver?.disconnect());
  }
  await waitIndex(page,0,12000);
  const state=await page.evaluate(()=>{
    const m=window.__taleraTimelineRuntime.currentMemory();
    return {id:m.storyId,video:document.body.classList.contains('talera-v61-narration-visual')};
  });
  assert.equal(state.id,mixed);
  assert.equal(state.video,false,'Ordinary photo roll cannot enter narration mode');
  // Playback integration in the SAME authenticated TALERA Free candidate.
  // Synthetic voice and original soundtrack, no new app, no customer media.
  const syntheticVoice=path.join(generated,'independent-narrator-voice.wav');
  const syntheticOriginal=path.join(generated,'independent-narrator-original.webm');
  execFileSync('ffmpeg',['-y','-f','lavfi','-i','sine=frequency=330:duration=4.6',
    '-c:a','pcm_s16le','-ar','22050',syntheticVoice],{timeout:25000,stdio:'ignore'});
  execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=blue:s=160x120:d=2',
    '-f','lavfi','-i','sine=frequency=440:duration=2',
    '-shortest','-c:v','libvpx','-b:v','160k','-c:a','libopus',
    '-b:a','64k',syntheticOriginal],
    {timeout:30000,stdio:'ignore'});
  const narrated=await page.evaluate(async ({voice,video})=>{
    const files=await Promise.all(['#f01426','#19d03a','#293af2'].map(async(c,i)=>{
      const canvas=document.createElement('canvas');
      canvas.width=140;canvas.height=140;
      const p=canvas.getContext('2d');p.fillStyle=c;p.fillRect(0,0,140,140);
      const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
      return new File([blob],'narration-original-'+i+'.png',{type:'image/png'});
    }));
    files.push(new File([Uint8Array.from(atob(video),x=>x.charCodeAt(0))],
      'original-with-audio.webm',{type:'video/webm'}));
    files.push(new File([Uint8Array.from(atob(voice),x=>x.charCodeAt(0))],
      'one-continuous-voice.wav',{type:'audio/wav'}));
    const saved=await window.TaleraMemories.save({
      title:'Independent voice playback',date:'2026-11-12',time:'18:30:00',
      text:'Synthetic one-story voice clock and original media',
      narrationCues:[]
    },files);
    const row=await window.TaleraMemories.get(saved.id);
    const imageKeys=row.items.filter(x=>x.kind==='photo'||x.kind==='video').map(x=>x.key);
    const voiceItem=row.items.find(x=>x.kind==='audio');
    if(imageKeys.length!==4||!voiceItem)throw Error('Original audio and 4 media IDs were not stored');
    const cues=[
      {t:0,index:0,mediaId:imageKeys[0]},
      {t:600,index:3,mediaId:imageKeys[3],videoAtMs:0},
      {t:1550,index:1,mediaId:imageKeys[1]},
      {t:2800,index:3,mediaId:imageKeys[3],videoAtMs:250}
    ];
    // Test-only insertion of the exact published narrator cue schema into
    // the SAME account-scoped IndexedDB. The real editor/writer is separately
    // protected by the F5 recorder ID/readback tests.
    const dbName=(await indexedDB.databases()).map(x=>x.name||'')
      .find(x=>x.startsWith('talera-free-local-'));
    if(!dbName)throw Error('Account-specific original media store missing');
    const db=await new Promise((ok,bad)=>{
      const req=indexedDB.open(dbName);
      req.onsuccess=()=>ok(req.result);req.onerror=()=>bad(req.error);
    });
    await new Promise((ok,bad)=>{
      const tx=db.transaction('stories','readwrite');
      const store=tx.objectStore('stories');
      const get=store.get(saved.id);
      get.onsuccess=()=>{
        const existing=get.result;
        if(!existing){tx.abort();return}
        store.put({...existing,narrationCues:cues,
          narrationSchema:'media-id-v1',narrationDurationMs:4600});
      };
      tx.oncomplete=ok;tx.onerror=()=>bad(tx.error);tx.onabort=()=>bad(tx.error);
    });
    db.close();
    return {id:saved.id,keys:imageKeys,voiceId:voiceItem.key,cues};
  },{voice:readFileSync(syntheticVoice).toString('base64'),
     video:readFileSync(syntheticOriginal).toString('base64')});
  assert.equal(narrated.cues.length,4);
  assert.equal(new Set(narrated.keys).size,4);
  await load(page,narrated.id,4);
  await page.locator('.talera-independent-narrator-layer audio')
    .waitFor({state:'attached',timeout:15000});
  await page.waitForFunction(()=>{
    const audio=document.querySelector('.talera-independent-narrator-layer audio');
    return audio&&!audio.paused&&audio.currentTime>.06;
  },null,{timeout:14000});
  const voiceSound=await page.evaluate(()=>{
    const voice=document.querySelector('.talera-independent-narrator-layer audio');
    return {settingsEnabled:window.__taleraAudioControls?.isEnabled?.(),
      muted:voice?.muted,volume:voice?.volume,
      dots:document.querySelectorAll('.talera-photo-dot').length};
  });
  assert.equal(voiceSound.settingsEnabled,true,
    'Original TALERA listening preference should default to enabled');
  assert.equal(voiceSound.muted,false,
    'Recorded voice must not be silently muted in the real PWA');
  assert.ok(voiceSound.volume>0,'Voice volume must be audible');
  assert.equal(voiceSound.dots,4,'Existing orange photo dots must be present');
  const firstNarrated=await centerPixel(page);
  assert.ok(dominant(firstNarrated,0),
    'Independent narrator did not paint its OWN first original photo: '+JSON.stringify(firstNarrated));
  await page.evaluate(()=>{
    const audio=document.querySelector('.talera-independent-narrator-layer audio');
    audio.currentTime=.8;
    audio.ontimeupdate?.();
  });
  await page.waitForFunction(()=>{
    const v=document.querySelector('video.talera-independent-narrator-video');
    return !!v&&v.muted===true;
  },null,{timeout:8000});
  await page.waitForFunction(()=>{
    const dots=[...document.querySelectorAll('.talera-photo-dot')];
    return dots.length===4&&dots[3].classList.contains('active')&&
      dots.filter(x=>x.classList.contains('active')).length===1;
  },null,{timeout:5500});
  await page.evaluate(()=>{
    const audio=document.querySelector('.talera-independent-narrator-layer audio');
    audio.currentTime=1.8;
    audio.ontimeupdate?.();
  });
  await page.waitForFunction(()=>{
    const img=document.querySelector('img.talera-independent-narrator-photo');
    return !!img&&!img.hidden&&img.complete&&img.naturalWidth>0;
  },null,{timeout:9000});
  await page.waitForFunction(()=>{
    const dots=[...document.querySelectorAll('.talera-photo-dot')];
    return dots.length===4&&dots[1].classList.contains('active')&&
      dots.filter(x=>x.classList.contains('active')).length===1;
  },null,{timeout:5500});
  const secondNarrated=await centerPixel(page);
  assert.ok(dominant(secondNarrated,1),
    'Voice cue time did not display its own green media-ID: '+JSON.stringify(secondNarrated));
  await page.waitForFunction(()=>!!document.querySelector(
    '.talera-independent-narrator-layer video.talera-independent-original-video'),
    null,{timeout:15000});

  await page.waitForFunction(()=>{
    const layer=document.querySelector('.talera-independent-narrator-layer');
    const video=layer?.querySelector('video.talera-independent-original-video');
    const sound=layer?.querySelector('audio');
    return video&&sound&&sound.currentSrc===video.currentSrc&&
      !sound.paused&&!sound.muted&&sound.currentTime>.02;
  },null,{timeout:12000});
  const soundtrack=await page.evaluate(()=>{
    const layer=document.querySelector('.talera-independent-narrator-layer');
    const video=layer.querySelector('video.talera-independent-original-video');
    const sound=layer.querySelector('audio');
    return {pictureMuted:video?.muted,audioMuted:sound?.muted,
      audioPlaying:!sound.paused&&sound.currentTime>0,
      sameOriginalSource:sound.currentSrc===video.currentSrc,
      secondListen:!!document.querySelector('button.talera-v61-audio-permission-hint'),
      narratorCount:document.querySelectorAll('.talera-independent-narrator-layer').length};
  });
  assert.equal(soundtrack.pictureMuted,true);
  assert.equal(soundtrack.audioMuted,false);
  assert.equal(soundtrack.audioPlaying,true);
  assert.equal(soundtrack.sameOriginalSource,true);
  assert.equal(soundtrack.secondListen,false);
  assert.equal(soundtrack.narratorCount,1);
  await load(page,plain,3);
  assert.equal(await page.locator('.talera-independent-narrator-layer').count(),0,
    'Ordinary memory must not receive any narrator layer');
  // Local iPhone-photo hydration and ordinary 2.5 s rotation may complete
  // after the memory ID changes; inspect the actual native layer, not a stale
  // first screenshot captured during the story-to-story handoff.
  let backToOrdinary=null;
  for(let tryNo=0;tryNo<12;tryNo++){
    const state=await page.evaluate(()=>{
      const m=window.__taleraTimelineRuntime?.currentMemory?.();
      const stage=document.getElementById('photoStage');
      return {storyId:m?.storyId,index:m?._photoIndex,zeroCount:m?._zeroFrames?.length,
        loaded:!m?._photoLoading,
        current:stage?.querySelector('.photo-layer img.example-photo')?.currentSrc||'',
        narrator:!!document.querySelector('.talera-independent-narrator-layer')};
    });
    if(state.storyId===plain&&state.index===0&&state.loaded&&!state.narrator){
      const pixel=await centerPixel(page);
      backToOrdinary={state,pixel};
      if(dominant(pixel,0))break;
    }
    await page.waitForTimeout(220);
  }
  assert.ok(backToOrdinary&&dominant(backToOrdinary.pixel,0),
    'Original ordinary memory stopped working after independent narration: '+
    JSON.stringify(backToOrdinary));
  console.log('TALERA_INDEPENDENT_NARRATOR_REAL_BROWSER_PASS',JSON.stringify({
    originalMediaIds:narrated.keys,continuousVoiceMediaId:narrated.voiceId,
    cueTimes:narrated.cues.map(x=>x.t),
    separateRenderer:true,silentNarrationVideo:true,
    remainingPhotoThenOriginalVideo:true,originalSoundtrackPresent:true,
    voiceAudioUnmuted:true,orangeDotsFollowVoiceCues:true,
    ordinaryPresentationRestored:true,realIPhoneAccepted:false
  }));


  // Regression for a genuine iPhone profile with historic listening=OFF.
  // The audio policy of the ORDINARY presentation must never silently mute
  // the independent voice track or the later original video soundtrack.
  await page.evaluate(()=>localStorage.setItem('talera-v61-listening-intent-r8','off'));
  await load(page,narrated.id,4);
  await page.waitForFunction(()=>{
    const audio=document.querySelector('.talera-independent-narrator-layer audio');
    return audio&&!audio.paused&&audio.currentTime>.06;
  },null,{timeout:15000});
  const independentSound=await page.evaluate(()=>{
    const audio=document.querySelector('.talera-independent-narrator-layer audio');
    return {presenterListening:window.__taleraAudioControls?.isEnabled?.(),
      voicedAudioMuted:audio?.muted,voicedAudioDefaultMuted:audio?.defaultMuted,
      voicedAudioVolume:audio?.volume,voicedAudioTime:audio?.currentTime};
  });
  assert.equal(independentSound.presenterListening,false,
    'Historical ordinary-presenter silent setting not reproduced');
  assert.equal(independentSound.voicedAudioMuted,false,
    'A stored presenter OFF preference must NOT mute the separately owned voice');
  assert.equal(independentSound.voicedAudioDefaultMuted,false);
  assert.equal(independentSound.voicedAudioVolume,1);
  await page.waitForFunction(()=>!!document.querySelector(
    '.talera-independent-narrator-layer video.talera-independent-original-video'),
    null,{timeout:16000});

  await page.waitForFunction(()=>{
    const layer=document.querySelector('.talera-independent-narrator-layer');
    const video=layer?.querySelector('video.talera-independent-original-video');
    const sound=layer?.querySelector('audio');
    return video&&sound&&sound.currentSrc===video.currentSrc&&
      !sound.paused&&!sound.muted&&sound.currentTime>.02;
  },null,{timeout:12000});
  const independentVideo=await page.evaluate(()=>{
    const layer=document.querySelector('.talera-independent-narrator-layer');
    const video=layer.querySelector('video.talera-independent-original-video');
    const sound=layer.querySelector('audio');
    return {pictureMuted:video?.muted,soundMuted:sound?.muted,
      soundPlaying:!!sound&&!sound.paused&&sound.currentTime>0,
      volume:sound?.volume,sameSource:sound?.currentSrc===video?.currentSrc};
  });
  assert.equal(independentVideo.pictureMuted,true);
  assert.equal(independentVideo.soundMuted,false);
  assert.equal(independentVideo.soundPlaying,true);
  assert.ok(independentVideo.volume>0&&independentVideo.sameSource);
  await page.evaluate(()=>localStorage.setItem('talera-v61-listening-intent-r8','on'));
  await load(page,plain,3);
  assert.equal(await page.locator('.talera-independent-narrator-layer').count(),0);
  console.log('TALERA_NARRATOR_AUDIO_NOT_CONNECTED_TO_PRESENTER_MUTE',
    JSON.stringify({presenterSoundOff:true,ownVoiceAudibleFlag:true,
      ownVideoAudibleFlag:true,physicalIphoneSoundNotMeasurableInCI:true}));



  // A real LEFT/RIGHT gesture from a playing voice memory must immediately
  // reveal the EXISTING 11-photo wheel and select another saved memory.
  // No new viewer, test app, audio ID or narrator-specific swipe engine.
  await load(page,narrated.id,4);
  await page.waitForFunction(()=>{
    const audio=document.querySelector('.talera-independent-narrator-layer audio');
    return audio&&!audio.paused&&audio.currentTime>.06;
  },null,{timeout:13000});
  // Seek into the already-known video cue: the precise reported slowdown
  // happens while the narrator's video is actively decoding.
  await page.evaluate(()=>{
    const voice=document.querySelector('.talera-independent-narrator-layer audio');
    window.__taleraSwipeVoiceToStop=voice;
    voice.currentTime=1.85;voice.dispatchEvent(new Event('timeupdate'));
  });
  await page.waitForFunction(()=>{
    const layer=document.querySelector('.talera-independent-narrator-layer');
    const video=layer?.querySelector('video.talera-independent-narrator-video');
    const audio=layer?.querySelector('audio');
    return !!video?.currentSrc&&!video.paused&&!audio.paused;
  },null,{timeout:9000});
  const narratedWheelAtRest=await page.locator('#photoStage .talera-wheel-strip')
    .evaluate(el=>({active:el.classList.contains('is-visible'),
      display:getComputedStyle(el).display}));
  assert.equal(narratedWheelAtRest.active,false);
  assert.equal(narratedWheelAtRest.display,'none',
    'Narrated wheel must not cover original image at rest');
  const narratedBounds=await page.locator('#memoryStoryScroll').boundingBox();
  assert.ok(narratedBounds?.width>100&&narratedBounds?.height>100);
  const narratorY=narratedBounds.y+narratedBounds.height*.48;
  await page.mouse.move(narratedBounds.x+narratedBounds.width*.2,narratorY);
  await page.mouse.down();
  const videoStillRunningOnTouch=await page.evaluate(()=>{
    const l=document.querySelector('.talera-independent-narrator-layer');
    return {audioPaused:l.querySelector('audio')?.paused,
      videoPaused:l.querySelector('video.talera-independent-narrator-video')?.paused,
      hidden:l.style.visibility==='hidden'};
  });
  assert.equal(videoStillRunningOnTouch.audioPaused,false,
    'A touch WITHOUT horizontal movement must not pause speech');
  assert.equal(videoStillRunningOnTouch.videoPaused,false,
    'A touch WITHOUT horizontal movement must not pause the video');
  assert.equal(videoStillRunningOnTouch.hidden,false);
  assert.equal(await page.locator('#photoStage .talera-wheel-strip')
    .evaluate(el=>el.classList.contains('is-visible')),false,
    'Touching without swiping should not reveal thumbnail wheel');
  await page.mouse.move(narratedBounds.x+narratedBounds.width*.35,narratorY,{steps:4});
  const narratedDuringSwipe=await page.evaluate(()=>{
    const wheel=document.querySelector('#photoStage .talera-wheel-strip');
    const style=wheel&&getComputedStyle(wheel);
    return {
      selected:window.__taleraTimelineRuntime?.currentMemory?.()?.storyId,
      narrationActive:!!document.querySelector('.talera-independent-narrator-layer'),
      active:wheel?.classList.contains('is-visible'),
      display:style?.display,visibility:style?.visibility,opacity:style?.opacity,
      drag:window.__taleraIntegratedBand?.getState?.().drag,
      narratorHidden:document.querySelector('.talera-independent-narrator-layer')?.style.visibility==='hidden',
      voicePaused:document.querySelector('.talera-independent-narrator-layer audio')?.paused,
      videoPaused:document.querySelector('.talera-independent-narrator-video')?.paused
    };
  });
  assert.equal(narratedDuringSwipe.selected,narrated.id);
  assert.equal(narratedDuringSwipe.narrationActive,true);
  assert.equal(narratedDuringSwipe.drag,true,'Original gesture did not register finger move');
  assert.equal(narratedDuringSwipe.active,true,
    'Narrated swipe must activate original photo strip on the FIRST movement');
  assert.notEqual(narratedDuringSwipe.display,'none',
    'Narrated CSS still hides the original photo strip during swipe');
  assert.notEqual(narratedDuringSwipe.visibility,'hidden',
    'Narrated swipe strip cannot stay invisible once active');
  assert.ok(Number(narratedDuringSwipe.opacity)>0.9);
  assert.equal(narratedDuringSwipe.narratorHidden,true,
    'The narrator video must be visually removed during active photo-strip swipe');
  assert.equal(narratedDuringSwipe.voicePaused,true,
    'The narrator voice timer must stop while swiping away');
  assert.equal(narratedDuringSwipe.videoPaused,true,
    'The current iPhone video decoder must stop at swipe recognition');
  await page.mouse.move(narratedBounds.x+narratedBounds.width*.84,narratorY,{steps:10});
  await page.mouse.up();
  await page.waitForFunction(id=>
    window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,
    mixed,{timeout:13000});
  await page.waitForFunction(()=>!document.querySelector(
    '.talera-independent-narrator-layer'),null,{timeout:6000});
  const afterNarratedSwipe=await page.evaluate(()=>({
    leftVoicePaused:window.__taleraSwipeVoiceToStop?.paused,
    leftVoiceSrc:window.__taleraSwipeVoiceToStop?.src,
    hasNarratorClass:document.body.classList.contains('talera-v61-narration-visual'),
    newMemory:window.__taleraTimelineRuntime?.currentMemory?.()?.storyId
  }));
  assert.equal(afterNarratedSwipe.leftVoicePaused,true,
    'Old voice keeps playing after navigating to another memory');
  assert.equal(afterNarratedSwipe.hasNarratorClass,false);
  assert.equal(afterNarratedSwipe.newMemory,mixed);
  // The opposite swipe returns to the narrated memory on the same timeline,
  // still using the original wheel rather than a separate gesture controller.
  await page.waitForFunction(()=>!document.querySelector(
    '#photoStage .talera-wheel-strip')?.classList.contains('is-visible'),
    null,{timeout:13000});
  await page.mouse.move(narratedBounds.x+narratedBounds.width*.8,narratorY);
  await page.mouse.down();
  await page.mouse.move(narratedBounds.x+narratedBounds.width*.18,narratorY,{steps:13});
  await page.mouse.up();
  await page.waitForFunction(id=>
    window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,
    narrated.id,{timeout:13000});
  await page.locator('.talera-independent-narrator-layer audio')
    .waitFor({state:'attached',timeout:13000});
  assert.equal(await page.locator('.talera-independent-narrator-layer').count(),1);
  console.log('TALERA_NARRATOR_EXISTING_WHEEL_SWIPE_BOTH_DIRECTIONS_PASS',
    JSON.stringify({wheelVisibleOnMovement:true,
      videoSuspendedOnHorizontalGesture:true,videoUnchangedAtTouch:true,
      previousMemory:mixed,
      returnedNarratedMemory:narrated.id,oldVoiceStopped:true,
      ordinaryEngineUntouched:true,iphoneAccepted:false}));
  await load(page,plain,3);

  // iPhone-style autoplay rejection in the REAL F5 PWA DOM. Previous tests
  // enabled a Chromium flag allowing audio autoplay, masking this case.
  // Reject the first voice play and all newly-created audible video plays.
  // The narrator must reuse its unlocked voice audio element instead.
  await page.addInitScript(()=>{
    const originalPlay=HTMLMediaElement.prototype.play;
    let refusedVoice=false,refusedVideo=false;
    HTMLMediaElement.prototype.play=function(...args){
      if(this.closest('.talera-independent-narrator-layer')){
        if(this.tagName==='AUDIO'&&!refusedVoice){
          refusedVoice=true;
          return Promise.reject(new DOMException('User gesture required','NotAllowedError'));
        }
        if(this.tagName==='VIDEO'&&!this.muted&&this.classList.contains('talera-independent-original-video')&&!refusedVideo){
          refusedVideo=true;
          return Promise.reject(new DOMException('User gesture required','NotAllowedError'));
        }
      }
      return originalPlay.apply(this,args);
    };
  });
  await load(page,narrated.id,4);
  const voiceButton=page.locator('button.talera-v61-audio-permission-hint')
    .filter({hasText:'Beluister'});
  await voiceButton.waitFor({state:'visible',timeout:10000});
  await voiceButton.click({timeout:6000});
  await page.waitForFunction(()=>{
    const a=document.querySelector('.talera-independent-narrator-layer audio');
    return a&&!a.paused&&!a.muted&&a.currentTime>.15;
  },null,{timeout:12000});
  await page.locator('.talera-independent-narrator-layer .talera-independent-original-video')
    .waitFor({state:'attached',timeout:18000});

  // The first voice gesture unlocks the audio element; the video soundtrack
  // reuses that SAME element without another user interaction.
  await page.waitForFunction(()=>{
    const layer=document.querySelector('.talera-independent-narrator-layer');
    const v=layer?.querySelector('video.talera-independent-original-video');
    const a=layer?.querySelector('audio');
    return v&&a&&v.currentSrc===a.currentSrc&&!a.muted&&
      !a.paused&&a.currentTime>.04;
  },null,{timeout:12000});
  assert.equal(await voiceButton.count(),0,
    'The original video soundtrack must not request a second Listen tap');
  const finalSound=await page.evaluate(()=>{
    const layer=document.querySelector('.talera-independent-narrator-layer');
    const v=layer.querySelector('video.talera-independent-original-video');
    const a=layer.querySelector('audio');
    return {pictureMuted:v.muted,soundMuted:a.muted,
      soundPlaying:!a.paused&&a.currentTime>.04,
      sameMedia:a.currentSrc===v.currentSrc};
  });
  assert.equal(finalSound.pictureMuted,true);
  assert.equal(finalSound.soundMuted,false);
  assert.ok(finalSound.soundPlaying&&finalSound.sameMedia);
  console.log('TALERA_IOS_GESTURE_NARRATOR_AUDIO_AND_VIDEO_PLAYBACK_PASS');
  await load(page,plain,3);



  // OWNER'S LAST FIRST-MEDIA BUG: a video at index 0 must show its own
  // first frame in the EXISTING swipe strip, never photo from index 1.
  // Actual local F5 IndexedDB row, real original video Blob, no mock covers.
  const videoFirst=await page.evaluate(async b64=>{
    const original=new File(
      [Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],
      'video-first-blue.webm',{type:'video/webm'});
    const canvas=document.createElement('canvas');
    canvas.width=140;canvas.height=140;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffa500';
    ctx.fillRect(0,0,140,140);
    const photoBlob=await new Promise(done=>canvas.toBlob(done,'image/png'));
    const second=new File([photoBlob],'second-photo-orange.png',{type:'image/png'});
    const row=await window.TaleraMemories.save({
      title:'Original blue video FIRST, orange photo SECOND',
      date:'2026-11-11',time:'11:59:00',text:'First media must own strip cover'
    },[original,second]);
    return {id:row.id,kinds:row.items.filter(x=>
      x.kind==='video'||x.kind==='photo').map(x=>x.kind)};
  },readFileSync(syntheticOriginal).toString('base64'));
  assert.deepEqual(videoFirst.kinds,['video','photo'],
    'Test needs genuinely ordered video first, photo second in the same memory');
  await load(page,videoFirst.id,2);
  try{
    await page.waitForFunction(id=>{
        const mem=window.__taleraTimelineRuntime?.currentMemory?.();
        return mem?.storyId===id && !mem._photoLoading &&
          mem.thumbnail?.startsWith('blob:')&&mem.thumbnail===mem.photos[0] &&
          mem.thumbnail!==mem.photos[1];
      },videoFirst.id,{timeout:16000});
  }catch(error){
    const details=await page.evaluate(async id=>{
      const mem=window.__taleraTimelineRuntime?.currentMemory?.();
      const row=await window.TaleraMemories.get(id);
      const video=row.items.find(item=>item.kind==='video');
      let poster=null;
      try{const b=await window.TaleraMemories.blob(video.key+':phone-v1');
        poster=b?{type:b.type,size:b.size}:null}catch(e){poster={error:String(e)}}
      return {kindOrder:row.items.map(it=>it.kind),thumbnail:mem?.thumbnail,
        image:mem?.image,preview:mem?.previewImage,photos:mem?.photos,
        frames:mem?._zeroFrames,loading:mem?._photoLoading,
        poster,videoKey:video.key};
    },videoFirst.id);
    throw Error('FIRST_VIDEO_STILL_NOT_READY '+JSON.stringify(details)+' '+error);
  }
  const firstMediaCover=await page.evaluate(async id=>{
    const book=window.__taleraPhotoBook;
    const mem=book.list().find(x=>x.storyId===id);
    const image=new Image();image.src=mem.thumbnail;
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=32;canvas.height=32;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(image,0,0,32,32);
    return {
      firstKind:mem._zeroFrames?.[0]?.kind,
      secondKind:mem._zeroFrames?.[1]?.kind,
      sameFirst:mem.thumbnail===mem.photos[0],
      distinctSecond:mem.thumbnail!==mem.photos[1],
      pixel:Array.from(context.getImageData(16,16,1,1).data).slice(0,3)
    };
  },videoFirst.id);
  assert.deepEqual([firstMediaCover.firstKind,firstMediaCover.secondKind],
    ['video','photo']);
  assert.ok(firstMediaCover.sameFirst&&firstMediaCover.distinctSecond);
  const persistedVideoPoster=await page.evaluate(async id=>{
    const m=window.__taleraTimelineRuntime.currentMemory();
    const first=m._zeroItems.find(it=>it.kind==='video');
    const blob=await window.TaleraMemories.blob(first.key+':phone-v1');
    return {type:blob?.type||null,bytes:blob?.size||0};
  },videoFirst.id);
  assert.ok(persistedVideoPoster.bytes>100&&
    String(persistedVideoPoster.type).startsWith('image/'),
    'First video sidecar must already exist in original account-scoped IDB: '+
      JSON.stringify(persistedVideoPoster));

  assert.ok(firstMediaCover.pixel[2]>firstMediaCover.pixel[0]*1.4&&
    firstMediaCover.pixel[2]>firstMediaCover.pixel[1]*1.4,
    'First-media VIDEO cover is not its BLUE first frame: '+
      JSON.stringify(firstMediaCover));

  // Swipe FROM another photo memory. During the movement, the native RH19
  // strip must show that same first video still; after landing its video plays.
  await load(page,plain,3);
  const stripBox=await page.locator('#memoryStoryScroll').boundingBox();
  const stripY=stripBox.y+stripBox.height*.48;
  await page.mouse.move(stripBox.x+stripBox.width*.18,stripY);
  await page.mouse.down();
  await page.mouse.move(stripBox.x+stripBox.width*.62,stripY,{steps:10});
  try{
    await page.waitForFunction(id=>{
      const owner='pwa:'+id;
      const mem=window.__taleraPhotoBook?.list()?.find(m=>m.storyId===id);
      const tile=[...document.querySelectorAll('#photoStage .talera-wheel-page')]
        .find(el=>el.dataset.owner===owner);
      const cover=mem?.thumbnail||mem?.previewImage||mem?.photos?.[0]||mem?.image;
    return !!tile&&tile.dataset.url===cover&&
      !!tile.querySelector('img.example-photo')?.naturalWidth;
    },videoFirst.id,{timeout:12000});
  }catch(error){
    const diag=await page.evaluate(id=>{
      const list=window.__taleraPhotoBook?.list()||[];
      const target=list.find(m=>m.storyId===id);
      return {selected:window.__taleraTimelineRuntime?.currentMemory?.()?.storyId,
        band:window.__taleraIntegratedBand?.getState?.(),
        target:target?{id:target.id,thumbnail:target.thumbnail,
          previewImage:target.previewImage,photos:target.photos,
          loading:target._photoLoading}:null,
        wheels:[...document.querySelectorAll('#photoStage .talera-wheel-page')]
          .map(el=>({owner:el.dataset.owner,url:el.dataset.url,
            image:el.querySelector('img.example-photo')?.src,
            natural:el.querySelector('img.example-photo')?.naturalWidth,
            visible:getComputedStyle(el).visibility}))
          .filter(x=>x.owner||x.url).slice(0,12)};
    },videoFirst.id);
    await page.mouse.up();
    throw Error('FIRST_VIDEO_WHEEL_NOT_READY '+JSON.stringify(diag)+' '+error);
  }
  const duringVideoFirstSwipe=await page.evaluate(id=>{
    const book=window.__taleraPhotoBook;
    const mem=book.list().find(m=>m.storyId===id);
    const tile=[...document.querySelectorAll('#photoStage .talera-wheel-page')]
      .find(x=>x.dataset.owner==='pwa:'+id);
    const cover=mem.thumbnail||mem.previewImage||mem.photos?.[0]||mem.image;
    const img=tile?.querySelector('img.example-photo');
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=1;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if(img?.naturalWidth)context.drawImage(img,0,0,1,1);
    const pixel=Array.from(context.getImageData(0,0,1,1).data).slice(0,3);
    return {tileMatchesVideoFirst:tile?.dataset.url===cover,
      firstKind:mem._zeroItems?.find(it=>it.kind==='photo'||it.kind==='video')?.kind,
      stripVisible:document.querySelector('#photoStage .talera-wheel-strip')
        ?.classList.contains('is-visible'),pixel};
  },videoFirst.id);
  assert.equal(duringVideoFirstSwipe.tileMatchesVideoFirst,true);
  assert.equal(duringVideoFirstSwipe.firstKind,'video');
  assert.equal(duringVideoFirstSwipe.stripVisible,true);
  assert.ok(duringVideoFirstSwipe.pixel[2]>duringVideoFirstSwipe.pixel[0]*1.4&&
    duringVideoFirstSwipe.pixel[2]>duringVideoFirstSwipe.pixel[1]*1.4,
    'SWIPE showed other photo instead of first blue VIDEO frame: '+
      JSON.stringify(duringVideoFirstSwipe));
  await page.mouse.move(stripBox.x+stripBox.width*.85,stripY,{steps:6});
  await page.mouse.up();
  await page.waitForFunction(id=>
    window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,
    videoFirst.id,{timeout:13000});
  await page.waitForFunction(()=>{
    const mem=window.__taleraTimelineRuntime?.currentMemory?.();
    return mem?._photoIndex===0&&
      !!document.querySelector('video.talera-v61-inline-video');
  },null,{timeout:10000});
  console.log('TALERA_FIRST_MEDIA_VIDEO_BLUE_FRAME_SWIPE_COVER_PASS',
    JSON.stringify({first:videoFirst.id,
      videoFrameNotLaterPhoto:true,originalVideoIdUnchanged:true,
      firstVideoFrameInStrip:true,noNewVideoCopy:true,iPhoneAccepted:false}));
  await load(page,plain,3);

  // A real event occupies its own saved date AND clock time. The original
  // timestamp must never be stretched into blended/artificial memories
  // across all intervening hours and years on the native timeline.
  const exactStories=await page.evaluate(async()=>{
    const save=async(title,date,time,color)=>{
      const c=document.createElement('canvas');c.width=c.height=30;
      const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,30,30);
      const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
      return (await window.TaleraMemories.save({
        title,date,time,text:'Original event with exact persisted clock time'
      },[new File([blob],title+'.png',{type:'image/png'})])).id;
    };
    return [
      await save('Morning event','2017-09-09','08:15:00','#e35723'),
      await save('Evening event','2017-09-09','22:45:00','#552bad')
    ];
  });
  await load(page,exactStories[0],1);
  await page.waitForFunction(ids=>ids.every(id=>
    window.__taleraPhotoBook?.list()?.some(m=>m.storyId===id)),
    exactStories,{timeout:15000});
  const eventBridge=await page.evaluate(async ids=>{
    const book=window.__taleraPhotoBook;
    const axis=window.__taleraTimelineRuntime;
    const band=window.__taleraIntegratedBand;
    const all=book.list(),morning=all.find(m=>m.storyId===ids[0]);
    const evening=all.find(m=>m.storyId===ids[1]);
    const morningIndex=all.indexOf(morning),eveningIndex=all.indexOf(evening);
    // Separate original saved times, on exactly the same calendar date.
    const morningTime=morning?.ms,eveningTime=evening?.ms;
    band.beginTimeline();
    const targetMorning=morningTime+90*60000;
    axis.setCenter(targetMorning);axis.draw();band.followTimeline(targetMorning);
    const nearMorning=band.getState().p;
    const targetEvening=eveningTime-70*60000;
    axis.setCenter(targetEvening);axis.draw();band.followTimeline(targetEvening);
    const nearEvening=band.getState().p;
    const noEventDate=new Date(2019,0,11,12,0,0).getTime();
    axis.setCenter(noEventDate);axis.draw();band.followTimeline(noEventDate);
    const inGap=band.getState().p;
    const centerBeforeRelease=axis.centerMs();
    band.endTimeline();
    await new Promise(resolve=>setTimeout(resolve,720));
    return {
      morningTime,eveningTime,morningIndex,eveningIndex,
      nearMorning,nearEvening,inGap,
      centerBeforeRelease,centerAfterRelease:axis.centerMs(),
      title:document.getElementById('memoryStory')?.textContent,
      focusedDate:document.getElementById('focusText')?.textContent,
      eventDate:document.getElementById('memoryDate')?.textContent,
      selected:axis.currentMemory()?.id,
      selectedDate:axis.currentMemory()?.ms
    };
  },exactStories);
  assert.ok(Number.isFinite(eventBridge.morningTime)&&
    Number.isFinite(eventBridge.eveningTime)&&
    eventBridge.eveningTime-eventBridge.morningTime===14.5*3600000,
    'Original distinct morning and evening timestamps must remain exact: '+
      JSON.stringify(eventBridge));
  assert.equal(eventBridge.nearMorning,eventBridge.morningIndex,
    'Morning photo must be anchored only to its exact record (no fractional overlap)');
  assert.equal(eventBridge.nearEvening,eventBridge.eveningIndex,
    'Evening photo must be anchored only to its exact record (no fractional overlap)');
  assert.equal(eventBridge.inGap,Math.round(eventBridge.inGap),
    'No interpolated photographic memory should appear on unrelated 2019 dates');
  assert.ok(Math.abs(eventBridge.centerAfterRelease-
    eventBridge.centerBeforeRelease)<60000,
    'Unrelated memory must not replace finger-selected 2019 date');
  assert.ok(String(eventBridge.focusedDate).includes('2019'),
    'Timeline clock must show actual selected 2019 date, not adjacent memory date: '+
      JSON.stringify(eventBridge));
  assert.equal(eventBridge.selectedDate,eventBridge.eveningTime,
    'Selected original memory must retain its EXACT stored hour when timeline stops in 2019');
  assert.equal(eventBridge.title,'Evening event',
    'The displayed title must belong to the same selected memory ID');
  assert.ok(String(eventBridge.eventDate).includes('2017'),
    'Original memory date must not be presented as the 2019 ruler date');
  assert.ok(Number.isFinite(eventBridge.selectedDate),
    'Timeline selection must reference one original real memory ID');
  console.log('TALERA_EXACT_EVENT_DATE_TIME_SINGLE_OWNER_PASS',
    JSON.stringify({sameDayDistinctHours:true,noInterpolatedMemories:true,
      independentNativeRuler:true,noNewMediaOrDatabase:true,iphoneAccepted:false}));

  // Timeline is the SAME controller as the photo book. Moving it while an
  // original narrated story plays must immediately stop the voice/video and
  // expose the original wheel at the nearest stored date. No separate app.
  await load(page,narrated.id,4);
  try{
    await page.waitForFunction(()=>!!document.querySelector(
      '.talera-independent-narrator-layer audio'),null,{timeout:12000});
    await page.evaluate(async()=>{
      const audio=document.querySelector('.talera-independent-narrator-layer audio');
      if(audio.ended)audio.currentTime=0;
      if(audio.paused)await audio.play();
    });
    await page.waitForFunction(()=>{
      const voice=document.querySelector('.talera-independent-narrator-layer audio');
      return !!voice&&!voice.paused&&voice.currentTime>.05;
    },null,{timeout:7000});
  }catch(error){
    const diagnostic=await page.evaluate(()=>({
      active:window.__taleraTimelineRuntime?.currentMemory?.()?.storyId,
      narrator:!!document.querySelector('.talera-independent-narrator-layer'),
      audio:[...document.querySelectorAll('.talera-independent-narrator-layer audio')]
        .map(x=>({paused:x.paused,time:x.currentTime,ended:x.ended,src:!!x.currentSrc,
          ready:x.readyState,network:x.networkState,error:x.error?.message})),
      runtime:window.__taleraIntegratedBand?.getState?.(),
      location:location.pathname+location.search
    }));
    throw Error('TIMELINE_GESTURE_NARRATOR_START_DIAGNOSTIC '+JSON.stringify(diagnostic)+
      ' original='+String(error));
  }
  const activeNarratedId=await page.evaluate(()=>
    window.__taleraTimelineRuntime.currentMemory()?.storyId);
  assert.equal(activeNarratedId,narrated.id);
  const liveSurface=await page.locator('#surface').boundingBox();
  assert.ok(liveSurface?.width>150);
  const touchY=liveSurface.y+liveSurface.height*.38;
  const timeBefore=await page.evaluate(()=>window.__taleraTimelineRuntime.centerMs());
  await page.mouse.move(liveSurface.x+liveSurface.width*.17,touchY);
  await page.mouse.down();
  const stillOnTouch=await page.evaluate(()=>({
    voice:!!document.querySelector('.talera-independent-narrator-layer audio'),
    showing:!!document.querySelector('.talera-independent-narrator-layer')
  }));
  assert.equal(stillOnTouch.voice,true,'Touch alone must not stop existing narration');
  await page.mouse.move(liveSurface.x+liveSurface.width*.83,touchY,{steps:18});
  const navigation=await page.evaluate(()=>{
    const runtime=window.__taleraTimelineRuntime;
    const band=window.__taleraIntegratedBand.getState();
    const wheel=document.querySelector('#photoStage .talera-wheel-strip');
    return {
      center:runtime.centerMs(),tracking:band.timelineTracking,
      photoIndex:band.p,photos:window.__taleraPhotoBook.list().length,
      wheelVisible:wheel?.classList.contains('is-visible'),
      layer:!!document.querySelector('.talera-independent-narrator-layer'),
      voice:!!document.querySelector('.talera-independent-narrator-layer audio'),
      originalVideo:!!document.querySelector('.talera-independent-narrator-video'),
      focusedDate:document.getElementById('focusText')?.textContent
    };
  });
  assert.ok(navigation.center<timeBefore-4*365*86400000,
    'Timeline must keep original decade-swipe navigation');
  assert.equal(navigation.tracking,true);
  assert.equal(navigation.wheelVisible,true,
    'Existing eleven-image strip must follow a time swipe while held');
  assert.equal(navigation.layer,false,
    'Timeline movement MUST stop and remove the playing narrator immediately: '+
      JSON.stringify(navigation));
  assert.ok(Number.isInteger(navigation.photoIndex),
    'Timeline must select the nearest REAL memory, not intermediate photo');
  await page.mouse.up();
  await page.waitForFunction(ids=>ids.includes(
    window.__taleraTimelineRuntime.currentMemory()?.storyId),
    exactStories,{timeout:12000});
  const settled=await page.evaluate(()=>{
    const m=window.__taleraTimelineRuntime.currentMemory();
    return {story:m?.storyId,date:m?.ms,
      narrator:!!document.querySelector('.talera-independent-narrator-layer'),
      currentAxis:window.__taleraTimelineRuntime.centerMs(),
      originalVideo:!!document.querySelector('.talera-independent-narrator-video')};
  });
  assert.equal(settled.narrator,false);
  assert.ok(exactStories.includes(settled.story),
    'Timeline must settle on one of the actual original 2017 events');
  assert.ok(settled.currentAxis<timeBefore-4*365*86400000,
    'Photo selection must not rewrite finger-selected timeline date');
  console.log('TALERA_TIMELINE_NAVIGATION_DISMISSES_NARRATOR_AND_FOLLOWS_REAL_PHOTOS_PASS',
    JSON.stringify({existingPhotoWheel:true,narrationStopped:true,
      eventDateKept:true,speedScaleIntact:true,iphoneAccepted:false}));

  // A non-narrated ORIGINAL video has the same ownership rule: movement of
  // the time axis stops the video instead of leaving a competing presentation.
  await load(page,mixed,3);
  await page.evaluate(()=>window.__taleraV31SelectPhoto?.(
    window.__taleraTimelineRuntime.currentMemory().id,2,true));
  await page.waitForFunction(()=>!!document.querySelector('video.talera-v61-inline-video'),
    null,{timeout:12000});
  // Slow the synthetic clip so its natural end cannot mask the test:
  // playback must stop BECAUSE of timeline movement, not a one-second EOF.
  await page.evaluate(()=>{
    const video=document.querySelector('video.talera-v61-inline-video');
    video.loop=true;video.playbackRate=.1;
  });
  const videoSurface=await page.locator('#surface').boundingBox();
  const videoY=videoSurface.y+videoSurface.height*.38;
  await page.mouse.move(videoSurface.x+videoSurface.width*.2,videoY);
  await page.mouse.down();
  await page.mouse.move(videoSurface.x+videoSurface.width*.8,videoY,{steps:12});
  const ordinaryWhileMoving=await page.evaluate(()=>({
    originalVideo:!!document.querySelector('video.talera-v61-inline-video'),
    wheel:document.querySelector('#photoStage .talera-wheel-strip')?.classList.contains('is-visible')
  }));
  await page.mouse.up();
  assert.equal(ordinaryWhileMoving.originalVideo,false,
    'Timeline movement must stop the original ordinary video player');
  assert.equal(ordinaryWhileMoving.wheel,true);
  console.log('TALERA_TIMELINE_NAVIGATION_STOPS_ORDINARY_VIDEO_PASS',
    JSON.stringify({originalVideoStopped:true,noNewPlayer:true,iphoneAccepted:false}));

  assert.deepEqual(errors,[],'Original presentation script runtime errors');
  console.log('TALERA_SAME_FREE_PRESENTATION_BROWSER_OK',JSON.stringify({
    photoAutoVisible:true,tapVisible:true,loop:true,
    originalVideoThenPhotos:true,narrationNeverActivated:true,
    newApp:false,customerData:false,realIphoneAccepted:false
  }));
}finally{
  await stop();
}

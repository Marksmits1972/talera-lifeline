// Test the EXISTING TALERA Free /present route with disposable local-only media.
// No test Worker, second app, production account, changes to /tell or personal data.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium,devices} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
// Each CI execution gets its own synthetic originals + local Wrangler DO store.
// Delete this exact run directory at the end; never reuse or clear owner data.
const generated=path.join(here,'generated','ordinary-presentation-'+randomUUID());
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
    '--persist-to',path.join(generated,'worker-do'),
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
  // The exact SAME Home must refill from a real account-local saved memory:
  // a clean default cannot hide people's real titles, years or media.
  const realHomeResponse=await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
  assert.equal(realHomeResponse.status(),200);
  await page.waitForFunction(()=>document.getElementById('heroTitle')?.textContent.trim()
    ==='Original photo roll',null,{timeout:18000});
  const filledHome=await page.evaluate(async id=>{
    const local=await window.TaleraMemories.list();
    const hero=document.getElementById('heroCaption');
    const picture=document.getElementById('heroImage');
    return {
      saved:local.map(x=>x.id),
      heroTitle:document.getElementById('heroTitle')?.textContent.trim(),
      heroVisible:getComputedStyle(hero).display!=='none',
      heroUrl:hero.dataset.presentHref,
      heroPictureReady:picture.classList.contains('ready'),
      selectedYear:document.getElementById('v17-selected-year')?.textContent.trim(),
      yearStatus:document.getElementById('v17-year-summary')?.textContent.trim(),
      preview:document.getElementById('v17-year-preview')?.textContent.trim(),
      demos:window.__taleraReferenceMemories?.length,
      fakeTiles:document.querySelectorAll('.talera-topic-example').length
    };
  },plain);
  assert.ok(filledHome.saved.includes(plain),'Original owner memory survived Home cleanup');
  assert.equal(filledHome.heroTitle,'Original photo roll');
  assert.equal(filledHome.heroVisible,true);
  assert.ok(filledHome.heroUrl.includes(plain),'Hero must open the SAME owner memory');
  assert.equal(filledHome.heroPictureReady,true,'Original photo must still load on Home');
  assert.equal(filledHome.selectedYear,'2026');
  assert.match(filledHome.yearStatus,/1/,'One real memory is counted on year slider');
  assert.match(filledHome.preview,/Original photo roll/,'Real title appears on its original year');
  assert.equal(filledHome.demos,0);
  assert.equal(filledHome.fakeTiles,0);
  console.log('TALERA_F5_HOME_OWNER_RECORDS_STILL_WORK_PASS',
    JSON.stringify({saved:1,ownHero:true,ownPhoto:true,ownerYear:true,
      exampleCount:0,originalPwa:true,iphoneAccepted:false}));
  // Real iPhone report 19 Nov: Home shows a genuine owner photo and "3 eigen"
  // yet tapping that very photo lands on a white presentation. Follow the
  // ORIGINAL Home photo tap: never fabricate or directly navigate the URL.
  // Tap the VISIBLE photo area above the white Home sheet. Clicking the
  // image element's geometric centre lands behind the sheet on iPhone.
  const exposedHeroPoint=await page.evaluate(()=>{
    const image=document.getElementById('heroImage')?.getBoundingClientRect();
    const sheet=document.getElementById('sheet')?.getBoundingClientRect();
    if(!image||!sheet)return null;
    const x=image.left+image.width*0.52;
    const y=Math.min(sheet.top-70,image.top+image.height*0.46);
    const target=document.elementFromPoint(x,y);
    return {x,y,imageBottom:image.bottom,sheetTop:sheet.top,
      targetTag:target?.tagName,targetId:target?.id||'',
      isAboveSheet:y<sheet.top};
  });
  assert.ok(exposedHeroPoint?.isAboveSheet,'Original Home photo not exposed above white sheet');
  console.log('TALERA_HOME_EXPOSED_PHOTO_TAP_POINT',JSON.stringify(exposedHeroPoint));
  await page.mouse.click(exposedHeroPoint.x,exposedHeroPoint.y);
  await page.waitForFunction(()=>location.pathname==='/present',null,{timeout:12000});
  await page.waitForFunction(id=>{
    const mem=window.__taleraTimelineRuntime?.currentMemory?.();
    return mem?.storyId===id&&!mem._photoLoading&&mem._zeroFrames?.length===3;
  },plain,{timeout:18000});
  // The original Safari transition intentionally keeps the first frame
  // covered until it is decoded and up to 180ms of settling have elapsed.
  await page.waitForFunction(()=>!document.documentElement.classList.contains(
    'talera-direct-memory-entering'),null,{timeout:7000});
  // Use real browser TOUCH input on the existing native reading scroller,
  // not a test-only second drag handler or a user memory mutation.
  const readingDragStart=await page.evaluate(()=>{
    const scroller=document.getElementById('memoryStoryScroll');
    const sheet=document.getElementById('memoryCaption');
    scroller.scrollTop=0;
    const frame=scroller.getBoundingClientRect();
    const handle=sheet.getBoundingClientRect();
    return {
      x:Math.max(frame.left+28,Math.min(frame.right-28,handle.left+36)),
      y:Math.max(frame.top+48,Math.min(frame.bottom-45,handle.top+30)),
      max:scroller.scrollHeight-scroller.clientHeight,
      touchAction:getComputedStyle(scroller).touchAction
    };
  });
  assert.ok(readingDragStart.max>125,
    'The original story sheet must offer a real vertical pull-up range');
  assert.equal(readingDragStart.touchAction,'pan-y');
  let readingDragPosition=[];
  const touchSession=await page.context().newCDPSession(page);
  try{
    const x=readingDragStart.x,y=readingDragStart.y,id=47;
    await touchSession.send('Input.dispatchTouchEvent',{
      type:'touchStart',touchPoints:[{x,y,id}]});
    for(const delta of [48,105]){
      await touchSession.send('Input.dispatchTouchEvent',{
        type:'touchMove',touchPoints:[{x,y:y-delta,id}]});
      await page.waitForTimeout(95);
      readingDragPosition.push(await page.evaluate(()=>
        document.getElementById('memoryStoryScroll').scrollTop));
    }
    await touchSession.send('Input.dispatchTouchEvent',
      {type:'touchEnd',touchPoints:[]});
  }finally{
    await touchSession.detach();
    await page.evaluate(()=>{document.getElementById('memoryStoryScroll').scrollTop=0});
  }
  assert.ok(readingDragPosition[0]>=16&&
    readingDragPosition[1]>readingDragPosition[0]+16,
    'The ORIGINAL white reading paper must move proportionally with two upward finger moves: '+
    JSON.stringify({readingDragStart,readingDragPosition}));
  console.log('TALERA_ORIGINAL_READING_PANEL_FOLLOWS_FINGER_PASS',
    JSON.stringify({syntheticIphoneTouch:true,readingDragPosition,
      noSecondDragController:true,realIphoneAccepted:false}));
  // The original deep-link photo guard intentionally waits for a decoded
  // first frame and then two rAFs/180ms. Don't treat that brief entry
  // handoff as a permanently white stage on slow CI frame scheduling.
  await page.waitForFunction(()=>
    !document.documentElement.classList.contains('talera-direct-memory-entering'),
    null,{timeout:3500});
  const afterRealHeroTap=await page.evaluate(()=>({
    url:location.pathname+location.search,
    memoryId:window.__taleraTimelineRuntime?.currentMemory?.()?.storyId,
    hiddenByEntry:document.documentElement.classList.contains('talera-direct-memory-entering'),
    stageVisibility:getComputedStyle(document.getElementById('photoStage')).visibility,
    frontReady:!!document.getElementById('memoryPhotoA')?.naturalWidth,
    selectedYear:document.getElementById('focusText')?.textContent,
    accountApiPresent:!!window.TaleraMemories?.list
  }));
  assert.equal(afterRealHeroTap.hiddenByEntry,false,
    'HOME_PHOTO_TAP_CANNOT_LEAVE_MEMORY_STAGE_HIDDEN: '+JSON.stringify(afterRealHeroTap));
  assert.notEqual(afterRealHeroTap.stageVisibility,'hidden',
    'HOME_PHOTO_TAP_STILL_WHITE: '+JSON.stringify(afterRealHeroTap));
  const afterHeroTapPixels=await centerPixel(page);
  assert.ok(dominant(afterHeroTapPixels,0),
    'HOME_PHOTO_TAP_MUST_DISPLAY_ORIGINAL_OWN_PHOTO: '+
    JSON.stringify({afterRealHeroTap,afterHeroTapPixels}));
  console.log('TALERA_REAL_HOME_PHOTO_TAP_OPENS_VISIBLE_OWNER_MEMORY_PASS',
    JSON.stringify({storyIdCorrect:true,originalPhotoVisible:true,originalLocalDataUnchanged:true}));
  // REPORTED IPHONE REGRESSION: Home shows the original own photo, but
  // opening the existing /present route without ?memory= stays completely
  // blank. Previous browser tests used ?memory= and missed this path.
  const ordinaryRoot=await page.goto(origin+'/present',{waitUntil:'domcontentloaded'});
  assert.equal(ordinaryRoot.status(),200);
  await page.waitForFunction(()=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    return !!m&&!m._photoLoading&&m._zeroFrames?.length===3;
  },null,{timeout:16000});
  const rootVisible=await centerPixel(page);
  const rootState=await page.evaluate(()=>({
    memory:window.__taleraTimelineRuntime?.currentMemory?.()?.id,
    frames:window.__taleraTimelineRuntime?.currentMemory?.()?._zeroFrames?.length||0,
    photo:window.__taleraTimelineRuntime?.currentMemory?.()?.photos?.[0]||null,
    heroNotEmpty:!!document.querySelector('#photoStage img:not([hidden])')
  }));
  assert.ok(dominant(rootVisible,0),
    'HOME_HAS_OWN_PHOTO_BUT_DEFAULT_PRESENTATION_IS_BLANK: '+
      JSON.stringify({rootState,rootVisible}));
  console.log('TALERA_HOME_TO_DEFAULT_PRESENT_OWN_PHOTO_VISIBLE_PASS',
    JSON.stringify({ownerPhoto:true,defaultRoute:true,originalMediaIdPreserved:true,
      realIphoneAccepted:false}));
  // The Home "Door de tijd" year link is /present?year=2026.
  // Force a slow but normal local IndexedDB read to reproduce the native
  // iPhone timing where year selection fires BEFORE the catalog loads.
  // We delay ONLY synthetic list() in this page, never use mock stories.
  await page.addInitScript(()=>{
    let store;
    Object.defineProperty(window,'TaleraMemories',{
      configurable:true,
      get(){return store},
      set(next){
        store=next;
        if(typeof next?.list==='function'){
          const original=next.list;
          next.list=async function(...args){
            if(location.pathname==='/present'&&location.search==='?year=2026')
              await new Promise(resolve=>setTimeout(resolve,4200));
            return original.apply(this,args);
          };
        }
      }
    });
  });
  // With real IndexedDB hydration the year selector can execute before
  // registration and never re-activate the selected own photo.
  const yearRoute=await page.goto(origin+'/present?year=2026',
    {waitUntil:'domcontentloaded'});
  assert.equal(yearRoute.status(),200);
  await page.waitForFunction(()=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    return !!m&&!m._photoLoading&&m._zeroFrames?.length===3;
  },null,{timeout:16000});
  await page.waitForTimeout(400);
  const yearVisible=await centerPixel(page);
  const yearStatus=await page.evaluate(()=>({
    date:document.getElementById('focusText')?.textContent,
    currentId:window.__taleraTimelineRuntime?.currentMemory?.()?.id,
    front:document.getElementById('memoryPhotoA')?.getAttribute('src'),
    frontNatural:document.getElementById('memoryPhotoA')?.naturalWidth||0,
    stageVisible:getComputedStyle(document.getElementById('photoStage')).visibility
  }));
  assert.ok(dominant(yearVisible,0),
    'HOME_YEAR_LINK_HAS_OWN_PHOTO_BUT_PRESENT_YEAR_MODE_IS_BLANK: '+
      JSON.stringify({yearStatus,yearVisible}));
  console.log('TALERA_HOME_YEAR_LINK_OWN_PHOTO_VISIBLE_PASS',
    JSON.stringify({year:2026,ownImage:true,realIphoneAccepted:false}));
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
  // The visible original reading-sheet arrow must be a real 43px grip.
  // Dragging it 100px up moves the SAME original vertical scrollTop
  // roughly 100px immediately, without inertia, snap or a new story viewer.
  const readingGrip=page.locator('#talera-f5-story-grip');
  assert.equal(await readingGrip.count(),1,'One original story pull handle');
  const gripBounds=await readingGrip.boundingBox();
  assert.ok(gripBounds?.width>=60&&gripBounds?.height>=40,
    'Reading-sheet pull handle is too small on a phone');
  const gripInitial=await page.evaluate(()=>{
    const scroll=document.getElementById('memoryStoryScroll');
    const grip=document.getElementById('talera-f5-story-grip');
    return {max:scroll.scrollHeight-scroll.clientHeight,
      top:scroll.scrollTop,font:parseFloat(getComputedStyle(grip).fontSize),
      touchAction:getComputedStyle(grip).touchAction};
  });
  assert.ok(gripInitial.max>140&&gripInitial.font>=20&&gripInitial.touchAction==='none',
    'Original reading sheet does not offer a usable drag target: '+
    JSON.stringify(gripInitial));
  const gx=gripBounds.x+gripBounds.width*.5,gy=gripBounds.y+gripBounds.height*.5;
  const gripBeforeDrag=await page.evaluate(([x,y])=>{
    const grip=document.getElementById('talera-f5-story-grip');
    const scroll=document.getElementById('memoryStoryScroll');
    const sheet=document.getElementById('memoryCaption');
    const style=el=>{const c=getComputedStyle(el);return {id:el.id,
      tag:el.tagName,cls:typeof el.className==='string'?el.className:'',
      pointer:c.pointerEvents,touch:c.touchAction,opacity:c.opacity,
      z:c.zIndex,visibility:c.visibility,position:c.position,
      display:c.display}};
    const at=document.elementFromPoint(x,y);
    window.__taleraGripPointerTrace=[];
    for(const [target,name] of [[grip,'grip'],[scroll,'scroll'],[document,'document']])
      for(const phase of ['pointerdown','pointermove','pointerup','pointercancel'])
        target.addEventListener(phase,e=>{
          if(window.__taleraGripPointerTrace.length>55)return;
          window.__taleraGripPointerTrace.push({name,phase,at:e.clientY,
            target:e.target?.id||e.target?.tagName,
            capture:target.hasPointerCapture?.(e.pointerId)||false,
            scrollTop:scroll.scrollTop});
        },{capture:true,passive:true});
    return {coordinate:[x,y],
      top:at?.id||at?.className||at?.tagName,
      topIsGrip:at===grip,grip:style(grip),sheet:style(sheet),
      scroll:style(scroll),
      layers:document.elementsFromPoint(x,y).slice(0,9).map(style),
      rects:{grip:grip.getBoundingClientRect().toJSON(),
        sheet:sheet.getBoundingClientRect().toJSON(),
        scroll:scroll.getBoundingClientRect().toJSON()}};
  },[gx,gy]);
  console.log('TALERA_REAL_READING_GRIP_HIT_AREA_BEFORE_DRAG',
    JSON.stringify(gripBeforeDrag));
  await page.mouse.move(gx,gy);
  await page.mouse.down();
  await page.mouse.move(gx,gy-100,{steps:12});
  const gripDuring=await page.evaluate(()=>
    document.getElementById('memoryStoryScroll').scrollTop);
  const gripMovedDuring=gripDuring-gripInitial.top>=75&&
    gripDuring-gripInitial.top<=112;
  const pointerTrace=await page.evaluate(()=>window.__taleraGripPointerTrace);
  console.log('TALERA_REAL_READING_GRIP_POINTER_TRACE',
    JSON.stringify({moved:gripMovedDuring,gripDuring,
      gripInitial:gripInitial.top,events:pointerTrace}));
  await page.mouse.up();
  await page.waitForTimeout(180);
  const gripAfter=await page.evaluate(()=>
    document.getElementById('memoryStoryScroll').scrollTop);
  if(gripMovedDuring)assert.ok(Math.abs(gripAfter-gripDuring)<=9,
    'Reading sheet jumped or kept sliding after finger release: '+
    JSON.stringify({gripDuring,gripAfter}));
  await page.evaluate(()=>document.getElementById('memoryStoryScroll').scrollTop=0);
  console.log('TALERA_FREE_ORIGINAL_READING_GRIP_DRAG_RESULT',
    JSON.stringify({gripMovedDuring,gripWidth:gripBounds.width,gripHeight:gripBounds.height,
      draggedPx:gripDuring-gripInitial.top,noInertia:true,sameSheet:true,
      realIphoneAccepted:false}));
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
  const swipeEntryIndex=await page.evaluate(()=>
    window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex);
  // The approved ordinary slideshow may already have advanced to photo 2
  // while its original swipe inertia settles on a busy CI runner. Assert
  // that the REAL pixels match the active media index, not an expired frame.
  // This still fails if dots/index move but the photo is stale or blank.
  assert.ok((swipeEntryIndex===0&&nearColor(swipePhotoBefore,[255,165,0]))||
    (swipeEntryIndex===1&&nearColor(swipePhotoBefore,[0,217,242])),
    'SWIPED STORY PHOTO DOES NOT MATCH ACTIVE INDEX: '+
      JSON.stringify({swipeEntryIndex,swipePhotoBefore}));
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
    window.__taleraOriginalVideoTitleLayer=null;
    window.__taleraVideoActuallyPlayingLayout=null;
    let watchingVideo=null;
    const watchActualPlayback=video=>{
      if(video===watchingVideo)return;
      watchingVideo=video;
      let frames=0;
      const sample=()=>{
        if(++frames>900||!video.isConnected)return;
        // A poster/thumbnail and a hidden video DOM node are NOT enough.
        // Measure the real, playing, decoded VIDEO after its first frames.
        if(video.readyState>=2&&!video.paused&&video.currentTime>=0.14){
          const scroll=document.getElementById('memoryStoryScroll');
          const title=document.getElementById('memoryStory');
          const grip=document.getElementById('talera-f5-story-grip');
          const bounds=el=>el?.getBoundingClientRect().toJSON()||null;
          const hit=grip?.getBoundingClientRect();
          const element=hit?document.elementFromPoint(hit.x+hit.width/2,
            hit.y+hit.height/2):null;
          const visible=(r,parent)=>{
            if(!r||!parent)return 0;
            return Math.max(0,Math.min(r.bottom,parent.bottom,innerHeight)-
              Math.max(r.top,parent.top,0));
          };
          const sr=scroll?.getBoundingClientRect();
          window.__taleraVideoActuallyPlayingLayout={
            currentTime:video.currentTime,readyState:video.readyState,
            playing:!video.paused,videoRect:bounds(video),
            storyScroll:bounds(scroll),scrollTop:scroll?.scrollTop,
            titleText:title?.textContent?.trim(),titleRect:bounds(title),
            titleInViewportPx:visible(title?.getBoundingClientRect(),sr),
            gripRect:bounds(grip),
            gripInViewportPx:visible(hit,sr),
            gripHitElement:element?.id||element?.className||element?.tagName||'',
            gripIsTopHit:!!element?.closest?.('#talera-f5-story-grip'),
            bodyClass:document.body.className,
            scrollZ:getComputedStyle(scroll).zIndex,
            videoZ:getComputedStyle(video).zIndex
          };
          return;
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    };
    const checkVideo=()=>{
      const video=document.querySelector('video.talera-v61-inline-video');
      if(!video)return;
      window.__taleraOriginalVideoWasShown=true;
      watchActualPlayback(video);
      if(window.__taleraOriginalVideoTitleLayer)return;
      const sheet=document.getElementById('memoryCaption');
      const scroll=document.getElementById('memoryStoryScroll');
      const title=document.getElementById('memoryStory');
      const style=x=>x?getComputedStyle(x):null;
      window.__taleraOriginalVideoTitleLayer={
        title:title?.textContent?.trim()||'',
        captionDisplay:style(sheet)?.display,
        captionOpacity:style(sheet)?.opacity,
        titleOpacity:style(title)?.opacity,
        scrollZ:Number(style(scroll)?.zIndex),
        videoZ:Number(style(video)?.zIndex),
        gripVisible:!!document.getElementById('talera-f5-story-grip')
      };
    };
    const observer=new MutationObserver(checkVideo);
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
  const originalVideoDuringMotion=await page.evaluate(()=>
    window.__taleraVideoActuallyPlayingLayout);
  console.log('TALERA_ACTUAL_PLAYING_VIDEO_TITLE_AND_GRIP_SCREEN_GEOMETRY',
    JSON.stringify(originalVideoDuringMotion));
  assert.ok(originalVideoDuringMotion?.playing&&
    originalVideoDuringMotion?.gripInViewportPx>=25&&
    originalVideoDuringMotion?.gripIsTopHit,
    'The story handle was not visibly reachable once VIDEO was ACTUALLY PLAYING: '+
    JSON.stringify(originalVideoDuringMotion));
  const originalTitleLayer=await page.evaluate(()=>window.__taleraOriginalVideoTitleLayer);
  assert.ok(originalTitleLayer&&originalTitleLayer.scrollZ>originalTitleLayer.videoZ&&
    originalTitleLayer.gripVisible&&originalTitleLayer.captionDisplay!=='none'&&
    Number(originalTitleLayer.captionOpacity)>.8&&
    Number(originalTitleLayer.titleOpacity)>.8,
    'Original story title disappeared behind the playing video: '+
    JSON.stringify(originalTitleLayer));
  console.log('TALERA_FREE_VIDEO_KEEP_ORIGINAL_TITLE_ABOVE_PLAYER_PASS',
    JSON.stringify({...originalTitleLayer,realIphoneAccepted:false}));
  assert.ok(gripMovedDuring,
    "Original grip missed the drag; center hit and pointer events: "+
    JSON.stringify({hit:gripBeforeDrag,trace:pointerTrace,
      during:gripDuring,after:gripAfter}));
  await waitIndex(page,0,12000);
  const state=await page.evaluate(()=>{
    const m=window.__taleraTimelineRuntime.currentMemory();
    return {id:m.storyId,video:document.body.classList.contains('talera-v61-narration-visual')};
  });
  assert.equal(state.id,mixed);
  assert.equal(state.video,false,'Ordinary photo roll cannot enter narration mode');
  // The SAME ordinary native video node must survive story-to-story swipes,
  // not merely photo/video rotations within one story. On iOS that element
  // may retain the sound authorization a prior genuine gesture established.
  await page.evaluate(()=>{
    window.__taleraOrdinaryPlayerBeforeStorySwipe=
      document.querySelector('video.talera-v61-inline-video');
    if(!window.__taleraOrdinaryPlayerBeforeStorySwipe)
      throw Error('Original video element missing before ordinary story swipe');
  });
  const ordinarySwipeBox=await page.locator('#memoryStoryScroll').boundingBox();
  const ordinarySwipeY=ordinarySwipeBox.y+ordinarySwipeBox.height*.48;
  const swipeMemory=async(from,to)=>{
    await page.mouse.move(ordinarySwipeBox.x+ordinarySwipeBox.width*from,ordinarySwipeY);
    await page.mouse.down();
    await page.mouse.move(ordinarySwipeBox.x+ordinarySwipeBox.width*to,ordinarySwipeY,
      {steps:13});
    await page.mouse.up();
  };
  await swipeMemory(.18,.82);
  await page.waitForFunction(id=>
    window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,
    plain,{timeout:13000});
  await page.waitForFunction(()=>!document.querySelector(
    '#photoStage .talera-wheel-strip')?.classList.contains('is-visible'),
    null,{timeout:13000});
  const stillSameOnPlain=await page.evaluate(()=>
    document.querySelector('video.talera-v61-inline-video')===
    window.__taleraOrdinaryPlayerBeforeStorySwipe);
  assert.equal(stillSameOnPlain,true,
    'Changing ordinary memory must not destroy the authorized video DOM node');
  await swipeMemory(.82,.18);
  await page.waitForFunction(id=>
    window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id,
    mixed,{timeout:13000});
  await page.waitForFunction(()=>!document.querySelector(
    '#photoStage .talera-wheel-strip')?.classList.contains('is-visible'),
    null,{timeout:13000});
  await page.evaluate(id=>window.__taleraOrdinarySelectPhoto?.(
    window.__taleraTimelineRuntime.currentMemory().id,2,true),mixed);
  await page.waitForFunction(()=>{
    const v=document.querySelector('video.talera-v61-inline-video');
    return v?.currentSrc?.startsWith('blob:')&&!v.paused&&
      v===window.__taleraOrdinaryPlayerBeforeStorySwipe;
  },null,{timeout:11000});
  const retainedPlayer=await page.evaluate(()=>({
    sameNode:document.querySelector('video.talera-v61-inline-video')===
      window.__taleraOrdinaryPlayerBeforeStorySwipe,
    memoryId:window.__taleraTimelineRuntime?.currentMemory()?.storyId,
    narratedLayerCount:document.querySelectorAll('.talera-independent-narrator-layer').length,
    listenButtonCount:document.querySelectorAll('button.talera-v61-audio-permission-hint').length
  }));
  assert.equal(retainedPlayer.sameNode,true);
  assert.equal(retainedPlayer.narratedLayerCount,0);
  assert.equal(retainedPlayer.listenButtonCount,0);
  console.log('TALERA_ORDINARY_PLAYER_REUSED_ACROSS_REAL_STORY_SWIPES_PASS',
    JSON.stringify({sameNode:retainedPlayer.sameNode,
      ordinaryToOrdinary:true,noNarratorLeak:true,realIphoneAccepted:false}));
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
  await page.evaluate(()=>{
    const shared=window.__taleraF5SharedAudible?.get?.();
    if(!shared||shared.id!=='talera-f5-shared-audio')
      throw Error('Shared audio element missing for narrated memory');
    window.__taleraAudioNodeBeforeNarrationSwipe=shared;
  });
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
  // Simulate the SAME iPhone PWA being backgrounded and foregrounded without
  // a full document reload. A preserved WebKit page must not stay forever on
  // the first photo after visibilitychange pauses the voice clock.
  const hiddenNarration=await page.evaluate(()=>{
    const audio=document.querySelector('.talera-independent-narrator-layer audio');
    if(!audio||audio.paused)throw Error('Narrator not actively playing');
    window.__taleraSyntheticPwaHidden=true;
    Object.defineProperty(document,'hidden',{configurable:true,
      get:()=>window.__taleraSyntheticPwaHidden});
    document.dispatchEvent(new Event('visibilitychange'));
    return {paused:audio.paused,at:audio.currentTime};
  });
  assert.equal(hiddenNarration.paused,true,
    'Existing narrated voice must pause when PWA enters background');
  await page.evaluate(()=>{
    window.__taleraSyntheticPwaHidden=false;
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
  });
  await page.waitForFunction(previous=>{
    const audio=document.querySelector('.talera-independent-narrator-layer audio');
    return audio&&!audio.paused&&!audio.muted&&
      audio.currentTime>previous+0.08;
  },hiddenNarration.at,{timeout:12000});
  console.log('TALERA_F5_NARRATED_PWA_FOREGROUND_VOICE_RESUMES_PASS',
    JSON.stringify({syntheticVisibility:true,originalPlayer:true,
      originalMediaUnchanged:true,realIphoneAccepted:false}));
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
  // A narrated VIDEO must not cover the already-present title/reading
  // sheet. The narrator owns audio/video; the existing sheet owns text.
  const readingDuringNarratedVideo=await page.evaluate(()=>{
    const video=document.querySelector('.talera-independent-narrator-layer video');
    const layer=document.querySelector('.talera-independent-narrator-layer');
    const stage=document.getElementById('photoStage');
    const scroll=document.getElementById('memoryStoryScroll');
    const sheet=document.getElementById('memoryCaption');
    const title=document.getElementById('memoryStory');
    const grip=document.getElementById('talera-f5-story-grip');
    const stack=el=>Number.parseInt(getComputedStyle(el).zIndex,10);
    return {
      narratorVideoPresent:!!video,
      stageZ:stack(stage),narratorZ:stack(layer),readingZ:stack(scroll),
      title:(title?.textContent||'').trim(),
      titleOpacity:Number(getComputedStyle(title).opacity),
      paperVisible:getComputedStyle(scroll).visibility==='visible'&&
        getComputedStyle(scroll).display!=='none',
      arrowSize:grip?Number.parseFloat(getComputedStyle(grip).fontSize):0,
      arrowText:grip?.textContent||'',
      gripWidth:grip?.getBoundingClientRect().width||0,
      gripHeight:grip?.getBoundingClientRect().height||0,
      touchAction:getComputedStyle(scroll).touchAction
    };
  });
  assert.equal(readingDuringNarratedVideo.narratorVideoPresent,true);
  assert.equal(readingDuringNarratedVideo.title,'Independent voice playback',
    'Original user title must remain available during video narration');
  assert.ok(readingDuringNarratedVideo.stageZ<
     readingDuringNarratedVideo.narratorZ &&
     readingDuringNarratedVideo.narratorZ<
     readingDuringNarratedVideo.readingZ,
    'Narrated video must remain BEHIND original pull-up reading/title layer: '+
     JSON.stringify(readingDuringNarratedVideo));
  assert.ok(readingDuringNarratedVideo.paperVisible&&
    readingDuringNarratedVideo.titleOpacity>=0.8,
    'Original title/paper must remain visible when narrated video starts');
  assert.ok(readingDuringNarratedVideo.arrowSize>=22&&
    readingDuringNarratedVideo.arrowText.includes('↑')&&
    readingDuringNarratedVideo.gripWidth>=60&&
    readingDuringNarratedVideo.gripHeight>=40,
    'The existing pull-up arrow must be visible and easy to grab on a phone');
  assert.equal(readingDuringNarratedVideo.touchAction,'pan-y');
  console.log('TALERA_NARRATOR_VIDEO_KEEPS_ORIGINAL_TITLE_AND_READING_GRIP_PASS',
    JSON.stringify({...readingDuringNarratedVideo,realIphoneAccepted:false}));
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



  // Safari can abort the first play request during a cold PWA document
  // transition. An AbortError on the SAME existing original audio element
  // must not silently freeze the narrator clock and every timed photo.
  const interrupted=await ctx.newPage();
  try{
    await interrupted.addInitScript(()=>{
      const original=HTMLMediaElement.prototype.play;
      let interruptedOnce=false;
      HTMLMediaElement.prototype.play=function(...args){
        if(!interruptedOnce&&this.tagName==='AUDIO'&&
           this.closest('.talera-independent-narrator-layer')){
          interruptedOnce=true;
          return Promise.reject(new DOMException(
            'Synthetic iPhone WebKit playback interruption','AbortError'));
        }
        return original.apply(this,args);
      };
    });
    await load(interrupted,narrated.id,4);
    await interrupted.waitForFunction(()=>{
      const a=document.querySelector('.talera-independent-narrator-layer audio');
      return a&&!a.paused&&a.currentTime>.12;
    },null,{timeout:8000});
    console.log('TALERA_F5_COLD_IPHONE_ABORTED_FIRST_PLAY_RECOVERS_PASS',
      JSON.stringify({syntheticAbortError:true,originalVoiceElement:true,
        photoVideoCueClockProtected:true,realIphoneAccepted:false}));
  }finally{await interrupted.close()}

  // iPhone MediaRecorder produces AAC/M4A voice recordings, not the WAV
  // fixture above. Verify the REAL account-local /tell writer, persisted
  // original audio/mp4 bytes and timed photo/video cues across a cold reopen.
  const syntheticIphoneVoice=path.join(generated,'iphone-aac-narration.m4a');
  execFileSync('ffmpeg',['-y','-f','lavfi',
    '-i','sine=frequency=495:duration=3.2',
    '-c:a','aac','-b:a','96k','-movflags','+faststart',
    syntheticIphoneVoice],{timeout:25000,stdio:'ignore'});
  await page.goto(origin+'/tell',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.TaleraMemories?.updateCues==='function',
    null,{timeout:15000});
  const aacStory=await page.evaluate(async ({voice,video})=>{
    const bytes=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));
    const photo=new File([await new Promise(resolve=>{
      const canvas=document.createElement('canvas');
      canvas.width=120;canvas.height=120;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#1dcf4c';ctx.fillRect(0,0,120,120);
      canvas.toBlob(resolve,'image/png');
    })],'iphone-voice-photo.png',{type:'image/png'});
    const originalVideo=new File([bytes(video)],'iphone-story-original.webm',
      {type:'video/webm'});
    const originalVoice=new File([bytes(voice)],'iphone-original-voice.m4a',
      {type:'audio/mp4'});
    const saved=await window.TaleraMemories.save({
      title:'',date:'2026-11-12',time:'18:45:00',
      text:'Technical only: original iPhone-style AAC voice and media',
      narrationCues:[],narrationDurationMs:3200
    },[photo,originalVideo,originalVoice]);
    const images=saved.items.filter(x=>x.kind==='photo'||x.kind==='video');
    const recorded=saved.items.find(x=>x.kind==='audio');
    if(!recorded||images.length!==2)
      throw Error('Original account-local editor lost the AAC recording or image/video IDs');
    const cues=[{t:0,index:0,mediaId:images[0].key},
      {t:700,index:1,mediaId:images[1].key,videoAtMs:0}];
    await window.TaleraMemories.updateCues(saved.id,cues);
    const row=await window.TaleraMemories.get(saved.id);
    const blob=await window.TaleraMemories.blob(recorded.key);
    return {id:saved.id,voiceId:recorded.key,voiceSize:blob?.size||0,
      voiceType:blob?.type,frameKeys:images.map(x=>x.key),
      cues:row.narrationCues};
  },{voice:readFileSync(syntheticIphoneVoice).toString('base64'),
     video:readFileSync(syntheticOriginal).toString('base64')});
  assert.ok(aacStory.voiceSize>15000,'Original AAC iPhone voice not persisted');
  assert.match(aacStory.voiceType||'',/^audio\/mp4/);
  assert.deepEqual(aacStory.cues.map(x=>x.mediaId),aacStory.frameKeys);
  await load(page,aacStory.id,2);
  await page.waitForFunction(()=>{
    const a=document.querySelector('.talera-independent-narrator-layer audio');
    return a&&!a.paused&&a.currentTime>.06;
  },null,{timeout:14000});
  // Cold restart within the SAME authenticated PWA storage container.
  await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
  await load(page,aacStory.id,2);
  const aacReopen=await page.evaluate(async id=>{
    const row=await window.TaleraMemories.get(id);
    const voice=row.items.find(x=>x.kind==='audio');
    const original=await window.TaleraMemories.blob(voice.key);
    const mem=window.__taleraTimelineRuntime?.currentMemory?.();
    return {voiceId:voice.key,voiceType:original?.type,
      voiceSize:original?.size||0,frames:mem?._zeroFrames?.map(x=>x.key),
      cues:mem?._taleraNarrationCues?.map(x=>x.mediaId)};
  },aacStory.id);
  assert.equal(aacReopen.voiceId,aacStory.voiceId);
  assert.equal(aacReopen.voiceSize,aacStory.voiceSize);
  assert.deepEqual(aacReopen.frames,aacStory.frameKeys);
  assert.deepEqual(aacReopen.cues,aacStory.frameKeys);
  await page.waitForFunction(()=>{
    const a=document.querySelector('.talera-independent-narrator-layer audio');
    return a&&!a.paused&&a.currentTime>.06;
  },null,{timeout:14000});
  console.log('TALERA_F5_ORIGINAL_IPHONE_AAC_VOICE_REOPENS_WITH_SAME_MEDIA_IDS_PASS',
    JSON.stringify({syntheticOnly:true,accountOriginalBlobsIntact:true,
      originalAACPlayback:true,timedPhotoAndVideoCuesIntact:true,
      physicalIphoneAccepted:false}));
  await load(page,plain,3);

  // Owner-reported release-risk: a real iPhone story with SIX photos and
  // ONE voice stayed visible after closing the PWA, but earlier stories were
  // absent after a Worker release. Protect the exact same local account
  // library across a full fresh document load, without creating another
  // app, database, storage owner, or copying any customer media.
  await page.goto(origin+'/tell',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.TaleraMemories?.updateCues==='function',
    null,{timeout:15000});
  const sixPhotoStory=await page.evaluate(async voice=>{
    const colors=['#de2525','#26bd46','#245be2','#e5a422','#a43bd3','#24b8ba'];
    const uploads=[];
    for(let i=0;i<colors.length;i++){
      const canvas=document.createElement('canvas');
      canvas.width=144;canvas.height=144;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle=colors[i];ctx.fillRect(0,0,144,144);
      const image=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!image?.size)throw Error('Synthetic original iPhone photo missing');
      uploads.push(new File([image],'original-'+i+'.png',{type:'image/png'}));
    }
    uploads.push(new File([Uint8Array.from(atob(voice),x=>x.charCodeAt(0))],
      'original-six-photo-voice.m4a',{type:'audio/mp4'}));
    const saved=await window.TaleraMemories.save({
      title:'',date:'1989-05-06',time:'14:20:00',
      tags:[],text:'Synthetic account-only voice memory with six original photos',
      narrationCues:[],narrationDurationMs:3200
    },uploads);
    const keys=saved.items.map(x=>x.key);
    if(saved.items.length!==7||saved.items.some((x,i)=>
      x.kind!==(i<6?'photo':'audio')))
      throw Error('The actual TALERA library lost six photo/voice references');
    const cues=keys.slice(0,6).map((mediaId,index)=>({
      t:index*500,index,mediaId
    }));
    await window.TaleraMemories.updateCues(saved.id,cues);
    const hash=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest(
      'SHA-256',await blob.arrayBuffer())),b=>
      b.toString(16).padStart(2,'0')).join('');
    const digests=await Promise.all(keys.map(async key=>{
      const blob=await window.TaleraMemories.blob(key);
      if(!(blob instanceof Blob)||!blob.size)
        throw Error('Original photo/voice Blob missing after save');
      return hash(blob);
    }));
    const me=await fetch('/api/me',{credentials:'same-origin'});
    if(!me.ok)throw Error('Original account session not available');
    const account=(await me.json()).account?.id;
    const dbs=(await indexedDB.databases()).map(x=>x.name||'')
      .filter(x=>x.startsWith('talera-free-local-')).sort();
    return {id:saved.id,account,keys,digests,cues,dbs};
  },readFileSync(syntheticIphoneVoice).toString('base64'));
  assert.equal(sixPhotoStory.keys.length,7);
  assert.equal(sixPhotoStory.cues.length,6);
  assert.ok(sixPhotoStory.account&&sixPhotoStory.dbs.length===1);
  await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(async id=>{
    if(!window.TaleraMemories?.list)return false;
    const rows=await window.TaleraMemories.list();
    const own=document.getElementById('myCards');
    return rows.some(r=>r.id===id)&&own?.children?.length>0&&
      getComputedStyle(own).display!=='none';
  },sixPhotoStory.id,{timeout:15000});
  // A refreshed PWA gets new HTML/scripts; the account UUID, physical
  // IndexedDB namespace, original file hashes, photo order and cues must
  // remain identical. This verifies same-origin reload, not a physical
  // iPhone OS storage eviction or a full production deployment.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(async id=>{
    if(typeof window.TaleraMemories?.list!=='function')return false;
    const rows=await window.TaleraMemories.list();
    const cards=document.getElementById('myCards');
    return rows.some(x=>x.id===id)&&!!cards?.children?.length&&
      getComputedStyle(cards).display!=='none';
  },sixPhotoStory.id,{timeout:15000});
  const sixPhotoReload=await page.evaluate(async id=>{
    const me=await fetch('/api/me',{credentials:'same-origin'});
    const account=me.ok?(await me.json()).account?.id:null;
    const row=await window.TaleraMemories.get(id);
    if(!row)throw Error('Previously persisted six-photo voice story is gone');
    const blobs=await Promise.all(row.items.map(x=>window.TaleraMemories.blob(x.key)));
    const hashes=await Promise.all(blobs.map(async blob=>{
      if(!(blob instanceof Blob)||!blob.size)
        throw Error('Original audio or picture missing after PWA reload');
      return Array.from(new Uint8Array(await crypto.subtle.digest(
        'SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
    }));
    const dbs=(await indexedDB.databases()).map(x=>x.name||'')
      .filter(x=>x.startsWith('talera-free-local-')).sort();
    const own=document.getElementById('myCards');
    return {account,id:row.id,keys:row.items.map(x=>x.key),digests:hashes,
      cues:row.narrationCues,dbs,title:row.title,tags:row.tags||[],
      ownCardVisible:!!own&&own.children.length>0&&
        getComputedStyle(own).display!=='none'};
  },sixPhotoStory.id);
  assert.equal(sixPhotoReload.account,sixPhotoStory.account);
  assert.equal(sixPhotoReload.id,sixPhotoStory.id);
  assert.deepEqual(sixPhotoReload.keys,sixPhotoStory.keys);
  assert.deepEqual(sixPhotoReload.digests,sixPhotoStory.digests);
  assert.deepEqual(sixPhotoReload.cues,sixPhotoStory.cues);
  assert.deepEqual(sixPhotoReload.dbs,sixPhotoStory.dbs);
  assert.equal(sixPhotoReload.title,'');
  assert.deepEqual(sixPhotoReload.tags,[]);
  assert.equal(sixPhotoReload.ownCardVisible,true);
  await load(page,sixPhotoStory.id,6);
  await page.waitForFunction(()=>{
    const audio=document.querySelector('.talera-independent-narrator-layer audio');
    const memory=window.__taleraTimelineRuntime?.currentMemory?.();
    return audio&&!audio.paused&&audio.currentTime>.06&&
      memory?._zeroFrames?.length===6&&
      memory?._taleraNarrationCues?.length===6;
  },null,{timeout:14000});
  console.log('TALERA_FREE_SIX_PHOTO_VOICE_ACCOUNT_LIBRARY_RELOAD_PASS',
    JSON.stringify({sameOrigin:true,sameAccount:true,allSevenMediaIDsStable:true,
      originalPhotoAndVoiceHashesIdentical:true,allSixCuesIdentical:true,
      titleAndTagsOptional:true,homeAndNarratorBothReadable:true,
      realWorkerVersionTransitionTested:false,realIphoneAccepted:false,
      syntheticOnly:true}));
  await load(page,plain,3);

  // A real LEFT/RIGHT gesture from a playing voice memory must immediately
  // reveal the EXISTING 11-photo wheel and select another saved memory.
  // No new viewer, test app, audio ID or narrator-specific swipe engine.
  await load(page,narrated.id,4);
  // load() is a FULL page navigation; compare DOM identity only within this
  // document, across actual touch swipes (not across reloads).
  await page.evaluate(()=>{
    window.__taleraAudioNodeBeforeNarrationSwipe=
      window.__taleraF5SharedAudible.get();
  });
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
    newMemory:window.__taleraTimelineRuntime?.currentMemory?.()?.storyId,
    memoryHasVoice:!!window.__taleraTimelineRuntime?.currentMemory?.()
      ?._zeroItems?.some(x=>x.kind==='audio'),
    narratorLayers:document.querySelectorAll('.talera-independent-narrator-layer').length,
    danglingListen:document.querySelectorAll('button.talera-v61-audio-permission-hint').length,
    settingsEnabled:window.__taleraAudioControls?.isEnabled?.(),
    audioPreserved:window.__taleraF5SharedAudible.get()===
      window.__taleraAudioNodeBeforeNarrationSwipe,
    soundNodeCount:document.querySelectorAll('#talera-f5-shared-audio').length
  }));
  assert.equal(afterNarratedSwipe.memoryHasVoice,false,
    'Ordinary memory must select ordinary motor after swipe');
  assert.equal(afterNarratedSwipe.narratorLayers,0,
    'Recorded-voice motor must be entirely stopped on ordinary-memory transition');
  assert.equal(afterNarratedSwipe.audioPreserved,true,
    'Narrator-to-ordinary swipe must keep the SAME audio element');
  assert.equal(afterNarratedSwipe.soundNodeCount,1,
    'There must be exactly one persistent sound element on the presentation page');
  assert.equal(afterNarratedSwipe.danglingListen,0,
    'A narrator Listen button must never remain on an ordinary memory');
  console.log('TALERA_SWIPE_ENGINE_AUDIO_ISOLATION_PASS',JSON.stringify(afterNarratedSwipe));
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
  assert.equal(await page.evaluate(()=>window.__taleraF5SharedAudible.get()===
    window.__taleraAudioNodeBeforeNarrationSwipe),true,
    'Ordinary-to-narrator swipe must reuse the SAME audio element');
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
  // This is a NEW document load after saving the real account-local record:
  // the persisted voice Blob and canonical picture/video cues must be present
  // BEFORE diagnosing any iPhone autoplay rejection.
  const reopenedNarration=await page.evaluate(async id=>{
    const row=await window.TaleraMemories.get(id);
    const voice=row?.items?.find(x=>x.kind==='audio');
    const blob=voice&&await window.TaleraMemories.blob(voice.key);
    const frames=(row?.items||[]).filter(x=>x.kind==='photo'||x.kind==='video');
    const selected=window.__taleraTimelineRuntime?.currentMemory?.();
    return {id:row?.id,voiceId:voice?.key,
      voiceBytes:blob?.size||0,voiceMime:blob?.type,
      cueCount:row?.narrationCues?.length||0,
      cueIds:(row?.narrationCues||[]).map(c=>c.mediaId),
      frameIds:frames.map(x=>x.key),
      voiceHydrated:!!selected?._zeroItems?.some(x=>x.kind==='audio'),
      frameCount:selected?._zeroFrames?.length};
  },narrated.id);
  assert.equal(reopenedNarration.id,narrated.id);
  assert.equal(reopenedNarration.voiceId,narrated.voiceId);
  assert.ok(reopenedNarration.voiceBytes>100,'Cold reopen lost original voice bytes');
  assert.deepEqual(reopenedNarration.cueIds,narrated.cues.map(x=>x.mediaId),
    'Cold reopen lost original canonical picture/video cue IDs');
  assert.equal(reopenedNarration.frameCount,4);
  assert.equal(reopenedNarration.voiceHydrated,true,
    'Cold reopen routed a narrated story to the ordinary picture player');
  console.log('TALERA_F5_COLD_REOPEN_ORIGINAL_VOICE_AND_CUES_PRESERVED_PASS',
    JSON.stringify({sameAccount:true,originalVoiceId:true,
      canonicalCues:true,voiceBytes:reopenedNarration.voiceBytes,
      syntheticOnly:true,realIphoneAccepted:false}));
  const voiceHint=page.locator('#talera-f5-narrator-sound-hint');
  await voiceHint.waitFor({state:'visible',timeout:10000});
  assert.equal(await voiceHint.textContent(),'Tik één keer voor geluid');
  assert.equal(await voiceHint.evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  await page.evaluate(()=>{
    window.__taleraNarratorTapDiagnostics=[];
    document.addEventListener('click',e=>window.__taleraNarratorTapDiagnostics.push({
      target:e.target?.id||e.target?.className||e.target?.tagName,
      inside:!!e.target?.closest?.('#memoryStoryScroll'),
      blocked:!!e.target?.closest?.('a,button,[role=button],input,select,textarea')
    }),{capture:true,once:true});
  });
  // The original picture is intentionally covered by the existing user
  // gesture surface. Use that actual hit target, never force an underlying
  // aria-hidden photoStage click or add an alternate player/view.
  await page.locator('#memoryStoryScroll').tap({timeout:6000});
  await page.waitForTimeout(500);
  const tapReport=await page.evaluate(()=>({events:window.__taleraNarratorTapDiagnostics,
    hint:!!document.getElementById('talera-f5-narrator-sound-hint'),
    memory:window.__taleraTimelineRuntime?.currentMemory?.()?.id,
    audio:((a)=>({exists:!!a,paused:a?.paused,muted:a?.muted,
      time:a?.currentTime,source:a?.currentSrc?.slice(0,45)}))
        (document.querySelector('.talera-independent-narrator-layer audio'))}));
  console.log('TALERA_NARRATOR_SHARED_TAP_DIAGNOSTIC',JSON.stringify(tapReport));
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
  assert.equal(await voiceHint.count(),0,
    'The original video soundtrack must not request a second sound-activation hint');
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
  // The real iPhone shows TIMELINE ONLY (white background) with a previously
  // saved first-video poster. A deep-link entry guard must never leave
  // #photoStage hidden after the selected original has loaded.
  await page.waitForFunction(()=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    return !m?._photoLoading&&m?.photos?.[0]?.startsWith('blob:');
  },null,{timeout:16500});
  // Native Safari has a bounded 180ms fallback after the FIRST requested
  // media frame is verified. Check after that bound, not in the same
  // microtask that finishes IndexedDB/photo metadata hydration.
  await page.waitForTimeout(480);
  const deepEntry=await page.evaluate(()=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    const front=document.getElementById('memoryPhotoA');
    const stage=document.getElementById('photoStage');
    const v=document.querySelector('video.talera-v61-inline-video');
    return {
      hiddenByEntry:document.documentElement.classList.contains('talera-direct-memory-entering'),
      stageVisibility:getComputedStyle(stage).visibility,
      firstFrameMatches:front?.getAttribute('src')===m?.image,
      firstFrameReady:!!front?.complete&&front.naturalWidth>0,
      videoPlaying:!!v&&!v.paused,
      mediaFirstKind:m?._zeroFrames?.[0]?.kind,
      mediaID:m?._zeroFrames?.[0]?.key,
      storyID:m?.storyId,
      frontSourceType:String(front?.getAttribute('src')||'').split(':')[0]
    };
  });
  assert.equal(deepEntry.hiddenByEntry,false,
    'IPHONE_BLANK_STAGE_DIRECT_VIDEO: '+JSON.stringify(deepEntry));
  assert.notEqual(deepEntry.stageVisibility,'hidden',
    'First own video must be visible, not covered by stale entry guard');
  console.log('TALERA_FIRST_VIDEO_DIRECT_ENTRY_STAGE_VISIBLE_PASS',
    JSON.stringify({...deepEntry,realIphoneAccepted:false}));
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

  // Real-IndexedDB original video: on returning from its second photo to
  // its own first media, reuse the same saved 0.15s still. Begin a guarded
  // 50ms visual blend once the actual video passes the 0.10s mark; retain
  // the original video and stored thumbnail without seeking or copying.
  // Prove attachment, removal before video end and media-ID ownership.
  await page.evaluate(()=>{
    const m=window.__taleraTimelineRuntime.currentMemory();
    window.__taleraOrdinarySelectPhoto?.(m.id,1,true);
  });
  await page.waitForFunction(()=>window.__taleraTimelineRuntime
    ?.currentMemory?.()?._photoIndex===1,null,{timeout:9000});
  await page.evaluate(()=>{
    const host=document.getElementById('photoStage')?.parentElement;
    if(!host)throw Error('Original ordinary presentation host not found');
    const trace={added:0,removed:0,src:'',timeAtRemoval:null,
      fadeAt:null,fadeDuration:null,endedAtRemoval:null,hasOneSoundNode:null};
    window.__taleraFirstFrameHandoffTrace=trace;
    window.__taleraFirstFrameHandoffObserver=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==='attributes'&&record.target.classList?.contains('talera-v61-first-frame-bridge')&&
           record.target.style.opacity==='0'&&trace.fadeAt===null){
          const video=document.querySelector('video.talera-v61-inline-video');
          trace.fadeAt=video?.currentTime??null;
          trace.fadeDuration=record.target.style.transition;
        }
        for(const node of record.addedNodes){
          if(node.nodeType===1&&node.classList?.contains('talera-v61-first-frame-bridge')){
            trace.added++;trace.src=node.src;
          }
        }
        for(const node of record.removedNodes){
          if(node.nodeType===1&&node.classList?.contains('talera-v61-first-frame-bridge')){
            const video=document.querySelector('video.talera-v61-inline-video');
            trace.removed++;trace.timeAtRemoval=video?.currentTime;
            trace.endedAtRemoval=video?.ended;
            trace.hasOneSoundNode=document.querySelectorAll('#talera-f5-shared-audio').length===1;
          }
        }
      }
    });
    window.__taleraFirstFrameHandoffObserver.observe(host,{
      childList:true,subtree:true,attributes:true,attributeFilter:['style']});
    const m=window.__taleraTimelineRuntime.currentMemory();
    window.__taleraOrdinarySelectPhoto?.(m.id,0,true);
  });
  await page.waitForFunction(()=>{
    const v=document.querySelector('video.talera-v61-inline-video');
    if(v&&!v.paused){v.loop=true;v.playbackRate=.3}
    const t=window.__taleraFirstFrameHandoffTrace;
    return t?.added===1&&t?.removed===1;
  },null,{timeout:15000});
  const exactHandoff=await page.evaluate(id=>{
    const mem=window.__taleraTimelineRuntime.currentMemory();
    const report=window.__taleraFirstFrameHandoffTrace;
    window.__taleraFirstFrameHandoffObserver?.disconnect();
    return {...report,firstOriginalId:mem?._zeroFrames?.[0]?.key,
      rememberedId:mem?.storyId,exactSameStill:report.src===mem?.photos?.[0],
      bridgeLeft:!!document.querySelector('.talera-v61-first-frame-bridge')};
  },videoFirst.id);
  assert.equal(exactHandoff.added,1);
  assert.equal(exactHandoff.removed,1);
  assert.equal(exactHandoff.exactSameStill,true,
    'Handoff must reuse the SAME video still as the existing timeline wheel');
  assert.ok(exactHandoff.fadeAt>=.095,
    'Do not fade a 0.15s thumbnail until the native video has a decoded 0.10s frame: '+
      JSON.stringify(exactHandoff));
  assert.ok(exactHandoff.fadeAt<.27,
    'Do not hold a still until long after playback starts: '+JSON.stringify(exactHandoff));
  assert.equal(exactHandoff.fadeDuration,'opacity 50ms linear',
    'Only a short 50ms blend is permitted in the existing video stage');
  assert.ok(exactHandoff.timeAtRemoval>=.14,
    'Remove the old 0.15s still only after the matching video time and fade');
  assert.equal(exactHandoff.endedAtRemoval,false,
    'The visual transition must settle WHILE the original video plays');
  assert.equal(exactHandoff.bridgeLeft,false);
  assert.equal(exactHandoff.hasOneSoundNode,true);
  assert.equal(exactHandoff.rememberedId,videoFirst.id);
  console.log('TALERA_NATIVE_VIDEO_FIRST_FRAME_HANDOFF_PASS',
    JSON.stringify({...exactHandoff,iPhoneAccepted:false}));

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
  // A one-second synthetic video cannot reliably stay playing across
  // additional asynchronous diagnostic polls. Keep the original browser
  // regression for playback/navigation and verify the generated contract.
  await page.waitForFunction(()=>{
    const video=document.querySelector('video.talera-v61-inline-video');
    if(!video)return false;
    video.loop=true;video.playbackRate=.1;
    return true;
  },null,{timeout:12000});
  const ordinarySource=await page.content();
  const ordinaryMotorStart=ordinarySource.indexOf('  function playOrdinaryVideo(memory,index){');
  const ordinaryMotorEnd=ordinarySource.indexOf('  function showPhoto(memory,index,manual=false){',
    ordinaryMotorStart);
  assert.ok(ordinaryMotorStart>=0&&ordinaryMotorEnd>ordinaryMotorStart,
    'Only the existing ordinary video player may be inspected');
  const ordinaryMotor=ordinarySource.slice(ordinaryMotorStart,ordinaryMotorEnd);
  const ordinarySafety={
    noBlueMask:!ordinarySource.includes('taleraOrdinaryVideoMask')&&
      !ordinarySource.includes('talera-f5-ordinary-video-mask'),
    originalFirstPlay:ordinaryMotor.includes('video.onloadedmetadata=start')&&
      ordinaryMotor.includes('video.src=url;start()'),
    noDoubleLoad:!ordinaryMotor.includes('video.src=url;video.load()')
  };
  assert.ok(Object.values(ordinarySafety).every(Boolean),
    'Ordinary video is unchanged and no blue interstitial is installed: '+
      JSON.stringify(ordinarySafety));
  assert.ok(ordinarySource.includes('const adjacentOriginals=new Map()')&&
    ordinarySource.includes('for(const offset of [-1,1])')&&
    ordinarySource.includes("m._zeroFrames?.[0]?.kind!=='photo'"),
    'Warm only two adjacent ORIGINAL photo images, never a second video or new app');
  assert.equal(await page.locator('#talera-f5-ordinary-video-mask').count(),0,
    'Ordinary video must never paint the obsolete blue inter-memory mask');
  assert.ok(ordinarySource.includes('now-lastSoundSeekAt<5000')&&
    ordinarySource.includes('Math.abs(audio.currentTime-video.currentTime)>1.5'),
    'The first cold original audio must not repeatedly seek every 0.4 second');
  console.log('TALERA_VIDEO_STILL_STRIP_ONLY_AND_COLD_AUDIO_CONTRACT_PASS',
    JSON.stringify({wheelPreserved:true,originalPlayer:true,
      coldAudioResyncCapped:true,narratorUntouched:true,iphoneAccepted:false}));
  const videoSurface=await page.locator('#surface').boundingBox();
  const videoY=videoSurface.y+videoSurface.height*.38;
  await page.mouse.move(videoSurface.x+videoSurface.width*.2,videoY);
  await page.mouse.down();
  await page.mouse.move(videoSurface.x+videoSurface.width*.8,videoY,{steps:12});
  const ordinaryWhileMoving=await page.evaluate(()=>{
    const video=document.querySelector('video.talera-v61-inline-video');
    return {retainedPlayer:!!video,paused:video?.paused,
      hidden:video?.style.display==='none',
      wheel:document.querySelector('#photoStage .talera-wheel-strip')?.classList.contains('is-visible')};
  });
  await page.mouse.up();
  assert.equal(ordinaryWhileMoving.retainedPlayer,true,
    'A real timeline swipe must retain the SAME ordinary video node for iOS sound reuse');
  assert.equal(ordinaryWhileMoving.paused,true,
    'Timeline movement must immediately stop the old ordinary video soundtrack');
  assert.equal(ordinaryWhileMoving.hidden,true,
    'The old ordinary video must disappear while the native timeline strip moves');
  assert.equal(await page.locator('#talera-f5-ordinary-video-mask').count(),0,
    'Swiping toward another memory may not paint a blue video mask');
  assert.equal(ordinaryWhileMoving.wheel,true);
  console.log('TALERA_TIMELINE_NAVIGATION_STOPS_ORDINARY_VIDEO_PASS',
    JSON.stringify({originalVideoStopped:true,originalVideoHidden:true,
      nativeNodeRetained:true,noNewPlayer:true,iphoneAccepted:false}));

  // Owner explicitly requests a truly empty account-local story list.
  // Use the SAME existing PWA and the original account's IndexedDB; confirm
  // that an explicit reset cannot affect the original media engine or other IDs.
  const beforeOwnerClear=await page.evaluate(async()=>
    (await window.TaleraMemories.list()).length);
  assert.ok(beforeOwnerClear>=3,'Need original saved account stories for clear test');
  console.log('TALERA_OWNER_REMOVE_METHOD_SOURCE',await page.evaluate(()=>
    window.TaleraMemories.remove.toString().slice(0,2000)));

  // The user requested DIRECT deletion: no button or confirmation dialogue.
  // This deliberate one-time query must run in the ordinary SAME-ORIGIN app.
  let nativeDialogs=0;
  page.on('dialog',async d=>{nativeDialogs++;await d.dismiss()});
  await page.goto(origin+'/mijn-leven?wis-alle-verhalen=nu',
    {waitUntil:'domcontentloaded'});
  await page.waitForFunction(async()=>
    location.pathname==='/mijn-leven'&&location.search===''&&
    !!window.TaleraMemories?.list&&
    (await window.TaleraMemories.list()).length===0&&
    /^(nog leeg|still empty)$/i.test(document.getElementById('v17-year-summary')?.textContent?.trim()||''),
    null,{timeout:20000});
  assert.equal(nativeDialogs,0,'Direct owner reset cannot require dialogs');
  // The Home can briefly return an empty pre-hydration catalog during
  // account-scoped IndexedDB open. Require durable deletion across a fresh
  // page load, never mistake that transient state for persisted deletion.
  await page.waitForTimeout(1600);
  const beforeReload=await page.evaluate(async()=>({
    url:location.pathname+location.search+location.hash,
    count:(await window.TaleraMemories.list()).length
  }));
  console.log('TALERA_OWNER_CLEAR_BEFORE_RELOAD',JSON.stringify(beforeReload));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(async()=>
    !!window.TaleraMemories?.list&&
    (await window.TaleraMemories.list()).length===0,
    null,{timeout:15000});

  assert.equal(await page.evaluate(async()=>
    (await window.TaleraMemories.list()).length),0,
    'Existing owner reset must delete the local stories, not just hide cards');
  const afterOwnerClear=await page.evaluate(()=>({
    photo:document.getElementById('heroImage')?.getAttribute('src'),
    year:document.getElementById('v17-year-summary')?.textContent?.trim(),
    examples:window.__taleraReferenceMemories?.length
  }));
  assert.equal(afterOwnerClear.photo,null,'A cleared account must show no previous cover');
  assert.equal(afterOwnerClear.examples,0,'No bundled examples return after clearing stories');
  console.log('TALERA_OWNER_CONFIRMED_LOCAL_STORY_CLEAR_PASS',
    JSON.stringify({before:beforeOwnerClear,after:0,accountStoreOnly:true,
      exampleStories:0,realIphoneAccepted:false}));
  assert.deepEqual(errors,[],'Original presentation script runtime errors');
  console.log('TALERA_SAME_FREE_PRESENTATION_BROWSER_OK',JSON.stringify({
    photoAutoVisible:true,tapVisible:true,loop:true,
    originalVideoThenPhotos:true,narrationNeverActivated:true,
    newApp:false,customerData:false,realIphoneAccepted:false
  }));
}finally{
  await stop();
  // The test uses ONLY this newly generated, uniquely named local directory.
  // No real account, iPhone memory or QA-app storage is touched.
  rmSync(generated,{recursive:true,force:true});
}

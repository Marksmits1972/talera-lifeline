// Called by the EXISTING TALERA browser regression, on its existing local
// Worker, using its disposable synthetic account. No second app or worker.
import assert from 'node:assert/strict';
const widths=[[1024,768],[1366,768],[1920,1080]];
const close=(a,b,tolerance=3)=>Math.abs(a-b)<=tolerance;
export async function verifyDesktopLayout({browser,origin,gate,sid,mobileDevice}){
 const context=await browser.newContext({
  viewport:{width:1366,height:768},isMobile:false,hasTouch:false,
  serviceWorkers:'block',extraHTTPHeaders:{'x-talera-f5-key':gate}
 });
 try{
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  // The existing signed-out presentation has no reference photos. Do not
  // show a broken-image icon, but keep the native elements for later data.
  await page.goto(origin+'/present',{waitUntil:'domcontentloaded'});
  const emptyPhotos=await page.evaluate(()=>['memoryPhotoA','memoryPhotoB'].map(id=>{
   const img=document.getElementById(id);
   return img?{id,src:!!img.getAttribute('src'),srcset:!!img.getAttribute('srcset'),visibility:getComputedStyle(img).visibility}:null;
  }));
  assert.ok(emptyPhotos.every(p=>p&&!p.src&&!p.srcset&&p.visibility==='hidden'),'Empty native desktop photos: '+JSON.stringify(emptyPhotos));
  console.log('TALERA_DESKTOP_EMPTY_PHOTOS_HIDDEN_PASS');
  await context.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',
   path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
  // No user account or photos: reuse the existing synthetic local store API.
  await page.goto(origin+'/tell',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.TaleraMemories?.save);
  const id=await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=160;canvas.height=120;
   const c=canvas.getContext('2d');c.fillStyle='#336677';c.fillRect(0,0,160,120);
   const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
   const row=await window.TaleraMemories.save({
    title:'Desktop geometry regression',date:new Date().toISOString().slice(0,10),
    time:'12:00:00',text:'Synthetic local layout fixture'
   },[0,1,2].map(i=>new File([blob],'desktop-regression-'+i+'.png',{type:'image/png'})));
   return row.id;
  });
  const href='/present?memory='+encodeURIComponent(id);
  await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(href=>{
   const image=document.getElementById('heroImage');
   return document.getElementById('heroCaption')?.dataset.presentHref===href&&image?.complete&&image.naturalWidth>0;
  },href,{timeout:20000});
  const sizes=[];
  for(const [width,height] of widths){
   await page.setViewportSize({width,height});
   await page.waitForFunction(()=>{
    const s=document.getElementById('sheet')?.getBoundingClientRect();
    return s&&Math.abs(s.width-Math.min(620,Math.max(350,innerWidth*.35)))<3;
   },null,{timeout:7000});
   const geometry=await page.evaluate(()=>{
    const rect=(selector)=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null};
    return {width:innerWidth,height:innerHeight,sheet:rect('#sheet'),hero:rect('.hero'),nav:rect('.flow-nav'),
      add:rect('a[href="/tell"]'),scrollWidth:document.documentElement.scrollWidth,
      readingSizes:Object.fromEntries(['.sheet-sub','#v17-year-summary','#v17-min-year','#v17-mid-year','#v17-max-year','.v18-era-note','#navMine'].map(s=>{const e=document.querySelector(s);return [s,e?parseFloat(getComputedStyle(e).fontSize):null]})),
      desktop:matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)').matches};
   });
   assert.ok(geometry.desktop,JSON.stringify(geometry));
   assert.ok(close(geometry.sheet.left,0)&&close(geometry.sheet.right,geometry.hero.left),'Control/image boundary '+JSON.stringify(geometry));
   assert.ok(close(geometry.hero.right,width)&&geometry.hero.width>geometry.sheet.width,'Remembrance must dominate desktop '+JSON.stringify(geometry));
   assert.ok(geometry.nav.left>=0&&geometry.nav.right<=geometry.sheet.right+3,'Navigation stays on left '+JSON.stringify(geometry));
   assert.ok(geometry.scrollWidth<=width+1,'No horizontal page overflow');
   for(const [selector,minimum] of [['.sheet-sub',14],['#v17-year-summary',14],['#v17-min-year',13],['#v17-mid-year',13],['#v17-max-year',13],['.v18-era-note',14],['#navMine',13]])
    assert.ok(geometry.readingSizes[selector]>=minimum,'Desktop reading size '+selector+': '+JSON.stringify(geometry.readingSizes));
   sizes.push(geometry);
  }
  // Real click on the existing visible image, rather than constructing a new
  // navigation path, proves that the original action still opens the same ID.
  const hero=await page.locator('.hero').boundingBox();assert.ok(hero);
  await Promise.all([page.waitForURL(u=>u.pathname==='/present'&&u.searchParams.get('memory')===id,{timeout:20000}),
    page.mouse.click(hero.x+hero.width*.55,hero.y+hero.height*.45)]);
  await page.waitForFunction(id=>{
   const m=window.__taleraTimelineRuntime?.currentMemory?.();
   return m?.storyId===id&&!m._photoLoading;
  },id,{timeout:20000});
  await page.waitForFunction(()=>!document.documentElement.classList.contains('talera-direct-memory-entering'),null,{timeout:8000});
  const presentations=[];
  for(const [width,height] of widths){
   await page.setViewportSize({width,height});
   const expected=Math.min(width*.62,960);
   await page.waitForFunction(expected=>Math.abs(document.getElementById('surface')?.getBoundingClientRect().width-expected)<3,expected,{timeout:7000});
   const g=await page.evaluate(()=>{
    const rect=(selector)=>{const r=document.querySelector(selector)?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null};
    return {surface:rect('#surface'),canvas:rect('#timelineCanvas'),date:rect('#focusText'),
      dots:rect('.talera-photo-dots'),stage:rect('#photoStage'),id:window.__taleraTimelineRuntime?.currentMemory?.()?.storyId,
      controlColors:Object.fromEntries(['#talera-flow-home','#talera-v5-editor-pencil'].map(s=>{const e=document.querySelector(s);return [s,e?{background:getComputedStyle(e,'::after').backgroundColor,hitBackground:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,paintWidth:getComputedStyle(e,'::after').width,hitWidth:getComputedStyle(e).width}:null]}))};
   });
   assert.ok(close(g.surface.width,expected)&&close((g.surface.left+g.surface.right)/2,width/2),'Centered shorter ruler '+JSON.stringify(g));
   assert.ok(close(g.canvas.width,g.surface.width),'Canvas must match native hit area');
   assert.ok(g.dots.height>0&&g.canvas.top<g.date.top&&g.date.top<g.dots.top,'Timeline, date, orange dots order preserved');
   assert.ok(close(g.stage.width,width)&&close(g.stage.height,height),'Full photo stage');
   assert.equal(g.id,id,'Resizing must not change selection');
   for(const [selector,style] of Object.entries(g.controlColors)){
    assert.equal(style?.background,'rgba(11, 30, 57, 0.88)','Desktop contrast '+selector);
    assert.equal(style?.color,'rgb(255, 255, 255)','Desktop foreground '+selector);
    assert.equal(style?.hitBackground,'rgba(0, 0, 0, 0)','Original transparent hit area '+selector);
    assert.equal(style?.paintWidth,'34px','Original visible circle '+selector);
    assert.equal(style?.hitWidth,'45px','Original hit area '+selector);
   }
   presentations.push(g);
  }
  console.log('TALERA_DESKTOP_GEOMETRY_AND_MEMORY_PASS',JSON.stringify({sizes:sizes.map(s=>[s.width,s.height,s.sheet.width]),presentations:presentations.map(g=>g.surface.width),sameMemoryId:true}));
  // Preserve the original back link, route, account and data. Trace only the
  // disposable synthetic navigation, so a failed return is diagnosable.
  // The default CI locale is not necessarily Dutch. Use the actual original
  // Home destination rather than an exact localized accessible-name string.
  const back=page.locator('a[href="/"]:visible, a[href="/mijn-leven"]:visible');
  const links=await page.locator('a:visible').evaluateAll(nodes=>nodes.map(e=>({
   href:e.getAttribute('href'),label:e.getAttribute('aria-label'),title:e.getAttribute('title')
  })));
  assert.equal(await back.count(),1,'Exactly one original visible Home return link: '+JSON.stringify(links));
  const backBefore=await back.evaluate(e=>{
   const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return {href:e.getAttribute('href'),resolved:e.href,rect:[r.x,r.y,r.width,r.height],hit:hit?.outerHTML?.slice(0,300)};
  });
  const returnEvents=[];
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())returnEvents.push(frame.url())});
  await back.click();
  try{
   await page.waitForURL(u=>u.pathname==='/'||u.pathname==='/mijn-leven',{timeout:20000,waitUntil:'domcontentloaded'});
  }catch(error){
   console.log('TALERA_DESKTOP_BACK_DIAGNOSTIC',JSON.stringify({before:backBefore,after:page.url(),navigations:returnEvents,errors}));
   throw error;
  }
  await page.waitForFunction(async id=>!!window.TaleraMemories?.list&&
   (await window.TaleraMemories.list()).some(row=>row.id===id),id);
  assert.deepEqual(errors,[],'Desktop runtime errors');
  console.log('TALERA_DESKTOP_SAME_APP_LAYOUT_PASS',JSON.stringify({sizes:sizes.map(s=>[s.width,s.height,s.sheet.width]),presentations:presentations.map(g=>g.surface.width),sameMemoryId:true,originalBack:true}));
 }finally{await context.close()}
 // Explicit narrow touch baseline alongside the existing full mobile tests.
 const mobile=await browser.newContext({...mobileDevice,serviceWorkers:'block',extraHTTPHeaders:{'x-talera-f5-key':gate}});
 try{
  const page=await mobile.newPage();
  await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.getElementById('sheet'));
  const home=await page.evaluate(()=>({width:innerWidth,sheet:document.getElementById('sheet').getBoundingClientRect().width,
   hero:document.querySelector('.hero').getBoundingClientRect().width,
   desktop:matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)').matches}));
  assert.ok(!home.desktop&&close(home.sheet,home.width)&&close(home.hero,home.width),'Original mobile Home geometry '+JSON.stringify(home));
  await page.goto(origin+'/present',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.getElementById('surface'));
  const presentation=await page.evaluate(()=>({width:innerWidth,surface:document.getElementById('surface').getBoundingClientRect().width}));
  assert.ok(close(presentation.surface,presentation.width),'Original mobile ruler still full width');
  console.log('TALERA_DESKTOP_MOBILE_LAYOUT_UNCHANGED_PASS');
 }finally{await mobile.close()}
}

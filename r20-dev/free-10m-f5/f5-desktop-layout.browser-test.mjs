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
  // Open the existing menu and messages using the original visible links.
  await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__taleraMoreMenu?.ready);
  const panel=page.locator('#talera-more-menu > .panel');
  const dialogGeometry=async(view)=>{
   await panel.and(page.locator('[data-view="'+view+'"]')).waitFor({state:'visible'});
   const g=await panel.evaluate(e=>{
    const r=e.getBoundingClientRect(),b=e.querySelector('.body');
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,viewport:[innerWidth,innerHeight],bodyOverflow:getComputedStyle(b).overflowY};
   });
   assert.ok(close(g.width,620)&&close((g.left+g.right)/2,g.viewport[0]/2)&&close((g.top+g.bottom)/2,g.viewport[1]/2),'Centered desktop menu '+view+': '+JSON.stringify(g));
   assert.ok(g.top>=23&&g.bottom<=g.viewport[1]-23&&g.bodyOverflow==='auto','Menu remains within viewport and scrollable '+JSON.stringify(g));
   return g;
  };
  await page.locator('#navMore').click();
  await dialogGeometry('hub');
  await panel.locator('button[data-view="settings"]').click();
  const settings=await dialogGeometry('settings');
  assert.ok(settings.height<600,'Settings should not be a full-height mobile sheet '+JSON.stringify(settings));
  await panel.locator('[data-action="back"]').click();
  await dialogGeometry('hub');
  await panel.locator('[data-action="close"]').click();
  await panel.waitFor({state:'hidden'});
  await page.locator('#navNotifications').click();
  const messages=await dialogGeometry('messages');
  assert.ok(messages.height<500,'Signed-out messages fit their content '+JSON.stringify(messages));
  await panel.locator('[data-action="close"]').click();
  await panel.waitFor({state:'hidden'});
  console.log('TALERA_DESKTOP_CENTERED_MENU_PASS',JSON.stringify({settings,messages}));
  // The existing signed-out presentation has no reference photos. Do not
  // show a broken-image icon, but keep the native elements for later data.
  const overview=page.locator('#talera-desktop-present-link');
  await overview.waitFor({state:'visible'});
  assert.equal(await overview.getAttribute('href'),'/present');
  await Promise.all([page.waitForURL(u=>u.pathname==='/present'&&!u.search),overview.click()]);
  console.log('TALERA_DESKTOP_EXPLICIT_PRESENTATION_ENTRY_PASS');
  const emptyPhotos=await page.evaluate(()=>['memoryPhotoA','memoryPhotoB'].map(id=>{
   const img=document.getElementById(id);
   return img?{id,src:!!img.getAttribute('src'),srcset:!!img.getAttribute('srcset'),visibility:getComputedStyle(img).visibility}:null;
  }));
  assert.ok(emptyPhotos.every(p=>p&&!p.src&&!p.srcset&&p.visibility==='hidden'),'Empty native desktop photos: '+JSON.stringify(emptyPhotos));
  console.log('TALERA_DESKTOP_EMPTY_PHOTOS_HIDDEN_PASS');
  for(const [width,height] of widths){
   await page.setViewportSize({width,height});
   const dock=await page.evaluate(()=>{
    const nav=document.querySelector('nav[data-i18n-aria-label="core.present.navAria"]'),r=nav?.getBoundingClientRect();
    return r?{left:r.left,right:r.right,width:r.width,bottom:r.bottom,buttons:[...nav.children].map(e=>({tag:e.tagName,cls:e.className,font:parseFloat(getComputedStyle(e).fontSize),width:e.getBoundingClientRect().width}))}:null;
   });
   assert.ok(dock&&close(dock.width,420)&&close((dock.left+dock.right)/2,width/2)&&close(dock.bottom,height-12),'Compact desktop navigation '+JSON.stringify(dock));
   assert.equal(dock.buttons.length,3,'Original three navigation actions retained');
   assert.ok(dock.buttons.every(b=>b.tag==='BUTTON'&&b.width>=44),'Original usable navigation targets '+JSON.stringify(dock));
   assert.ok(dock.buttons.filter(b=>b.cls.includes('nav-item')).every(b=>b.font>=13),'Readable desktop navigation labels');
  }
  console.log('TALERA_DESKTOP_COMPACT_NAVIGATION_PASS');
  await context.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',
   path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
  // No user account or photos: reuse the existing synthetic local store API.
  await page.goto(origin+'/tell',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.TaleraMemories?.save);
  const id=await page.evaluate(async()=>{
   // Distinct portrait, landscape and square photos make the existing
   // random Home image and first presentation frame visibly distinguishable.
   const files=[];
   for(const [i,[width,height,color]] of [[160,120,'#336677'],[120,160,'#985344'],[140,140,'#476a3d']].entries()){
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,width,height);
    const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
    files.push(new File([blob],'desktop-regression-'+i+'.png',{type:'image/png'}));
   }
   const row=await window.TaleraMemories.save({
    title:'Desktop geometry regression',date:new Date().toISOString().slice(0,10),
    time:'12:00:00',text:'Synthetic local layout fixture'
   },files);
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
    return {width:innerWidth,height:innerHeight,sheet:rect('#sheet'),hero:rect('.hero'),nav:rect('.flow-nav'), language:rect('#talera-v23-language'), logo:rect('.mast .logo'),
      add:rect('a[href="/tell"]'),scrollWidth:document.documentElement.scrollWidth,
      readingSizes:Object.fromEntries(['.sheet-sub','#v17-year-summary','#v17-min-year','#v17-mid-year','#v17-max-year','.v18-era-note','#navMine'].map(s=>{const e=document.querySelector(s);return [s,e?parseFloat(getComputedStyle(e).fontSize):null]})),
      desktop:matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)').matches};
   });
   assert.ok(geometry.desktop,JSON.stringify(geometry));
   assert.ok(close(geometry.sheet.left,0)&&close(geometry.sheet.right,geometry.hero.left),'Control/image boundary '+JSON.stringify(geometry));
   assert.ok(close(geometry.hero.right,width)&&geometry.hero.width>geometry.sheet.width,'Remembrance must dominate desktop '+JSON.stringify(geometry));
   assert.ok(geometry.nav.left>=0&&geometry.nav.right<=geometry.sheet.right+3,'Navigation stays on left '+JSON.stringify(geometry));
   assert.ok(geometry.language&&geometry.logo&&geometry.language.left>=geometry.logo.right&&geometry.language.right<=geometry.sheet.right-8,'Language belongs to controls and must not overlap logo '+JSON.stringify(geometry));
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
  await page.waitForFunction(()=>[...document.querySelectorAll('#photoStage img.example-photo,#photoStage img.talera-story-synced-sharp')].some(e=>e.complete&&e.naturalWidth>0),null,{timeout:15000});
  const presentations=[];
  for(const [width,height] of widths){
   await page.setViewportSize({width,height});
   const expected=Math.min(width*.62,960);
   await page.waitForFunction(expected=>Math.abs(document.getElementById('surface')?.getBoundingClientRect().width-expected)<3,expected,{timeout:7000});
   const g=await page.evaluate(()=>{
    const rect=(selector)=>{const r=document.querySelector(selector)?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null};
    return {surface:rect('#surface'),canvas:rect('#timelineCanvas'),date:rect('#focusText'),
      dots:rect('.talera-photo-dots'),stage:rect('#photoStage'),
      photos:[...document.querySelectorAll('#photoStage img.example-photo,#photoStage img.talera-story-synced-sharp')].map(e=>({fit:getComputedStyle(e).objectFit,natural:[e.naturalWidth,e.naturalHeight],rect:e.getBoundingClientRect().toJSON()})),
      id:window.__taleraTimelineRuntime?.currentMemory?.()?.storyId,
      controlColors:Object.fromEntries(['#talera-flow-home','#talera-v5-editor-pencil'].map(s=>{const e=document.querySelector(s);return [s,e?{background:getComputedStyle(e,'::after').backgroundColor,hitBackground:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,paintWidth:getComputedStyle(e,'::after').width,hitWidth:getComputedStyle(e).width}:null]}))};
   });
   assert.ok(close(g.surface.width,expected)&&close((g.surface.left+g.surface.right)/2,width/2),'Centered shorter ruler '+JSON.stringify(g));
   assert.ok(close(g.canvas.width,g.surface.width),'Canvas must match native hit area');
   assert.ok(g.dots.height>0&&g.canvas.top<g.date.top&&g.date.top<g.dots.top,'Timeline, date, orange dots order preserved');
   assert.ok(close(g.stage.width,width)&&close(g.stage.height,height),'Full photo stage');
   assert.equal(g.id,id,'Resizing must not change selection');
   assert.ok(g.photos.some(p=>p.natural[0]>0&&p.natural[1]>0),'At least one decoded original photo');
   assert.ok(g.photos.every(p=>p.fit==='contain'),'All native photo layers must keep their full image '+JSON.stringify(g.photos));
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
  // Verify the real original edit route with the same synthetic memory.
  // Opening/closing its existing date, writer and recorder does not record,
  // overwrite, reorder or publish any story.
  await page.setViewportSize({width:1366,height:768});
  await page.goto(origin+'/tell?edit='+encodeURIComponent(id),{waitUntil:'domcontentloaded'});
  await page.locator('#app #main .work.talera-r16-editor #title').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelectorAll('.talera-work-tiles .tile').length>=3);
  const editor=await page.evaluate(()=>{
   const r=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
   return {app:r('#app'),media:r('.talera-work-tiles'),tags:r('.talera-tags-v20'),toolbar:r('.talera-r16-toolbar'),title:r('#title'),
    width:innerWidth,layout:getComputedStyle(document.querySelector('.work.talera-r16-editor')).display};
  });
  assert.ok(editor.app.width>1100&&editor.layout==='grid'&&editor.media.right<editor.tags.left&&editor.title.width>1000,
    'Desktop two-column original editor '+JSON.stringify(editor));
  assert.ok(editor.toolbar.width<=630&&editor.toolbar.right<=editor.app.right,'Compact original editor actions '+JSON.stringify(editor));
  await page.locator('#dateToggle').click();
  const date=page.locator('#v30DateBox');
  await date.waitFor({state:'visible'});
  const dateBox=await date.boundingBox();assert.ok(dateBox&&close(dateBox.x+dateBox.width/2,683)&&dateBox.width<=460,
   'Date modal centered and bounded');
  assert.equal(await page.locator('#v30DateSave').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(7, 26, 61)','Existing date confirmation uses primary TALERA navy');
  await page.locator('#v30DateCancel').click();
  await date.waitFor({state:'hidden'});
  await page.locator('#write').click();
  const writer=page.locator('#taleraWriterOverlay');
  await writer.waitFor({state:'visible'});
  const writerGeometry=await page.evaluate(()=>{
   const r=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
   return {photos:r('#taleraWriterPhotos'),text:r('#taleraWriterText'),done:r('#taleraWriterDone'),header:r('.talera-writer-top'),width:innerWidth};
  });
  assert.ok(writerGeometry.photos.right<writerGeometry.text.left&&writerGeometry.text.width>500&&writerGeometry.text.height>=360,
   'Desktop original writer photos beside text '+JSON.stringify(writerGeometry));
  assert.ok(writerGeometry.done.left>=0&&writerGeometry.done.right<=writerGeometry.width+1,'Writer Done stays in viewport');
  await page.locator('#taleraWriterDone').click();
  await writer.waitFor({state:'hidden'});
  await page.locator('#speak').click();
  const recorder=page.locator('#taleraV61RecControls');
  await recorder.waitFor({state:'visible'});
  const rec=await page.evaluate(()=>{
   const r=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
   return {controls:r('#taleraV61RecControls'),frame:r('#frame'),close:r('#taleraV61RecClose'),width:innerWidth};
  });
  assert.ok(rec.controls.width<=700&&close(rec.controls.left+rec.controls.width/2,rec.width/2)&&rec.frame.bottom<=rec.controls.top,
   'Original recorder shows image above compact controls '+JSON.stringify(rec));
  await page.locator('#taleraV61RecClose').click();
  await recorder.waitFor({state:'hidden'});
  console.log('TALERA_DESKTOP_EDITOR_WRITER_RECORDER_DATE_PASS',JSON.stringify({editor,writerGeometry,rec}));

  // Test the SAME saved synthetic memory and actual editor in narrow viewports.
  // No new test app, route, account, media ID, store, or save handler.
  const narrow=[];
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
   await page.setViewportSize({width,height});
   const tags=page.locator('.talera-tags-toggle'),loc=page.locator('.talera-location-toggle');
   const publish=page.locator('.talera-r16-toolbar #publish');
   const fixedBefore=await publish.boundingBox();
   await tags.scrollIntoViewIfNeeded();
   await tags.click();
   assert.equal(await tags.getAttribute('aria-expanded'),'true');
   await loc.scrollIntoViewIfNeeded();
   assert.equal(await loc.isVisible(),true,'Location must remain available when tags are expanded');
   await loc.click();
   assert.equal(await loc.getAttribute('aria-expanded'),'true');
   assert.equal(await tags.getAttribute('aria-expanded'),'true','Independent existing expansion states are retained');
   const tile=page.locator('.talera-location-edit').last();
   await tile.scrollIntoViewIfNeeded();
   const visible=await tile.evaluate(e=>{
    const r=e.getBoundingClientRect(),main=e.closest('#main').getBoundingClientRect();
    const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return {inside:r.top>=main.top-1&&r.bottom<=main.bottom+1,hit:hit===e||e.contains(hit),overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.ok(visible.inside&&visible.hit&&!visible.overflow,'Reachable expanded location controls at '+width+'px '+JSON.stringify(visible));
   await publish.scrollIntoViewIfNeeded();
   const pub=await publish.evaluate(e=>{
    const r=e.getBoundingClientRect(),s=getComputedStyle(e),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return {rgb:s.backgroundColor,hit:hit===e||e.contains(hit),disabled:e.disabled};
   });
   assert.ok(!pub.disabled&&pub.rgb==='rgb(7, 26, 61)'&&pub.hit,'Existing Save remains the reachable primary action '+JSON.stringify(pub));
   const fixedAfter=await publish.boundingBox();
   assert.ok(fixedBefore&&fixedAfter&&Math.abs(fixedBefore.y-fixedAfter.y)<2,'Both expanded panels must leave Save at the same fixed position');
   // Close the original panels, then enter the original writer.
   await loc.click();await tags.click();
   await page.locator('#write').click();
   await writer.waitFor({state:'visible'});
   const done=page.locator('#taleraWriterDone');
   assert.equal(await done.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(7, 26, 61)');
   await page.locator('#taleraWriterText').scrollIntoViewIfNeeded();
   await done.click();
   await writer.waitFor({state:'hidden'});
   await page.locator('#speak').click();
   await recorder.waitFor({state:'visible'});
   const bounds=await page.evaluate(()=>{
    const r=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
    return {card:r('#taleraV61RecControls'),prev:r('#frame > #prev'),next:r('#frame > #next'),pos:r('#frame > #pos'),
     picture:r('#frame > img'),primary:getComputedStyle(document.getElementById('taleraV61RecStart')).backgroundColor};
   });
   assert.equal(bounds.primary,'rgb(7, 26, 61)');
   assert.ok(bounds.prev&&bounds.next&&bounds.pos&&bounds.picture,'Existing photo navigation and image still present');
   assert.ok(bounds.card.bottom<=Math.min(bounds.prev.top,bounds.next.top,bounds.pos.top)+1&&bounds.picture.bottom<=bounds.card.top+1,
     'Separate photo, recorder, and navigation regions '+width+'px '+JSON.stringify(bounds));
   assert.ok(bounds.prev.width>=44&&bounds.next.width>=44&&bounds.next.bottom<=height+1,'Original tap targets fit viewport');
   await page.locator('#frame > #next').click(); // same original photo navigation
   await page.locator('#taleraV61RecClose').click();await recorder.waitFor({state:'hidden'});
   narrow.push({width,height,locationReachable:visible.hit,saveReachable:pub.hit});
  }
  console.log('TALERA_NARROW_EDITOR_ACTION_HIERARCHY_GEOMETRY_PASS',JSON.stringify(narrow));

  assert.deepEqual(errors,[],'Desktop runtime errors');
  console.log('TALERA_DESKTOP_SAME_APP_LAYOUT_PASS',JSON.stringify({sizes:sizes.map(s=>[s.width,s.height,s.sheet.width]),presentations:presentations.map(g=>g.surface.width),sameMemoryId:true,originalBack:true}));
 }finally{await context.close()}
 // Explicit narrow touch baseline alongside the existing full mobile tests.
 const mobile=await browser.newContext({...mobileDevice,serviceWorkers:'block',extraHTTPHeaders:{'x-talera-f5-key':gate}});
 try{
  const page=await mobile.newPage();
  await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.getElementById('sheet'));
  await page.locator('#talera-desktop-present-link').waitFor({state:'hidden'});
  const home=await page.evaluate(()=>({width:innerWidth,sheet:document.getElementById('sheet').getBoundingClientRect().width,
   hero:document.querySelector('.hero').getBoundingClientRect().width,
   desktop:matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)').matches}));
  assert.ok(!home.desktop&&close(home.sheet,home.width)&&close(home.hero,home.width),'Original mobile Home geometry '+JSON.stringify(home));
  await page.goto(origin+'/present',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.getElementById('surface'));
  const presentation=await page.evaluate(()=>({width:innerWidth,surface:document.getElementById('surface').getBoundingClientRect().width,photoFit:getComputedStyle(document.getElementById('memoryPhotoA')).objectFit}));
  assert.ok(close(presentation.surface,presentation.width),'Original mobile ruler still full width');
  assert.equal(presentation.photoFit,'cover','Mobile presentation keeps the original full-bleed photo rule');
  console.log('TALERA_DESKTOP_MOBILE_LAYOUT_UNCHANGED_PASS');
 }finally{await mobile.close()}
}


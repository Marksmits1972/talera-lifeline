// The existing TALERA Free Home, with ephemeral data on one local Worker.
// No separate app, no production account and no shared customer media.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium,devices} from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const generated=path.join(here,'generated');
mkdirSync(generated,{recursive:true});
const origin='http://127.0.0.1:8838',gate='1'.repeat(64);
let worker=null,browser=null,log='';
async function stop(){
 if(browser)await browser.close().catch(()=>{});
 if(worker&&!worker.killed)worker.kill('SIGTERM');
}
async function start(){
 worker=spawn(path.resolve('node_modules/.bin/wrangler'),[
  'dev','--local','--ip','127.0.0.1','--port','8838',
  '--config',path.join(here,'wrangler.jsonc'),
  '--persist-to',path.join(generated,'life-home-browser-local'),
  '--var','STAGING_F5_KEY:'+gate,
  '--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
  '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
  '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_F5_LIFE_GALLERY_LOCAL_TEST_KEY',
  '--var','DEMO_IDENTITY_KEY:SYNTHETIC_F5_LIFE_GALLERY_LOCAL_SOCIAL_KEY',
  '--log-level','error'
 ],{env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore','pipe','pipe']});
 for(const stream of [worker.stdout,worker.stderr])
  stream.on('data',x=>log=(log+x.toString()).slice(-5000));
 for(let i=0;i<140;i++){
  if(worker.exitCode!==null)throw Error('Free Worker stopped: '+log);
  try{if((await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(800)})).status===200)return}catch{}
  await new Promise(r=>setTimeout(r,280));
 }
 throw Error('Original Free Worker unavailable: '+log);
}
try{
 await start();
 const suffix=Date.now().toString(36);
 const signed=await fetch(origin+'/api/register',{method:'POST',headers:{
  origin,'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.87',
  'content-type':'application/json'
 },body:JSON.stringify({
  email:'gallery-'+suffix+'@example.invalid',username:'gallery'+suffix.slice(-8),
  displayName:'Synthetic gallery browser only',
  password:'Synthetic_Free_Gallery_Test_2026',birthDate:'1974-04-02'
 })});
 assert.equal(signed.status,200,'Local login failed: '+(await signed.text()).slice(0,300));
 const sid=/talera_sid=([a-f0-9]{64})/.exec(signed.headers.get('set-cookie')||'')?.[1];
 assert.ok(sid,'Local session cookie missing');
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({
  ...devices['iPhone 13'],extraHTTPHeaders:{'x-talera-f5-key':gate}
 });
 await ctx.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',
  path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.__taleraHomeGallery?.version==='F5-local-life-gallery',
  null,{timeout:15000});
 await page.waitForFunction(()=>!!document.querySelector('#talera-life-gallery-rows .talera-life-empty'),
  null,{timeout:15000});
 assert.equal(await page.locator('#v18-eras-grid').count(),0,
  'Old year/example tile gallery must be replaced');
 assert.equal(await page.locator('#talera-life-gallery-rows .talera-life-example-card').count(),3,
  'First-open shows one restrained swipe explanation');
 assert.equal(await page.locator('#talera-life-gallery-rows img').count(),0,
  'No fictitious photos may be presented as personal content');
 assert.equal(await page.locator('#talera-life-gallery-rows a').count(),0,
  'A demonstration may not link to invented memories');
 assert.equal(await page.locator('#v17-year-slider').count(),1);
 assert.equal(await page.locator('#navMine').count(),1);
 await page.waitForFunction(()=>!!window.TaleraMemories?.save,null,{timeout:12000});
 const saved=await page.evaluate(async()=>{
  const store=window.TaleraMemories,ids=[];
  const years=[1980,1983,1987,1990,1994,1998,2001,2007,2011,2016,2020,2024];
  for(let i=0;i<years.length;i++){
   const canvas=document.createElement('canvas');
   canvas.width=120;canvas.height=120;
   const c=canvas.getContext('2d');
   c.fillStyle='hsl('+((i*31)%360)+' 70% 50%)';
   c.fillRect(0,0,120,120);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const photo=new File([blob],'real-photo-'+i+'.png',{type:'image/png'});
   const m=await store.save({
    title:'Eigen moment '+years[i],date:years[i]+'-07-01',
    time:'12:00:00',text:'Ephemeral test memory'
   },[photo]);
   await store.setTags(m.id,i%3===0?['Familie','Vrienden']:['Familie']);
   ids.push(m.id);
  }
  return ids;
 });
 assert.equal(saved.length,12);
 const reopened=await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(reopened.status(),200);
 await page.waitForFunction(()=>document.getElementById('v18-phases')?.dataset.photoCount==='12',
  null,{timeout:20000});
 assert.equal(await page.locator('#talera-life-gallery-rows .talera-life-example-card').count(),0);
 assert.equal(await page.locator('#talera-life-gallery-rows .talera-life-collection-head').count(),2);
 const rowTitles=await page.locator('.talera-life-row-title').allTextContents();
 assert.ok(rowTitles.some(x=>x==='Familie'||x==='Family')&&
  rowTitles.some(x=>x==='Vrienden'||x==='Friends'),
  'Only actually used topics may be visible, localized to the iPhone language: '+JSON.stringify(rowTitles));
 assert.ok(rowTitles.some(x=>x.includes('1980'))&&rowTitles.some(x=>x.includes('2020')),
  'Decade rows must span the years of these actual memories');
 const family=page.locator('.talera-life-row').filter({
  has:page.getByRole('heading',{name:/^(Familie|Family)$/})
 });
 assert.equal(await family.locator('a.talera-life-card').count(),10,
  'Each horizontal topic row has at most ten actual photos');
 const compact=await family.locator('.talera-life-track').evaluate(track=>{
  const card=track.querySelector('.talera-life-card');
  const box=card.getBoundingClientRect(),styles=getComputedStyle(track);
  return {width:box.width,height:box.height,available:track.clientWidth,
   gap:parseFloat(styles.gap),rowMargin:parseFloat(
    getComputedStyle(track.closest('.talera-life-row')).marginBottom)};
 });
 assert.ok(compact.width>=90&&compact.width<=112,
  'Near-square Apple-style photo cards should be about 100 CSS px: '+JSON.stringify(compact));
 assert.ok(Math.abs(compact.height-compact.width)<=2,
  'Photographs should be square rather than wide landscape tiles: '+JSON.stringify(compact));
 assert.ok(compact.available>=3*compact.width+2*compact.gap,
  'At least three real photographs must fit next to one another on an iPhone: '+
   JSON.stringify(compact));
 assert.ok(compact.rowMargin>=20&&compact.rowMargin<=25,
  'Smaller cards should have more white breathing room between topic rows');
 assert.equal(await page.locator('#talera-life-gallery-rows .talera-life-photo-placeholder').count(),0,
  'Generated white hatch/raster must not overlay ANY real photograph');
 const years=await family.locator('a.talera-life-card').evaluateAll(links=>links.map(a=>a._taleraPhoto?.year));
 assert.ok(new Set(years).size>=7,
  'The ten selected photos should be spread across the time period');
 assert.equal(await page.locator('.talera-life-card-caption').count(),0,
  'Each photo itself is the card; no repeated topic and year labels');
 assert.equal(await page.locator('#v18-phases .v18-eras-title').count(),0,
  'Remove the duplicate Blader door je jaren header');
 assert.equal(await page.locator('.talera-life-collection-head small').count(),0,
  'Remove the redundant descriptions next to photo section headings');
 const links=await family.locator('a.talera-life-card').evaluateAll(links=>
  links.map(a=>a.getAttribute('href')));
 assert.ok(links.every(h=>/^\/present\?memory=local-/.test(h)),
  'Each real media card links to its existing original story');
 await family.locator('a.talera-life-card').first().scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>[...document.querySelectorAll(
  '#talera-life-gallery-rows a.talera-life-card img')].some(
  image=>image.currentSrc.startsWith('blob:')&&image.complete&&image.naturalWidth>0),
  null,{timeout:14000});
 assert.equal(await page.locator('#talera-life-gallery-rows .talera-life-photo-placeholder').count(),0,
  'Even loaded original photos must never have a generated raster on top');
 const firstLinks=await family.locator('a.talera-life-card').evaluateAll(a=>a.map(x=>x.href));
 await page.evaluate(()=>window.__taleraTopics.refresh());
 await page.waitForTimeout(350);
 const repeatLinks=await family.locator('a.talera-life-card').evaluateAll(a=>a.map(x=>x.href));
 assert.deepEqual(repeatLinks,firstLinks,'Do not reshuffle within one Home opening');
 const track=family.locator('.talera-life-track');
 const scroll=await track.evaluate(e=>{
  const before=e.scrollLeft;
  e.scrollLeft=e.scrollWidth;
  return {before,after:e.scrollLeft,range:e.scrollWidth-e.clientWidth};
 });
 assert.ok(scroll.range>50&&scroll.after>scroll.before,
  'Photo strip must really scroll horizontally on a mobile display');

 // Exact original photo ID and same-card return, not the story's first image.
 const multi=await page.evaluate(async()=>{
  const files=[];
  for(let i=0;i<12;i++){
   const canvas=document.createElement('canvas');
   canvas.width=96;canvas.height=96;
   const pen=canvas.getContext('2d');
   pen.fillStyle='hsl('+((i*27)%360)+' 70% 50%)';
   pen.fillRect(0,0,96,96);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   files.push(new File([blob],'photo-'+i+'.png',{type:'image/png'}));
  }
  const row=await window.TaleraMemories.save({
   title:'Foto-ID rechtstreekse route',date:'2018-09-03',
   time:'10:30:00',text:'Ephemeral exact original photo order'
  },files);
  await window.TaleraMemories.setTags(row.id,['FotoRoute']);
  return row.id;
 });
 await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.getElementById('v18-phases')?.dataset.photoCount==='24',
  null,{timeout:20000});
 const route=page.locator('.talera-life-row').filter({
  has:page.getByRole('heading',{name:'FotoRoute'})
 });
 assert.equal(await route.locator('a.talera-life-card').count(),10,
  'Ten real media IDs from the same original memory');
 const chosen=route.locator('a.talera-life-card').nth(7);
 await chosen.scrollIntoViewIfNeeded();
 const target=await chosen.evaluate(a=>{
  const selected=a._taleraPhoto;
  const frames=selected.row.items.filter(x=>x.kind==='photo'||x.kind==='video');
  return {key:selected.item.key,story:String(selected.row.id),
   index:frames.findIndex(x=>x.key===selected.item.key)};
 });
 assert.equal(target.story,multi);
 assert.ok(target.index>0,'Selected item must not be the first memory image');
 const scrollState=()=>page.evaluate(()=>{
  const row=[...document.querySelectorAll('.talera-life-row')].find(e=>
   e.querySelector('h4')?.textContent==='FotoRoute');
  return {y:window.scrollY,left:row?.querySelector('.talera-life-track')?.scrollLeft};
 });
 const before=await scrollState();
 await chosen.click();
 await page.waitForURL(/\/present\?memory=local-/,{timeout:30000});
 await page.waitForFunction(([id,index])=>{
  const m=window.__taleraTimelineRuntime?.currentMemory?.();
  return m?.storyId===id&&m._photoIndex===index&&!m._photoLoading&&
    !document.documentElement.classList.contains('talera-direct-memory-entering');
 },[target.story,target.index],{timeout:25000});
 await page.waitForFunction(index=>{
   const m=window.__taleraTimelineRuntime?.currentMemory?.();
   const sharp=document.querySelector('#photoStage .talera-story-synced-sharp');
   return m?._photoIndex===index&&sharp&&sharp.complete&&
     sharp.naturalWidth>0&&sharp.currentSrc===m.photos?.[index];
 },target.index,{timeout:15000});
 assert.equal(await page.locator('#talera-flow-home').count(),1,
  'The existing presentation back arrow remains present');
 await page.locator('#talera-flow-home').click({timeout:12000});
 await page.waitForURL(/\/mijn-leven(?:$|\?)/,{timeout:20000});
 await page.waitForFunction(()=>document.getElementById('v18-phases')?.dataset.photoCount==='24'&&
  sessionStorage.getItem('talera-f5-gallery-photo-return-v1')===null,
  null,{timeout:20000});
 const returned=await route.locator('a.talera-life-card').nth(7).evaluate(a=>
  ({key:a._taleraPhoto?.item.key,story:String(a._taleraPhoto?.row.id)}));
 assert.deepEqual(returned,{key:target.key,story:target.story},
  'Back must restore exact media ID, exact card and its neighbors');
 const after=await scrollState();
 assert.ok(Math.abs(before.left-after.left)<=5&&Math.abs(before.y-after.y)<=18,
  'Back must preserve scroll positions: '+JSON.stringify({before,after}));
 console.log('TALERA_GALLERY_EXACT_MEDIA_ID_AND_SAME_CARD_BACK_OK');
 // Story-to-story swipe must cancel special gallery return.
 await route.locator('a.talera-life-card').nth(7).click();
 await page.waitForURL(url=>url.pathname==='/present'&&
   url.searchParams.get('memory')?.startsWith('local-'),{timeout:15000});
 await page.waitForFunction(id=>
   window.__taleraTimelineRuntime?.currentMemory?.()?.storyId===id&&
   !document.documentElement.classList.contains('talera-direct-memory-entering'),
   target.story,{timeout:25000});
 const bounds=await page.locator('#memoryStoryScroll').boundingBox();
 assert.ok(bounds?.width>100&&bounds?.height>100);
 await page.mouse.move(bounds.x+bounds.width*.80,bounds.y+bounds.height*.50);
 await page.mouse.down();
 await page.mouse.move(bounds.x+bounds.width*.18,bounds.y+bounds.height*.50,{steps:14});
 await page.mouse.up();
 await page.waitForFunction(id=>
   !!window.__taleraTimelineRuntime?.currentMemory?.()&&
   window.__taleraTimelineRuntime.currentMemory().storyId!==id,
   target.story,{timeout:15000});
 await page.waitForFunction(()=>sessionStorage.getItem(
   'talera-f5-gallery-photo-return-v1')===null,null,{timeout:5000});
 await page.locator('#talera-flow-home').click({timeout:12000});
 await page.waitForURL(url=>url.pathname==='/mijn-leven',{timeout:15000});
 assert.equal(await page.evaluate(()=>sessionStorage.getItem(
   'talera-f5-gallery-photo-return-v1')),null);
 console.log('TALERA_GALLERY_SWIPE_TO_OTHER_MEMORY_BACK_NORMAL_HOME_OK');
 assert.deepEqual(errors,[],'Original Home and new gallery have no browser errors');
 console.log('TALERA_FREE_LIFE_GALLERY_FIRST_OPEN_EXAMPLE_NO_FAKE_PHOTOS_OK');
 console.log('TALERA_FREE_LIFE_GALLERY_LOCAL_YEARS_AND_TAGS_TEN_SPREAD_OVER_LIFE_OK');
 console.log('TALERA_FREE_LIFE_GALLERY_BLOB_PHOTOS_SCROLL_AND_ORIGINAL_MEMORY_LINKS_OK');
 console.log('TALERA_FREE_LIFE_GALLERY_SQUARE_THREE_ACROSS_NO_RASTER_OK',JSON.stringify(compact));
 console.log('TALERA_FREE_LIFE_GALLERY_ORIGINAL_TIMELINE_NAV_UNTOUCHED');
}finally{
 await stop();
}

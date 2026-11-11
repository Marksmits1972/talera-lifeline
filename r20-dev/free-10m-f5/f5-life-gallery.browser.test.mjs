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
 assert.ok(rowTitles.includes('Familie')&&rowTitles.includes('Vrienden'),
  'Only actually used personal tags create topic rows');
 assert.ok(rowTitles.some(x=>x.includes('1980'))&&rowTitles.some(x=>x.includes('2020')),
  'Decade rows must span the years of these actual memories');
 const family=page.locator('.talera-life-row').filter({
  has:page.getByRole('heading',{name:'Familie',exact:true})
 });
 assert.equal(await family.locator('a.talera-life-card').count(),10,
  'Each horizontal topic row has at most ten actual photos');
 const years=await family.locator('.talera-life-card-caption small').allTextContents();
 assert.ok(new Set(years).size>=7,
  'The ten selected photos should be spread across the time period');
 const links=await family.locator('a.talera-life-card').evaluateAll(links=>
  links.map(a=>a.getAttribute('href')));
 assert.ok(links.every(h=>/^\/present\?memory=local-/.test(h)),
  'Each real media card links to its existing original story');
 await family.locator('a.talera-life-card').first().scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>[...document.querySelectorAll(
  '#talera-life-gallery-rows a.talera-life-card img')].some(
  image=>image.currentSrc.startsWith('blob:')&&image.complete&&image.naturalWidth>0),
  null,{timeout:14000});
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
 assert.deepEqual(errors,[],'Original Home and new gallery have no browser errors');
 console.log('TALERA_FREE_LIFE_GALLERY_FIRST_OPEN_EXAMPLE_NO_FAKE_PHOTOS_OK');
 console.log('TALERA_FREE_LIFE_GALLERY_LOCAL_YEARS_AND_TAGS_TEN_SPREAD_OVER_LIFE_OK');
 console.log('TALERA_FREE_LIFE_GALLERY_BLOB_PHOTOS_SCROLL_AND_ORIGINAL_MEMORY_LINKS_OK');
 console.log('TALERA_FREE_LIFE_GALLERY_ORIGINAL_TIMELINE_NAV_UNTOUCHED');
}finally{
 await stop();
}

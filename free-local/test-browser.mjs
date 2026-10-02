import assert from 'node:assert/strict';
const {chromium}=await import(process.env.FREE_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.FREE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const errors=[],requests=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(request.url().startsWith('http'))requests.push({url:request.url(),method:request.method(),body:request.postData()});});
const origin=process.env.FREE_TEST_ORIGIN||'http://127.0.0.1:4173';
try{
  await page.goto(origin+'/');
  await page.locator('#freeEmpty:not([hidden])').waitFor();
  await page.locator('#freeEmpty a').click();
  await page.waitForFunction(()=>Boolean(window.__taleraFreeApi));
  // Generate a real 3000x2000 PNG in the test browser; exercise canvas compression.
  const bytes=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=3000;c.height=2000;
    const ctx=c.getContext('2d');ctx.fillStyle='#5B8FB9';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#E7A98B';ctx.fillRect(0,1000,1500,1000);
    return Array.from(new Uint8Array(await (await new Promise(resolve=>c.toBlob(resolve,'image/png'))).arrayBuffer()));
  });
  await page.locator('#photoInput').setInputFiles({name:'test-original.png',mimeType:'image/png',buffer:Buffer.from(bytes)});
  await page.waitForFunction(()=>document.getElementById('screen').classList.contains('has-photo'));
  await page.waitForFunction(()=>!window.__taleraStoryLabMedia.isUploading());
  await page.locator('#title').fill('Onze lokale proef');
  await page.locator('#title').dispatchEvent('change');
  await page.locator('#dateInput').fill('2021-04-10');
  await page.locator('#dateInput').dispatchEvent('change');
  await page.locator('#sheetPreview').click();
  await page.locator('#storyText').fill('Dit verhaal blijft op mijn telefoon.');
  await page.locator('#storyText').dispatchEvent('change');
  await page.locator('#sheetClose').click();
  await page.waitForFunction(()=>document.getElementById('timelinePublish').classList.contains('ready'));
  const saved=await page.evaluate(async()=>{
    const r=await window.__taleraFreeApi('/api/storylab-clean/state');const s=await r.json();const m=await window.__taleraFreeStorage.media(s.photos[0].id);
    return {story:s,width:m.width,height:m.height,bytes:m.blob.size,thumbnailBytes:m.thumbnail.size,sourceBytes:m.sourceBytes};
  });
  assert.ok(saved.width<=1280&&saved.height<=1280);assert.ok(saved.bytes<=128*1024&&saved.thumbnailBytes<=12*1024);assert.ok(saved.bytes>0&&saved.thumbnailBytes>0);assert.equal(saved.story.date,'2021-04-10');
  await page.locator('#timelinePublish').click();
  await page.waitForURL(origin+'/#story=*');
  await page.waitForFunction(()=>Boolean(window.__taleraTimelineRuntime));
  assert.equal(await page.locator('#memoryStory').textContent(),'Onze lokale proef');
  assert.equal(await page.locator('#memoryStoryMore').textContent(),'Dit verhaal blijft op mijn telefoon.');
  await page.reload();await page.waitForFunction(()=>Boolean(window.__taleraTimelineRuntime));
  assert.equal(await page.locator('#memoryStory').textContent(),'Onze lokale proef');
  await page.locator('#freeEdit').click();await page.waitForFunction(()=>Boolean(window.__taleraStoryLabMedia));
  await page.waitForFunction(()=>document.getElementById('storyText').value==='Dit verhaal blijft op mijn telefoon.');
  assert.equal(await page.locator('#dateInput').inputValue(),'2021-04-10');
  // A failed metadata transaction must preserve the previously saved story.
  const integrity=await page.evaluate(async()=>{
    const storage=window.__taleraFreeStorage;const state=await (await window.__taleraFreeApi('/api/storylab-clean/state')).json();
    let rejected=false;try{await storage.save({...state,storyText:'Wrong',photos:[{id:'missing-bytes'}]});}catch{rejected=true;}
    return {rejected,text:(await storage.story(state.id)).storyText};
  });
  assert.ok(integrity.rejected);assert.equal(integrity.text,'Dit verhaal blijft op mijn telefoon.');
  assert.deepEqual(errors,[]);
  assert.ok(requests.every(r=>r.method==='GET'&&!r.body&&r.url.startsWith(origin)&&!r.url.includes('/api/')&&!r.url.includes(saved.story.id)));
  await page.screenshot({path:process.env.FREE_SCREENSHOT_PATH||'.test-tmp/free-tell.png'});
  console.log(JSON.stringify({status:'passed',checks:['empty state','photo compression','IndexedDB readback','date and text','publish to selected timeline','reload','edit reopen','failed transaction preserves earlier story','no personal network requests'],measurement:saved,networkRequests:requests.length,browserErrors:errors},null,2));
}finally{await browser.close();}

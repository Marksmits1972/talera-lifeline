// Test the EXISTING TALERA Free /present route with disposable local-only media.
// No test Worker, second app, production account, changes to /tell or personal data.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium,webkit,devices} from 'playwright';

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
async function start(geoEnabled=false){
  worker=spawn(path.resolve('node_modules/.bin/wrangler'),[
    'dev','--local','--ip','127.0.0.1','--port','8837',
    '--config',path.join(here,'wrangler.jsonc'),
    '--persist-to',path.join(generated,'worker-do'),
    '--var','STAGING_F5_KEY:'+gate,
    '--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
    '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
    '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_F5_PRESENTATION_ONLY_LOCAL_TEST_KEY',
    '--var','DEMO_IDENTITY_KEY:SYNTHETIC_F5_PRESENTATION_ONLY_LOCAL_SOCIAL_KEY',
    ...(geoEnabled?['--var','GEONAMES_USERNAME:talera_synthetic_test']:[]),
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
backupRegression: try{
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
  const webkitPickerOnly=process.env.TALERA_WEBKIT_PICKER_ONLY==='1';
  browser=webkitPickerOnly?await webkit.launch({headless:true}):await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const ctx=await browser.newContext({
    ...devices['iPhone 13'],acceptDownloads:true,
    extraHTTPHeaders:{'x-talera-f5-key':gate}
  });
  await ctx.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',
    path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Actual picker import on the real authenticated Worker, with a private
  // synthetic browser context containing previous memories. No live data.
  const photoPath=path.join(generated,'picker-photo.jpg');
  const videoPath=path.join(generated,'picker-video.mov');
  execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=red:s=96x96:d=1',
    '-frames:v','1','-threads','1',photoPath],{timeout:20000,stdio:'ignore'});
  execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=blue:s=96x96:d=1',
    '-c:v','libx264','-pix_fmt','yuv420p','-threads','1','-movflags','+faststart',videoPath],
    {timeout:20000,stdio:'ignore'});
  for(const fixture of [{file:photoPath,broken:false},{file:videoPath,broken:false},{file:photoPath,broken:true},{file:videoPath,broken:true},{file:photoPath,broken:true,deleteTest:true}]){
    const {file,broken}=fixture;
    const pickerCtx=await browser.newContext({...devices['iPhone 13'],
      extraHTTPHeaders:{'x-talera-f5-key':gate}});
    try{
      await pickerCtx.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',
        path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
      // Test-only transaction diagnostics on the real application database.
      // Capture request error names and operation order, never media bytes.
      await pickerCtx.addInitScript(()=>{
        const trace=[];window.__taleraIdbTestTrace=trace;
        const note=(entry)=>{trace.push(entry);if(trace.length>200)trace.shift()};
        const errorInfo=e=>({name:e?.name||'',message:e?.message||'',reason:e?.reason||''});
        const ids=new WeakMap();let sequence=0;
        const originalTransaction=IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction=function(...args){
          const tx=originalTransaction.apply(this,args),id=++sequence;
          ids.set(tx,id);note({op:'transaction',id,stores:args[0],mode:args[1]});
          tx.addEventListener('complete',()=>note({op:'complete',id}));
          tx.addEventListener('abort',()=>note({op:'abort',id,error:errorInfo(tx.error)}));
          tx.addEventListener('error',e=>note({op:'transaction-error',id,error:errorInfo(e.target?.error)}));
          return tx;
        };
        const originalAbort=IDBTransaction.prototype.abort;
        IDBTransaction.prototype.abort=function(...args){
          note({op:'explicit-abort',id:ids.get(this),stack:new Error().stack?.slice(0,600)});
          return originalAbort.apply(this,args);
        };
        for(const op of ['get','getAll','getKey','add','put','delete']){
          const original=IDBObjectStore.prototype[op];
          IDBObjectStore.prototype[op]=function(...args){
            const id=ids.get(this.transaction),key=typeof args[0]==='string'?args[0]:args[0]?.key||args[0]?.id;
            const entry={op,id,store:this.name,key};
            let q;
            try{q=original.apply(this,args)}catch(e){note({...entry,phase:'throw',error:errorInfo(e)});throw e}
            note({...entry,phase:'request'});
            q.addEventListener('error',()=>note({...entry,phase:'error',error:errorInfo(q.error)}));
            if(op==='get')q.addEventListener('success',()=>note({...entry,phase:'success',found:q.result!==undefined,kind:Object.prototype.toString.call(q.result),size:q.result?.blob?.size,keys:q.result?Object.keys(q.result):[]}));
            return q;
          };
        }
      });
      const pickerPage=await pickerCtx.newPage(),pickerErrors=[];
      pickerPage.on('pageerror',e=>pickerErrors.push(e.message));
      pickerPage.on('console',m=>{if(m.type()==='warning'&&m.text().includes('TALERA_'))console.log('TALERA_PICKER_BROWSER_WARNING',m.text())});
      await pickerPage.goto(origin+'/tell',{waitUntil:'domcontentloaded'});
      await pickerPage.waitForFunction(()=>typeof window.TaleraMemories?.draftWriteRows==='function'&&!!document.getElementById('photoInput'),null,{timeout:15000});
      const seed=await pickerPage.evaluate(async()=>{
        const mem=window.TaleraMemories;
        const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
        const c=canvas.getContext('2d');c.fillStyle='#00aa33';c.fillRect(0,0,64,64);
        const png=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
        const photo=new File([png],'previous.png',{type:'image/png',lastModified:1700000000123});
        const second=new File([png],'previous-other.png',{type:'image/png',lastModified:1700000000456});
        let firstStory;
        try{firstStory=await mem.save({title:'Previous',date:'2026-11-23',text:'synthetic'},[photo,second])}
        catch(error){throw Error('Initial shared batch save: '+error.message+' '+(error.reason||'')+' TRACE '+JSON.stringify(window.__taleraIdbTestTrace.slice(-65)))}
        // Verify the same physical original is reused across a separate save too.
        const third=new File([png],'third-original.png',{type:'image/png',lastModified:1700000000789});
        try{await mem.save({title:'Separate prior memory',date:'2026-11-23',text:'synthetic'},[third])}
        catch(error){throw Error('Separate shared payload save: '+error.message+' '+(error.reason||'')+' TRACE '+JSON.stringify(window.__taleraIdbTestTrace.slice(-65)))}
        const dbName=document.getElementById('talera-memory-store-v1').textContent.match(/var DB_NAME='([^']+)'/)[1];
        const db=await new Promise((ok,bad)=>{const q=indexedDB.open(dbName,1);q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)});
        const raw=await new Promise((ok,bad)=>{const q=db.transaction('files','readonly').objectStore('files').getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)});
        db.close();
        const reads=[];
        for(const item of firstStory.items){
          try{const v=await mem.blob(item.key);reads.push({ok:true,size:v?.size,name:v?.name,lastModified:v?.lastModified})}
          catch(e){reads.push({ok:false,error:e.message,reason:e.reason})}
        }
        return {items:firstStory.items,reads,rows:raw.map(x=>({keys:Object.keys(x),key:x.key,
          payloadKey:x.payloadKey,metadata:x.metadata,binaryBytes:x.binaryParts?.reduce((n,b)=>n+b.byteLength,0),blob:x.blob instanceof Blob?{size:x.blob.size,type:x.blob.type,kind:Object.prototype.toString.call(x.blob)}:null}))};
      });
      console.log('TALERA_PICKER_PREVIOUS_SHARED_ORIGINALS',JSON.stringify({webkit:webkitPickerOnly,seed}));
      assert.ok(seed.reads.every(x=>x.ok),'Existing original read failed before picker: '+JSON.stringify(seed));
      if(broken){
        await pickerPage.evaluate(async key=>{
          const dbName=document.getElementById('talera-memory-store-v1').textContent.match(/var DB_NAME='([^']+)'/)[1];
          const db=await new Promise((ok,bad)=>{const q=indexedDB.open(dbName,1);q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)});
          try{
            await new Promise((ok,bad)=>{
              const tx=db.transaction('files','readwrite'),store=tx.objectStore('files');
              tx.oncomplete=ok;tx.onabort=()=>bad(tx.error);tx.onerror=()=>bad(tx.error);
              const q=store.get(key);
              q.onsuccess=()=>{const r=q.result;store.put({...r,metadata:{...r.metadata,length:r.metadata.length+1}})};
            });
          }finally{db.close()}
          let rejected=false;
          try{await window.TaleraMemories.blob(key)}catch(e){rejected=e.message==='TALERA_LIBRARY_INVALID_SHARED_ORIGINAL'&&e.reason==='logical-metadata'}
          if(!rejected)throw Error('Broken synthetic alias must remain strictly rejected');
        },seed.items[0].key);
      }
      if(fixture.deleteTest){
        const targetId=seed.items[0].key.slice(0,seed.items[0].key.lastIndexOf(':'));
        const previous=await pickerPage.evaluate(async targetId=>{
          const mem=window.TaleraMemories,rows=await mem.list();
          const survivor=rows.find(row=>row.id!==targetId);
          const dbName=document.getElementById('talera-memory-store-v1').textContent.match(/var DB_NAME='([^']+)'/)[1];
          const db=await new Promise((ok,bad)=>{const q=indexedDB.open(dbName,1);q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)});
          // Add a separate unreadable historical alias; keep the healthy
          // survivor's real original intact.
          const extra=await mem.save({title:'Independent damaged link',date:'2026-11-23',text:'synthetic'},[new File([new Uint8Array([1,2,3])],'unrelated.mp4',{type:'video/mp4'})]);
          try{
            await new Promise((ok,bad)=>{
              const tx=db.transaction('files','readwrite'),store=tx.objectStore('files');
              tx.oncomplete=ok;tx.onabort=()=>bad(tx.error);tx.onerror=()=>bad(tx.error);
              const q=store.get(extra.items[0].key);
              q.onsuccess=()=>store.put({...q.result,payloadKey:'talera-original-payload-v1:'+'f'.repeat(64)});
            });
          }finally{db.close()}
          const bytes=new Uint8Array(await (await mem.blob(survivor.items[0].key)).arrayBuffer());
          return {id:survivor.id,key:survivor.items[0].key,bytes:[...bytes],extraId:extra.id,extraKey:extra.items[0].key};
        },targetId);
        // Never mount deletion on an ordinary fresh editor, even with a bad
        // library row. Load the exact failing edit route instead.
        await pickerPage.goto(origin+'/tell?edit='+encodeURIComponent(targetId),{waitUntil:'domcontentloaded'});
        try{
          await pickerPage.locator('.talera-failed-edit-delete .talera-editor-memory-options-toggle').waitFor({state:'visible',timeout:18000});
        }catch(error){
          console.log('TALERA_BROKEN_EDIT_DELETE_UI_FAILURE',JSON.stringify({webkit:webkitPickerOnly,body:(await pickerPage.locator('body').innerText()).slice(0,2500),url:pickerPage.url()}));throw error;
        }
        const fallback=pickerPage.locator('.talera-failed-edit-delete');
        assert.ok((await fallback.innerText()).includes('Previous'),'Wrong selected memory displayed');
        let confirms=0;
        const dismiss=dialog=>{confirms++;return dialog.dismiss()};
        pickerPage.once('dialog',dismiss);
        await fallback.locator('.talera-editor-memory-options-toggle').click();
        await fallback.locator('.talera-delete-published-memory').click();
        await pickerPage.waitForFunction(()=>!document.querySelector('.talera-failed-edit-delete .talera-delete-published-memory')?.disabled);
        assert.equal(confirms,1);
        assert.ok(await pickerPage.evaluate(id=>window.TaleraMemories.get(id),targetId),'Cancel deleted the target');
        pickerPage.once('dialog',dialog=>{assert.equal(dialog.type(),'confirm');return dialog.accept()});
        await fallback.locator('.talera-editor-memory-options-toggle').click();
        await fallback.locator('.talera-delete-published-memory').click();
        await pickerPage.waitForURL('**/mijn-leven',{timeout:18000});
        await pickerPage.waitForFunction(()=>!!window.TaleraMemories?.get);
        const proof=await pickerPage.evaluate(async ({targetId,previous})=>{
          const mem=window.TaleraMemories,b=await mem.blob(previous.key);
          const bytes=[...new Uint8Array(await b.arrayBuffer())];
          let badStillRejected=false;
          try{await mem.blob(previous.extraKey)}catch(e){badStillRejected=e.reason==='missing-payload'}
          return {targetAbsent:!(await mem.get(targetId)),healthyRetained:!!await mem.get(previous.id),
            originalBytesIdentical:JSON.stringify(bytes)===JSON.stringify(previous.bytes),
            unrelatedBadRetained:!!await mem.get(previous.extraId)&&badStillRejected};
        },{targetId,previous});
        assert.ok(Object.values(proof).every(Boolean),'Deletion changed another memory: '+JSON.stringify(proof));
        console.log('TALERA_BROKEN_EDIT_CONFIRMED_DELETE_PASS',JSON.stringify({webkit:webkitPickerOnly,...proof}));
        // In this isolated synthetic fixture only, remove the second known
        // bad story using the same account-local library deletion contract.
        // A subsequent real picker import must have no advisory warning at all.
        const clean=await pickerPage.evaluate(async previous=>{
          const mem=window.TaleraMemories;
          await mem.remove(previous.extraId);
          const survivor=await mem.get(previous.id);
          const bytes=[...new Uint8Array(await (await mem.blob(previous.key)).arrayBuffer())];
          return {extraAbsent:!(await mem.get(previous.extraId)),survivorRetained:!!survivor,
            bytesIdentical:JSON.stringify(bytes)===JSON.stringify(previous.bytes)};
        },previous);
        assert.ok(Object.values(clean).every(Boolean),'Last damaged story removal changed healthy data: '+JSON.stringify(clean));
        await pickerPage.goto(origin+'/tell',{waitUntil:'domcontentloaded'});
      }
      await pickerPage.reload({waitUntil:'domcontentloaded'});
      await pickerPage.waitForFunction(()=>!!document.getElementById('photoInput')&&!!window.TaleraMemories?.draftReadPayload,null,{timeout:15000});
      await pickerPage.locator('#photoInput').setInputFiles(file);
      const expectedBytes=readFileSync(file).toString('base64');
      try{
        // Explicit Node-side polling: an asynchronous waitForFunction
        // predicate can resolve a false Promise value before the IDB draft
        // transaction is complete. Require an actual true readback.
        let ready=false;
        for(let attempt=0;attempt<150;attempt++){
          const state=await pickerPage.evaluate(async expected=>{
            if(document.body.innerText.includes('TALERA_LIBRARY_INVALID_SHARED_ORIGINAL'))throw Error(document.body.innerText);
            const d=await window.TaleraMemories.draftReadPayload('talera-v4-work:manifest','talera-v4-work:');
            const b=d.originals.find(([,v])=>v instanceof Blob)?.[1];
            if(!b)return false;
            const x=new Uint8Array(await b.arrayBuffer());
            const y=Uint8Array.from(atob(expected),c=>c.charCodeAt(0));
            return x.length===y.length&&x.every((v,i)=>v===y[i])&&
              d.catalog.some(g=>g.media?.length===1)&&!document.getElementById('photoInput');
          },expectedBytes);
          if(state===true){ready=true;break}
          await new Promise(resolve=>setTimeout(resolve,150));
        }
        assert.ok(ready,'Picker draft never became durably readable');
      }catch(error){
        console.log('TALERA_PICKER_IMPORT_FAILURE',JSON.stringify({webkit:webkitPickerOnly,file:path.basename(file),
          body:(await pickerPage.locator('body').innerText()).slice(0,1800),pickerErrors}));
        throw error;
      }
      if(fixture.deleteTest){
        // The persisted draft and completion callbacks must have settled.
        await pickerPage.waitForFunction(()=>!document.body.innerText.includes('Import nog niet klaar'));
        assert.ok(!(await pickerPage.locator('body').innerText()).includes('Een eerder mediabestand kon niet worden gecontroleerd op dubbelingen'),
          'Warning persisted after every known broken synthetic reference was removed');
        console.log('TALERA_LAST_DAMAGED_STORY_REMOVED_NO_DUPLICATE_WARNING_PASS',JSON.stringify({webkit:webkitPickerOnly}));
      }
      const published=await pickerPage.evaluate(async ({brokenKey,originalSize})=>{
        const mem=window.TaleraMemories;
        const draft=await mem.draftReadPayload('talera-v4-work:manifest','talera-v4-work:');
        const b=draft.originals.find(([,v])=>v instanceof Blob)?.[1];
        if(!b)throw Error('Picker draft original missing at second readback');
        const saved=await mem.save({title:'Picker test',date:'2026-11-23',text:'synthetic'},[b]);
        const result=await mem.blob(saved.items[0].key);
        const bytes=new Uint8Array(await result.arrayBuffer());
        const input=new Uint8Array(await b.arrayBuffer());
        let priorInvalidPreserved=!brokenKey;
        if(brokenKey){
          try{await mem.blob(brokenKey)}catch(e){priorInvalidPreserved=e.message==='TALERA_LIBRARY_INVALID_SHARED_ORIGINAL'&&e.reason==='logical-metadata'}
        }
        return {bytesIdentical:bytes.length===input.length&&bytes.length===originalSize&&bytes.every((v,i)=>v===input[i]),
          priorInvalidPreserved,priorMemoryRetained:(await mem.list()).length>=2};
      },{brokenKey:broken&&!fixture.deleteTest?seed.items[0].key:null,originalSize:readFileSync(file).length});
      assert.ok(published.bytesIdentical&&published.priorInvalidPreserved&&published.priorMemoryRetained,'Picker original or historical alias altered: '+JSON.stringify(published));
      console.log('TALERA_ACTUAL_PICKER_IMPORT_PASS',JSON.stringify({webkit:webkitPickerOnly,file:path.basename(file),originalBytesIdentical:true,priorSharedOriginals:true,brokenPriorAlias:broken,...published}));
      assert.deepEqual(pickerErrors,[],'Picker JS error');
    }finally{await pickerCtx.close()}
  }
  if(webkitPickerOnly)break backupRegression;
  // iPhone regression: real authenticated TALERA Worker, saved local image,
  // then same home-screen PWA routes offline. No second app or Worker.
  const offlineCtx=await browser.newContext({
    ...devices['iPhone 13'],serviceWorkers:'allow',
    extraHTTPHeaders:{'x-talera-f5-key':gate}
  });
  try{
    await offlineCtx.addCookies([{name:'talera_sid',value:sid,
      domain:'127.0.0.1',path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
    const offlinePage=await offlineCtx.newPage();
    const offlineErrors=[];
    offlinePage.on('pageerror',e=>offlineErrors.push(String(e.message).slice(0,180)));
    const entry=await offlinePage.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
    assert.equal(entry.status(),200,'Existing authenticated TALERA home required');
    await offlinePage.evaluate(async()=>{
      await navigator.serviceWorker.register('/sw.js',{scope:'/'});
      await navigator.serviceWorker.ready;
    });
    await offlinePage.reload({waitUntil:'domcontentloaded'});
    await offlinePage.waitForFunction(()=>!!window.TaleraMemories?.save);
    const saved=await offlinePage.evaluate(async()=>{
      const c=document.createElement('canvas');c.width=64;c.height=64;
      c.getContext('2d').fillStyle='#2356a9';
      c.getContext('2d').fillRect(0,0,64,64);
      const b=await new Promise(ok=>c.toBlob(ok,'image/png'));
      return window.TaleraMemories.save({
        title:'Synthetic offline picture',date:'2026-11-23',
        time:'16:00:00',text:'Technical test only'
      },[new File([b],'synthetic-offline.png',{type:'image/png'})]);
    });
    const account=await offlinePage.evaluate(async()=>{
      const r=await fetch('/api/me');
      if(!r.ok)throw Error('Synthetic session expired');
      return (await r.json()).account?.id;
    });
    assert.match(account,/^[0-9a-f-]{36}$/i);
    const state=async()=>offlinePage.evaluate(async()=>{
      const db=await new Promise((ok,bad)=>{
        const r=indexedDB.open('talera-f5-offline-shell-v1',1);
        r.onsuccess=()=>ok(r.result);r.onerror=()=>bad(r.error);
      });
      try{
        const read=key=>new Promise((ok,bad)=>{
          const r=db.transaction('shell','readonly').objectStore('shell').get(key);
          r.onsuccess=()=>ok(r.result);r.onerror=()=>bad(r.error);
        });
        const keys=['grant','ready','me','page:/mijn-leven',
          'page:/present','page:/tell','page:/__f5/backup','pending-logout'];
        const v=await Promise.all(keys.map(read));
        return {controlled:!!navigator.serviceWorker.controller,
          grant:v[0]?.id||null,ready:v[1]?.id||null,me:v[2]?.id||null,
          keyStored:!!v[0]?.key,
          home:!!v[3]?.id,present:!!v[4]?.id,tell:!!v[5]?.id,
          backup:!!v[6]?.id,pending:!!v[7]};
      }finally{db.close()}
    });
    let s=null;
    for(let n=0;n<120;n++){
      s=await state();
      if(s.grant===account&&s.ready===account&&s.home&&
        s.present&&s.tell&&s.backup)break;
      await offlinePage.waitForTimeout(300);
    }
    console.log('TALERA_REAL_APP_OFFLINE_PREPARATION_STATE',
      JSON.stringify({...s,accountMatched:s?.grant===account,
        ownSyntheticPhotoSaved:!!saved?.id,errors:offlineErrors.slice(-5)}));
    // Playwright's "offline" flag may leave Service Worker fetches ONLINE.
    // Kill only this disposable local Wrangler process and wait for closure.
    // Restart that SAME local origin/DO test store before any other regressions.
    const oldWorker=worker;
    await new Promise((ok,bad)=>{
      if(oldWorker.exitCode!==null)return ok();
      const timer=setTimeout(()=>bad(Error('LOCAL_WORKER_SHUTDOWN_TIMEOUT')),9000);
      oldWorker.once('exit',()=>{clearTimeout(timer);ok()});
      if(!oldWorker.kill('SIGTERM')){clearTimeout(timer);bad(Error('LOCAL_WORKER_NOT_STOPPED'))}
    });
    console.log('TALERA_REAL_APP_LOCAL_SERVER_TRULY_DISCONNECTED');
    try{
      const home=await offlinePage.goto(origin+'/mijn-leven',
        {waitUntil:'domcontentloaded',timeout:18000});
      assert.equal(home.status(),200,'Real PWA offline home returned unavailable 503');
      assert.equal(await home.headerValue('x-talera-offline'),'verified-device-shell',
        'Real offline home did not use encrypted device shell');
      // Verify the ACTUAL existing "Bewaar een nieuw moment" entry.
      // Earlier tests called TaleraMemories.save directly; they could miss
      // a broken offline page transition from the owner's visible button.
      await offlinePage.waitForTimeout(1000);
      const creationEntry=await offlinePage.evaluate(()=>{
        const tiny=el=>({
          tag:el.tagName.toLowerCase(),
          label:String(el.innerText||el.textContent||'').trim().slice(0,110),
          href:el.getAttribute('href'),role:el.getAttribute('role'),
          action:el.getAttribute('data-action'),
          html:el.outerHTML.slice(0,370)
        });
        const all=[...document.querySelectorAll('a,button,[role="button"],[onclick]')];
        const words=/bewaar|nieuw|moment|memory|herinner|create|add|save|new/i;
        const leafs=[...document.querySelectorAll('body *')]
          .filter(el=>el.children.length===0&&words.test(el.textContent||''));
        return {
          path:location.pathname+location.search,ready:document.readyState,
          bodyPreview:(document.body.innerText||'').slice(0,1000),
          anchors:[...document.querySelectorAll('a')].slice(0,40).map(tiny),
          buttons:[...document.querySelectorAll('button')].slice(0,40).map(tiny),
          matchingControls:all.filter(el=>words.test(
            (el.innerText||el.textContent||'')+' '+(el.getAttribute('aria-label')||'')))
            .slice(0,16).map(tiny),
          matchingLeafs:leafs.slice(0,14).map(el=>({
            label:el.textContent?.trim().slice(0,80),
            parent:el.parentElement?.outerHTML.slice(0,400)
          }))
        };
      });
      console.log('TALERA_OFFLINE_ACTUAL_NEW_MEMORY_ENTRY',JSON.stringify(creationEntry));
      // Exercise the ACTUAL original home button, not a fabricated editor URL.
      // This must open the SAME account-scoped /tell page with no backend.
      const newMomentControl=offlinePage.locator('a.action-start[href="/tell"]');
      assert.equal(await newMomentControl.count(),1,
        'Original New Moment link not available on offline Home');
      const [newMomentResponse]=await Promise.all([
        offlinePage.waitForNavigation({waitUntil:'domcontentloaded',timeout:18000}),
        newMomentControl.click()
      ]);
      assert.equal(newMomentResponse?.status(),200,
        'Original New Moment button opened unavailable offline editor');
      assert.equal(await newMomentResponse.headerValue('x-talera-offline'),
        'verified-device-shell','Original New Moment did not use verified offline editor');
      assert.equal(new URL(offlinePage.url()).pathname,'/tell');
      try{
       await offlinePage.waitForFunction(()=>!!window.TaleraMemories?.save,
         null,{timeout:15000});
      }catch(error){
       const state=await offlinePage.evaluate(()=>({
        path:location.pathname,ready:document.readyState,
        library:typeof window.TaleraMemories,
        libraryScript:!!document.getElementById('talera-memory-store-v1'),
        payloadReader:document.getElementById('talera-memory-store-v1')?.textContent.includes('const taleraPayload='),
        bodyPreview:document.body.innerText.slice(0,600)
       }));
       console.log('TALERA_OFFLINE_EDITOR_LIBRARY_NOT_INITIALIZED',JSON.stringify(state));
       throw error;
      }
      console.log('TALERA_OFFLINE_ORIGINAL_NEW_MOMENT_BUTTON_OPENS_EDITOR_PASS');
      const returnedHome=await offlinePage.goto(origin+'/mijn-leven',
        {waitUntil:'domcontentloaded',timeout:18000});
      assert.equal(returnedHome?.status(),200,
        'Original offline editor could not return to My Life');


      assert.ok(await offlinePage.evaluate(async id=>
        (await window.TaleraMemories.list()).some(x=>x.id===id),saved.id),
        'A real local photo disappeared after offline reload');
      // Make an additional local photo memory with the ALREADY-EXISTING
      // device-stored photo while the real test server is truly shut down.
      // No separate app, network upload, or production photo access.
      const newlySavedOffline=await offlinePage.evaluate(async originalId=>{
        const original=await window.TaleraMemories.get(originalId);
        const item=original.items.find(x=>x.kind==='photo');
        if(!item)throw Error('ORIGINAL_TEST_PHOTO_NOT_FOUND');
        const bytes=await window.TaleraMemories.blob(item.key);
        if(!bytes?.size)throw Error('ORIGINAL_TEST_PHOTO_BYTES_UNREADABLE');
        const memory=await window.TaleraMemories.save({
          title:'Locally saved while fully offline',
          date:'2026-11-23',time:'16:01:00',
          text:'Offline creation with the same original app and account'
        },[new File([bytes],'same-local-photo.png',{type:bytes.type||'image/png'})]);
        return {id:memory?.id,itemCount:memory?.items?.length};
      },saved.id);
      assert.match(newlySavedOffline.id,/^local-[a-z0-9-]{8,90}$/i,
        'Offline same-device memory was not committed to local library');
      const returnPage=await offlinePage.goto(origin+'/mijn-leven?published='+
        encodeURIComponent(newlySavedOffline.id),
        {waitUntil:'domcontentloaded',timeout:18000});
      assert.equal(returnPage.status(),200,
        'Offline newly-saved memory return showed unavailable 503');
      assert.equal(await returnPage.headerValue('x-talera-offline'),
        'verified-device-shell','Offline save returned through an unverified page');
      assert.ok(await offlinePage.evaluate(async id=>
        (await window.TaleraMemories.list()).some(row=>row.id===id),
        newlySavedOffline.id),'Newly created offline memory was not readable');
      const editPage=await offlinePage.goto(origin+'/tell?edit='+
        encodeURIComponent(newlySavedOffline.id),
        {waitUntil:'domcontentloaded',timeout:18000});
      assert.equal(editPage.status(),200,'Offline owner-local edit route unavailable');
      console.log('TALERA_REAL_APP_OFFLINE_NEW_MEMORY_SAVE_AND_RETURN_PASS',
        JSON.stringify({accountLocal:true,sameOrigin:true,noBackend:true,
          savedIdValid:true,originalMediaRetained:true,realIphoneAccepted:false}));
      const present=await offlinePage.goto(origin+'/present?memory='+
        encodeURIComponent(saved.id),{waitUntil:'domcontentloaded',timeout:18000});
      assert.equal(present.status(),200,
        'Real saved-photo presentation route returned unavailable offline');
      await offlinePage.waitForFunction(id=>{
        const memory=window.__taleraTimelineRuntime?.currentMemory?.();
        return memory?.storyId===id&&
          [...document.querySelectorAll('#photoStage img')]
            .some(img=>img.complete&&img.naturalWidth>0&&
              img.currentSrc?.startsWith('blob:'));
      },saved.id,{timeout:18000});
      console.log('TALERA_REAL_OWNER_PHOTO_OFFLINE_START_AND_PRESENT_PASS',
        JSON.stringify({sameWorker:true,sameOrigin:true,ownPhoto:true,
          realIphoneAccepted:false}));
    }finally{
      await start();
      console.log('TALERA_SAME_TEST_WORKER_RESTARTED_WITH_PERSISTED_DO_STORE');
    }
  }finally{await offlineCtx.close();}
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
  // Test the production metadata reader inside this exact generated /present.
  // Use only synthetic bytes, never an owner photo or a second app.
  const capturePlaceResults=await page.evaluate(async()=>{
    const ns='http://iptc.org/std/Iptc4xmpExt/2008-02-29/';
    const jpeg=(field='LocationCreated',city='Arnhem',code='NL',country='Nederland')=>{
      const packet='<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:i="'+ns+'"><i:'+field+'><rdf:Bag><rdf:li rdf:parseType="Resource"><i:City>'+city+'</i:City><i:CountryCode>'+code+'</i:CountryCode><i:CountryName>'+country+'</i:CountryName></rdf:li></rdf:Bag></i:'+field+'></rdf:Description></rdf:RDF></x:xmpmeta>';
      const data=new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0'+packet);
      const size=data.length+2;
      return new Blob([Uint8Array.from([255,216,255,225,size>>8,size&255]),data,Uint8Array.from([255,217])],{type:'image/jpeg'});
    };
    const rows=new Map([
      ['created',jpeg()],['shown',jpeg('LocationShown')],
      ['conflicting',jpeg('LocationCreated','Arnhem','DE','Nederland')],
      ['badcode',jpeg('LocationCreated','Arnhem','ZZ','Nederland')],
      ['missingcity',jpeg('LocationCreated','')],
      ['malformed',jpeg('LocationCreated','<bad>')],
      ['control',jpeg('LocationCreated','Arnhem&#x202E;')],
      ['plain',new Blob([Uint8Array.from([255,216,255,217])],{type:'image/jpeg'})]
    ]);
    const library=window.TaleraLibraryFactory.create({
      list:async()=>[],get:async()=>null,blob:async id=>rows.get(id)||null,mediaUrl:async()=>null
    });
    const output={};
    for(const key of rows.keys())output[key]=await library.capturePlace(key);
    return output;
  });
  assert.deepEqual(capturePlaceResults.created,{
    countryCode:'NL',country:'Nederland',city:'Arnhem',source:'iptc-location-created'
  });
  for(const key of ['shown','conflicting','badcode','missingcity','malformed','control','plain'])
    assert.equal(capturePlaceResults[key],null,key);
  console.log('TALERA_CAPTURE_PLACE_EXPLICIT_IPTC_BROWSER_PASS');

  // Save a decodable JPEG through the real /tell editor's existing account
  // library, reopen /present and read the same persisted item and bytes.
  // No new app or permanent synthetic memory: remove this test story.
  const metadataPage=await ctx.newPage();
  try{
    const editResponse=await metadataPage.goto(origin+'/tell',{waitUntil:'domcontentloaded'});
    assert.equal(editResponse.status(),200);
    await metadataPage.waitForFunction(()=>!!window.TaleraMemories?.save);
    const result=await metadataPage.evaluate(async()=>{
      const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
      const paint=canvas.getContext('2d');paint.fillStyle='#db3520';paint.fillRect(0,0,64,64);
      const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg'));
      const original=new Uint8Array(await jpeg.arrayBuffer());
      const packet='<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:i="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"><i:LocationCreated><rdf:Bag><rdf:li rdf:parseType="Resource"><i:City>Arnhem</i:City><i:CountryCode>NL</i:CountryCode><i:CountryName>Nederland</i:CountryName></rdf:li></rdf:Bag></i:LocationCreated></rdf:Description></rdf:RDF></x:xmpmeta>';
      const xmp=new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0'+packet),length=xmp.length+2;
      const tagged=new File([original.subarray(0,2),Uint8Array.of(255,225,length>>8,length&255),xmp,original.subarray(2)],'capture.jpg',{type:'image/jpeg'});
      const plain=new File([original],'no-location.jpg',{type:'image/jpeg'});
      const saved=await window.TaleraMemories.save({title:'Synthetic capture place',date:'2026-11-10',text:'Synthetic metadata test'},[tagged,plain]);
      const row=await window.TaleraMemories.get(saved.id);
      const read=await window.TaleraMemories.blob(row.items[0].key);
      const bytes=new Uint8Array(await read.arrayBuffer()),expected=new Uint8Array(await tagged.arrayBuffer());
      return {id:saved.id,place:row.items[0].capturePlace,missing:row.items[1].capturePlace??null,
        keys:row.items.map(x=>x.key),sameBytes:bytes.length===expected.length&&bytes.every((x,i)=>x===expected[i])};
    });
    assert.deepEqual(result.place,capturePlaceResults.created);
    assert.equal(result.missing,null);
    assert.equal(result.sameBytes,true);
    const presentResponse=await metadataPage.goto(origin+'/present?memory='+encodeURIComponent(result.id),{waitUntil:'domcontentloaded'});
    assert.equal(presentResponse.status(),200);
    await metadataPage.waitForFunction(()=>!!window.TaleraLibrary?.readStory);
    const reopened=await metadataPage.evaluate(async id=>{
      const row=await window.TaleraLibrary.readStory(id);
      return {place:row.items[0].capturePlace,missing:row.items[1].capturePlace??null,keys:row.items.map(x=>x.key)};
    },result.id);
    assert.deepEqual(reopened,{place:result.place,missing:null,keys:result.keys});
    // Exercise the actual selected decoded photo on the SAME /present page.
    await metadataPage.waitForFunction(id=>{
      const m=window.__taleraTimelineRuntime?.currentMemory?.();
      return m?.storyId===id&&!m._photoLoading&&m._zeroFrames?.length===2;
    },result.id,{timeout:20000});
    await metadataPage.evaluate(()=>{
      const m=window.__taleraTimelineRuntime.currentMemory();
      window.__taleraOrdinarySelectPhoto(m.id,0,true);
    });
    await metadataPage.waitForFunction(()=>{
      const row=document.getElementById('talera-capture-place');
      return row&&!row.hidden&&row.textContent==='Nederland · Arnhem'&&getComputedStyle(row).display!=='none';
    },null,{timeout:10000});
    const layout=await metadataPage.evaluate(()=>{
      const row=document.getElementById('talera-capture-place'),title=document.getElementById('memoryStory');
      const flag=row.querySelector('.talera-capture-flag').getBoundingClientRect();
      return {belowTitle:row.previousElementSibling===title,flagWidth:flag.width,flagHeight:flag.height};
    });
    assert.deepEqual(layout,{belowTitle:true,flagWidth:16,flagHeight:11});
    await metadataPage.evaluate(()=>{
      const m=window.__taleraTimelineRuntime.currentMemory();
      window.__taleraOrdinarySelectPhoto(m.id,1,true);
    });
    await metadataPage.waitForFunction(()=>{
      const m=window.__taleraTimelineRuntime.currentMemory();
      return m._photoIndex===1&&document.getElementById('talera-capture-place')?.hidden;
    },null,{timeout:10000});
    console.log('TALERA_CAPTURE_PLACE_ACTUAL_PRESENTATION_FRAME_PASS');
    await metadataPage.evaluate(id=>window.TaleraMemories.remove(id),result.id);
    console.log('TALERA_CAPTURE_PLACE_ACCOUNT_CATALOG_REOPEN_PASS');
  }finally{await metadataPage.close()}


  // Exercise the actual generated Home catalog using the same local Worker
  // with its real feature flag enabled. Only the provider boundary is mocked.
  // Restart the same process/origin/DO store, never deploy a second app.
  async function restartGeoWorker(enabled){
    const old=worker;
    await new Promise((ok,bad)=>{
      if(old.exitCode!==null)return ok();
      const timer=setTimeout(()=>bad(Error('LOCAL_WORKER_SHUTDOWN_TIMEOUT')),9000);
      old.once('exit',()=>{clearTimeout(timer);ok()});
      if(!old.kill('SIGTERM')){clearTimeout(timer);bad(Error('LOCAL_WORKER_NOT_STOPPED'))}
    });
    await start(enabled);
  }
  await restartGeoWorker(true);
  const geoCtx=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block',
    extraHTTPHeaders:{'x-talera-f5-key':gate}});
  try{
    await geoCtx.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',
      path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
    const geoPage=await geoCtx.newPage(),geoErrors=[];
    geoPage.on('pageerror',error=>geoErrors.push(error.message));
    await geoPage.goto(origin+'/tell',{waitUntil:'domcontentloaded'});
    await geoPage.waitForFunction(()=>!!window.TaleraMemories?.save);
    const saved=await geoPage.evaluate(async()=>{
      const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
      const paint=canvas.getContext('2d');paint.fillStyle='#39ad72';paint.fillRect(0,0,64,64);
      const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg'));
      const original=new Uint8Array(await jpeg.arrayBuffer());
      // Same local EXIF GPS fixture as the library contract, with real JPEG pixels.
      const t=new Uint8Array(130),v=new DataView(t.buffer);
      const u16=(i,n)=>v.setUint16(i,n,true),u32=(i,n)=>v.setUint32(i,n,true);
      v.setUint16(0,0x4949);u16(2,42);u32(4,8);u16(8,1);
      u16(10,0x8825);u16(12,4);u32(14,1);u32(18,26);u16(26,4);
      function entry(i,tag,type,count,val){
        const p=28+i*12;u16(p,tag);u16(p+2,type);u32(p+4,count);
        if(type===2)t[p+8]=val.charCodeAt(0);else u32(p+8,val);
      }
      entry(0,1,2,2,'N');entry(1,2,5,3,82);
      entry(2,3,2,2,'E');entry(3,4,5,3,106);
      [51,59,6,5,53,18].forEach((n,i)=>{u32(82+i*8,n);u32(86+i*8,1)});
      const len=2+6+t.length,marker=Uint8Array.from([255,225,len>>8,len&255,69,120,105,102,0,0,...t]);
      const file=new File([original.subarray(0,2),marker,original.subarray(2)],'synthetic-gps.jpg',{type:'image/jpeg'});
      const row=await window.TaleraMemories.save({title:'Synthetic GPS',date:'2026-11-10',text:'GPS contract'},[file]);
      return {id:row.id,key:row.items[0].key,bytes:[...new Uint8Array(await file.arrayBuffer())]};
    });
    // Observe real same-origin HTTP requests at the browser context boundary.
    // Unique response prevents a pre-existing catalog value passing this test.
    const city='Testplaats-'+randomUUID().slice(0,8);
    const sent=[],observed=[];
    const isGeo=url=>{const u=new URL(url);return u.origin===origin&&u.pathname==='/api/capture-place'};
    geoCtx.on('request',request=>{
      if(isGeo(request.url()))observed.push(request.method());
    });
    await geoCtx.route(url=>isGeo(url.href),async route=>{
      const request=route.request();
      sent.push({body:request.postDataJSON(),scope:request.headers()['x-talera-local-scope'],method:request.method()});
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({place:{
        countryCode:'NL',country:'Nederland',city,source:'geonames-nearby-place'
      }})});
    });
    // No replacement of window.fetch. Only the provider HTTP response is simulated.
    await geoCtx.addInitScript(()=>{
      if(location.pathname!=='/mijn-leven')return;
      window.__taleraGeoOnline=false;
      Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>window.__taleraGeoOnline});
    });
    const home=await geoPage.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
    assert.equal(home.status(),200);
    assert.ok((await home.text()).includes('/*TALERA_GEONAMES_ENABLED*/true'),'Actual Worker did not enable enrichment');
    await geoPage.waitForFunction(()=>!!window.TaleraMemories?.get);
    await geoPage.waitForTimeout(2500);
    assert.equal(sent.length,0,'No geocoding while offline');
    assert.equal(observed.length,0,'No HTTP geocoding attempt while offline');
    assert.equal(await geoPage.evaluate(async id=>(await window.TaleraMemories.get(id)).items[0].capturePlace??null,saved.id),null);
    await geoPage.evaluate(()=>{window.__taleraGeoOnline=true;window.dispatchEvent(new Event('online'))});
    try{
      await geoPage.waitForFunction(async ([id,expected])=>(await window.TaleraMemories.get(id))?.items[0]?.capturePlace?.city===expected,[saved.id,city],{timeout:15000});
    }catch(error){
      const state=await geoPage.evaluate(async id=>{
        const row=await window.TaleraMemories.get(id);
        const item=row?.items?.[0];
        return {path:location.pathname,online:navigator.onLine,hidden:document.hidden,place:item?.capturePlace??null,
          checked:item?.capturePlaceChecked??null,size:item?.size,kind:item?.kind,mime:item?.mime};
      },saved.id);
      console.log('TALERA_GEONAMES_ACTUAL_REQUEST_DIAGNOSTIC',JSON.stringify({state,sent:sent.length,observed:observed.length,geoErrors}));
      throw error;
    }
    assert.equal(sent.length,1,'Exactly one intercepted HTTP request');
    assert.deepEqual(observed,['POST'],'Exactly one browser HTTP request');
    assert.deepEqual(Object.keys(sent[0].body).sort(),['latitude','longitude']);
    assert.ok(Math.abs(sent[0].body.latitude-51.985)<0.00001);
    assert.ok(Math.abs(sent[0].body.longitude-5.888333333333333)<0.00001);
    assert.match(sent[0].scope,/^[a-f0-9]{32}$/);
    assert.equal(sent[0].method,'POST');
    const stored=await geoPage.evaluate(async id=>{
      const row=await window.TaleraMemories.get(id),item=row.items[0];
      return {key:item.key,place:item.capturePlace,bytes:[...new Uint8Array(await (await window.TaleraMemories.blob(item.key)).arrayBuffer())]};
    },saved.id);
    assert.equal(stored.key,saved.key);assert.deepEqual(stored.bytes,saved.bytes);
    assert.deepEqual(stored.place,{countryCode:'NL',country:'Nederland',city,source:'geonames-nearby-place'});
    await geoPage.evaluate(()=>window.dispatchEvent(new Event('online')));
    await geoPage.waitForTimeout(2500);
    assert.equal(sent.length,1,'Persisted metadata never requests the same media again');
    assert.equal(observed.length,1);
    await geoPage.goto(origin+'/present?memory='+encodeURIComponent(saved.id),{waitUntil:'domcontentloaded'});
    await geoPage.waitForFunction(expected=>document.getElementById('talera-capture-place')?.textContent.includes('Nederland · omgeving '+expected+' (GeoNames)'),city,{timeout:20000});
    assert.equal(sent.length,1,'Presentation performs no geocoding');
    assert.equal(observed.length,1);
    await geoPage.evaluate(id=>window.TaleraMemories.remove(id),saved.id);
    assert.deepEqual(geoErrors,[]);
    console.log('TALERA_GEONAMES_ACTUAL_HOME_OFFLINE_RECONNECT_CATALOG_PRESENT_PASS');
  }finally{await geoCtx.close();await restartGeoWorker(false)}

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
  // The original deep-link transition intentionally hides the paper until
  // its first photo has decoded. Do not grab a hidden button 0ms after
  // domcontentloaded; this was the source of false one-off drag failures.
  await page.waitForFunction(()=>
    !document.documentElement.classList.contains('talera-direct-memory-entering'),
    null,{timeout:9000});
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
    const css=getComputedStyle(grip);
    return {max:scroll.scrollHeight-scroll.clientHeight,
      top:scroll.scrollTop,font:parseFloat(css.fontSize),
      touchAction:css.touchAction,background:css.backgroundColor,
      foreground:css.color,fontWeight:css.fontWeight,
      borderWidth:css.borderTopWidth,shadow:css.boxShadow,
      arrowContrast:css.textShadow};
  });
  assert.ok(gripInitial.max>140&&gripInitial.font===20&&gripInitial.touchAction==='none',
    'Original reading sheet does not offer a usable drag target: '+
    JSON.stringify(gripInitial));
  assert.ok(gripInitial.foreground==='rgba(255, 253, 248, 0.94)'&&
      gripInitial.fontWeight==='600'&&
      gripInitial.arrowContrast.includes('rgba(5, 19, 33'),
    'Subtle arrow color or contrast changed unexpectedly: '+
    JSON.stringify(gripInitial));
  // Only the subtle original ↑ is visible; retain a large invisible iPhone
  // finger target and the exact original scroll motion tested below.
  assert.ok((gripInitial.background==='rgba(0, 0, 0, 0)'||
      gripInitial.background==='transparent')&&
      gripInitial.borderWidth==='0px'&&gripInitial.shadow==='none',
    'The original little story arrow grew a visible button again: '+
    JSON.stringify(gripInitial));
  console.log('TALERA_SUBTLE_ORIGINAL_ARROW_WITH_INVISIBLE_TOUCH_TARGET_PASS',
    JSON.stringify({visualButton:false,arrowFontPx:gripInitial.font,
      hitWidth:gripBounds.width,hitHeight:gripBounds.height,
      realIphoneAccepted:false}));
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
  // The owner uses a REAL iPhone finger, not a mouse. Send two genuine
  // synthetic touch moves to the SAME 66x43 native grip, with no new UI or
  // alternate video engine, and inspect scrolling before releasing.
  const gripTouchSession=await page.context().newCDPSession(page);
  let touchPositions=[];
  try{
    const id=74,x=gx,y=gy;
    await gripTouchSession.send('Input.dispatchTouchEvent',{
      type:'touchStart',touchPoints:[{x,y,id}]});
    for(const amount of [50,100]){
      await gripTouchSession.send('Input.dispatchTouchEvent',{
        type:'touchMove',touchPoints:[{x,y:y-amount,id}]});
      await page.waitForTimeout(85);
      touchPositions.push(await page.evaluate(()=>
        document.getElementById('memoryStoryScroll').scrollTop));
    }
    await gripTouchSession.send('Input.dispatchTouchEvent',{
      type:'touchEnd',touchPoints:[]});
  }finally{await gripTouchSession.detach()}
  assert.ok(touchPositions[0]>=35&&touchPositions[1]>=85&&
    touchPositions[1]>touchPositions[0]+25,
    'Native phone touch did not move SAME original reading sheet: '+
    JSON.stringify(touchPositions));
  await page.evaluate(()=>document.getElementById('memoryStoryScroll').scrollTop=0);
  console.log('TALERA_FREE_READING_GRIP_SYNTHETIC_IPHONE_TOUCH_PASS',
    JSON.stringify({touchPositions,sameOriginalSheet:true,
      realIphoneAccepted:false}));
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
            videoInsidePhotoStage:document.getElementById('photoStage')?.contains(video),
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
  await page.waitForFunction(()=>
    !!window.__taleraVideoActuallyPlayingLayout,
    null,{timeout:6500});
  const originalVideoDuringMotion=await page.evaluate(()=>
    window.__taleraVideoActuallyPlayingLayout);
  console.log('TALERA_ACTUAL_PLAYING_VIDEO_TITLE_AND_GRIP_SCREEN_GEOMETRY',
    JSON.stringify(originalVideoDuringMotion));
  assert.ok(originalVideoDuringMotion?.playing&&
    originalVideoDuringMotion?.videoInsidePhotoStage&&
    originalVideoDuringMotion?.gripInViewportPx>=25&&
    originalVideoDuringMotion?.gripIsTopHit,
    'The story handle was not visibly reachable once VIDEO was ACTUALLY PLAYING: '+
    JSON.stringify(originalVideoDuringMotion));
  const originalTitleLayer=await page.evaluate(()=>window.__taleraOriginalVideoTitleLayer);
  // The original video is now INSIDE #photoStage. Its own z-index (12)
  // is local to the stage (z=1); compare the stage against the unchanged
  // reading sheet (z=8), not two elements in distinct stacking contexts.
  const videoStageHierarchy=await page.evaluate(()=>{
    const stage=document.getElementById('photoStage');
    const video=document.querySelector('video.talera-v61-inline-video');
    const scroll=document.getElementById('memoryStoryScroll');
    return {inside:stage?.contains(video),
      stageZ:Number(getComputedStyle(stage).zIndex),
      scrollZ:Number(getComputedStyle(scroll).zIndex)};
  });
  assert.ok(originalTitleLayer&&videoStageHierarchy.inside&&
    videoStageHierarchy.stageZ<videoStageHierarchy.scrollZ&&
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
  // The owner chose a smaller visible 20px arrow; the full finger target
  // must still be at least 60x40px during moving narrated video.
  assert.ok(readingDuringNarratedVideo.arrowSize===20&&
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

  // The owner's physical Safari restore showed six cue dots but a BROKEN
  // rendered picture. Previous backup tests compared Blob bytes only; this
  // regression now covers actual export -> restore into EMPTY browser storage
  // -> original photo + voice presentation, all on the SAME Free Worker/origin.
  // All input is disposable synthetic data; real iPhone storage is untouched.
  const backupPage=await ctx.newPage();
  let restoredContext;
  try{
    const backupResp=await backupPage.goto(origin+'/__f5/backup',
      {waitUntil:'domcontentloaded'});
    assert.equal(backupResp.status(),200);
    await backupPage.waitForFunction(()=>
      document.getElementById('talera-free-backup')?.dataset.ready==='yes');
    await backupPage.locator('#make-backup').click();
    await backupPage.locator('#save-backup').waitFor({state:'visible',timeout:25000});
    const downloadPromise=backupPage.waitForEvent('download');
    await backupPage.locator('#save-backup').click();
    const downloaded=await downloadPromise;
    const archiveBytes=readFileSync(await downloaded.path());
    assert.ok(archiveBytes.length>300,'Real Free export must include media bytes');

    restoredContext=await browser.newContext({
      ...devices['iPhone 13'],extraHTTPHeaders:{'x-talera-f5-key':gate}
    });
    await restoredContext.addCookies([{name:'talera_sid',value:sid,
      domain:'127.0.0.1',path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
    const restoredPage=await restoredContext.newPage();
    restoredPage.on('pageerror',e=>errors.push('RESTORED '+e.message));
    // Observe the existing authenticated backup module requests only.
    // Never read/store archive bytes, personal story contents or credentials.
    const restoreModuleTrace=[];
    restoredPage.on('response',resp=>{
      const p=new URL(resp.url()).pathname;
      if(p.startsWith('/__f5/'))restoreModuleTrace.push({
        path:p,status:resp.status(),
        type:resp.headers()['content-type']||''
      });
    });
    restoredPage.on('requestfailed',req=>{
      const p=new URL(req.url()).pathname;
      if(p.startsWith('/__f5/'))restoreModuleTrace.push({
        path:p,error:req.failure()?.errorText||'failed'
      });
    });
    restoredPage.on('console',msg=>{
      if(msg.type()==='error')restoreModuleTrace.push({
        console:'browser-error',message:msg.text().slice(0,220)
      });
    });
    await restoredPage.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
    await restoredPage.waitForFunction(()=>
      typeof window.TaleraMemories?.list==='function');
    const initial=await restoredPage.evaluate(()=>window.TaleraMemories.list());
    assert.equal(initial.length,0,
      'Only a genuinely empty independent browser storage partition can be restored');
    const restorePageResponse=await restoredPage.goto(origin+'/__f5/backup',{waitUntil:'domcontentloaded'});
    try{
      await restoredPage.waitForFunction(()=>
        document.getElementById('talera-free-backup')?.dataset.ready==='yes');
    }catch(error){
      // Diagnostics only. Preserve the exact original readiness requirement.
      const inspection=await restoredPage.evaluate(()=>({
        pathname:location.pathname,
        documentReadyState:document.readyState,
        ready:document.getElementById('talera-free-backup')?.dataset.ready||null,
        backupElementPresent:!!document.getElementById('talera-free-backup'),
        restoreInputPresent:!!document.getElementById('restore-file'),
        scriptCount:document.scripts.length
      })).catch(e=>({inspectionError:String(e)}));
      console.error('TALERA_RESTORE_PAGE_READINESS_DIAGNOSTIC',
        JSON.stringify({httpStatus:restorePageResponse?.status(),inspection,
          errors:errors.slice(-6),moduleTrace:restoreModuleTrace.slice(-18),
          timeout:String(error),syntheticOnly:true}));
      throw error;
    }
    await restoredPage.locator('#restore-file').setInputFiles({
      name:'talera-synthetic-same-app.talera',mimeType:'application/octet-stream',
      buffer:archiveBytes
    });
    await restoredPage.locator('#preview-restore').click();
    await restoredPage.waitForFunction(()=>
      document.getElementById('restore-hint')?.textContent.includes('Geen dubbele'),
      null,{timeout:25000});
    assert.equal(await restoredPage.locator('#backup-step-confirm').isVisible(),true);
    await restoredPage.locator('#confirm-restore').check();
    await restoredPage.locator('#run-restore').click();
    await restoredPage.waitForFunction(()=>
      document.getElementById('restore-status')?.textContent.includes('Herstel voltooid'),
      null,{timeout:30000});
    await load(restoredPage,sixPhotoStory.id,6);
    await restoredPage.waitForFunction(()=>
      [...document.querySelectorAll('#photoStage img')]
        .some(img=>img.complete&&img.naturalWidth>0&&
          img.currentSrc.startsWith('blob:')),
      null,{timeout:12000});
    const rendered=await restoredPage.evaluate(async id=>{
      const memory=window.__taleraTimelineRuntime?.currentMemory?.();
      const row=await window.TaleraMemories.get(id);
      const photos=row.items.filter(x=>x.kind==='photo');
      const files=await Promise.all(photos.map(x=>window.TaleraMemories.blob(x.key)));
      const frames=memory?._zeroFrames||[];
      const decoded=await Promise.all(frames.map(async frame=>{
        if(frame.kind!=='photo'||!frame.url)return false;
        const image=new Image();image.src=frame.url;
        try{await image.decode();return image.naturalWidth>0}catch{return false}
      }));
      const voiceKey=row.items.find(x=>x.kind==='audio')?.key;
      const voice=voiceKey&&await window.TaleraMemories.blob(voiceKey);
      return {storyId:memory?.storyId,frameCount:frames.length,
        decodedPhotos:decoded.filter(Boolean).length,
        allBlobsPresent:files.every(b=>b instanceof Blob&&b.size>0),
        soundPresent:voice instanceof Blob&&voice.size>100,
        renderedImage:[...document.querySelectorAll('#photoStage img')]
          .some(img=>img.complete&&img.naturalWidth>0&&
            img.currentSrc.startsWith('blob:'))};
    },sixPhotoStory.id);
    assert.equal(rendered.storyId,sixPhotoStory.id);
    assert.equal(rendered.frameCount,6);
    assert.equal(rendered.decodedPhotos,6,
      'Restored photos MUST decode in the actual presentation; byte checks are insufficient');
    assert.equal(rendered.allBlobsPresent,true);
    assert.equal(rendered.soundPresent,true);
    assert.equal(rendered.renderedImage,true);
    console.log('TALERA_RESTORED_SAME_PWA_ORIGINAL_PHOTOS_AND_VOICE_RENDER_PASS',
      JSON.stringify({...rendered,syntheticOnly:true,physicalIphoneAccepted:false}));
  }finally{
    await backupPage.close();
    if(restoredContext)await restoredContext.close();
  }
  // Optional scoped backup regression: all existing original media and actual
  // restore-to-presentation assertions above have executed unchanged.
  // The default full suite still runs every subsequent gesture and reset test.
  if(process.env.TALERA_BACKUP_REGRESSION_ONLY==='1'){
    assert.deepEqual(errors,[],'Runtime errors during actual backup/presentation regression');
    console.log('TALERA_SCOPED_ACTUAL_BACKUP_AND_RENDER_REGRESSION_PASS');
    break backupRegression;
  }
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
    // This synthetic 4.6-second voice must stay active while headless Chrome
    // decodes the video and we check the FIRST live swipe movement.
    // Its natural end is tested separately; never let it auto-advance here.
    // This changes test input only, not shipped TALERA playback code.
    voice.loop=true;
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

  if(!(firstMediaCover.pixel[2]>firstMediaCover.pixel[0]*1.4&&
    firstMediaCover.pixel[2]>firstMediaCover.pixel[1]*1.4)){
    // Do not waive the blue-first-frame assertion. Identify whether the
    // encrypted local poster itself is black or only the presented image.
    const stored=await page.evaluate(async id=>{
      const m=window.__taleraTimelineRuntime.currentMemory();
      const first=m._zeroItems.find(it=>it.kind==='video');
      const blob=await window.TaleraMemories.blob(first.key+':phone-v1');
      if(!blob)return {posterPresent:false};
      const url=URL.createObjectURL(blob);
      try{
        const img=new Image();img.src=url;await img.decode();
        const c=document.createElement('canvas');c.width=32;c.height=32;
        const g=c.getContext('2d',{willReadFrequently:true});
        g.drawImage(img,0,0,32,32);
        return {posterPresent:true,type:blob.type,size:blob.size,
          storedPixel:Array.from(g.getImageData(16,16,1,1).data).slice(0,3),
          videoPlaying:!!document.querySelector('video.talera-v61-inline-video') &&
            !document.querySelector('video.talera-v61-inline-video').paused};
      }finally{URL.revokeObjectURL(url)}
    },videoFirst.id).catch(e=>({inspectionError:String(e)}));
    console.error('TALERA_FIRST_VIDEO_ORIGINAL_POSTER_DIAGNOSTIC',
      JSON.stringify({stored,cover:firstMediaCover,syntheticOnly:true}));
  }
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

  // Owner acceptance: for memories dated on the SAME calendar day with no
  // explicit event time, their original creation order must be the
  // left-to-right order. Never invent an event time or change media/IDs.
  const sameDayPosts=await page.evaluate(async()=>{
    const ids=[],creation=[];
    for(let n=0;n<3;n++){
      const canvas=document.createElement('canvas');canvas.width=canvas.height=24;
      const context=canvas.getContext('2d');
      context.fillStyle=['#c83242','#399b4d','#325ab7'][n];
      context.fillRect(0,0,24,24);
      const image=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
      const story=await window.TaleraMemories.save({
        title:'Chronological post '+(n+1),date:'2026-11-23',
        text:'Owner same-day no-time ordering contract'
      },[new File([image],'chrono-'+n+'.png',{type:'image/png'})]);
      ids.push(story.id);
      creation.push((await window.TaleraMemories.get(story.id))?.createdAt);
      await new Promise(ok=>setTimeout(ok,65));
    }
    return {ids,creation};
  });
  assert.equal(new Set(sameDayPosts.ids).size,3);
  assert.ok(sameDayPosts.creation.every(Boolean),
    'Original local record creation timestamps must be retained');
  const checkSameDateOrder=async()=>{
    await load(page,sameDayPosts.ids[0],1);
    await page.waitForFunction(ids=>ids.every(id=>
      window.__taleraPhotoBook?.list()?.some(m=>m.storyId===id)),
      sameDayPosts.ids,{timeout:15000});
    return page.evaluate(ids=>{
      const all=window.__taleraPhotoBook.list();
      const positions=ids.map(id=>all.findIndex(m=>m.storyId===id));
      const times=ids.map(id=>all.find(m=>m.storyId===id)?.ms);
      return {positions,times,storyCount:all.length};
    },sameDayPosts.ids);
  };
  const sameDateBeforeReopen=await checkSameDateOrder();
  assert.ok(sameDateBeforeReopen.positions[0]<sameDateBeforeReopen.positions[1]&&
    sameDateBeforeReopen.positions[1]<sameDateBeforeReopen.positions[2],
    'Same-day posts without event times must be chronological from first to LAST: '+
    JSON.stringify({stored:sameDayPosts.creation,order:sameDateBeforeReopen}));
  // Reopen the same original /present route; no app reinstall or data reset.
  const sameDateAfterReopen=await checkSameDateOrder();
  assert.deepEqual(sameDateAfterReopen.positions,sameDateBeforeReopen.positions,
    'Same-day chronological order must survive a fresh page load');
  console.log('TALERA_SAME_DATE_POST_CREATION_ORDER_PASS',
    JSON.stringify({chronological:true,originalMediaIds:true,
      originalEventDate:true,storedCreationTimestamps:true,
      realIphoneAccepted:false}));

  // Owner-approved large HOME image: random private original photo from the
  // year under the EXISTING indicator, without changing playback or storage.
  // This runs on the SAME local TALERA app/account and is synthetic only.
  const yearHeroRecords=await page.evaluate(async()=>{
    const makePhoto=async(color,name)=>{
      const c=document.createElement('canvas');c.width=c.height=40;
      c.getContext('2d').fillStyle=color;c.getContext('2d').fillRect(0,0,40,40);
      const blob=await new Promise(ok=>c.toBlob(ok,'image/png'));
      return new File([blob],name+'.png',{type:'image/png'});
    };
    const older=await window.TaleraMemories.save({
      title:'Year slider 2024 original photos',date:'2024-06-15',
      text:'Synthetic in-app hero contract'
    },[await makePhoto('#d42135','red'),await makePhoto('#29aa42','green')]);
    const newer=await window.TaleraMemories.save({
      title:'Year slider 2025 original photo',date:'2025-08-10',
      text:'Synthetic in-app hero contract'
    },[await makePhoto('#2356bd','blue')]);
    return {older:older.id,newer:newer.id};
  });
  await page.goto(origin+'/mijn-leven',{waitUntil:'domcontentloaded'});
  try{
    await page.waitForFunction(async ids=>{
      const saved=await window.TaleraMemories?.list?.();
      const slider=document.getElementById('v17-year-slider');
      return Array.isArray(saved)&&ids.every(id=>saved.some(s=>s.id===id))&&
        Number(slider?.max)>=2026;
    },[yearHeroRecords.older,yearHeroRecords.newer],{timeout:20000});
  }catch(error){
    const state=await page.evaluate(async()=>{
      const saved=await window.TaleraMemories?.list?.()||[];
      return {dates:saved.map(m=>[m.id,m.date]),year:
        document.getElementById('v17-selected-year')?.textContent,
        summary:document.getElementById('v17-year-summary')?.textContent,
        slider:[document.getElementById('v17-year-slider')?.min,
          document.getElementById('v17-year-slider')?.max],
        hero:document.getElementById('heroTitle')?.textContent};
    });
    throw Error('SAME_HOME_YEAR_FIXTURE_READBACK '+JSON.stringify(state)+' '+String(error));
  }
  const chooseOriginalYear=async(year,id)=>{
    const yearEventDiagnostic=await page.evaluate(y=>{
      // Deterministic RNG only INSIDE technical test. Product uses Math.random.
      window.Math.random=()=>.999;
      const rail=document.getElementById('v17-year-slider');
      const inspect=()=>({value:rail.value,min:rail.min,max:rail.max,type:rail.type,
        selected:document.getElementById('v17-selected-year')?.textContent,
        summary:document.getElementById('v17-year-summary')?.textContent});
      const before=inspect();
      rail.value=String(y);
      const set=inspect();
      rail.dispatchEvent(new Event('input',{bubbles:true}));
      const input=inspect();
      rail.dispatchEvent(new Event('change',{bubbles:true}));
      const change=inspect();
      return {year:y,before,set,input,change};
    },year);
    console.log('TALERA_HOME_SLIDER_OWNER_RANDOM_DIAGNOSTIC',
      JSON.stringify(yearEventDiagnostic));
    try{
      await page.waitForFunction(([y,href])=>{
        const hero=document.getElementById('heroCaption');
        const image=document.getElementById('heroImage');
        return document.getElementById('v17-selected-year')?.textContent===String(y)&&
          hero?.dataset.presentHref===href&&image?.hasAttribute('src');
      },[year,'/present?memory='+encodeURIComponent(id)],{timeout:18000});
    }catch(e){
      const diag=await page.evaluate(async()=>{
        const own=await window.TaleraMemories?.list?.()||[];
        return {year:document.getElementById('v17-selected-year')?.textContent,
          summary:document.getElementById('v17-year-summary')?.textContent,
          rail:document.getElementById('v17-year-slider')?.value,
          cover:document.getElementById('heroImage')?.getAttribute('src'),
          title:document.getElementById('heroTitle')?.textContent,
          href:document.getElementById('heroCaption')?.dataset.presentHref,
          captionDisplay:getComputedStyle(document.getElementById('heroCaption')).display,
          displayUrlType:typeof window.TaleraMemories?.displayUrl,
          rows:own.map(m=>({id:m.id,date:m.date,
            photoKeys:(m.items||[]).filter(i=>i.kind==='photo').map(i=>i.key)}))};
      });
      throw Error('OWNER_RANDOM_YEAR_HERO_DIAGNOSTIC '+JSON.stringify(diag)+
        ' PAGE_ERRORS='+JSON.stringify(errors.slice(-9))+' '+String(e));
    }
    return page.evaluate(async()=>{
      const image=document.getElementById('heroImage');
      await image.decode();
      const c=document.createElement('canvas');c.width=c.height=12;
      c.getContext('2d').drawImage(image,0,0,12,12);
      return [...c.getContext('2d').getImageData(6,6,1,1).data].slice(0,3);
    });
  };
  const greenYear=await chooseOriginalYear(2024,yearHeroRecords.older);
  assert.ok(greenYear[1]>greenYear[0]*1.5&&greenYear[1]>greenYear[2]*1.5,
    'Selected-year random photo did not choose second ORIGINAL 2024 picture: '+
    JSON.stringify(greenYear));
  const blueYear=await chooseOriginalYear(2025,yearHeroRecords.newer);
  assert.ok(blueYear[2]>blueYear[0]*1.5&&blueYear[2]>blueYear[1]*1.5,
    'Hero kept old year or old photo instead of original 2025 media: '+
    JSON.stringify(blueYear));
  // Empty years may not borrow a photo/title from another calendar year.
  await page.evaluate(()=>{
    const rail=document.getElementById('v17-year-slider');
    rail.value='2023';
    rail.dispatchEvent(new Event('input',{bubbles:true}));
    rail.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.getElementById('v17-selected-year')?.textContent==='2023'&&
    !document.getElementById('heroImage')?.hasAttribute('src')&&
    getComputedStyle(document.getElementById('heroCaption')).display==='none',
    null,{timeout:10000});
  // Original records/IDs and media must remain in same account-local catalog.
  assert.ok(await page.evaluate(async ids=>{
    for(const id of ids)if(!(await window.TaleraMemories.get(id)))return false;
    return true;
  },[yearHeroRecords.older,yearHeroRecords.newer]));
  console.log('TALERA_HOME_RANDOM_PHOTO_SELECTED_YEAR_PASS',
    JSON.stringify({originalYearIndicator:true,randomAcrossPhotos:true,
      switchAfterSliderRelease:true,emptyYearDoesNotShowAnotherYear:true,
      storedRecordsPreserved:true,presentationUntouched:true,
      realIphoneAccepted:false}));

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

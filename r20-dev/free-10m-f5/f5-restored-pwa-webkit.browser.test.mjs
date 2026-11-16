// TALERA Free F5: the SAME local Worker and original /mijn-leven + /present
// in WebKit (Safari engine), never a second app/worker/repository.
// Disposable synthetic data only. Validates first restore -> Home -> tap ->
// presentation -> Back without losing local picture or changing media bytes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium,webkit,devices} from 'playwright';
const here=path.dirname(fileURLToPath(import.meta.url));
const origin='http://127.0.0.1:8837',gate='1'.repeat(64);
const bounded=(name,op,ms=18000)=>Promise.race([op,
  new Promise((_,reject)=>setTimeout(()=>reject(Error('WEBKIT_STAGE_TIMEOUT_'+name)),ms))]);
let worker=null,browser=null,sourceBrowser=null,log='';
async function stop(){
  if(browser)await browser.close().catch(()=>{});
  if(sourceBrowser)await sourceBrowser.close().catch(()=>{});
  if(worker&&!worker.killed)worker.kill('SIGTERM');
}
async function boot(){
  worker=spawn(path.resolve('node_modules/.bin/wrangler'),[
    'dev','--local','--ip','127.0.0.1','--port','8837',
    '--config',path.join(here,'wrangler.jsonc'),
    '--persist-to',path.join(here,'generated','webkit-restored-local'),
    '--var','STAGING_F5_KEY:'+gate,
    '--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
    '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
    '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_F5_PRESENTATION_ONLY_LOCAL_TEST_KEY',
    '--var','DEMO_IDENTITY_KEY:SYNTHETIC_F5_PRESENTATION_ONLY_LOCAL_SOCIAL_KEY',
    '--log-level','error'
  ],{env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore','pipe','pipe']});
  for(const stream of [worker.stdout,worker.stderr])
    stream.on('data',x=>log=(log+x.toString()).slice(-4000));
  for(let i=0;i<120;i++){
    if(worker.exitCode!==null)throw Error('Original Free Worker stopped '+log);
    try{
      if((await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(1000)})).status===200)return;
    }catch{}
    await new Promise(r=>setTimeout(r,270));
  }
  throw Error('Original Free Worker did not start: '+log);
}
try{
  await boot();
  const suffix=Date.now().toString(36);
  const response=await fetch(origin+'/api/register',{method:'POST',
    headers:{origin,'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.92',
      'content-type':'application/json'},
    body:JSON.stringify({email:'webkit-'+suffix+'@example.invalid',
      username:'wk'+suffix.slice(-8),displayName:'WebKit restored photo test',
      password:'Synthetic_Free_Only_Roll_2026',birthDate:'1974-04-02'})});
  assert.equal(response.status,200,'Synthetic account register '+(await response.text()).slice(0,200));
  const sid=/talera_sid=([a-f0-9]{64})/.exec(response.headers.get('set-cookie')||'')?.[1];
  assert.ok(sid);
  // Source is a disposable existing Free PWA Chrome instance, just as the
  // user's OLDER install produced the backup. Only the TARGET WebKit engine
  // needs to consume it; WebKit/Linux may lack camera-File IDB writes.
  sourceBrowser=await chromium.launch({headless:true});
  browser=await webkit.launch({headless:true});
  const mkContext=async(engine)=>{
    const ctx=await engine.newContext({...devices['iPhone 13'],
      extraHTTPHeaders:{'x-talera-f5-key':gate}});
    await ctx.addCookies([{name:'talera_sid',value:sid,
      domain:'127.0.0.1',path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
    return ctx;
  };
  const source=await mkContext(sourceBrowser),target=await mkContext(browser);
  const a=await source.newPage(),b=await target.newPage();
  b.on('console',msg=>{if(msg.text().startsWith('WEBKIT_RESTORE_'))console.log('TALERA_WEBKIT_DETAIL',msg.text())});
  b.on('pageerror',err=>console.log('TALERA_WEBKIT_PAGEERROR',err.message));
  assert.equal((await a.goto(origin+'/mijn-leven')).status(),200);
  await a.waitForFunction(()=>typeof window.TaleraMemories?.save==='function',
    null,{timeout:18000});
  console.log('TALERA_WEBKIT_STAGE_SOURCE_SAVE');
  const story=await bounded('source-save',a.evaluate(async()=>{
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=160;
    const cx=canvas.getContext('2d');
    cx.fillStyle='#db1937';cx.fillRect(0,0,160,160);
    const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
    const row=await window.TaleraMemories.save({title:'WebKit restored original',
      date:'2026-11-11',time:'11:11:11',text:'Restored original image'},
      [new File([blob],'webkit-original.png',{type:'image/png'})]);
    return {id:row.id,bytes:blob.size};
  }),18000);
  assert.ok(story.bytes>150);
  await a.goto(origin+'/__f5/backup');
  console.log('TALERA_WEBKIT_STAGE_SOURCE_ARCHIVE');
  const archived=await bounded('source-archive',a.evaluate(async()=>{
    const db=document.getElementById('talera-free-backup')?.dataset.database;
    const {exportExistingFreeLibrary}=await import('/__f5/f5-portable-idb.mjs');
    const file=await exportExistingFreeLibrary(db);
    const bytes=new Uint8Array(await file.arrayBuffer());
    return Array.from(bytes);
  }),18000);
  assert.ok(archived.length>600);
  await b.goto(origin+'/mijn-leven');
  await b.waitForFunction(()=>!!window.TaleraMemories?.list,
    null,{timeout:18000});
  // The Linux WebKit engine cannot reliably persist a newly created File/Blob
  // to IndexedDB (pre-existing environment limitation). Test the RESTORE path
  // directly using the lossless archive created in the same app by Chromium.
  // The original local media IDs, rendering and Back assertions remain below.
  await b.goto(origin+'/__f5/backup');
  // Diagnostic only: prove whether Playwright's Linux WebKit can write even
  // one native File to the EXISTING synthetic account's IndexedDB.
  // These one-off records are not owner memories or a separate test app.
  console.log('TALERA_WEBKIT_STAGE_NATIVE_INDEXEDDB_FILE_CANARY');
  const nativeCanary=await bounded('native-file-canary',b.evaluate(async()=>{
    const name=document.getElementById('talera-free-backup')?.dataset.database;
    const opened=indexedDB.open(name,1);
    const db=await new Promise((ok,no)=>{
      opened.onsuccess=()=>ok(opened.result);
      opened.onerror=()=>no(opened.error);
    });
    const probe=async(type)=>{
      const key='__talera_webkit_native_file_test_'+type;
      const payload=type==='blob'?
        new Blob([new Uint8Array([1,2,3,4,5,6,7])],{type:'image/png'}):
        new File([new Uint8Array([1,2,3,4,5,6,7])],
          'test-only.png',{type:'image/png'});
      console.log('WEBKIT_RESTORE_CANARY_BEGIN',type,payload.constructor.name);
      const result=await new Promise(resolve=>{
        const tx=db.transaction('files','readwrite');
        let ended=false;
        const finish=(state)=>{
          if(ended)return;ended=true;clearTimeout(timer);resolve(state);
        };
        const timer=setTimeout(()=>{
          console.log('WEBKIT_RESTORE_CANARY_NATIVE_TIMEOUT',type);
          try{tx.abort()}catch{}
          finish('timeout');
        },6000);
        tx.oncomplete=()=>finish('complete');
        tx.onabort=()=>finish('abort:'+String(tx.error));
        tx.onerror=()=>console.log('WEBKIT_RESTORE_CANARY_TX_ERROR',type);
        const req=tx.objectStore('files').add({key,blob:payload});
        req.onsuccess=()=>console.log('WEBKIT_RESTORE_CANARY_REQUEST_SUCCESS',type);
        req.onerror=()=>console.log('WEBKIT_RESTORE_CANARY_REQUEST_ERROR',type,String(req.error));
      });
      console.log('WEBKIT_RESTORE_CANARY_RESULT',type,result);
      return result;
    };
    try{
      const blob=await probe('blob');
      if(blob!=='complete')return {blob,file:'not-run'};
      const file=await probe('file');
      return {blob,file};
    }finally{db.close()}
  }),16500);
  console.log('TALERA_WEBKIT_NATIVE_FILE_CANARY_RESULT',JSON.stringify(nativeCanary));
  assert.deepEqual(nativeCanary,{blob:'complete',file:'complete'},
    'Linux WebKit cannot persist a native File/Blob to the same account-private IndexedDB: '+
    JSON.stringify(nativeCanary));
  console.log('TALERA_WEBKIT_STAGE_TARGET_RESTORE');
  const imported=await bounded('target-restore',b.evaluate(async bytes=>{
    const db=document.getElementById('talera-free-backup')?.dataset.database;
    console.log('WEBKIT_RESTORE_DATABASE_SELECTED',String(db||'').length);
    const {previewFreeLibraryRestore,restoreFreeLibrary}=
      await import('/__f5/f5-portable-idb.mjs');
    console.log('WEBKIT_RESTORE_MODULE_LOADED');
    const blob=new Blob([new Uint8Array(bytes)],{type:'application/octet-stream'});
    console.log('WEBKIT_RESTORE_ARCHIVE_BYTES',blob.size);
    const preview=await previewFreeLibraryRestore(blob,db,{allowOtherOrigin:true});
    console.log('WEBKIT_RESTORE_PREVIEW_COMPLETE',preview.storyCount,preview.mediaStoreEntries);
    if(!preview.safeToRestore)throw Error('Fresh WebKit restore denied');
    const done=await restoreFreeLibrary(blob,db,{allowOtherOrigin:true,confirmed:true});
    console.log('WEBKIT_RESTORE_COMMIT_COMPLETE',done.restoredStories,done.readbackPassed);
    return done;
  },archived),22000);
  assert.equal(imported.restoredStories,1);
  assert.equal(imported.readbackPassed,true);
  console.log('TALERA_WEBKIT_STAGE_HOME_RENDER');
  await b.goto(origin+'/mijn-leven');
  await b.waitForFunction(()=>document.getElementById('heroImage')?.src.startsWith('blob:')&&
    document.getElementById('heroImage').naturalWidth>0,
    null,{timeout:23000});
  const home=await b.evaluate(()=>{
    const img=document.getElementById('heroImage');
    return {src:img.src,width:img.naturalWidth,href:
      document.getElementById('heroCaption')?.dataset.presentHref||null};
  });
  assert.ok(home.href?.includes(story.id),'Owner hero must link to restored record: '+JSON.stringify(home));
  console.log('TALERA_WEBKIT_STAGE_PRESENT_CLICK');
  await b.locator('.hero').click();
  await b.waitForURL(/\/present/,{timeout:18000});
  await b.waitForFunction(id=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    return m?.storyId===id&&!m._photoLoading&&m.photos?.[0]?.startsWith('blob:');
  },story.id,{timeout:25000});
  const presented=await b.evaluate(async()=>{
    const m=window.__taleraTimelineRuntime.currentMemory();
    const images=[...document.querySelectorAll('#photoStage img')];
    return {storyId:m.storyId,
      originalPresent:!!(await window.TaleraMemories.blob(m._zeroItems[0].key)),
      images:images.filter(x=>x.complete&&x.naturalWidth>0&&
        x.src===m.photos[0]).map(x=>({width:x.naturalWidth,
        visible:getComputedStyle(x).visibility!=='hidden'&&
          getComputedStyle(x).display!=='none'}))};
  });
  assert.ok(presented.originalPresent&&presented.images.some(x=>x.visible),
    'WebKit returned an EMPTY image after opening restored memory: '+JSON.stringify(presented));
  await b.goBack({waitUntil:'domcontentloaded'});
  await b.waitForFunction(()=>document.getElementById('heroImage')?.naturalWidth>0,
    null,{timeout:18000});
  const returned=await b.evaluate(async()=>{
    const src=document.getElementById('heroImage').src;
    return {srcIsBlob:src.startsWith('blob:'),
      fetchOk:await fetch(src).then(r=>r.ok).catch(()=>false),
      imageWidth:document.getElementById('heroImage').naturalWidth};
  });
  assert.ok(returned.srcIsBlob&&returned.fetchOk&&returned.imageWidth>0,
    'WebKit lost Home image after returning from real presentation: '+JSON.stringify(returned));
  console.log('TALERA_SAME_PWA_WEBKIT_RESTORE_HOME_PRESENT_BACK_PASS',
    JSON.stringify({sourceStoryBytes:story.bytes,restoredRecords:imported.restoredStories,
      initiallyVisible:home.width,originalVisibleInPresentation:true,
      returnedPhotoVisible:returned.imageWidth,
      actualIPhonePwaAcceptance:false,customerDataUsed:false}));
}finally{await stop()}

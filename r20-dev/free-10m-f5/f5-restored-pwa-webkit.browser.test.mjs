// TALERA Free F5: the SAME local Worker and original /mijn-leven + /present
// in WebKit (Safari engine), never a second app/worker/repository.
// Disposable synthetic data only. Validates first restore -> Home -> tap ->
// presentation -> Back without losing local picture or changing media bytes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {webkit,devices} from 'playwright';
const here=path.dirname(fileURLToPath(import.meta.url));
const origin='http://127.0.0.1:8837',gate='1'.repeat(64);
let worker=null,browser=null,log='';
async function stop(){
  if(browser)await browser.close().catch(()=>{});
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
    '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_WEBKIT_F5_ONLY_KEY',
    '--var','DEMO_IDENTITY_KEY:SYNTHETIC_WEBKIT_F5_ONLY_SOCIAL',
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
  browser=await webkit.launch({headless:true});
  const mkContext=async()=>{
    const ctx=await browser.newContext({...devices['iPhone 13'],
      extraHTTPHeaders:{'x-talera-f5-key':gate}});
    await ctx.addCookies([{name:'talera_sid',value:sid,
      domain:'127.0.0.1',path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
    return ctx;
  };
  const source=await mkContext(),target=await mkContext();
  const a=await source.newPage(),b=await target.newPage();
  assert.equal((await a.goto(origin+'/mijn-leven')).status(),200);
  await a.waitForFunction(()=>typeof window.TaleraMemories?.save==='function',
    null,{timeout:18000});
  const story=await a.evaluate(async()=>{
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=160;
    const cx=canvas.getContext('2d');
    cx.fillStyle='#db1937';cx.fillRect(0,0,160,160);
    const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
    const row=await window.TaleraMemories.save({title:'WebKit restored original',
      date:'2026-11-11',time:'11:11:11',text:'Restored original image'},
      [new File([blob],'webkit-original.png',{type:'image/png'})]);
    return {id:row.id,bytes:blob.size};
  });
  assert.ok(story.bytes>150);
  await a.goto(origin+'/__f5/backup');
  const archived=await a.evaluate(async()=>{
    const db=document.getElementById('talera-free-backup')?.dataset.database;
    const {exportExistingFreeLibrary}=await import('/__f5/f5-portable-idb.mjs');
    const file=await exportExistingFreeLibrary(db);
    const bytes=new Uint8Array(await file.arrayBuffer());
    return Array.from(bytes);
  });
  assert.ok(archived.length>600);
  await b.goto(origin+'/mijn-leven');
  await b.waitForFunction(()=>!!window.TaleraMemories?.list,
    null,{timeout:18000});
  await b.goto(origin+'/__f5/backup');
  const imported=await b.evaluate(async bytes=>{
    const db=document.getElementById('talera-free-backup')?.dataset.database;
    const {previewFreeLibraryRestore,restoreFreeLibrary}=
      await import('/__f5/f5-portable-idb.mjs');
    const blob=new Blob([new Uint8Array(bytes)],{type:'application/octet-stream'});
    const preview=await previewFreeLibraryRestore(blob,db,{allowOtherOrigin:true});
    if(!preview.safeToRestore)throw Error('Fresh WebKit restore denied');
    return restoreFreeLibrary(blob,db,{allowOtherOrigin:true,confirmed:true});
  },archived);
  assert.equal(imported.restoredStories,1);
  assert.equal(imported.readbackPassed,true);
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

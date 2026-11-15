// Same approved TALERA Free candidate, local browser proof only.
// No customer media, no second app, no Cloudflare write, no narrated changes.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium,devices} from 'playwright';

const home=path.dirname(fileURLToPath(import.meta.url));
const generated=path.join(home,'generated');
mkdirSync(generated,{recursive:true});
const origin='http://127.0.0.1:8837',gate='1'.repeat(64);
let worker,browser,logs='';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  worker=spawn(path.resolve('node_modules/.bin/wrangler'),[
    'dev','--local','--ip','127.0.0.1','--port','8837',
    '--config',path.join(home,'wrangler.jsonc'),
    '--persist-to',path.join(generated,'ordinary-present-local'),
    '--var','STAGING_F5_KEY:'+gate,'--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
    '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
    '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_F5_PRESENTATION_ONLY_LOCAL_TEST_KEY',
    '--var','DEMO_IDENTITY_KEY:SYNTHETIC_F5_PRESENTATION_ONLY_LOCAL_SOCIAL_KEY',
    '--log-level','error'
  ],{env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore','pipe','pipe']});
  for(const output of [worker.stdout,worker.stderr])output.on('data',d=>logs=(logs+d.toString()).slice(-2500));
  let healthy=false;
  for(let i=0;i<120;i++){
    if(worker.exitCode!==null)throw Error('Local TALERA worker stopped '+logs);
    try{if((await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(600)})).status===200){healthy=true;break}}catch{}
    await wait(280);
  }
  assert.ok(healthy,'Same F5 TALERA candidate did not start '+logs);
  const tag=Date.now().toString(36);
  const result=await fetch(origin+'/api/register',{method:'POST',headers:{
    origin,'x-talera-f5-key':gate,'cf-connecting-ip':'192.0.2.55',
    'content-type':'application/json'
  },body:JSON.stringify({email:'video-'+tag+'@example.invalid',
    username:'video'+tag.slice(-9),displayName:'Local ordinary video regression',
    password:'Synthetic_TALERA_Ordinary_Test_2026',birthDate:'1974-04-02'})});
  assert.equal(result.status,200,'Synthetic registration must succeed: '+(await result.text()).slice(0,400));
  const sid=/talera_sid=([a-f0-9]{64})/.exec(result.headers.get('set-cookie')||'')?.[1];
  assert.ok(sid,'Synthetic cookie missing');
  browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const ctx=await browser.newContext({...devices['iPhone 13'],extraHTTPHeaders:{'x-talera-f5-key':gate}});
  await ctx.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',
    path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/present',{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.TaleraMemories?.save,null,{timeout:18000});
  const clip=path.join(generated,'ordinary-original-video.webm');
  // Browser-playable synthetic audio + video. iPhone MOV/HEVC still needs device acceptance.
  execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=blue:s=160x120:d=1',
    '-f','lavfi','-i','sine=frequency=440:duration=1',
    '-shortest','-c:v','libvpx','-b:v','160k','-c:a','libopus',
    '-b:a','64k',clip],
    {timeout:30000,stdio:'ignore'});
  const codec=execFileSync('ffprobe',['-v','error','-show_entries',
    'stream=codec_type','-of','default=noprint_wrappers=1:nokey=1',clip],
    {encoding:'utf8'});
  assert.ok(codec.split(/\s+/).includes('audio'),'Synthetic original video must contain actual soundtrack');
  const id=await page.evaluate(async b64=>{
    const files=await Promise.all(['#ef1523','#27d128'].map(async(c,i)=>{
      const el=document.createElement('canvas');el.width=140;el.height=140;
      const p=el.getContext('2d');p.fillStyle=c;p.fillRect(0,0,140,140);
      const blob=await new Promise(resolve=>el.toBlob(resolve,'image/png'));
      return new File([blob],'test-'+i+'.png',{type:'image/png'});
    }));
    files.push(new File([Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0))],
      'source.webm',{type:'video/webm'}));
    const row=await window.TaleraMemories.save({
      title:'Ordinary only',date:'2026-11-11',text:'Non-narrated media',
      narrationCues:[],narrationDurationMs:0
    },files);
    return row.id;
  },readFileSync(clip).toString('base64'));
  await page.goto(origin+'/present?memory='+id,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(id=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    return m?.storyId===id&&!m._photoLoading&&m._zeroFrames?.length===3;
  },id,{timeout:18000});
  // Read the REAL persisted Settings contract before any test simulates it.
  // This checks that the on/off preference survives navigation/reload, unlike
  // the later controlled Safari-denial experiment that replaces isEnabled().
  const settingsKey='talera-v61-listening-intent-r8';
  const previousIntent=await page.evaluate(key=>localStorage.getItem(key),settingsKey);
  const realPreferenceChecks=[];
  for(const [stored,expected] of [['off',false],['on',true]]){
    await page.evaluate(({key,stored})=>localStorage.setItem(key,stored),
      {key:settingsKey,stored});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(id=>{
      const m=window.__taleraTimelineRuntime?.currentMemory?.();
      return typeof window.__taleraAudioControls?.isEnabled==='function'&&
        m?.storyId===id&&!m._photoLoading&&m._zeroFrames?.length===3;
    },id,{timeout:18000});
    const actual=await page.evaluate(key=>({
      stored:localStorage.getItem(key),
      actualEnabled:window.__taleraAudioControls.isEnabled(),
      narratorPresent:!!document.querySelector('.talera-independent-narrator-layer'),
      voiceItem:!!window.__taleraTimelineRuntime.currentMemory()?._zeroItems?.some(x=>x.kind==='audio')
    }),settingsKey);
    assert.equal(actual.stored,stored,'Existing Settings intent must persist through reload');
    assert.equal(actual.actualEnabled,expected,
      'REAL Settings on/off must reach the ordinary-video audio contract');
    assert.equal(actual.narratorPresent,false,
      'An ordinary memory must never initialize the voice engine');
    assert.equal(actual.voiceItem,false,'Sound preference test must use ordinary memory');
    realPreferenceChecks.push(actual);
  }
  await page.evaluate(({key,value})=>{
    if(value===null)localStorage.removeItem(key);
    else localStorage.setItem(key,value);
  },{key:settingsKey,value:previousIntent});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(id=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    return typeof window.__taleraAudioControls?.isEnabled==='function'&&
      m?.storyId===id&&!m._photoLoading&&m._zeroFrames?.length===3;
  },id,{timeout:18000});
  console.log('TALERA_REAL_PERSISTED_AUDIO_SETTINGS_PASS',
    JSON.stringify({checks:realPreferenceChecks,originalPreferenceRestored:true,
      testAppOnly:true,realIPhoneAccepted:false}));

  await page.evaluate(()=>{
    // Setting OFF: keep the original video moving with its soundtrack muted.
    const listening=window.__taleraAudioControls;
    if(!listening||typeof listening.isEnabled!=='function')throw Error('Audio preference contract missing');
    listening.isEnabled=()=>false;
    if(listening.isEnabled()!==false)throw Error('Could not simulate listening preference OFF');
    window.__taleraOrdinaryVideoSnapshots=[];
    window.__taleraOrdinaryVideoObserved=false;
    const observedSources=new Set();
    const observer=new MutationObserver(records=>{
      for(const record of records){
        const candidates=record.type==='attributes'?[record.target]:
          [...record.addedNodes].filter(x=>x.nodeType===1).flatMap(node=>{
            const found=node.matches?.('video.talera-v61-inline-video')?node:
              node.querySelector?.('video.talera-v61-inline-video');
            return found?[found]:[];
          });
        for(const video of candidates){
          if(!video.matches?.('video.talera-v61-inline-video'))continue;
          const source=video.getAttribute('src');
          if(!source?.startsWith('blob:')||observedSources.has(source))continue;
          observedSources.add(source);
          window.__taleraOrdinaryVideoObserved=true;
          const snapshot={muted:video.muted,
            defaultMuted:video.defaultMuted,volume:video.volume,played:false,
            listeningEnabled:window.__taleraAudioControls?.isEnabled?.(),events:[],
            samePlayer:window.__taleraOrdinaryVideoSnapshots.length===0||
              video===window.__taleraFirstOrdinaryVideo};
          if(!window.__taleraFirstOrdinaryVideo)window.__taleraFirstOrdinaryVideo=video;
          window.__taleraOrdinaryVideoSnapshots.push(snapshot);
          for(const kind of ['loadstart','loadedmetadata','play','playing','timeupdate','pause','ended','error']){
            video.addEventListener(kind,()=>{
              if(snapshot.events.length<25)snapshot.events.push(kind+':'+video.currentTime.toFixed(2));
              if(kind==='playing'||kind==='timeupdate'&&video.currentTime>.04)snapshot.played=true;
            });
          }
        }
      }
    });
    observer.observe(document.documentElement,{
      childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    window.__taleraOrdinaryVideoObserver=observer;
  });
  // No manual selection: wait for the normal photo timer to bring the video into view.
  await page.waitForFunction(()=>window.__taleraOrdinaryVideoObserved,null,{timeout:18000});
  const info=()=>page.evaluate(()=>{
    const m=window.__taleraTimelineRuntime?.currentMemory?.();
    const v=document.querySelector('video.talera-v61-inline-video');
    return {idx:m?._photoIndex,id:m?.storyId,kind:m?._zeroFrames?.[m?._photoIndex]?.kind,
      player:!!v,paused:v?.paused,ended:v?.ended,current:v?.currentTime,
      duration:v?.duration,ready:v?.readyState,network:v?.networkState,
      error:v?.error?.code,muted:v?.muted,src:v?.currentSrc?.startsWith('blob:'),
      voiceAudio:!!window.__taleraInlineSharedAudio};
  });
  const immediate=await info();
  try{
    await page.waitForFunction(()=>window.__taleraOrdinaryVideoSnapshots?.[0]?.played,
      null,{timeout:4500});
  }catch(error){
    const diag=await page.evaluate(()=>({
      samples:window.__taleraOrdinaryVideoSnapshots,
      active:document.querySelector('video.talera-v61-inline-video')?.outerHTML,
      memory:window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex,
      hintCount:document.querySelectorAll('button.talera-v61-audio-permission-hint').length
    }));
    throw Error('Automatic ordinary muted playback did not report playing: '+JSON.stringify(diag));
  }
  await wait(2200);
  const silentAfter=await info();
  const silent=await page.evaluate(()=>window.__taleraOrdinaryVideoSnapshots[0]);
  assert.equal(silent.listeningEnabled,false,'Test must simulate the real menu setting OFF');
  assert.equal(silent.muted,true,'Setting OFF must mute the original video soundtrack');
  assert.equal(silent.defaultMuted,true,'Setting OFF must set muted as the video default');
  assert.equal(silent.volume,1,'Setting OFF must not modify the original stored file or volume');
  assert.equal(silentAfter.idx,0,'Silent video must return to ordinary photo rotation after ending');
  // Switch the same existing Settings contract ON before the next automatic cycle.
  await page.evaluate(()=>{window.__taleraAudioControls.isEnabled=()=>true});
  await page.waitForFunction(()=>window.__taleraOrdinaryVideoSnapshots?.length>=2,
    null,{timeout:18000});
  await page.waitForFunction(()=>window.__taleraOrdinaryVideoSnapshots?.[1]?.played,
    null,{timeout:10000});
  const audible=await page.evaluate(()=>window.__taleraOrdinaryVideoSnapshots[1]);
  assert.equal(audible.listeningEnabled,true,'Test must simulate the real menu setting ON');
  assert.equal(audible.muted,false,'Setting ON must request the original audible soundtrack');
  assert.equal(audible.defaultMuted,false,'Setting ON must clear default mute');
  assert.equal(audible.volume,1,'Original video soundtrack must retain its full playback volume');
  assert.equal(audible.samePlayer,true,'Same ordinary media element must be retained across video rotations');
  assert.equal(await page.locator('button.talera-v61-audio-permission-hint').count(),0,
    'Ordinary video must never show its own duplicate Listen button');
  // Keep the same observer active for the simulated Safari denial and later video.
  await wait(2200);
  const after=await info();
  console.log('TALERA_ORDINARY_VIDEO_SETTINGS_DIAGNOSTIC',
    JSON.stringify({immediate,silentAfter,after,silent,audible,errors}));
  assert.equal(after.voiceAudio,false,'Ordinary player must not instantiate narrated audio');
  assert.equal(after.id,id,'Correct memory must stay selected');
  assert.equal(after.idx,0,'Original ordinary video must return to first photo after ending');
  // No hidden audio-authorization listener on Back or the entire document.
  // The Settings flag is read again for EVERY video, even if Safari denied
  // the preceding video's sound and it continued muted.
  await page.evaluate(id=>{
    const originalPlay=HTMLMediaElement.prototype.play;
    window.__taleraAutoPlayAttempts=[];
    window.__taleraDenyNextAudible=true;
    HTMLMediaElement.prototype.play=function(...args){
      if(this.classList?.contains('talera-v61-inline-video')){
        window.__taleraAutoPlayAttempts.push({
          muted:this.muted,source:this.getAttribute('src'),
          frame:window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex
        });
        if(!this.muted&&window.__taleraDenyNextAudible){
          window.__taleraDenyNextAudible=false;
          // Native metadata can complete while the first audible play promise
          // is still pending. Do NOT issue a second, overlapping audible play.
          setTimeout(()=>this.dispatchEvent(new Event('loadedmetadata')),12);
          return new Promise((_,reject)=>setTimeout(()=>reject(
            new DOMException('Safari requires gesture','NotAllowedError')),80));
        }
      }
      return originalPlay.apply(this,args);
    };
    window.__taleraOrdinarySelectPhoto?.(id,2,true);
  },id);
  await page.waitForFunction(()=>{
    const v=document.querySelector('video.talera-v61-inline-video');
    return v?.muted===true&&!v.paused&&v.currentTime>.025&&
      window.__taleraAutoPlayAttempts?.some(x=>!x.muted)&&
      window.__taleraAutoPlayAttempts?.some(x=>x.muted);
  },null,{timeout:9000});
  assert.equal(await page.locator('button.talera-v61-audio-permission-hint').count(),0,
    'Ordinary presentation must not add a per-video Listen button');
  const deniedCalls=await page.evaluate(()=>window.__taleraAutoPlayAttempts
    .filter(x=>!x.muted).length);
  assert.equal(deniedCalls,1,
    'Safari metadata load must not trigger TWO overlapping audible play() attempts');
  // The user's real tap on the EXISTING story surface is the only recovery
  // gesture. No hidden button, document-wide touch listener or Back binding.
  await page.locator('#memoryStoryScroll').tap({timeout:4500});
  await page.waitForFunction(before=>window.__taleraAutoPlayAttempts
    ?.filter(x=>!x.muted).length>before,deniedCalls,{timeout:4500});
  const gestureRecovery=await page.evaluate(()=>({
    attempts:window.__taleraAutoPlayAttempts,
    narratorActive:!!document.querySelector('.talera-independent-narrator-layer'),
    listenButtons:document.querySelectorAll('button.talera-v61-audio-permission-hint').length
  }));
  assert.equal(gestureRecovery.narratorActive,false,
    'Ordinary tap recovery must not activate narrator');
  assert.equal(gestureRecovery.listenButtons,0,
    'Ordinary tap recovery must never add a Beluister button');
  console.log('TALERA_ORDINARY_NATIVE_STAGE_TAP_AUDIO_RECOVERY_PASS',JSON.stringify({
    firstAudibleAttempts:deniedCalls,
    audibleRetries:gestureRecovery.attempts.filter(x=>!x.muted).length,
    noExtraControl:true,ordinaryEngineOnly:true,realIphoneAccepted:false
  }));
  // That blocked video ends; the SAME automatic photo cycle eventually
  // brings it back. Settings ON must cause a FRESH unmuted play() attempt.
  await page.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex===0,
    null,{timeout:7000});
  await page.waitForFunction(()=>window.__taleraOrdinaryVideoSnapshots?.length>=4,
    null,{timeout:16000});
  await page.waitForFunction(()=>window.__taleraOrdinaryVideoSnapshots?.[3]?.played,
    null,{timeout:7000});
  const consecutive=await page.evaluate(()=>({
    next:window.__taleraOrdinaryVideoSnapshots[3],
    attempts:window.__taleraAutoPlayAttempts
  }));
  assert.equal(consecutive.next.samePlayer,true,'Retain the original single ordinary player');
  assert.equal(consecutive.next.listeningEnabled,true,'Settings ON remains the only sound preference');
  assert.equal(consecutive.next.muted,false,
    'The NEXT automatic video must freshly request sound after a denied previous clip');
  assert.ok(consecutive.attempts.filter(x=>x.muted===false).length>=2,
    'The Settings ON preference must trigger a new audible play() attempt on EACH video');
  console.log('TALERA_ORDINARY_SETTINGS_EACH_VIDEO_AUTOPLAY_PASS',JSON.stringify({
    firstAudibleDenied:true,silentFallback:true,
    nextVideoAutomaticallyAudible:true,
    audibleAttempts:consecutive.attempts.filter(x=>!x.muted).length,
    onePlayer:true,noListenButton:true
  }));
  await page.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex===0,
    null,{timeout:7000});
  // Before tapping Back, simulate the exact reported state:
  // Safari has rejected audible autoplay, the clip is playing silently.
  await page.evaluate(id=>{
    window.__taleraDenyNextAudible=true;
    window.__taleraOrdinarySelectPhoto?.(id,2,true);
    const back=document.getElementById('talera-flow-home');
    if(!back)throw Error('Original Back control missing');
    back.addEventListener('click',()=>{
      const video=document.querySelector('video.talera-v61-inline-video');
      console.log('TALERA_BACK_CLICK_NO_SOUND_PROBE '+JSON.stringify({
        videoMuted:video?.muted,videoPlaying:video&&!video.paused,
        attemptCount:window.__taleraAutoPlayAttempts?.length,
        settings:window.__taleraAudioControls?.isEnabled?.(),
        target:back.getAttribute('href')
      }));
    },{capture:true,once:true});
  },id);
  await page.waitForFunction(()=>{
    const v=document.querySelector('video.talera-v61-inline-video');
    return v?.muted===true&&!v.paused&&v.currentTime>.02&&
      window.__taleraDenyNextAudible===false;
  },null,{timeout:8000});
  let backProbe=null;
  page.on('console',message=>{
    const label='TALERA_BACK_CLICK_NO_SOUND_PROBE ';
    if(message.text().startsWith(label))backProbe=JSON.parse(message.text().slice(label.length));
  });
  await page.evaluate(()=>window.__taleraOrdinaryVideoObserver?.disconnect());

  // Diagnose the reported top-left return control on the SAME ordinary player.
  await page.evaluate(id=>window.__taleraOrdinarySelectPhoto?.(id,2,true),id);
  await page.waitForSelector('video.talera-v61-inline-video',{timeout:8000});
  const navigation=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('button,a,[role="button"]')];
    const controls=nodes.map(el=>{
      const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
      const centerX=r.x+r.width/2,centerY=r.y+r.height/2;
      const top=document.elementFromPoint(centerX,centerY);
      return {tag:el.tagName,id:el.id,className:String(el.className).slice(0,120),
        text:el.textContent?.trim().slice(0,65),aria:el.getAttribute('aria-label'),
        title:el.getAttribute('title'),href:el.getAttribute('href'),
        outer:el.outerHTML.slice(0,360),
        rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
        visible:cs.visibility!=='hidden'&&cs.display!=='none',
        pointerEvents:cs.pointerEvents,zIndex:cs.zIndex,
        atCenter:top?.id||top?.className||top?.tagName,
        itselfAtCenter:top===el||el.contains(top)};
    }).filter(x=>x.rect[0]<195&&x.rect[1]<240&&x.rect[2]>10&&x.rect[3]>10);
    return {url:location.href,controls,
      elementsAtTopLeft:document.elementsFromPoint(34,145).slice(0,8)
        .map(el=>({tag:el.tagName,id:el.id,className:String(el.className).slice(0,100),
          pointerEvents:getComputedStyle(el).pointerEvents})),
      historyLength:history.length,
      audioSetting:window.__taleraAudioControls?.isEnabled?.(),
      currentVideo:document.querySelector('video.talera-v61-inline-video')?.outerHTML.slice(0,370)};
  });
  console.log('TALERA_ORDINARY_RETURN_BUTTON_DIAGNOSTIC',JSON.stringify(navigation));
  const back=navigation.controls.find(x=>x.id==='talera-flow-home');
  assert.ok(back,'The ORIGINAL return control must exist while video is shown');
  assert.equal(back.href,'/mijn-leven','Back must directly open the real Home path, not rely on Safari following a redirect');
  assert.equal(back.itselfAtCenter,true,'Nothing may cover the back button hit target');
  const playCountBeforeBack=await page.evaluate(()=>window.__taleraAutoPlayAttempts?.length);
  await page.touchscreen.tap(back.rect[0]+back.rect[2]/2,back.rect[1]+back.rect[3]/2);
  try{
    await page.waitForURL(url=>url.pathname==='/mijn-leven',{timeout:8000});
  }catch(error){
    const trace=await page.evaluate(()=>({href:location.href,historyLength:history.length,
      homeLink:document.getElementById('talera-flow-home')?.outerHTML,
      pageshow:document.readyState,
      anchorCount:document.querySelectorAll('#talera-flow-home').length}));
    throw Error('Real mobile tap on original back did not reach home: '+JSON.stringify(trace));
  }
  assert.ok(backProbe,'Back tap must be observed without any audio side effect');
  assert.equal(backProbe.settings,true,'Settings ON stays enabled even when navigating Back');
  assert.equal(backProbe.videoMuted,true,'Back must not unmute the blocked video');
  assert.equal(backProbe.target,'/mijn-leven','Back must navigate directly to My life');
  assert.equal(backProbe.attemptCount,playCountBeforeBack,
    'Back must NEVER call video.play() or try to unlock audio');
  console.log('TALERA_ORDINARY_BACK_NAV_ONLY_NO_AUDIO_PASS',JSON.stringify(backProbe));
  console.log('TALERA_ORDINARY_RETURN_TO_HOME_WITH_ACTIVE_VIDEO_PASS',
    JSON.stringify({url:page.url(),noExtraBackControls:true}));

  assert.deepEqual(errors,[],'No presentation JS errors');
}finally{
  if(browser)await browser.close().catch(()=>{});
  if(worker&&!worker.killed)worker.kill('SIGTERM');
}

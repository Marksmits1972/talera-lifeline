// Real browser acceptance against the SAME existing authenticated TALERA worker.
// Test signal is generated only in the disposable browser test context.
import assert from 'node:assert/strict';
// Test the real generated layouts, including the actual moving recorder/share controls.
async function assertVoiceOrbLayout(page,selector,controlId,{recording=false}={}){
  await page.waitForFunction(({selector,controlId,recording})=>{
    const root=document.querySelector(selector),control=document.getElementById(controlId);
    const t=root?.querySelector('.talera-voice-orb-timing');
    const graphic=root?.querySelector('.talera-voice-orb-symbol');
    if(!root||!control||!t||!graphic)return false;
    const r=root.getBoundingClientRect(),c=control.getBoundingClientRect(),b=t.getBoundingClientRect(),g=graphic.getBoundingClientRect();
    if(c.width<=0||c.height<=0||getComputedStyle(control).visibility==='hidden')return false;
    if(!b.width||!b.height||!g.width||!g.height)return false;
    // Bounds are actual CSS pixels; tolerate subpixel rounding, not overlap.
    return b.bottom+12<=c.top&&b.left>=r.left+20&&b.right<=r.right-20&&
      g.top>=r.top&&g.bottom<=b.top-4&&b.width>=Math.min(540,r.width-48)-2&&
      (recording?getComputedStyle(root.querySelector('progress')).display==='none':getComputedStyle(root.querySelector('progress')).display!=='none');
  },{selector,controlId,recording},{timeout:12000});
  const layout=await page.locator(selector).evaluate(root=>({
    rings:root.querySelectorAll('.talera-voice-orb-ring').length,
    bars:root.querySelectorAll('.talera-voice-orb-bar').length,
    background:getComputedStyle(root).backgroundImage,
    core:getComputedStyle(root.querySelector('.talera-voice-orb-core')).backgroundImage,
    wave:Array.from(root.querySelectorAll('.talera-voice-orb-bar')).map(n=>getComputedStyle(n).backgroundColor)
  }));
  assert.equal(layout.rings,3);assert.equal(layout.bars,10);
  assert.match(layout.background,/rgb\(16, 31, 53\)/);
  assert.match(layout.core,/radial-gradient/);
  assert.ok(layout.wave.every(color=>color==='rgb(247, 252, 255)'));
}
export async function verifyVoiceOrb(browser,accountContext,origin,gate){
  const ctx=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'nl-NL',
    extraHTTPHeaders:{'x-talera-f5-key':gate}
  });
  try{
    await ctx.addCookies(await accountContext.cookies(origin));
    const page=await ctx.newPage();
    await page.addInitScript(()=>{
      // Real native MediaRecorder input; no mocked recorder, storage or player.
      const nativeNow=performance.now.bind(performance);
      let offset=0;
      Object.defineProperty(performance,'now',{value:()=>nativeNow()+offset});
      window.__orbTestClock=n=>{offset=n};
      navigator.mediaDevices.getUserMedia=async constraints=>{
        if(!constraints.audio)throw Error('Synthetic voice fixture only');
        const context=new AudioContext();
        await context.resume();
        const oscillator=context.createOscillator(),gain=context.createGain();
        oscillator.frequency.value=330;gain.gain.value=.45;
        const output=context.createMediaStreamDestination();
        oscillator.connect(gain);gain.connect(output);oscillator.start();
        window.__orbTestTone=value=>{gain.gain.value=value};
        return output.stream;
      };
    });
    await page.goto(origin+'/tell',{waitUntil:'domcontentloaded'});
    await page.locator('#without').click({timeout:20000});
    await page.locator('#frame .talera-voice-orb').waitFor({timeout:10000});
    assert.equal(await page.evaluate(()=>typeof window.__orbTestTone),'undefined','Idle orb must not request microphone');
    await page.locator('#taleraV61RecStart').click();
    const orb=page.locator('#frame .talera-voice-orb');
    await orb.waitFor({timeout:10000});
    await page.waitForFunction(()=>Number(document.querySelector('#frame .talera-voice-orb')?.dataset.level||0)>.06,null,{timeout:12000});
    assert.match(await orb.innerText(),/5 minuten/);
    const live=await orb.evaluate(el=>({level:Number(el.dataset.level),scale:Number(el.querySelector('.talera-voice-orb-core').style.transform.match(/scale\(([^)]+)/)[1])}));
    assert.ok(Math.abs(live.scale-(1+live.level*.045*1.25))<.0011,'Only live visual energy increases exactly 25% '+JSON.stringify(live));
    await assertVoiceOrbLayout(page,'#frame .talera-voice-orb','taleraV61RecControls',{recording:true});
    await page.waitForTimeout(1200);
    // Simulate elapsed time only to verify the original count-up clock has
    // no 5 minute auto-stop. Restore the clock before writing original bytes.
    await page.evaluate(()=>window.__orbTestClock(301000));
    await page.waitForFunction(()=>/^05:/.test(document.getElementById('taleraV61RecClock')?.textContent||''));
    assert.equal(await page.locator('#taleraV61RecStart').isEnabled(),true);
    await page.evaluate(()=>{window.__orbTestClock(0);window.__orbTestTone(0)});
    await page.waitForFunction(()=>Number(document.querySelector('#frame .talera-voice-orb')?.dataset.level||0)<.005,null,{timeout:10000});
    await page.waitForTimeout(1000);
    await page.evaluate(()=>window.__orbTestTone(.45));
    await page.waitForFunction(()=>Number(document.querySelector('#frame .talera-voice-orb')?.dataset.level||0)>.06);
    await page.waitForTimeout(1000);
    await page.locator('#taleraV61RecStart').click();
    await page.locator('#taleraV61RecPlay').waitFor({timeout:15000});
    await page.locator('#taleraV61RecStart').waitFor({state:'visible'});
    await page.locator('#taleraV61RecPlay').click();
    await page.waitForFunction(()=>Number(document.querySelector('#frame .talera-voice-orb')?.dataset.level||0)>.02,null,{timeout:10000});
    assert.ok(await orb.locator('progress').isVisible());
    await assertVoiceOrbLayout(page,'#frame .talera-voice-orb','taleraV61RecControls');
    await page.locator('#taleraV61RecPlay').click();
    await page.waitForFunction(()=>document.querySelector('#frame .talera-voice-orb')?.dataset.level==='0.000');
    await page.locator('#taleraV61RecClose').click();
    assert.equal(await orb.count(),0);
    const draft=await page.evaluate(async()=>{
      const d=await window.TaleraMemories.draftReadPayload('talera-v4-work:manifest','talera-v4-work:');
      const g=d.catalog.find(x=>x.voice&&x.media.length===0),file=d.originals.find(([key])=>key===g?.voice)?.[1];
      if(!g||!(file instanceof Blob))throw Error('Voice-only original not saved in private draft');
      const hash=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
      return {hash:await hash(file),size:file.size,cues:g.voiceCues||[],wave:g.voiceWave||[]};
    });
    assert.ok(draft.size>0);assert.deepEqual(draft.cues,[]);assert.deepEqual(draft.wave,[]);
    await page.locator('#publish').click();
    await page.waitForURL(url=>url.pathname==='/mijn-leven'&&url.searchParams.has('published'),{timeout:25000});
    const id=new URL(page.url()).searchParams.get('published');
    await page.goto(origin+'/present?memory='+encodeURIComponent(id),{waitUntil:'domcontentloaded'});
    await page.waitForFunction(id=>{
      const m=window.__taleraTimelineRuntime?.currentMemory?.();
      return m?.storyId===id&&!m._photoLoading&&m._zeroFrames?.length===0;
    },id,{timeout:25000});
    const presented=page.locator('#photoStage .talera-voice-orb');
    await presented.waitFor({timeout:15000});
    await page.waitForFunction(()=>Number(document.querySelector('#photoStage .talera-voice-orb')?.dataset.level||0)>.02,null,{timeout:15000});
    await page.waitForFunction(()=>Number(document.querySelector('#photoStage .talera-voice-orb progress')?.value||0)>0);
    const readback=await page.evaluate(async id=>{
      const row=await window.TaleraMemories.get(id),item=row.items[0],original=await window.TaleraMemories.blob(item.key);
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await original.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
      const audio=window.__taleraF5SharedAudible.get();
      return {kinds:row.items.map(x=>x.kind),key:item.key,hash,size:original.size,cues:row.narrationCues||[],
        shared:audio===document.querySelector('.talera-independent-narrator-layer audio'),count:document.querySelectorAll('#talera-f5-shared-audio').length};
    },id);
    assert.deepEqual(readback.kinds,['audio']);assert.deepEqual(readback.cues,[]);
    assert.equal(readback.hash,draft.hash);assert.equal(readback.size,draft.size);
    assert.ok(readback.shared);assert.equal(readback.count,1);
    await page.evaluate(()=>window.__taleraF5SharedAudible.get().pause());
    await page.waitForFunction(()=>document.querySelector('#photoStage .talera-voice-orb')?.dataset.level==='0.000');
    // Reflow the SAME presentation while its native audio is paused. The bar
    // must follow the actual dock even when there is no audio animation tick.
    for(const viewport of [{width:390,height:844},{width:320,height:568},{width:430,height:932},{width:1280,height:800}]){
      await page.setViewportSize(viewport);
      await assertVoiceOrbLayout(page,'#photoStage .talera-voice-orb','talera-clean-social');
    }
    await page.setViewportSize({width:390,height:844});
    console.log('TALERA_VOICE_ORB_BLUE_SYMBOL_AND_SHARE_DOCK_GEOMETRY_PASS',JSON.stringify({recording:true,preview:true,pausedPresentation:true,widths:[390,320,430,1280]}));
    await page.goto(origin+'/tell?edit='+encodeURIComponent(id),{waitUntil:'domcontentloaded'});
    await page.locator('#speak').waitFor({timeout:15000});
    await page.locator('#speak').click();
    await page.locator('#taleraV61RecPlay').click({timeout:10000});
    await page.locator('#frame .talera-voice-orb').waitFor({timeout:10000});
    const reopened=await page.evaluate(async id=>(await window.TaleraMemories.get(id)).items.map(x=>x.key),id);
    assert.deepEqual(reopened,[readback.key]);
    console.log('TALERA_VOICE_ORB_BROWSER_CAPTURE_SAVE_REOPEN_SHARED_AUDIO_PASS',JSON.stringify({
      existingEditor:true,realNativeMediaRecorder:true,voiceOnlyOriginalBytes:true,
      noFakePhotoOrCue:true,simulatedFiveMinutesNoCutoff:true,physicalIphoneAccepted:false
    }));
  }finally{await ctx.close()}
}

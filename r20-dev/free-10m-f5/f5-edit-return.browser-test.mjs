// Exercise the actual existing authenticated editor and presentation, in the
// existing regression runner's disposable Chromium or WebKit context.
import assert from 'node:assert/strict';

export async function verifyEditReturn({browser,origin,gate,sid,mobileDevice}){
 const ctx=await browser.newContext({...mobileDevice,serviceWorkers:'block',
   extraHTTPHeaders:{'x-talera-f5-key':gate}});
 try{
  await ctx.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',path:'/',
    secure:false,httpOnly:true,sameSite:'Lax'}]);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push({message:e.message,route:page.url(),stack:e.stack||''}));
  const eye=page.locator('#talera-f5-edit-return-eye'),pencil=page.locator('#talera-v5-editor-pencil');
  const go=async pathname=>{
   const res=await page.goto(origin+pathname,{waitUntil:'domcontentloaded'});
   assert.equal(res.status(),200,'Actual authenticated route '+pathname);
   await page.waitForFunction(()=>!!window.TaleraMemories?.get);
  };
  await go('/tell');
  assert.equal(await eye.count(),0,'No eye on ordinary editor entry');
  const ids=await page.evaluate(async()=>{
   const mem=window.TaleraMemories;
   const photos=await Promise.all(['red','blue','green','orange','purple','teal','yellow'].map(async(color,i)=>{
    const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;
    const draw=canvas.getContext('2d');draw.fillStyle=color;draw.fillRect(0,0,80,80);
    const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
    return new File([blob],'edit-return-'+i+'.png',{type:'image/png'});
   }));
   const a=await mem.save({title:'Edit return first',date:'2026-11-23',time:'12:00:00',text:'Original first',tags:['Familie','Eigen aangehecht']},photos.slice(0,6));
   const b=await mem.save({title:'Edit return second, same day',date:'2026-11-23',time:'13:00:00',text:'Original second'},photos.slice(6));
   return [a.id,b.id];
  });
  const read=()=>page.evaluate(async()=>{
   const mem=window.TaleraMemories,rows=await mem.list();
   const stories=await Promise.all(rows.map(async r=>({id:r.id,title:r.title,text:r.text,tags:r.tags??[],
    items:await Promise.all(r.items.map(async item=>({key:item.key,bytes:[...new Uint8Array(await (await mem.blob(item.key)).arrayBuffer())]}))),
    cues:r.narrationCues??null})));
   const name=document.getElementById('talera-memory-store-v1').textContent.match(/var DB_NAME='([^']+)'/)[1];
   const db=await new Promise((ok,bad)=>{const q=indexedDB.open(name,1);q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)});
   try{
    const catalog=await new Promise((ok,bad)=>{const q=db.transaction('files','readonly').objectStore('files').get('talera-v4-work:manifest');q.onsuccess=()=>ok(q.result?.blob??[]);q.onerror=()=>bad(q.error)});
    return {stories:stories.sort((a,b)=>a.id.localeCompare(b.id)),catalog};
   }finally{db.close()}
  });
  const baseline=await read();
  const settleImages=async()=>{
   await page.waitForLoadState('load');
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('.talera-work-tiles img')).every(img=>img.complete),null,{timeout:10000});
  };
  const selected=async id=>{
   await page.waitForFunction(id=>{const m=window.__taleraTimelineRuntime?.currentMemory?.();return m?.storyId===id&&!m._photoLoading&&m._zeroFrames?.length>0},id,{timeout:20000});
  };
  for(const [i,id] of ids.entries()){
   await go('/present?memory='+encodeURIComponent(id));await selected(id);
   if(i===0){
    await page.evaluate(()=>{const m=window.__taleraTimelineRuntime.currentMemory();window.__taleraOrdinarySelectPhoto(m.id,1,true)});
    await page.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex===1,null,{timeout:10000});
   }
   await pencil.waitFor({state:'visible'});
   const pos=await pencil.boundingBox();
   assert.ok(pos,'Existing pencil hit area');
   // Locator.click may scroll/settle a mobile viewport first. The user
   // touches the actual hit area at pointerdown, not the earlier rect.
   await pencil.evaluate(el=>el.addEventListener('pointerdown',()=>{
    const r=el.getBoundingClientRect();
    sessionStorage.setItem('talera-ci-pencil-hit-rect',JSON.stringify({x:r.x,y:r.y,width:r.width,height:r.height}));
   },{once:true,capture:true,passive:true}));
   const dialogs=[];
   const handle=d=>{dialogs.push(d.type());return d.dismiss()};
   page.on('dialog',handle);
   await pencil.click();
   await page.waitForURL('**/tell?edit='+encodeURIComponent(id));
   await eye.waitFor({state:'visible',timeout:20000});
   const back=page.locator('#app header.top #back'),dots=page.locator('#app .talera-editor-memory-options-toggle');
   await back.waitFor({state:'visible'});await dots.waitFor({state:'visible'});
   // Check the actual header controls, not CSS inputs or a simulated layout.
   // The eye's visible icon must align with the back arrow's row and the
   // existing deletion menu's column while keeping its own touch target.
   await page.waitForFunction(()=>{
    const e=document.getElementById('talera-f5-edit-return-eye'),b=document.querySelector('#app header.top #back'),d=document.querySelector('#app .talera-editor-memory-options-toggle');
    if(!e||!b||!d)return false;
    const er=e.getBoundingClientRect(),br=b.getBoundingClientRect(),dr=d.getBoundingClientRect();
    return Math.abs(er.x+er.width/2-dr.x-dr.width/2)<=2&&Math.abs(er.y+er.height/2-br.y-br.height/2)<=2&&er.bottom<=dr.top;
   },null,{timeout:5000});
   const box=await eye.boundingBox(),backBox=await back.boundingBox(),dotsBox=await dots.boundingBox();
   const geometry=await page.evaluate(()=>{
    const hit=JSON.parse(sessionStorage.getItem('talera-ci-pencil-hit-rect')||'null');sessionStorage.removeItem('talera-ci-pencil-hit-rect');
    const button=document.getElementById('talera-f5-edit-return-eye'),style=getComputedStyle(button);
    const key=Object.keys(sessionStorage).find(k=>k.startsWith('talera-free-edit-return-'));
    return {hit,context:key?JSON.parse(sessionStorage.getItem(key)):null,background:style.backgroundColor,border:style.borderTopWidth,shadow:style.boxShadow,color:style.color,dotsColor:getComputedStyle(document.querySelector('.talera-editor-memory-options-toggle')).color};
   });
   assert.ok(geometry.hit,'Actual trusted pointer-down position missing');
   assert.equal(geometry.context.id,id,'Same exact captured memory ID');
   assert.ok(Math.abs(box.x+box.width/2-(dotsBox.x+dotsBox.width/2))<=2,'Eye must be centered over dots: '+JSON.stringify({box,dotsBox}));
   assert.ok(Math.abs(box.y+box.height/2-(backBox.y+backBox.height/2))<=2,'Eye must align with back-arrow row: '+JSON.stringify({box,backBox}));
   assert.ok(box.y+box.height<=dotsBox.y,'Eye must be above and not cover options');
   assert.ok(Math.abs(box.width-45)<=1&&Math.abs(box.height-45)<=1,'Accessible eye target');
   assert.equal(geometry.background,'rgba(0, 0, 0, 0)','Eye inherits white screen background');
   assert.equal(geometry.border,'0px','No circle outline');
   assert.equal(geometry.shadow,'none','No shadow');
   assert.equal(geometry.color,geometry.dotsColor,'Same icon color as options');
   // Inspect ACTUAL painted glyph pixels instead of merely comparing
   // clickable rectangles. A grid text node displaced the chevron despite
   // passing the earlier rectangle-only test. No screenshot leaves this
   // disposable synthetic browser context; report only measured geometry.
   const screenshot=await page.screenshot({scale:'css'});
   const glyphs=await page.evaluate(async({data,backBox,box})=>{
    const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const c=canvas.getContext('2d');c.drawImage(image,0,0);
    const rgba=c.getImageData(0,0,canvas.width,canvas.height).data;
    const measure=rect=>{
     let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,count=0;
     for(let y=Math.max(0,Math.floor(rect.y));y<Math.min(canvas.height,Math.ceil(rect.y+rect.height));y++)
      for(let x=Math.max(0,Math.floor(rect.x));x<Math.min(canvas.width,Math.ceil(rect.x+rect.width));x++){
       const k=(y*canvas.width+x)*4;
       if(rgba[k+3]>200&&rgba[k]<145&&rgba[k+1]<165&&rgba[k+2]<185){
        count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
       }
      }
     return {count,width:maxX-minX+1,height:maxY-minY+1,centerY:(minY+maxY+1)/2};
    };
    return {back:measure(backBox),eye:measure(box)};
   },{data:screenshot.toString('base64'),backBox,box});
   assert.ok(glyphs.back.count>15&&glyphs.eye.count>20,'Both visible icons must paint: '+JSON.stringify(glyphs));
   assert.ok(glyphs.back.height>=14&&glyphs.eye.width>=20,'Clear reference-sized symbols: '+JSON.stringify(glyphs));
   assert.ok(Math.abs(glyphs.back.centerY-glyphs.eye.centerY)<=1.5,'Actual visible back and eye glyphs must share a centerline: '+JSON.stringify(glyphs));
   console.log('TALERA_EDITOR_PAINTED_HEADER_GLYPHS_ALIGNED',JSON.stringify(glyphs));
   const saveLabel=await page.evaluate(()=>{
    const lang=String(window.TaleraI18n?.language||document.documentElement.lang||'nl').slice(0,2);
    return {actual:document.getElementById('publish').textContent.trim(),expected:({nl:'Opslaan',en:'Save',de:'Speichern',fr:'Enregistrer',es:'Guardar'})[lang]||'Opslaan'};
   });
   assert.equal(saveLabel.actual,saveLabel.expected,'Existing pencil edit must say Save in the current language');
   assert.equal(await page.locator('#app header.top strong').isVisible(),false,'Work editor has no logo');
   assert.equal(await page.locator('.talera-tags-own-input,.talera-tag-apply,.talera-tag-cancel').count(),0,'No create/apply/cancel controls in the editor');
   if(i===0){
    const toggle=page.locator('.talera-tags-toggle'),panel=page.locator('.talera-tags-panel'),publish=page.locator('#publish');
    assert.equal(await page.locator('.talera-work-tiles .talera-v9-remove-media').count(),6);
    const before=await publish.boundingBox(),gridBefore=await page.locator('.talera-work-tiles').boundingBox();
    await toggle.click();await panel.waitFor({state:'visible'});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const afterBox=await publish.boundingBox(),gridAfter=await page.locator('.talera-work-tiles').boundingBox();
    assert.ok(Math.abs(gridBefore.y-gridAfter.y)<=2&&Math.abs(gridBefore.height-gridAfter.height)<=2,'Opening characteristics must not move photos');
    assert.ok(Math.abs(before.y-afterBox.y)<=4,'Opening characteristics must not move the footer: '+JSON.stringify({before,afterBox}));
    assert.equal(await page.locator('.talera-tags-own-input,.talera-tag-apply,.talera-tag-cancel').count(),0);
    assert.equal(await page.locator('.talera-tags-selected').isVisible(),false,'No duplicate selected chips in open panel');
    const visible=await page.locator('.talera-tags-choices').evaluate(choices=>{
     const viewport=choices.getBoundingClientRect(),rows=[...choices.querySelectorAll('.talera-tag-choice')].map(b=>b.getBoundingClientRect());
     const whole=rows.filter(r=>r.top>=viewport.top-1&&r.bottom<=viewport.bottom+1).length;
     const partial=rows.filter(r=>r.top<viewport.bottom-1&&r.bottom>viewport.top+1&&!(r.top>=viewport.top-1&&r.bottom<=viewport.bottom+1)).length;
     return {count:rows.length,whole,partial,height:viewport.height};
    });
    assert.equal(visible.whole,Math.min(6,visible.count),'Two complete characteristic rows on the actual six-photo editor: '+JSON.stringify(visible));
    assert.equal(visible.partial,0,'No third partial row; '+JSON.stringify(visible));
    console.log('TALERA_EDITOR_REFERENCE_TWO_COMPLETE_ROWS_PASS',JSON.stringify(visible));
    const choiceIndex=await page.locator('.talera-tag-choice').evaluateAll(nodes=>nodes.findIndex(n=>n.getAttribute('aria-pressed')==='false'));
    assert.ok(choiceIndex>=0,'Need an unselected existing characteristic');
    const option=page.locator('.talera-tag-choice').nth(choiceIndex);
    await option.click();assert.equal(await option.getAttribute('aria-pressed'),'true');
    await option.click();assert.equal(await option.getAttribute('aria-pressed'),'false');
    await toggle.click();await panel.waitFor({state:'hidden'});
    // Capture the actual integrated app with six synthetic photos at the
    // owner's tall-phone geometry, both states, without touching any live
    // data or introducing another app. Only diagnostic test output, never
    // part of the public software artifact.
    if(browser.browserType().name()==='chromium'){
     const originalViewport=page.viewportSize();
     await page.setViewportSize({width:390,height:844});
     const capture=async label=>{
      await settleImages();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const png=await page.screenshot({type:'jpeg',quality:72,scale:'css'});
      const b64=png.toString('base64'),chunks=b64.match(/.{1,5000}/g);
      chunks.forEach((part,n)=>console.log('TALERA_VISUAL_QA_'+label+'_'+n+'_'+chunks.length+' '+part));
     };
     await capture('CLOSED');
     await toggle.click();await panel.waitFor({state:'visible'});
     await capture('OPEN');
     await toggle.click();await panel.waitFor({state:'hidden'});
     if(originalViewport)await page.setViewportSize(originalViewport);
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
   }
   await settleImages();
   const opened=await read();
   assert.equal(opened.catalog.filter(x=>x.existing===id).length,1,'One existing edit draft');
   await eye.click();
   try{await page.waitForURL('**/present?memory='+encodeURIComponent(id),{timeout:20000})}
   catch(e){throw Error('Clean eye return did not navigate: '+JSON.stringify({id,dialogs,errors,body:(await page.locator('body').innerText()).slice(0,1600)})+' '+e.message)}
   await selected(id);
   if(i===0)await page.waitForFunction(()=>window.__taleraTimelineRuntime?.currentMemory?.()?._photoIndex===1,null,{timeout:10000});
   page.off('dialog',handle);
   assert.deepEqual(dialogs,[],'No dialog for unmodified edit');
   const after=await read();
   assert.deepEqual(after,baseline,'No new draft, new story, lost original bytes, cue or other same-day memory');
  }
  // Test the approved direct selection and normal Save against the actual
  // same account-local library; the previously published story and bytes
  // must remain intact until Save, and a new memory still says Place.
  const target=ids[0];
  await go('/present?memory='+encodeURIComponent(target));await selected(target);
  await pencil.click();await page.waitForURL('**/tell?edit='+encodeURIComponent(target));
  await eye.waitFor({state:'visible'});
  await page.locator('.talera-tags-toggle').click();
  const choiceIndex=await page.locator('.talera-tag-choice').evaluateAll(nodes=>nodes.findIndex(n=>n.getAttribute('aria-pressed')==='false'));
    assert.ok(choiceIndex>=0,'Need an unselected existing characteristic');
    const option=page.locator('.talera-tag-choice').nth(choiceIndex);
  await option.click();assert.equal(await option.getAttribute('aria-pressed'),'true');
  const edited=await page.evaluate(async target=>{
   const story=await window.TaleraMemories.get(target);
   const draft=await window.TaleraMemories.blob('talera-v4-work:manifest');
   return {storyTags:story.tags??[],draftTags:draft?.find(x=>x.existing===target)?.tags??null};
  },target);
  assert.deepEqual(edited.storyTags,baseline.stories.find(x=>x.id===target).tags,'Tag selection is not a published change');
  // Playwright's waitForFunction polls a truthy value, not the resolved
  // result of an asynchronous IndexedDB predicate. Poll explicitly so a
  // pending promise or a navigation cannot be mistaken for a successful save.
  const pollDb=async(fn,arg,limit,label)=>{
   const until=Date.now()+limit;
   while(Date.now()<until){
    try{if(await page.evaluate(fn,arg)===true)return;}
    catch(e){if(!/Execution context was destroyed|Cannot find context|navigation/i.test(e.message))throw e;}
    await page.waitForTimeout(150);
   }
   throw Error(label);
  };
  // Wait for the original async draft queue via the same manifest.
  await pollDb(async target=>{
   const draft=await window.TaleraMemories.blob('talera-v4-work:manifest');
   const story=await window.TaleraMemories.get(target);
   const tags=draft?.find(x=>x.existing===target)?.tags;
   return !!tags&&tags.length===(story.tags??[]).length+1;
  },target,10000,'Direct selection was not persisted to the original draft');
  const expected=await page.evaluate(async target=>(await window.TaleraMemories.blob('talera-v4-work:manifest')).find(x=>x.existing===target).tags,target);
  await settleImages();
  await page.locator('#publish').click();
  await pollDb(async ({target,expected})=>{
   const mem=window.TaleraMemories;
   if(!mem?.get||!mem?.list)return false;
   const row=await mem.get(target),rows=await mem.list();
   const draft=await mem.blob('talera-v4-work:manifest');
   return !!row&&JSON.stringify(row.tags??[])===JSON.stringify(expected)&&
     JSON.stringify(rows.find(x=>x.id===target)?.tags??[])===JSON.stringify(expected)&&
     !(draft??[]).some(x=>x.existing===target);
  },{target,expected},20000,'Actual normal Save did not finish with the selected characteristic and original draft cleanup');
  // Reopen the actual existing library route, not merely the same JS context.
  await settleImages();
  await go('/mijn-leven');
  await page.waitForLoadState('load');
  const saved=await read();
  assert.equal(saved.stories.length,baseline.stories.length,'Save does not create a new memory');
  const expectedStories=structuredClone(baseline.stories);expectedStories.find(x=>x.id===target).tags=expected;
  assert.deepEqual(saved.stories,expectedStories,'Saving just characteristics preserves all original media, IDs and other stories');
  await go('/tell');
  await page.locator('#without').click();
  await page.locator('#publish').waitFor({state:'visible'});
  assert.equal(await eye.count(),0,'No eye on new memory');
  const label=await page.locator('#publish').textContent();
  assert.ok(!['Opslaan','Save','Speichern','Enregistrer','Guardar'].includes(label.trim()),'New memory must use Place, not Save: '+label);
  console.log('TALERA_EDITOR_CLEAN_LAYOUT_DIRECT_TAG_SELECTION_EXISTING_SAVE_NEW_PLACE_PASS',JSON.stringify({browser:browser.browserType().name(),realAccountLocalLibrary:true}));
  assert.deepEqual(errors,[],'No actual script errors');
  console.log('TALERA_EDIT_RETURN_ACTUAL_PENCIL_EYE_SAME_ID_POSITION_ORIGINAL_BYTES_AND_DRAFT_PASS',JSON.stringify({browser:browser.browserType().name(),twoSameDayStories:true,headerEye:true,transparentBackground:true}));
 }finally{await ctx.close()}
}

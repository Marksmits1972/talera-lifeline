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
  page.on('pageerror',e=>errors.push(e.message));
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
   const photos=await Promise.all(['red','blue','green'].map(async(color,i)=>{
    const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;
    const draw=canvas.getContext('2d');draw.fillStyle=color;draw.fillRect(0,0,80,80);
    const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
    return new File([blob],'edit-return-'+i+'.png',{type:'image/png'});
   }));
   const a=await mem.save({title:'Edit return first',date:'2026-11-23',time:'12:00:00',text:'Original first'},photos.slice(0,2));
   const b=await mem.save({title:'Edit return second, same day',date:'2026-11-23',time:'13:00:00',text:'Original second'},photos.slice(2));
   return [a.id,b.id];
  });
  const read=()=>page.evaluate(async()=>{
   const mem=window.TaleraMemories,rows=await mem.list();
   const stories=await Promise.all(rows.map(async r=>({id:r.id,title:r.title,text:r.text,
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
  assert.deepEqual(errors,[],'No actual script errors');
  console.log('TALERA_EDIT_RETURN_ACTUAL_PENCIL_EYE_SAME_ID_POSITION_ORIGINAL_BYTES_AND_DRAFT_PASS',JSON.stringify({browser:browser.browserType().name(),twoSameDayStories:true,headerEye:true,transparentBackground:true}));
 }finally{await ctx.close()}
}

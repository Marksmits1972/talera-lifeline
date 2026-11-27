// Actual existing Free Worker and authenticated IndexedDB in a disposable browser
// context. Invoked by the same Chromium and WebKit presentation suite.
import assert from 'node:assert/strict';
import {languageCatalog} from './f5-language-catalog.mjs';
export async function verifyCharacteristicSearch({browser,origin,gate,sid,mobileDevice}){
 const url=origin+'/mijn-leven';
 for(const device of [mobileDevice,{viewport:{width:1280,height:900}}]){
  const context=await browser.newContext({...device,locale:'nl-NL',extraHTTPHeaders:{'x-talera-f5-key':gate}});
  try{
   await context.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
   const page=await context.newPage(),presentRequests=[];
   page.on('request',req=>{const u=new URL(req.url());if(u.pathname==='/present')presentRequests.push(u.search);});
   const home=async()=>{
    assert.equal((await page.goto(url,{waitUntil:'domcontentloaded'})).status(),200);
    await page.waitForFunction(()=>!!window.__taleraTopics?.refresh&&!!window.TaleraMemories?.save,null,{timeout:18000});
    await page.evaluate(()=>window.__taleraTopics.refresh());
   };
   await home();
   const panel=page.locator('#talera-characteristic-search');
   assert.equal(await panel.count(),0,'Empty own account contains no search choices');
   const rows=await page.evaluate(async()=>{
    const tags=[['Familie','Vakantie','Kinderen'],[' Familie ','vakantie'],['Vakantie'],['Werk'],['Familie','familie'],Array.from({length:9},(_,i)=>'Extra '+(i+1))];
    const rows=[];
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
    canvas.getContext('2d').fillRect(0,0,32,32);
    const image=await new Promise(r=>canvas.toBlob(r,'image/png'));
    for(let i=0;i<tags.length;i++){
     rows.push(await window.TaleraMemories.save({title:'Synthetic characteristic '+i,text:'Synthetic regression',date:'200'+i+'-06-01',tags:tags[i]},[new File([image],'original.png',{type:'image/png'})]));
    }
    await window.__taleraTopics.refresh();return rows;
   });
   assert.equal(await panel.count(),1);
   assert.equal(await page.locator('#demoCards button.talera-topic-card').count(),8);
   assert.equal(await panel.locator('input[type=checkbox]').count(),13);
   assert.equal(await page.evaluate(()=>document.getElementById('demoCards').nextElementSibling.id),'talera-characteristic-search');
   const open=async()=>{
    await panel.locator('summary').click();
    assert.equal(await panel.evaluate(x=>x.open),true);
   };
   await open();
   const checkbox=name=>panel.getByLabel(name,{exact:true});
   const submit=panel.locator('button');
   const status=panel.locator('[role=status]');
   const select=async(names,count)=>{
    for(const name of names)await checkbox(name).check();
    assert.equal(await status.innerText(),count);
   };
   await select(['Familie'],'3 herinneringen');
   await select(['Vakantie'],'2 herinneringen');
   await select(['Kinderen'],'1 herinnering');
   await select(['Werk'],'Geen herinneringen met deze combinatie.');
   assert.equal(await submit.isDisabled(),true);
   await checkbox('Werk').uncheck();
   assert.equal(await submit.isEnabled(),true);
   for(const lang of ['en','de','fr','es','nl']){
    await page.evaluate(lang=>window.TaleraI18n.setLanguage(lang),lang);
    await page.waitForFunction(expected=>document.querySelector('#talera-characteristic-search summary')?.textContent===expected,languageCatalog[lang]['core.topicSearch.toggle']);
    assert.equal(await checkbox('Familie').isChecked(),true);
   }
   const result=async(expected)=>{
    await submit.click();
    await page.waitForURL(u=>u.pathname==='/present'&&u.hash.startsWith('#talera-kenmerken='));
    await page.waitForFunction(ids=>JSON.stringify(window.__taleraPhotoBook?.list().map(m=>m.storyId))===JSON.stringify(ids),expected,{timeout:18000});
    assert.deepEqual(await page.evaluate(()=>window.__taleraPhotoBook.list().map(m=>m.storyId)),expected);
    assert.ok(presentRequests.every(q=>!q),'New selection never uses a network query');
   };
   await result([rows[0].id]);
   await home();await open();
   await select(['Familie','Vakantie'],'2 herinneringen');await result([rows[0].id,rows[1].id]);
   await home();await open();
   await select(['Familie'],'3 herinneringen');await result([rows[0].id,rows[1].id,rows[4].id]);
   // Stale/invalid fragment is never widened to the complete account.
   await page.goto(origin+'/present#talera-kenmerken=%5B%22missing%22%5D',{waitUntil:'domcontentloaded'});
   await page.locator('#talera-characteristic-empty').waitFor();
   assert.equal(await page.evaluate(()=>window.__taleraPhotoBook.list().length),0);
   await page.locator('#talera-characteristic-empty a').click();
   await page.waitForURL(url);
   await page.waitForFunction(()=>!!window.__taleraTopics);
   await page.evaluate(async id=>{await window.TaleraMemories.setTags(id,['Familie','Vakantie']);await window.__taleraTopics.refresh();},rows[0].id);
   assert.equal(await panel.locator('input[type=checkbox]').count(),12);
   // Existing one-topic tile still goes to the original ?theme= route.
   const tile=page.locator('#demoCards button.talera-topic-card').first();
   await tile.click();
   await page.waitForURL(u=>u.pathname==='/present'&&u.searchParams.has('theme'));
   await page.goBack({waitUntil:'domcontentloaded'});
   await page.waitForURL(url);
   // Original files and stable IDs survive all selections and tag updates.
   const preserved=await page.evaluate(async rows=>{
    const current=await window.TaleraMemories.list();
    return rows.every(old=>{const row=current.find(r=>r.id===old.id);return row&&row.items[0].key===old.items[0].key;});
   },rows);
   assert.equal(preserved,true);
   await context.clearCookies();
   await home();
   assert.equal(await panel.count(),0,'Signed-out shell never sees prior account tags');
   console.log('TALERA_CHARACTERISTIC_SEARCH_EXISTING_APP_PASS',JSON.stringify({mobile:!!device.isMobile,physicalIphoneAccepted:false,idsPreserved:true}));
  }finally{await context.close();}
 }
}

// Same-origin synthetic loopback test of the exact backup view, modules and
// signaling state machine. Two isolated browser contexts mimic phone and PC.
// No live app, deployment, real account or Cloudflare binding is accessed.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {localBackupPage} from './f5-local-backup-page.mjs';
import {TransferSignaling} from './f5-transfer-signal.mjs';
import {privateAccountScope} from './f5-local-scope.mjs';
const account='12345678-1234-4123-8123-123456789abc';
const scope='talera-free-local-'+(await privateAccountScope(account)).slice(0,32)+'-v1';
const assets=new Set(['backup-controller.mjs','f5-portable-idb.mjs','f5-portable-archive.mjs','f5-library-persistence.mjs','f5-transfer-controller.mjs','f5-transfer-library.mjs','f5-transfer-transport.mjs','f5-transfer-qr.mjs','f5-transfer-scan.mjs','f5-transfer-jsqr.mjs']);
let signal=new TransferSignaling(),networkPosts=0;
// Fail closed with an exact checkpoint, even if the Playwright protocol,
// a browser-side promise or shutdown never resolves. No product behavior changed.
let checkpoint='fixture initialization';
const watchdog=setTimeout(()=>{
 console.error('TALERA_TRANSFER_BROWSER_WATCHDOG',checkpoint);
 process.exit(1);
},300000);
const mark=label=>{checkpoint=label;console.log('TALERA_TRANSFER_BROWSER_CHECKPOINT',label)};
async function bounded(label,fn,ms=20000){
 mark(label);
 let timer;
 try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(Error('TALERA_TRANSFER_BROWSER_TIMEOUT: '+label)),ms);
 })])}finally{clearTimeout(timer)}
}

const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/api/me'){res.setHeader('content-type','application/json');res.end(JSON.stringify({account:{id:account}}));return}
  if(req.url==='/api/device-transfer'&&req.method==='POST'){
   networkPosts++;let data='';for await(const chunk of req)data+=chunk;
   assert.ok(data.length<=16000);
   const sid=/sid=([ab])/.exec(req.headers.cookie||'')?.[1]?.repeat(64);
   assert.ok(sid);
   const c=JSON.parse(data);
   // No SDP, pairing secrets, media or personal data in diagnostics.
   console.log('TALERA_TRANSFER_BROWSER_SIGNAL',c.action);
   const result=c.action==='offer'?signal.offer(sid,c.code):signal.handle(sid,c);
   res.setHeader('content-type','application/json');res.end(JSON.stringify(result));return
  }
  if(req.url==='/__f5/backup'){res.setHeader('content-type','text/html');res.end(localBackupPage(scope));return}
  const file=req.url.slice('/__f5/'.length);
  if(req.url.startsWith('/__f5/')&&assets.has(file)){
   res.setHeader('content-type','text/javascript');res.end(await readFile(new URL('./'+(file==='backup-controller.mjs'?'f5-backup-controller.mjs':file),import.meta.url)));return
  }
  res.writeHead(404).end();
 }catch{res.writeHead(409).end('unavailable')}
});
// Fixed, valid 3x2 JPEG test input removes asynchronous canvas encoding from the fixture.
const fixtureJpeg='/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAMDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/ooooA//2Q==';
const seed=async (p,story)=>p.evaluate(async({scope,story,fixtureJpeg})=>{
 const db=await new Promise((res,rej)=>{const q=indexedDB.open(scope,1);
 q.onupgradeneeded=()=>{q.result.createObjectStore('stories',{keyPath:'id'});q.result.createObjectStore('files',{keyPath:'key'})};
 q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||Error('FIXTURE_IDB_OPEN_FAILED'));q.onblocked=()=>rej(Error('FIXTURE_IDB_OPEN_BLOCKED'))});
 try{
  if(story){
   // Seed via the actual TALERA WebKit-compatible byte-storage path. Direct
   // File writes to an ephemeral WebKit IndexedDB are not a valid fixture.
   const {restoreRowsAtomic,readAll}=await import('/__f5/f5-library-persistence.mjs');
   const jpg=Uint8Array.from(atob(fixtureJpeg),c=>c.charCodeAt(0)),key='local-media:'+story;
   await restoreRowsAtomic(db,{
    stories:[{id:story,title:story,items:[{key,kind:'photo'}],narrationCues:[{t:0,index:0}]}],
    files:[{key,blob:new File([jpg],story+'.jpg',{type:'image/jpeg',lastModified:12345})}]
   });
   const saved=await readAll(db),file=saved.files.find(r=>r.key===key)?.blob;
   if(!saved.stories.some(r=>r.id===story)||!(file instanceof File)||
      file.name!==story+'.jpg'||file.type!=='image/jpeg'||file.lastModified!==12345)
    throw Error('FIXTURE_METADATA_READBACK_FAILED');
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(bytes.length!==jpg.length||bytes.some((v,i)=>v!==jpg[i]))throw Error('FIXTURE_BYTES_READBACK_FAILED');
  }
 }finally{db.close()}
},{scope,story,fixtureJpeg});
const inspect=p=>p.evaluate(async scope=>{
 const m=await import('/__f5/f5-transfer-library.mjs'),s=await m.readTransferLibrary(scope);
 return {stories:s.stories.map(x=>x.id).sort(),files:await Promise.all(s.files.map(async x=>({key:x.key,name:x.blob.name,bytes:Array.from(new Uint8Array(await x.blob.arrayBuffer()))})))};
},scope);
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
try{
 for(const engine of [chromium,webkit]){
  signal=new TransferSignaling();
  const name=engine.name();
  const browser=await bounded(name+' launch',()=>engine===chromium?chromium.launch():webkit.launch(),35000);
  try{
   const a=await bounded(name+' sender context',()=>browser.newContext()),b=await bounded(name+' receiver context',()=>browser.newContext());
   await a.addCookies([{name:'sid',value:'a',url}]);await b.addCookies([{name:'sid',value:'b',url}]);
   const sender=await bounded(name+' sender page',()=>a.newPage()),receiver=await bounded(name+' receiver page',()=>b.newPage());
   for(const [role,page] of [['sender',sender],['receiver',receiver]]){page.setDefaultTimeout(15000);page.on('pageerror',e=>console.error('TALERA_TRANSFER_BROWSER_PAGE_ERROR',name,role,e.message));}
   await bounded(name+' sender goto',()=>sender.goto(url+'/__f5/backup'));await bounded(name+' receiver goto',()=>receiver.goto(url+'/__f5/backup'));
   await bounded(name+' seed first existing story',()=>seed(sender,'local-one'));await bounded(name+' seed empty receiving library',()=>seed(receiver,null));
   async function once(count,before){
    // Pairing server throttles consecutive starts for 3 seconds.
    const step=name+' transfer '+before+'/'+count;
    mark(step+' begin');
    await receiver.waitForTimeout(3100);
    await receiver.locator('#transfer-receive').click();
    mark(step+' receive pairing code');
    await receiver.locator('#transfer-code').waitFor({state:'visible',timeout:25000});
    const code=await receiver.locator('#transfer-code').innerText();
    const scanned=await bounded(step+' decode QR',()=>receiver.evaluate(async()=>{
     const canvas=document.getElementById('transfer-qr'),ctx=canvas.getContext('2d');
     const p=ctx.getImageData(0,0,canvas.width,canvas.height);
     const {default:decode}=await import('/__f5/f5-transfer-jsqr.mjs');
     const {readPairingPayload}=await import('/__f5/f5-transfer-qr.mjs');
     return readPairingPayload(decode(p.data,p.width,p.height,{inversionAttempts:'dontInvert'})?.data);
    }));
    assert.equal(scanned,code.replace(/-/g,'').toLowerCase());
    mark(step+' connect');
    await sender.locator('#transfer-send').click();
    await sender.locator('#transfer-input').fill(code);await sender.locator('#transfer-connect').click();
    try{
     mark(step+' wait for direct channel');
     await Promise.all([sender.locator('#transfer-approve').waitFor({state:'visible',timeout:25000}),receiver.locator('#transfer-approve').waitFor({state:'visible',timeout:25000})]);
     mark(step+' approve both');
     await sender.locator('#transfer-approve').click();await receiver.locator('#transfer-approve').click();
     if(count){
      await receiver.locator('#transfer-import').waitFor({state:'visible',timeout:30000});
      assert.equal((await bounded(step+' inspect before commit',()=>inspect(receiver))).stories.length,before);
      await receiver.locator('#transfer-import').click();
     }
     mark(step+' verify receipt');
     await sender.locator('#transfer-status').filter({hasText:count+' herinneringen toegevoegd en gecontroleerd'}).waitFor({timeout:30000});
     await receiver.locator('#transfer-receive').waitFor({state:'visible'});
     await receiver.waitForFunction(()=>!document.getElementById('transfer-receive').disabled);
     assert.deepEqual(await bounded(step+' inspect receiver',()=>inspect(receiver)),await bounded(step+' inspect sender',()=>inspect(sender)));
    }catch(e){console.error('TALERA_TRANSFER_BROWSER_FAILURE',checkpoint,e.message);for(const [role,page] of [['sender',sender],['receiver',receiver]]){try{console.error(role,await bounded(step+' '+role+' status',()=>page.locator('#transfer-status').textContent({timeout:2000}),3000))}catch{}}throw e}
   }
   await once(1,0);await bounded(name+' seed second story',()=>seed(sender,'local-two'));await once(1,1);await once(0,2);
   console.log('TALERA_DIRECT_TRANSFER_BROWSER_PASS',engine.name(),{networkPosts,firstCopy:true,repeatOnlyNew:true,identicalBytes:true,explicitConfirmation:true});
  }finally{await bounded(name+' browser close',()=>browser.close(),15000)}
  mark(name+' complete including cleanup');
 }
}finally{
 await bounded('fixture server close',()=>new Promise(r=>{server.close(r);server.closeAllConnections()}),5000);
 clearTimeout(watchdog);
}

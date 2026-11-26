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
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/api/me'){res.setHeader('content-type','application/json');res.end(JSON.stringify({account:{id:account}}));return}
  if(req.url==='/api/device-transfer'&&req.method==='POST'){
   networkPosts++;let data='';for await(const chunk of req)data+=chunk;
   assert.ok(data.length<=16000);
   const sid=/sid=([ab])/.exec(req.headers.cookie||'')?.[1]?.repeat(64);
   assert.ok(sid);
   const c=JSON.parse(data);
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
const seed=async (p,story)=>p.evaluate(async({scope,story})=>{
 const db=await new Promise((res,rej)=>{const q=indexedDB.open(scope,1);
 q.onupgradeneeded=()=>{q.result.createObjectStore('stories',{keyPath:'id'});q.result.createObjectStore('files',{keyPath:'key'})};
 q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
 if(story){
  const canvas=document.createElement('canvas');canvas.width=3;canvas.height=2;
  canvas.getContext('2d').fillRect(0,0,3,2);
  const jpg=await new Promise(r=>canvas.toBlob(r,'image/jpeg'));
  await new Promise((res,rej)=>{const tx=db.transaction(['stories','files'],'readwrite');
   const key='local-media:'+story;
   tx.objectStore('stories').add({id:story,title:story,items:[{key,kind:'photo'}],narrationCues:[{t:0,index:0}]});
   tx.objectStore('files').add({key,blob:new File([jpg],story+'.jpg',{type:'image/jpeg',lastModified:12345})});
   tx.oncomplete=res;tx.onabort=()=>rej(tx.error)});
 }db.close();
},{scope,story});
const inspect=p=>p.evaluate(async scope=>{
 const m=await import('/__f5/f5-transfer-library.mjs'),s=await m.readTransferLibrary(scope);
 return {stories:s.stories.map(x=>x.id).sort(),files:await Promise.all(s.files.map(async x=>({key:x.key,name:x.blob.name,bytes:Array.from(new Uint8Array(await x.blob.arrayBuffer()))})))};
},scope);
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
try{
 for(const engine of [chromium,webkit]){
  signal=new TransferSignaling();
  const browser=engine===chromium?await chromium.launch():await webkit.launch();
  try{
   const a=await browser.newContext(),b=await browser.newContext();
   await a.addCookies([{name:'sid',value:'a',url}]);await b.addCookies([{name:'sid',value:'b',url}]);
   const sender=await a.newPage(),receiver=await b.newPage();
   await sender.goto(url+'/__f5/backup');await receiver.goto(url+'/__f5/backup');
   await seed(sender,'local-one');await seed(receiver,null);
   async function once(count,before){
    // Pairing server throttles consecutive starts for 3 seconds.
    await receiver.waitForTimeout(3100);
    await receiver.locator('#transfer-receive').click();
    await receiver.locator('#transfer-code').waitFor({state:'visible',timeout:25000});
    const code=await receiver.locator('#transfer-code').innerText();
    const scanned=await receiver.evaluate(async()=>{
     const canvas=document.getElementById('transfer-qr'),ctx=canvas.getContext('2d');
     const p=ctx.getImageData(0,0,canvas.width,canvas.height);
     const {default:decode}=await import('/__f5/f5-transfer-jsqr.mjs');
     const {readPairingPayload}=await import('/__f5/f5-transfer-qr.mjs');
     return readPairingPayload(decode(p.data,p.width,p.height,{inversionAttempts:'dontInvert'})?.data);
    });
    assert.equal(scanned,code.replace(/-/g,'').toLowerCase());
    await sender.locator('#transfer-send').click();
    await sender.locator('#transfer-input').fill(code);await sender.locator('#transfer-connect').click();
    try{
     await Promise.all([sender.locator('#transfer-approve').waitFor({state:'visible',timeout:25000}),receiver.locator('#transfer-approve').waitFor({state:'visible',timeout:25000})]);
     await sender.locator('#transfer-approve').click();await receiver.locator('#transfer-approve').click();
     if(count){
      await receiver.locator('#transfer-import').waitFor({state:'visible',timeout:30000});
      assert.equal((await inspect(receiver)).stories.length,before);
      await receiver.locator('#transfer-import').click();
     }
     await sender.locator('#transfer-status').filter({hasText:count+' herinneringen toegevoegd en gecontroleerd'}).waitFor({timeout:30000});
     await receiver.locator('#transfer-receive').waitFor({state:'visible'});
     await receiver.waitForFunction(()=>!document.getElementById('transfer-receive').disabled);
     assert.deepEqual(await inspect(receiver),await inspect(sender));
    }catch(e){console.error(engine.name(),await sender.locator('#transfer-status').innerText(),await receiver.locator('#transfer-status').innerText());throw e}
   }
   await once(1,0);await seed(sender,'local-two');await once(1,1);await once(0,2);
   console.log('TALERA_DIRECT_TRANSFER_BROWSER_PASS',engine.name(),{networkPosts,firstCopy:true,repeatOnlyNew:true,identicalBytes:true,explicitConfirmation:true});
  }finally{await browser.close()}
 }
}finally{await new Promise(r=>server.close(r))}

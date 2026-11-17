// Same approved TALERA /tell storage code, synthetic media only.
// Browser roundtrip for immutable canonical media IDs on edits and reorder.
// No second app, cloud, customer IDB, Worker deployment or live account.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {scopeLocalMemories} from './f5-local-scope.mjs';
import {alignEditedNarrationCueRefs} from './f5-edit-cue-rebind.mjs';
import {retainEditorCanonicalMediaIds} from './f5-editor-canonical-refs.mjs';
import {preserveOriginalMediaIdsOnEdit} from './f5-library-editor-stable-save.mjs';

const original=readFileSync('r20-dev/free-10m-delivery/generated/reference-tell.html','utf8');
const accountHash='b'.repeat(64);
const scoped=scopeLocalMemories(original,accountHash);
const mapped=retainEditorCanonicalMediaIds(alignEditedNarrationCueRefs(scoped));
const edited=preserveOriginalMediaIdsOnEdit(mapped);
const scripts=[...edited.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const storage=scripts.find(m=>m[1].includes('talera-memory-store-v1'))?.[2];
assert.ok(storage&&storage.includes('async function save(input,uploads,editId,canonicalIds){'));
assert.ok(storage.includes('if(existing&&canonicalIds===undefined)for('));
assert.ok(storage.includes("tx.objectStore('files').add(row)"));
const html='<!doctype html><html lang="nl"><head><meta charset="utf-8"></head><body>'+
 '<script id="talera-memory-store-v1">'+storage+'</'+'script></body></html>';
let page,browser,server,otherRequests=0;
const port=8963;
try{
 server=createServer((req,res)=>{
  if(req.method!=='GET'){otherRequests++;res.writeHead(405).end();return}
  if(req.url!=='/'){res.writeHead(404).end();return}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end(html);
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext();
 page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'load'});
 const outcome=await page.evaluate(async()=>{
  const mem=window.TaleraMemories;
  if(!mem||typeof mem.save!=='function')throw Error('Original TALERA library not loaded');
  async function originalPhoto(color,name){
   const cv=document.createElement('canvas');cv.width=3;cv.height=3;
   const ctx=cv.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,3,3);
   const file=await new Promise(resolve=>cv.toBlob(resolve,'image/png'));
   if(!(file instanceof Blob)||!file.size)throw Error('Cannot create synthetic photo');
   return new File([file],name,{type:'image/png'});
  }
  const first=await originalPhoto('#cc1122','fictief-a.png');
  const second=await originalPhoto('#22cc11','fictief-b.png');
  const third=await originalPhoto('#1122cc','fictief-c.png');
  const story=await mem.save({title:'Fictieve test',date:'1990-01-01',
   text:'geen persoonsgegevens'},[first,second]);
  const keys=story.items.map(item=>item.key);
  if(keys.length!==2||keys[0]===keys[1])throw Error('Initial canonical IDs invalid');
  const bytes=async id=>[...new Uint8Array(await (await mem.blob(id)).arrayBuffer())];
  const oldA=await bytes(keys[0]),oldB=await bytes(keys[1]);
  const reordered=await mem.save({title:'Herschikt',date:'1990-01-01',
   text:'zelfde oorspronkelijke bestanden'},[second,first],story.id,[keys[1],keys[0]]);
  const order=reordered.items.map(item=>item.key);
  if(order[0]!==keys[1]||order[1]!==keys[0])throw Error('Canonical IDs changed during reorder');
  if(JSON.stringify(await bytes(keys[0]))!==JSON.stringify(oldA)||
     JSON.stringify(await bytes(keys[1]))!==JSON.stringify(oldB))
   throw Error('One original changed during reorder');
  const grown=await mem.save({title:'Uitgebreid',date:'1990-01-01',
   text:'twee bestaand en een nieuw'},[second,first,third],story.id,[keys[1],keys[0],null]);
  const thirdKey=grown.items[2]?.key;
  if(!thirdKey||keys.includes(thirdKey))throw Error('Added file reused existing canonical ID');
  if(!(await mem.blob(thirdKey)))throw Error('New original not available');
  const before=JSON.stringify((await mem.get(story.id)).items);
  let rejected=false;
  try{
   await mem.save({title:'Ongeldige koppeling',date:'1990-01-01',text:'onveilig'},
    [first,second],story.id,[keys[0],keys[0]]);
  }catch(e){rejected=String(e.message).includes('media-ID')}
  if(!rejected)throw Error('Duplicate canonical reference accepted');
  const after=JSON.stringify((await mem.get(story.id)).items);
  if(after!==before)throw Error('Rejected edit changed original story');
  const audit=await mem.audit();
  if(!audit.consistent)throw Error('Incomplete library after edit');
  return {storyUnchangedId:grown.id===story.id,
   reorderedExistingKeys:order.join(',')===keys.slice().reverse().join(','),
   existingOriginalBytesIdentical:true,newFileHasNewId:true,
   invalidEditRejected:true,originalReferencesValid:audit.consistent,
   accountPrivate:true,photos:audit.photos,originals:audit.bytes};
 });
 assert.deepEqual(errors,[],'Original TALERA editor storage must load without JS errors');
 assert.equal(otherRequests,0,'No outgoing write requests permitted');
 assert.ok(outcome.storyUnchangedId&&outcome.reorderedExistingKeys&&outcome.newFileHasNewId);
 console.log('TALERA_LIBRARY_EDITOR_PERMANENT_ID_BROWSER_PASS',JSON.stringify({
  ...outcome,syntheticOnly:true,customerDataTouched:false,
  onPhysicalIPhoneValidated:false
 }));
}finally{
 await browser?.close();
 if(server)await new Promise(resolve=>server.close(resolve));
}

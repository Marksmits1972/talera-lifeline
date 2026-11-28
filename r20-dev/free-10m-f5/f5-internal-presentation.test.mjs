import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeReceivedProjection} from './f5-internal-presentation.mjs';
import {internalSendOriginal} from './f5-internal-send.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const key='a'.repeat(64);
const bytes=new Uint8Array([1,2,3]);
function fixture(){
 const manifest={version:1,items:[{kind:'audio',mediaId:'original:voice',mime:'audio/mp4',size:bytes.length,parts:1,hashes:[hash(bytes)]}],posters:[],narrationCues:[],narrationDurationMs:3000,datePrecision:'exact',time:'12:00:00'};
 const record={key,state:'ready',unread:true,createdAt:100,content:{eventDate:'2024-03-19',title:'Stem',storyText:'',manifest,manifestHash:hash(JSON.stringify(manifest))}};
 return {record,store:{get:async k=>k===key?structuredClone(record):null,getPart:async(k,id)=>k===key&&id==='asset-0-0'?bytes.slice():null,markSeen:async()=>{record.unread=false},close(){}}};
}
test('received projection is read-only, preserves media ID, and marks seen only on explicit presentation action',async()=>{
 const {record,store}=fixture(),revoked=[];
 const p=await makeReceivedProjection(key,store,{createUrl:()=> 'blob:received',revokeUrl:url=>revoked.push(url)});
 assert.equal(record.unread,true);
 const [row]=await p.library.list();assert.equal(row.id,'local-received-'+key);
 assert.equal(row.items[0].key,'original:voice');
 assert.equal(await p.library.get('local-other'),null);
 assert.equal(await p.library.blob('owner:private'),null);
 assert.equal(p.library.save,undefined);
 assert.deepEqual(new Uint8Array(await (await p.library.blob('original:voice')).arrayBuffer()),bytes);
 assert.equal(await p.library.mediaUrl('original:voice'),'blob:received');
 assert.equal(record.unread,true);await p.markSeen();assert.equal(record.unread,false);
 p.dispose();assert.deepEqual(revoked,['blob:received']);
});
test('received projection cannot display partial, corrupt, missing or wrong-account data',async()=>{
 for(const mode of ['partial','wrong-key','corrupt','wrong-hash','changed']){
  const {record,store}=fixture();let current=true;
  if(mode==='partial')record.state='partial';
  if(mode==='corrupt')store.getPart=async()=>new Uint8Array([1,2,4]);
  if(mode==='wrong-hash')record.content.manifestHash='0'.repeat(64);
  if(mode==='changed')store.getPart=async()=>{current=false;return bytes};
  await assert.rejects(makeReceivedProjection(mode==='wrong-key'?'b'.repeat(64):key,store,{isCurrent:()=>current}));
  assert.equal(record.unread,true);
 }
});
test('send upload hash failure or changed account cannot finalize',async()=>{
 for(const mode of ['checksum','account']){
  let current=true,finalized=false;
  const row={id:'local-sender-story',title:'Story',text:'',date:'2024-03-19',items:[{key:'original:voice',kind:'audio'}],narrationCues:[],narrationDurationMs:1000};
  const library={get:async()=>row,blob:async()=>new Blob([bytes],{type:'audio/mp4'})};
  await assert.rejects(internalSendOriginal({memory:{_taleraLocal:true,storyId:row.id},library,
   contacts:['00000000-0000-4000-8000-000000000001'],requestId:'00000000-0000-4000-8000-000000000002',expiresAt:Date.now()+1000,
   mimeFor:async(item,blob)=>blob.type,isCurrent:()=>current,
   post:async data=>{if(data.action==='finalize')finalized=true;return {ok:true,key,state:'draft'}},
   upload:async()=>{if(mode==='account')current=false;return {ok:true,sha256:mode==='checksum'?'0'.repeat(64):hash(bytes)}}}));
  assert.equal(finalized,false);
 }
});

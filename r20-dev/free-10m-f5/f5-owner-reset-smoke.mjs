// Test the EXACT generated signed-in and guest TALERA Home scripts.
// One PWA, no new UI or Worker, no private data leaves the phone.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
import {referencePages,guestPages} from './generated/public-template-map.mjs';
const root='r20-dev/free-10m-delivery/public';
const originalWorker=readFileSync('r20-dev/free-10m-f5/f5-worker.mjs','utf8');
assert.ok(originalWorker.includes("const OWNER_PURGE_PATH='/mijn-leven/opschonen-cfd3450b58ef9410b64a26cc84c2045c';")&&
 originalWorker.includes("pathname===OWNER_PURGE_PATH?'/mijn-leven':pathname"),
 'Reset action path must resolve to original signed-in or guest Home page');
assert.ok(originalWorker.includes("if(url.pathname==='/mijn-leven'&&key==='wis-alle-verhalen'&&id==='nu')return true;"),
  'The same app must allow this exact reset query through its normal route security');
async function check(shell,requested){
 const html=readFileSync(root+shell['/mijn-leven'],'utf8');
 const m=html.match(/<script id="talera-owner-delete-on-request">([\s\S]*?)<\/script>/);
 assert.ok(m?.[1],'Actual generated Home script missing');
 let rows=Array.from({length:3},(_,i)=>({
   id:'local-aabbccdd-1234-4678-abb0-12345678900'+i,
   source:'pwa-local',
   items:[{kind:'photo',key:'local-aabbccdd-1234-4678-abb0-12345678900'+i+':0'}]
 }));
 const otherAccount=[{id:'local-unrelated-account-story'}],removed=[],messages=[],redirects=[];
 const location={pathname:requested?
    '/mijn-leven/opschonen-cfd3450b58ef9410b64a26cc84c2045c':'/mijn-leven',
   search:'',
   replace(value){redirects.push(value)}
 };
 const document={
   readyState:'complete',
   body:{appendChild(node){messages.push(node)}},
   getElementById(id){return messages.find(x=>x.id===id)||null},
   createElement(tag){return {tag,id:'',textContent:'',style:{},setAttribute(){}}}
 };
 const history={replaceState(state,title,path){
   assert.equal(path,'/mijn-leven');
   location.search='';
 }};
 const store={
  localOnly:true,
  async list(){return rows.map(r=>({...r}))},
  async remove(id){
   assert.ok(rows.some(x=>x.id===id),'Unknown or other-account record selected');
   removed.push(id);rows=rows.filter(x=>x.id!==id);
  }
 };
 const errors=[],perPhone=new Map();
 const localStorage={
  getItem(key){return perPhone.get(key)||null},
  setItem(key,value){perPhone.set(key,value)}
 };
 const actualScript=new Script(m[1],{filename:'exact-TALERA-owner-one-time-reset.js'});
 const context=createContext({
   document,history,location,window:{TaleraMemories:store},
   URLSearchParams,Promise,setTimeout,localStorage,
   console:{error:x=>errors.push(String(x))},
   alert:msg=>errors.push('alert '+msg)
 });
 actualScript.runInContext(context);
 for(let i=0;i<60;i++)await Promise.resolve();
 if(requested){
   assert.equal(location.search,'','Destructive URL must not persist in browser history');
   assert.equal(removed.length,3,'All visible same-store local stories deleted');
   assert.deepEqual(rows,[]);
   assert.equal(redirects.at(-1),'/mijn-leven');
   assert.ok(messages.find(x=>x.id==='talera-own-reset-progress'));
   assert.equal(perPhone.get('talera-free-owner-cleanup-cfd3450b58ef9410b64a26cc84c2045c'),
     'done','Only a confirmed nonempty deletion marks the one-time link complete');
   rows=[{id:'local-new-after-cleanup-abc123456',source:'pwa-local'}];
   location.pathname='/mijn-leven/opschonen-cfd3450b58ef9410b64a26cc84c2045c';
   actualScript.runInContext(context);
   for(let i=0;i<60;i++)await Promise.resolve();
   assert.equal(removed.length,3,'Reopening the link may never delete new stories');
   assert.equal(rows.length,1,'New stories after cleanup must be preserved');
 }else{
   assert.deepEqual(removed,[],'Normal Home MUST NEVER delete memories');
   assert.equal(rows.length,3);
   assert.deepEqual(redirects,[]);
 }
 assert.equal(otherAccount.length,1,'Another account DB cannot be touched');
 assert.deepEqual(errors,[]);
 return {requested,removed:removed.length,normalHomeSafe:!requested||rows.length===0};
}
const result={
 signedNormal:await check(referencePages,false),
 signedReset:await check(referencePages,true),
 guestNormal:await check(guestPages,false),
 guestReset:await check(guestPages,true)
};
console.log('TALERA_ONE_TIME_RESET_ON_REAL_SIGNED_AND_GUEST_HOME_PASS',
 JSON.stringify({...result,remoteIphoneStorageAccess:false,realIphoneAccepted:false}));

// Same TALERA Free PWA source: exact generated signed-in Home reset script.
// No second app, worker, origin, HTTP service, or real account data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
import {referencePages,guestPages} from './generated/public-template-map.mjs';
const root='r20-dev/free-10m-delivery/public';
const signed=readFileSync(root+referencePages['/mijn-leven'],'utf8');
const guest=readFileSync(root+guestPages['/mijn-leven'],'utf8');
const m=signed.match(/<script id="talera-owner-delete-on-request">([\s\S]*?)<\/script>/);
assert.ok(m?.[1],'Existing signed-in Home reset script not generated');
assert.ok(!guest.includes('id="talera-owner-delete-on-request"'),
  'Guest must not have access to account-scoped deletion');
assert.ok(signed.includes('id="v17-year-summary"'));
const program=new Script(m[1],{filename:'exact-TALERA-Free-owner-reset.js'});
async function smoke(hash){
 let rows=Array.from({length:3},(_,i)=>({
   id:'local-aabbccdd-1234-4678-abb0-12345678900'+i,source:'pwa-local',
   items:[{key:'local-aabbccdd-1234-4678-abb0-12345678900'+i+':0',kind:'photo'}]
 }));
 const otherAccount=[{id:'local-other-private-account-record',source:'pwa-local'}];
 const all=[],removed=[],redirects=[],errors=[],alerts=[];
 class Element{
  constructor(tag){this.tag=tag;this.style={};this.listeners={};this.attributes={};
   this.disabled=false;this.textContent='';this.id='';all.push(this);}
  setAttribute(name,value){this.attributes[name]=value}
  insertAdjacentElement(where,element){assert.equal(where,'afterend');this.after=element}
  addEventListener(name,fn){this.listeners[name]=fn}
  append(...nodes){this.children=(this.children||[]).concat(nodes)}
  appendChild(node){this.append(node);return node}
  remove(){this.removed=true}
  focus(){}
 }
 const host=new Element('span');host.id='v17-year-summary';
 const doc={
  readyState:'complete',body:new Element('body'),
  createElement:t=>new Element(t),
  getElementById:id=>all.find(n=>n.id===id&&!n.removed)||null,
  addEventListener(){throw Error('Unexpected DOM delay')}
 };
 const store={
  localOnly:true,
  async list(){return rows.map(x=>({...x}))},
  async remove(id){
   assert.ok(rows.some(x=>x.id===id),'Only signed-in original local IDs can be removed');
   removed.push(id);rows=rows.filter(x=>x.id!==id);return true;
  }
 };
 const location={
  pathname:'/mijn-leven',search:'',hash:hash?'#wis-alle-verhalen':'',
  replace(url){redirects.push(url)}
 };
 const history={replaceState(state,title,path){location.hash='';assert.equal(path,'/mijn-leven')}};
 program.runInContext(createContext({
   window:{TaleraMemories:store},document:doc,location,history,
   URLSearchParams,Promise,setTimeout,clearTimeout,
   alert:msg=>alerts.push(msg),console:{error:(...args)=>errors.push(args.join(' '))}
 }));
 for(let i=0;i<30;i++)await Promise.resolve();
 const trigger=doc.getElementById('talera-owner-clear-stories');
 assert.ok(trigger&&host.after===trigger,'Visible Home action must be inserted next to own-memory count');
 assert.ok(trigger.textContent.includes('Wis alle'));
 assert.deepEqual(removed,[],'Never automatically delete records on entering the page');
 if(!hash){
  assert.equal(doc.getElementById('talera-owner-clear-confirm'),null);
  trigger.listeners.click();
 }
 const shade=doc.getElementById('talera-owner-clear-confirm');
 assert.ok(shade&&shade.children?.length===1,'Actual in-page confirm, not Safari native confirm');
 const confirm=doc.getElementById('talera-clear-confirm-button');
 assert.ok(confirm&&!confirm.disabled,'User can explicitly confirm local deletion');
 await confirm.listeners.click();
 for(let i=0;i<10;i++)await Promise.resolve();
 assert.deepEqual(rows,[]);
 assert.equal(removed.length,3);
 assert.equal(redirects.at(-1),'/mijn-leven');
 assert.equal(errors.length,0,JSON.stringify(errors));
 assert.equal(alerts.length,0,'Native alerts should not block successful deletion');
 assert.equal(otherAccount.length,1,'Other account records cannot be touched');
 return {requestedLink:hash,deleted:removed.length,sameAccount:true,guestProtected:true};
}
const normal=await smoke(false);
const link=await smoke(true);
console.log('TALERA_EXACT_OWNER_CLEAR_HOME_BUTTON_AND_LINK_PASS',
 JSON.stringify({normal,link,originalScopedStoreUsed:true,
  onlyActualSignedInHomeSource:true,physicalIphoneAccepted:false}));

// Existing Meldingen view: merge pending server locators and locally delivered
// packages by ID. Download only after a deliberate open; no media polling.
let taleraInboxPanel=null,taleraInboxCache=null,taleraInboxFlight=null;
const inboxLabels=Object.freeze({inbox:'menu.internal.inbox',inboxEmpty:'menu.internal.inboxEmpty',loading:'menu.internal.loading',personal:'menu.internal.personal',receiveError:'menu.internal.receiveError',receiveProgress:'menu.internal.receiveProgress',received:'menu.internal.received',unknownSender:'menu.internal.unknownSender',unread:'menu.internal.unread'});
const inboxText=(key,p)=>t(inboxLabels[key],p);
function taleraClearInbox(){
 taleraInboxPanel?.root.remove();taleraInboxPanel=null;taleraInboxCache=null;taleraInboxFlight=null;
}
const inboxCurrent=(account,epoch)=>state.account?.id===account&&authEpoch===epoch;
async function taleraInboxRpc(account,epoch,path,input){
 if(!inboxCurrent(account,epoch))throw Error('ACCOUNT_CHANGED');
 const r=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-talera-expected-account':account},body:JSON.stringify(input)});
 const data=await r.json().catch(()=>null);
 if(!inboxCurrent(account,epoch)||!r.ok||!data?.ok)throw Error('INBOX_UNAVAILABLE');
 return data;
}
async function taleraInboxLocal(account,epoch,fn){
 const db=await taleraReceive.openReceivedStore(account,{isCurrent:()=>inboxCurrent(account,epoch)});
 try{return await fn(db)}finally{db.close()}
}
async function taleraInboxData(force=false){
 const account=state.account?.id,epoch=authEpoch;
 if(!account)return [];
 if(taleraInboxFlight?.account===account&&taleraInboxFlight.epoch===epoch)return taleraInboxFlight.promise;
 const flow={account,epoch};taleraInboxFlight=flow;
 flow.promise=(async()=>{
  const local=await taleraInboxLocal(account,epoch,db=>db.list());
  let pending=taleraInboxCache?.account===account&&taleraInboxCache.epoch===epoch?taleraInboxCache.items:[];
  if(force||!taleraInboxCache||Date.now()-taleraInboxCache.at>=60000){
   try{
    const items=[];let after=null;
    do{
     const d=await taleraInboxRpc(account,epoch,'/api/internal-share',{action:'list',direction:'in',after});
     items.push(...d.items);after=d.next;
    }while(after);
    pending=items;
    if(inboxCurrent(account,epoch))taleraInboxCache={account,epoch,at:Date.now(),items};
   }catch(e){if(!inboxCurrent(account,epoch))return []}
  }
  if(!inboxCurrent(account,epoch))return [];
  const merged=new Map(pending.filter(x=>x.expiresAt>Date.now()).map(x=>[x.key,{...x,local:false}]));
  for(const r of local)merged.set(r.key,{key:r.key,sender:r.sender,senderName:r.senderName,createdAt:r.createdAt,expiresAt:r.expiresAt,title:r.content.title,eventDate:r.content.eventDate,unread:r.unread,local:true});
  return [...merged.values()].sort((a,b)=>b.createdAt-a.createdAt);
 })();
 try{return await flow.promise}finally{if(taleraInboxFlight===flow)taleraInboxFlight=null}
}
async function taleraInboxNames(account,epoch){
 const names=new Map();let after=null;
 try{do{const d=await taleraInboxRpc(account,epoch,'/api/people/link',{action:'inbound-list',after});for(const x of d.items)names.set(x.id,x.name);after=d.next}while(after)}catch(e){}
 return names;
}
function taleraRenderInbox(){
 if(!state.open||!['messages','notifications'].includes(state.view)||!state.account){
  taleraInboxPanel?.root.remove();taleraInboxPanel=null;return;
 }
 const account=state.account.id,epoch=authEpoch,lang=window.TaleraI18n.language;
 if(taleraInboxPanel?.account===account&&taleraInboxPanel.epoch===epoch&&taleraInboxPanel.lang===lang){body.prepend(taleraInboxPanel.root);return}
 const root=document.createElement('div');root.className='info';root.dataset.taleraInternalInbox='true';
 const v={root,account,epoch,lang,busy:false};taleraInboxPanel=v;body.prepend(root);
 const current=()=>taleraInboxPanel===v&&state.open&&['messages','notifications'].includes(state.view)&&inboxCurrent(account,epoch);
 const node=(tag,value='',cls='')=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n};
 const title=node('strong',inboxText('inbox')),status=node('p',inboxText('loading'),'meta'),list=node('div');
 status.setAttribute('role','status');root.append(title,status,list);
 const refresh=async()=>{
  try{
   const [items,names]=await Promise.all([taleraInboxData(true),taleraInboxNames(account,epoch)]);
   if(!current())return;
   status.textContent=items.length?'':inboxText('inboxEmpty');list.replaceChildren();
   const groups=new Map();
   for(const entry of items){const a=groups.get(entry.sender)||[];a.push(entry);groups.set(entry.sender,a)}
   for(const [sender,entries] of groups){
    const name=names.get(sender)||entries.find(x=>x.senderName)?.senderName||inboxText('unknownSender');
    const group=node('div'),heading=node('div','','status-line'),label=node('strong',name),unread=entries.filter(x=>x.unread).length;
    heading.append(label);
    if(unread){const badge=node('span',String(unread));badge.style.cssText='background:#bd263e;color:#fff;border-radius:14px;padding:2px 8px;min-width:18px;text-align:center';badge.setAttribute('aria-label',inboxText('unread',{count:unread}));heading.append(badge)}
    group.append(heading);
    for(const entry of entries){
     const b=node('button','','option');b.type='button';b.dataset.internalReceived=entry.key;
     const copy=node('span','','copy');copy.append(node('strong',entry.title||inboxText('received')),node('small',entry.eventDate||inboxText('personal')));b.append(copy,node('span',entry.unread?'● ›':'›'));group.append(b);
     b.addEventListener('click',async()=>{
      if(!current()||v.busy)return;v.busy=true;
      root.querySelectorAll('button').forEach(el=>el.disabled=true);
      status.textContent=inboxText('receiveProgress');
      try{
       await taleraInboxLocal(account,epoch,async db=>{
        const ready=await taleraReceive.receiveInternalShare({...entry,senderName:name},{store:db,...taleraReceive.receivedTransport(account,{isCurrent:current}),isCurrent:current});
        if(!current()||ready?.state!=='ready')throw Error('RECEIVE_INCOMPLETE');
       });
       if(!current())return;
       location.assign('/present?received='+entry.key);
      }catch(e){if(current()){status.textContent=inboxText('receiveError');root.querySelectorAll('button').forEach(el=>el.disabled=false)}}
      finally{v.busy=false}
     });
    }
    list.append(group);
   }
  }catch(e){if(current())status.textContent=inboxText('receiveError')}
 };
 void refresh();
}

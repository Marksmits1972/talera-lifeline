// Injected into the one existing share sheet, not a separate page or player.
let internalView=null;
const it=(name,params)=>window.TaleraI18n.t('menu.internal.'+name,params);
const internalCurrent=v=>internalView===v&&mode==='internal'&&!overlay.hidden&&
 String(runtime.currentMemory()?.id)===v.memoryId&&(!v.account||window.__taleraMoreMenu?.state?.().accountId===v.account);
const internalPost=async(v,path,body,blob=null)=>{
 if(!internalCurrent(v))throw Error('ACCOUNT_CHANGED');
 const r=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':blob?blob.type:'application/json','x-talera-expected-account':v.account},body:blob||JSON.stringify(body)});
 const result=await r.json().catch(()=>null);
 if(!internalCurrent(v)||!r.ok||!result?.ok)throw Error('INTERNAL_REQUEST_FAILED');
 return result;
};
function internalRouteOption(){
 if(shareAuth!==true||share.current().state==='preparing'||memory?._taleraReceived)return '';
 return '<button type="button" class="secondary" data-action="internal-route">'+escapeText(it('shareWithPeople'))+'</button>';
}
async function openInternal(){
 if(mode!=='share'||share.current().state==='preparing')return;
 const v={memoryId:String(runtime.currentMemory()?.id),account:null,rows:null,selected:new Set(),busy:false,sent:false,failed:false};
 internalView=v;mode='internal';render();
 try{
  const me=await coreRequest('/api/me');
  if(!internalCurrent(v)||!me.account?.id)throw Error('ACCOUNT_REQUIRED');
  v.account=me.account.id;
  if(!internalCurrent(v))throw Error('ACCOUNT_CHANGED');
  const db=await taleraContactAccess.openPeopleStore(v.account,{isCurrent:()=>internalCurrent(v)});
  let rows;try{rows=await db.list()}finally{db.close()}
  const linked=new Set(),chosen=rows.filter(x=>x.pairingApiUsed).map(x=>x.id);
  for(let i=0;i<chosen.length;i+=100){
   const result=await internalPost(v,'/api/people/link',{action:'list',contacts:chosen.slice(i,i+100)});
   for(const id of result.linked||[])linked.add(id);
  }
  if(!internalCurrent(v))return;
  v.rows=rows.filter(x=>linked.has(x.id));render();
 }catch(e){if(internalView===v&&mode==='internal'){v.failed=true;render()}}
}
function renderInternal(){
 const v=internalView;if(!v)return;
 const el=(tag,txt='',cls='')=>{const n=document.createElement(tag);if(txt)n.textContent=txt;if(cls)n.className=cls;return n};
 const btn=(txt,fn,cls='secondary')=>{const n=el('button',txt,cls);n.type='button';n.disabled=v.busy;n.addEventListener('click',fn);return n};
 panel.replaceChildren(el('h2',it('shareWithPeople')),el('p',it('shareHint')));
 const status=el('p','','status');status.setAttribute('role','status');panel.append(status);
 if(v.sent){
  status.textContent=it('sent');panel.append(btn(it('done'),close,'primary'));return;
 }
 if(v.failed){status.textContent=it('shareError');panel.append(btn(it('backToWhatsApp'),()=>{internalView=null;mode='share';render()}));return}
 if(v.rows===null){status.textContent=it('loading');return}
 if(!v.rows.length){
  status.textContent=it('noLinked');
  panel.append(btn(it('openPeople'),()=>{close();window.__taleraMoreMenu?.open('people')},'primary'));
 }else{
  const actions=el('div');actions.append(btn(it('all'),()=>{v.request=null;v.selected=new Set(v.rows.map(x=>x.id));render()}),
   btn(it('favorites'),()=>{v.request=null;v.selected=new Set(v.rows.filter(x=>x.favorite).map(x=>x.id));render()}),
   btn(it('clear'),()=>{v.request=null;v.selected.clear();render()}));
  panel.append(actions);
  const list=el('div');
  for(const contact of v.rows){
   const label=el('label'),c=el('input');c.type='checkbox';c.checked=v.selected.has(contact.id);c.disabled=v.busy;
   label.style.cssText='display:flex;align-items:center;gap:10px;padding:8px 0';
   c.addEventListener('change',()=>{if(c.checked)v.selected.add(contact.id);else v.selected.delete(contact.id);v.request=null;render()});
   label.append(c,el('span',contact.name+(contact.favorite?' ★':'')));list.append(label);
  }
  panel.append(list,el('p',it('selected',{count:v.selected.size})));
  const send=btn(it('send'),async()=>{
   if(!internalCurrent(v)||v.busy||!v.selected.size)return;
   const contacts=[...v.selected].sort();
   if(!v.request)v.request={requestId:crypto.randomUUID(),expiresAt:Date.now()+7*86400000-5000,contacts};
   v.busy=true;v.error=false;render();
   try{
    const lib=window.TaleraLibrary||window.TaleraMemories;
    const result=await taleraInternalSender.internalSendOriginal({memory:runtime.currentMemory(),library:lib,...v.request,
      mimeFor:taleraVerifiedGuestShareMime,isCurrent:()=>internalCurrent(v),
      post:body=>internalPost(v,'/api/internal-share',body),
      upload:(key,path,blob)=>internalPost(v,'/api/internal-share/upload/'+key+path,null,blob),
      onProgress:n=>{if(internalCurrent(v)){const label=panel.querySelector('[role="status"]');if(label)label.textContent=it('progress',{percent:n})}}});
    if(internalCurrent(v)&&result.ok)v.sent=true;
   }catch(e){if(internalCurrent(v))v.error=true}
   finally{if(internalView===v&&mode==='internal'){v.busy=false;render()}}
  },'primary');send.disabled=v.busy||!v.selected.size;panel.append(send);
 }
 if(v.error)status.textContent=it('shareError');
 else if(v.busy)status.textContent=it('progress',{percent:0});
 if(!v.busy)panel.append(btn(it('backToWhatsApp'),()=>{internalView=null;mode='share';render()}),btn(it('done'),close));
}

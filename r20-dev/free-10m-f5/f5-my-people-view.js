// Embedded inside the existing menu closure after original localization.
// No contact details pass into markup, requests, globals, logs or URLs.
let taleraPeoplePanel=null;
function taleraClearPeopleView(){
 if(taleraPeoplePanel){taleraPeoplePanel.root.replaceChildren();taleraPeoplePanel.root.remove();taleraPeoplePanel=null}
}
function taleraRenderPeopleView(){
 const mount=document.getElementById('talera-my-people-mount');
 if(state.view!=='people'||!state.open||!state.account||!mount){taleraClearPeopleView();return}
 const account=state.account.id,epoch=authEpoch,language=window.TaleraI18n.language;
 if(taleraPeoplePanel?.account===account&&taleraPeoplePanel.epoch===epoch&&taleraPeoplePanel.language===language){
  mount.append(taleraPeoplePanel.root);return;
 }
 taleraClearPeopleView();
 const root=document.createElement('div');
 root.dataset.taleraPeople='true';
 const panel={root,account,epoch,language};taleraPeoplePanel=panel;mount.append(root);
 const current=()=>taleraPeoplePanel===panel&&state.open&&state.view==='people'&&authEpoch===epoch&&state.account?.id===account;
 const peopleKeys=Object.freeze({title:'menu.people.title',localNotice:'menu.people.localNotice',signInTitle:'menu.people.signInTitle',signInHint:'menu.people.signInHint',signInAction:'menu.people.signInAction',contacts:'menu.people.contacts',empty:'menu.people.empty',add:'menu.people.add',edit:'menu.people.edit',remove:'menu.people.remove',name:'menu.people.name',phone:'menu.people.phone',phoneHint:'menu.people.phoneHint',save:'menu.people.save',cancel:'menu.people.cancel',whatsapp:'menu.people.whatsapp',notLinked:'menu.people.notLinked',favorite:'menu.people.favorite',unfavorite:'menu.people.unfavorite',confirmRemove:'menu.people.confirmRemove',removed:'menu.people.removed',saved:'menu.people.saved',pick:'menu.people.pick',vcard:'menu.people.vcard',vcardHint:'menu.people.vcardHint',review:'menu.people.review',reviewHint:'menu.people.reviewHint',search:'menu.people.search',phoneFor:'menu.people.phoneFor',noPhone:'menu.people.noPhone',addSelected:'menu.people.addSelected',chooseAtLeastOne:'menu.people.chooseAtLeastOne',importResult:'menu.people.importResult',noImport:'menu.people.noImport',pickerUnavailable:'menu.people.pickerUnavailable',fileInvalid:'menu.people.fileInvalid',nameInvalid:'menu.people.nameInvalid',phoneInvalid:'menu.people.phoneInvalid',duplicate:'menu.people.duplicate',storageError:'menu.people.storageError',linked:'menu.people.linked',linkContact:'menu.people.linkContact',joinInvite:'menu.people.joinInvite',inviteTitle:'menu.people.inviteTitle',makeInvite:'menu.people.makeInvite',inviteHint:'menu.people.inviteHint',inviteReady:'menu.people.inviteReady',copy:'menu.people.copy',copied:'menu.people.copied',claim:'menu.people.claim',claimHint:'menu.people.claimHint',claimReady:'menu.people.claimReady',confirm:'menu.people.confirm',confirmHint:'menu.people.confirmHint',confirmed:'menu.people.confirmed',unlink:'menu.people.unlink',unlinkConfirm:'menu.people.unlinkConfirm',unlinked:'menu.people.unlinked',linkError:'menu.people.linkError',unverified:'menu.people.unverified',inbound:'menu.people.inbound',inboundHint:'menu.people.inboundHint',block:'menu.people.block',unblock:'menu.people.unblock',blocked:'menu.people.blocked',more:'menu.people.more',invitePlaceholder:'menu.people.invitePlaceholder',confirmPlaceholder:'menu.people.confirmPlaceholder',close:'menu.people.close',copyError:'menu.people.copyError',reviewIdentity:'menu.people.reviewIdentity'});
 const tr=(key,params)=>t(peopleKeys[key],params);
 const el=(tag,text='',className='')=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node};
 const button=(label,fn,cls='secondary')=>{
  const b=el('button',label,cls);b.type='button';
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(current())void fn()});return b;
 };
 const message=el('p','','notice');message.hidden=true;message.setAttribute('role','status');
 const note=(key,params={},error=false)=>{
  if(!current())return;message.textContent=tr(key,params);message.classList.toggle('error',error);message.hidden=false;
 };
 const fail=e=>note(({PEOPLE_LINK_ERROR:'linkError',NAME_INVALID:'nameInvalid',PHONE_INVALID:'phoneInvalid',CONTACT_DUPLICATE:'duplicate',VCARD_INVALID:'fileInvalid'})[e?.message]||'storageError',{},true);
 const use=async fn=>{const db=await openPeopleStore(account,{isCurrent:current});try{return await fn(db)}finally{db.close()}};
 const titleBox=el('div','','info');
 titleBox.append(el('strong',tr('title')),el('p',tr('localNotice'),'meta'));
 const actions=el('div','','info'),editor=el('div','','info'),importArea=el('div','','info'),list=el('div','','info');
 editor.hidden=true;importArea.hidden=true;
 root.append(titleBox,actions,message,editor,importArea,list);
 let rows=[],busy=false,linked=new Set(),verified=new Set();
 const safe=async fn=>{
  if(busy||!current())return;busy=true;
  try{await fn()}catch(e){if(current())fail(e)}finally{busy=false}
 };
 const rpc=async command=>{
  if(!current())throw Error('ACCOUNT_CHANGED');
  const response=await fetch('/api/people/link',{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'content-type':'application/json','x-talera-expected-account':account},body:JSON.stringify(command)});
  const data=await response.json().catch(()=>null);
  if(!current())throw Error('ACCOUNT_CHANGED');
  if(!response.ok||!data?.ok)throw Error('PEOPLE_LINK_ERROR');
  return data;
 };
 // Codes remain in the open form only. Never include them in URLs, logs,
 // imported contacts, or automatic WhatsApp messages.
 const codeField=(label,value='',readOnly=false)=>{
  const wrapper=el('label',tr(label)),field=el('textarea');field.rows=3;
  field.value=value;field.readOnly=readOnly;field.autocomplete='off';field.spellcheck=false;field.maxLength=400;
  wrapper.append(field);editor.append(wrapper);return field;
 };
 const copyCode=(field)=>button(tr('copy'),async()=>{
  try{await navigator.clipboard.writeText(field.value);note('copied')}
  catch{if(current()){field.focus();field.select();note('copyError',{},true)}}
 });
 const dismiss=()=>{editor.hidden=true;editor.replaceChildren()};
 const openEditor=(key,params={})=>{
  editor.replaceChildren(el('strong',tr(key,params)));editor.hidden=false;importArea.hidden=true;importArea.replaceChildren();
 };
 function showLink(contact){
  openEditor('inviteTitle',{name:contact.name});
  editor.append(el('p',tr('inviteHint',{name:contact.name}),'meta'));
  editor.append(button(tr('makeInvite'),()=>safe(async()=>{
   await use(db=>db.markPairingUsed(contact.id));
   const data=await rpc({action:'create',contact:contact.id});
   if(!current())return;
   showLink(contact);
   const field=codeField('invitePlaceholder',data.invitation,true);
   editor.append(copyCode(field),el('p',tr('inviteReady'),'meta'));
  }),'primary'));
  editor.append(el('p',tr('confirmHint',{name:contact.name}),'meta'));
  const confirmation=codeField('confirmPlaceholder');
  editor.append(button(tr('confirm'),()=>safe(async()=>{
   await use(db=>db.markPairingUsed(contact.id));
   const proof=confirmation.value.trim().toLowerCase();
   const identity=await rpc({action:'preview',contact:contact.id,confirmation:proof});
   if(!current()||!window.confirm(tr('reviewIdentity',{name:contact.name,account:identity.name})))return;
   await rpc({action:'confirm',contact:contact.id,confirmation:proof});
   if(current()){dismiss();note('confirmed');await refresh()}
  }),'primary'),button(tr('close'),dismiss));
 }
 function showJoin(){
  openEditor('joinInvite');editor.append(el('p',tr('claimHint'),'meta'));
  const field=codeField('invitePlaceholder');
  editor.append(button(tr('claim'),()=>safe(async()=>{
   const data=await rpc({action:'claim',invitation:field.value.trim()});
   if(!current())return;
   openEditor('claimReady');const reply=codeField('confirmPlaceholder',data.confirmation,true);
   editor.append(copyCode(reply),button(tr('close'),dismiss));
  }),'primary'),button(tr('close'),dismiss));
 }
 const inbound=el('div','','info');inbound.hidden=true;root.append(inbound);
 async function loadInbound(after=null){
  if(!current())return;
  const data=await rpc({action:'inbound-list',after});
  if(!after)inbound.replaceChildren(el('strong',tr('inbound')),el('p',tr('inboundHint'),'meta'));
  inbound.hidden=!data.items.length&&!after;
  inbound.querySelector('[data-people-more]')?.remove();
  for(const sender of data.items){
   const row=el('div','','status-line'),label=el('span');label.append(el('strong',sender.name));
   if(sender.blocked)label.append(el('small',tr('blocked')));
   row.append(label,button(tr(sender.blocked?'unblock':'block'),()=>safe(async()=>{
    await rpc({action:sender.blocked?'unblock':'block',other:sender.id});await loadInbound();
   }),'inline-button'));inbound.append(row);
  }
  if(data.next){const more=button(tr('more'),()=>safe(()=>loadInbound(data.next)));more.dataset.peopleMore='true';inbound.append(more)}
 }
 const showForm=contact=>{
  if(!current()||busy)return;
  const editId=contact?.id||null;editor.replaceChildren();editor.hidden=false;importArea.hidden=true;importArea.replaceChildren();
  editor.append(el('strong',tr(editId?'edit':'add')));
  const nameLabel=el('label',tr('name')),name=el('input');name.type='text';name.required=true;name.maxLength=120;name.autocomplete='off';name.value=contact?.name||'';name.dataset.peopleField='name';nameLabel.append(name);
  const phoneLabel=el('label',tr('phone')),phone=el('input');phone.type='tel';phone.maxLength=50;phone.autocomplete='off';phone.value=contact?.phone||'';phone.dataset.peopleField='phone';phoneLabel.append(phone);
  editor.append(nameLabel,phoneLabel,el('p',tr('phoneHint'),'meta'));
  editor.append(button(tr('save'),()=>safe(async()=>{
   const data={name:name.value,phone:phone.value};
   if(editId)await use(db=>db.update(editId,data));
   else{
    const result=await use(db=>db.add([data]));
    if(!result[0].added){note('duplicate',{},true);return}
   }
   if(!current())return;editor.hidden=true;editor.replaceChildren();note('saved');await refresh();
  }),'primary'),button(tr('cancel'),()=>{editor.hidden=true;editor.replaceChildren()}));
  name.focus();
 };
 function renderList(){
  if(!current())return;list.replaceChildren(el('strong',tr('contacts')));
  if(!rows.length){list.append(el('p',tr('empty'),'empty-note'));return}
  for(const c of rows){
   const row=el('div','','status-line'),label=el('span');
   label.append(el('strong',c.name),el('small',linked.has(c.id)?tr('linked'):c.pairingApiUsed&&!verified.has(c.id)?tr('unverified'):c.phone?tr('whatsapp')+' · '+c.phone:tr('notLinked')));
   row.append(label);
   const controls=el('span');controls.style.cssText='display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end';
   const star=button(c.favorite?'★':'☆',()=>safe(async()=>{await use(db=>db.update(c.id,{favorite:!c.favorite}));await refresh()}),'inline-button');
   star.setAttribute('aria-label',tr(c.favorite?'unfavorite':'favorite',{name:c.name}));star.setAttribute('aria-pressed',String(c.favorite));
   const edit=button(tr('edit'),()=>showForm(c),'inline-button');
   const remove=button(tr('remove'),()=>safe(async()=>{
    if(!window.confirm(tr('confirmRemove',{name:c.name})))return;
    const latest=(await use(db=>db.list())).find(x=>x.id===c.id);
    if(latest?.pairingApiUsed)await rpc({action:'unlink',contact:c.id});
    await use(db=>db.remove(c.id));note('removed');await refresh();
   }),'inline-button');
   const connect=linked.has(c.id)?button(tr('unlink'),()=>safe(async()=>{
    if(!window.confirm(tr('unlinkConfirm')))return;
    await rpc({action:'unlink',contact:c.id});note('unlinked');await refresh();
   }),'inline-button'):button(tr('linkContact'),()=>showLink(c),'inline-button');
   controls.append(star,edit,remove,connect);row.append(controls);list.append(row);
  }
 }
 async function refresh(){
  const result=await use(db=>db.list());if(!current())return;
  rows=result;linked=new Set();verified=new Set();renderList();
  const candidates=rows.filter(c=>c.pairingApiUsed).map(c=>c.id);
  // Bounded pages, no background poll. Local names/numbers never leave device.
  for(let i=0;i<candidates.length&&current();i+=100){
   const contacts=candidates.slice(i,i+100);
   try{const data=await rpc({action:'list',contacts});if(!current())return;
    data.linked.forEach(id=>linked.add(id));contacts.forEach(id=>verified.add(id));renderList();
   }catch{if(!current())return;break}
  }
 }

 function review(candidates){
  if(!current())return;editor.hidden=true;editor.replaceChildren();importArea.hidden=false;importArea.replaceChildren();
  if(!candidates.length){note('noImport',{},true);importArea.hidden=true;return}
  importArea.append(el('strong',tr('review')),el('p',tr('reviewHint'),'meta'));
  const search=el('input');search.type='search';search.placeholder=tr('search');search.setAttribute('aria-label',tr('search'));importArea.append(search);
  const choices=el('div');importArea.append(choices);
  const selected=new Map();
  const render=()=>{
   choices.replaceChildren();
   const q=search.value.toLocaleLowerCase().trim();
   const matching=candidates.map((c,i)=>({c,i})).filter(({c})=>!q||c.name.toLocaleLowerCase().includes(q)||c.phones.some(p=>p.includes(q)));
   for(const {c,i} of matching){
    const row=el('div','','status-line'),label=el('label','','switch'),check=el('input');check.type='checkbox';check.checked=selected.has(i);
    const number=el('select');number.setAttribute('aria-label',tr('phoneFor',{name:c.name}));
    for(const p of c.phones.length?c.phones:['']){const opt=el('option',p||tr('noPhone'));opt.value=p;number.append(opt)}
    if(selected.has(i))number.value=selected.get(i);
    check.addEventListener('change',()=>{if(check.checked)selected.set(i,number.value);else selected.delete(i)});
    number.addEventListener('change',()=>{if(check.checked)selected.set(i,number.value)});
    label.append(check,el('span',c.name));row.append(label,number);choices.append(row);
   }
  };
  search.addEventListener('input',render);render();
  importArea.append(button(tr('addSelected'),()=>safe(async()=>{
   if(!selected.size){note('chooseAtLeastOne',{},true);return}
   const input=[...selected].map(([i,phone])=>({name:candidates[i].name,phone}));
   const results=await use(db=>db.add(input));if(!current())return;
   importArea.hidden=true;importArea.replaceChildren();
   note('importResult',{added:results.filter(x=>x.added).length,duplicates:results.filter(x=>!x.added).length});await refresh();
  }),'primary'),button(tr('cancel'),()=>{importArea.hidden=true;importArea.replaceChildren();selected.clear()}));
 }
 actions.append(button(tr('add'),()=>showForm(null),'primary'),button(tr('joinInvite'),showJoin));
 // Browser Contacts Picker is optional and requests only user-selected fields.
 if(window.isSecureContext&&typeof navigator.contacts?.select==='function'){
  // Check supported fields before the click; select() itself needs transient
  // user activation, so no await, promise, or network request precedes it.
  const picker=button(tr('pick'),async()=>{
   try{
    const records=await navigator.contacts.select(wanted,{multiple:true});
    if(current()&&records?.length)review(peoplePickerCandidates(records));
   }catch(e){if(current()&&e?.name!=='AbortError')note('pickerUnavailable',{},true)}
  });
  let wanted=['name','tel'];picker.disabled=true;actions.append(picker);
  Promise.resolve().then(()=>typeof navigator.contacts.getProperties==='function'?navigator.contacts.getProperties():wanted)
   .then(properties=>{if(!current())return;wanted=['name','tel'].filter(p=>properties.includes(p));if(wanted.includes('name'))picker.disabled=false;else picker.remove()})
   .catch(()=>{if(current())picker.remove()});
 }
 const input=el('input');input.type='file';input.accept='.vcf,.vcard,text/vcard,text/x-vcard';input.hidden=true;input.style.display='none';input.dataset.peopleImport='vcard';actions.append(input);
 actions.append(button(tr('vcard'),()=>input.click()));
 input.addEventListener('change',()=>safe(async()=>{
  const file=input.files?.[0];input.value='';if(!file)return;
  if(file.size>8_000_000){note('fileInvalid',{},true);return}
  const candidate=parsePeopleVcards(await file.text());if(current())review(candidate);
 }));
 actions.append(el('p',tr('vcardHint'),'meta'));
 void refresh().catch(fail);
 void loadInbound().catch(()=>{});
}

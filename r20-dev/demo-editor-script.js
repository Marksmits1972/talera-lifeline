(()=>{
'use strict';
const query=new URLSearchParams(location.search);
const demoId=query.get('editDemo');
if(!demoId||!/^([1-9]|[1-4]\d|50|1\d{3})$/.test(demoId))return;
const SOURCE='talera-dev-example-edit-source-r20-v1';
const HIDDEN='talera-dev-hidden-examples-r20-v1';
let info=null;
try{info=JSON.parse(sessionStorage.getItem(SOURCE)||'null')}catch(e){}
const isDemoId=id=>/^(?:[1-9]|[1-4]\d|50|1\d{3})$/.test(String(id))&&(Number(id)<=50||(Number(id)>=1001&&Number(id)<=1450));
const valid=info&&String(info.id)===demoId&&isDemoId(demoId)&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(info.at||'');
const editor=document.createElement('div');
editor.id='talera-dev-demo-editor';
document.body.classList.add('talera-dev-demo-page');
document.body.append(editor);
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x}
const header=el('header','talera-demo-header');
const back=el('button','talera-demo-back','‹ Terug');
back.type='button';back.onclick=()=>location.assign('/present');
header.append(back,el('strong','','TALERA'));
editor.append(header);
const body=el('main','talera-demo-main');
editor.append(body);
body.append(el('p','talera-demo-kicker','Herinnering bewerken'));
body.append(el('h1','','Voorbeeldherinnering'));
if(!valid){
 body.append(el('p','talera-demo-note','Dit voorbeeld kon niet veilig aan een actieve herinnerings-ID worden gekoppeld. Ga terug naar de presentatie en tik opnieuw op het potloodje.'));
 return;
}
body.append(el('p','talera-demo-note','Voorbeeld-ID '+demoId+' · Dit is een ingebouwd testvoorbeeld. Verwijderen verbergt alleen dit voorbeeld in de huidige ontwikkelomgeving. Opslaan maakt er een eigen lokale herinnering van.'));
const fields=el('form','talera-demo-form');
fields.autocomplete='off';
fields.addEventListener('submit',e=>e.preventDefault());
function input(labelText,type,value){
 const label=el('label','talera-demo-label');
 label.append(el('span','',labelText));
 const node=el('input','talera-demo-input');node.type=type;node.value=value||'';
 label.append(node);fields.append(label);return node;
}
const title=input('Titel','text',String(info.title||'').slice(0,140));
title.maxLength=140;
const date=input('Datum','date',String(info.at).slice(0,10));
const time=input('Tijd','time',String(info.at).slice(11,16));
const storyLabel=el('label','talera-demo-label');
storyLabel.append(el('span','','Verhaal'));
const text=el('textarea','talera-demo-text');
text.rows=6;text.value=String(info.text||'').slice(0,50000);
storyLabel.append(text);fields.append(storyLabel);
if(info.image&&/^https:\/\//.test(info.image)){
 const preview=el('div','talera-demo-preview');
 preview.append(el('span','','Bestaande voorbeeldafbeelding'));
 const img=el('img');img.src=info.image;img.alt='Voorbeeldafbeelding (niet opgeslagen op dit toestel)';
 img.loading='lazy';preview.append(img);fields.append(preview);
}
const add=el('label','talera-demo-label');
add.append(el('span','','Foto’s of video’s toevoegen (maximaal 6)'));
const upload=el('input','talera-demo-input');
upload.type='file';upload.accept='image/*,video/*';upload.multiple=true;
const names=el('p','talera-demo-note','Nog geen eigen mediabestanden geselecteerd.');
upload.addEventListener('change',()=>{
 const files=Array.from(upload.files||[]);
 names.textContent=files.length?files.map(f=>f.name).join(' · '):'Nog geen eigen mediabestanden geselecteerd.';
});
add.append(upload,names);fields.append(add);
fields.append(el('p','talera-demo-note','De ingebouwde voorbeeldfoto is alleen ter illustratie en wordt niet automatisch als jouw foto opgeslagen.'));
const actions=el('div','talera-demo-actions');
const save=el('button','talera-demo-save','Wijzigingen opslaan');
save.type='button';
const remove=el('button','talera-demo-remove','Hele herinnering verwijderen');
remove.type='button';
const status=el('p','talera-demo-status','');status.setAttribute('role','status');
actions.append(save,remove);fields.append(actions,status);body.append(fields);
function setStatus(message){status.textContent=message}
function hideExample(){
 const previous=JSON.parse(localStorage.getItem(HIDDEN)||'[]');
 const ids=Array.isArray(previous)?previous.map(String):[];
 if(!ids.includes(demoId))ids.push(demoId);
 localStorage.setItem(HIDDEN,JSON.stringify(ids));
}
remove.onclick=()=>{
 const overlay=el('div','talera-demo-confirm');
 const sheet=el('section','talera-demo-confirm-card');
 sheet.append(el('h2','','Voorbeeld verwijderen?'));
 sheet.append(el('p','','Testherinnering '+demoId+' verdwijnt uit jouw ontwikkeltijdlijn. De broncode en je eigen herinneringen worden niet verwijderd.'));
 const buttons=el('div','talera-demo-actions');
 const cancel=el('button','','Annuleren'),yes=el('button','talera-demo-remove','Voorbeeld verwijderen');
 cancel.type=yes.type='button';cancel.onclick=()=>overlay.remove();
 yes.onclick=()=>{try{hideExample();location.assign('/present')}catch(err){overlay.remove();setStatus('Verwijderen mislukt: '+String(err?.message||err))}};
 buttons.append(cancel,yes);sheet.append(buttons);overlay.append(sheet);editor.append(overlay);
 cancel.focus();
};
save.onclick=async()=>{
 const files=Array.from(upload.files||[]);
 if(!title.value.trim()){setStatus('Vul een titel in.');return}
 if(!date.value||date.value>new Date().toLocaleDateString('sv-SE')){setStatus('Kies een geldige datum.');return}
 if(files.length>6||files.some(f=>!/^image\/|^video\//.test(f.type))){setStatus('Kies maximaal zes foto’s of video’s.');return}
 const store=window.TaleraMemories;
 if(typeof store?.save!=='function'){setStatus('TALERA lokale opslag is nog niet beschikbaar.');return}
 save.disabled=remove.disabled=true;setStatus('Herinnering bewaren…');
 try{
  const row=await store.save({
   title:title.value.trim(),date:date.value,time:(time.value||'12:00')+':00',
   datePrecision:'exact',text:text.value.trim(),tags:[]
  },files);
  const verified=await store.get(row.id);
  if(verified?.id!==row.id)throw Error('Opgeslagen herinnering kon niet worden teruggevonden.');
  // Preserve the generated reference only until its locally owned replacement has been stored.
  hideExample();
  location.assign('/present?memory='+encodeURIComponent(row.id));
 }catch(err){
  setStatus('Opslaan niet voltooid: '+String(err?.message||err));
  save.disabled=remove.disabled=false;
 }
};
})();
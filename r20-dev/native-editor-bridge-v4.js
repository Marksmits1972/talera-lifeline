
function taleraDevNativeEditorPatch(html){
  // Only reuse TALERA's original /tell workblad. No new page, overlay or alternate editor.
  const keyBoot="await readDraft();const edit=new URLSearchParams(location.search).get('edit');";
  const keyWork="setupV10(g,details,frame,footer);taleraCompactWorkbench(g);if(errorMsg)showError(errorMsg)";
  const keyRemove="dlg.remove();if(current===gid)current=groups[0]?.id||'';";
  const keySaved="const remove=[...g.media,...(g.voice?[g.voice]:[])];groups=groups.filter(x=>x!==g);";
  if([keyBoot,keyWork,keyRemove,keySaved,"async function boot(){busy('TALERA openen','Concepten controleren');"].some(k=>html.split(k).length!==2)){
    return {changed:false,html,reason:'native-tell-editor-contract-changed',
     anchors:[keyBoot,keyWork,keyRemove,keySaved].map(k=>html.split(k).length-1)};
  }
  const helper=String.raw`
function taleraDevHideExampleAfterAction(demoId){
 const key='talera-dev-hidden-examples-r20-v1';
 const n=Number(demoId);
 if(!Number.isInteger(n)||!(n>=1&&n<=50||n>=1001&&n<=1450))return;
 try{
  const old=JSON.parse(localStorage.getItem(key)||'[]');
  const hidden=Array.isArray(old)?old.map(String):[];
  if(!hidden.includes(String(n)))hidden.push(String(n));
  localStorage.setItem(key,JSON.stringify(hidden));
 }catch(e){console.warn('Voorbeeld verbergen mislukte',e)}
}
`;
  const init=String.raw`
const demoId=new URLSearchParams(location.search).get('editDemo');
if(demoId){
 let ref=null;
 try{ref=JSON.parse(sessionStorage.getItem('talera-dev-example-edit-source-r20-v1')||'null')}catch(e){}
 const n=Number(demoId);
 const permitted=Number.isInteger(n)&&(n>=1&&n<=50||n>=1001&&n<=1450);
 if(permitted&&ref&&String(ref.id)===demoId&&/^\d{4}-\d{2}-\d{2}T/.test(String(ref.at||''))){
  let g=groups.find(x=>String(x.demoSourceId||'')===demoId);
  if(!g){
   g={id:uid(),media:[],voice:'',date:String(ref.at).slice(0,10),precision:'exact',
     dateConfirmed:true,dateSource:'history',title:String(ref.title||'Voorbeeldherinnering').slice(0,140),
     text:String(ref.text||'').slice(0,20000),season:'',demoSourceId:demoId};
   groups.push(g);
  }
  open('work',g.id);
  return;
 }
}
`;
  const nativeButton=String.raw`
{
 const tiles=main.querySelector('.talera-work-tiles');
 if(tiles){
  const remove=document.createElement('button');
  remove.type='button';
  remove.id='talera-inline-delete-active-memory';
  remove.textContent='Herinnering volledig verwijderen';
  remove.setAttribute('aria-label','Deze herinnering of dit concept volledig verwijderen');
  remove.style.cssText='display:block;width:100%;min-height:47px;margin:12px 0 18px;padding:10px 14px;border:1px solid #d9bfc1;border-radius:13px;background:#fff;color:#8a3535;font:650 14px/1.25 system-ui;cursor:pointer';
  remove.onclick=async()=>{
   if(!g.existing){taleraV7AskDelete(g.id);return}
   let stored=null;
   try{stored=await mem.get(g.existing)}catch(e){}
   if(!stored||stored.id!==g.existing||stored.source!=='pwa-local'){
    showError('Deze herinnering kan niet veilig worden verwijderd. Het opgeslagen record is niet gevonden.');
    return;
   }
   if(!window.confirm('Deze gepubliceerde herinnering, inclusief bijbehorende niet elders gebruikte foto’s, video’s en stemopname, definitief verwijderen? Dit kan niet ongedaan worden gemaakt.'))return;
   remove.disabled=true;
   remove.textContent='Herinnering verwijderen…';
   try{
    await mem.remove(g.existing);
    groups=groups.filter(x=>x!==g);
    try{await saveDraft()}catch(e){console.warn('Conceptopruiming niet voltooid',e)}
    location.assign('/mijn-leven');
   }catch(e){
    remove.disabled=false;
    remove.textContent='Herinnering volledig verwijderen';
    showError('Herinnering verwijderen is niet gelukt: '+String(e?.message||e));
   }
  };
  tiles.insertAdjacentElement('afterend',remove);
 }
}
`;
  let out=html.replace("async function boot(){busy('TALERA openen','Concepten controleren');",helper+"async function boot(){busy('TALERA openen','Concepten controleren');");
  out=out.replace(keyBoot,"await readDraft();"+init+"const edit=new URLSearchParams(location.search).get('edit');");
  out=out.replace(keyWork,keyWork+";"+nativeButton);
  out=out.replace(keyRemove,"if(g.demoSourceId)taleraDevHideExampleAfterAction(g.demoSourceId);"+keyRemove);
  out=out.replace(keySaved,"if(g.demoSourceId)taleraDevHideExampleAfterAction(g.demoSourceId);"+keySaved);
  return{changed:true,html:out,reason:'native-pwa-editor-reused'};
}

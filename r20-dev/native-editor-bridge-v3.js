
function taleraDevNativeEditorPatch(html){
  // Only reuse TALERA's original /tell workblad. No new page, overlay or alternate editor.
  const keyBoot="await readDraft();const edit=new URLSearchParams(location.search).get('edit');";
  const keyWork="setupV10(g,details,frame,footer);taleraCompactWorkbench(g);if(errorMsg)showError(errorMsg)";
  const keyRemove="dlg.remove();if(current===gid)current=groups[0]?.id||'';";
  const keySaved="const remove=[...g.media,...(g.voice?[g.voice]:[])];groups=groups.filter(x=>x!==g);";
  if([keyBoot,keyWork,keyRemove,keySaved].some(k=>html.split(k).length!==2)){
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
   await saveDraft();
  }
  open('work',g.id);
  return;
 }
}
`;
  const nativeButton=String.raw`
if(g.demoSourceId){
 const button=document.createElement('button');
 button.type='button';
 button.textContent='Hele herinnering verwijderen';
 button.setAttribute('aria-label','Deze voorbeeldherinnering verwijderen');
 button.style.cssText='display:block;width:100%;min-height:46px;margin-top:16px;border:1px solid #bdcbd2;border-radius:12px;background:#fff;color:#8a2f2a;font:650 14px system-ui';
 button.onclick=()=>taleraV7AskDelete(g.id);
 details.appendChild(button);
}
`;
  let out=html.replace(keyBoot,helper+"await readDraft();"+init+"const edit=new URLSearchParams(location.search).get('edit');");
  out=out.replace(keyWork,keyWork+";"+nativeButton);
  out=out.replace(keyRemove,"if(g.demoSourceId)taleraDevHideExampleAfterAction(g.demoSourceId);"+keyRemove);
  out=out.replace(keySaved,"if(g.demoSourceId)taleraDevHideExampleAfterAction(g.demoSourceId);"+keySaved);
  return{changed:true,html:out,reason:'native-pwa-editor-reused'};
}

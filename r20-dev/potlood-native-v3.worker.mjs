/* TALERA R20 dev — UI-only edit access and explicit deletion in editor. */
/* Binds to APPROVED R20 Worker, never modifies its source or photo/presentation engine. */
const PENCIL_JS="(()=>{\n'use strict';\nif(!['/','/mijn-leven','/present','/present/'].includes(location.pathname))return;\nlet tries=0;\nfunction init(){\n const rt=window.__taleraTimelineRuntime;\n if(!rt?.currentMemory){if(++tries<50)setTimeout(init,120);return}\n if(document.getElementById('talera-r20-owner-pencil'))return;\n const pencil=document.createElement('button');\n pencil.id='talera-r20-owner-pencil';\n pencil.type='button';\n pencil.textContent='✎';\n pencil.title='Herinnering beheren';\n pencil.setAttribute('aria-label','Actieve herinnering beheren');\n // The pencil belongs to the PLAYER, not to the selected story.\n // Never hide it as the active memory changes.\n pencil.hidden=false;\n document.body.appendChild(pencil);\n // Existing separate owner-only edit buttons are replaced by one stable control.\n for(const el of document.querySelectorAll('#talera-v30-edit,.talera-memory-edit'))el.style.setProperty('display','none','important');\n const active=()=>rt.currentMemory?.()||null;\n function updateLabel(){\n  const m=active();\n  pencil.setAttribute('aria-label',m?'Herinnering beheren, ID '+String(m.storyId||m.id):'Herinnering beheren');\n }\n function infoDialog(m,reason){\n  document.getElementById('talera-r20-pencil-info')?.remove();\n  const cover=document.createElement('div');\n  cover.id='talera-r20-pencil-info';\n  cover.setAttribute('role','dialog');\n  cover.setAttribute('aria-modal','true');\n  cover.setAttribute('aria-label','Herinnering beheren');\n  cover.style.cssText='position:fixed;inset:0;z-index:10060;background:rgba(12,30,42,.64);display:grid;place-items:center;padding:18px';\n  const box=document.createElement('div');\n  box.style.cssText='width:min(100%,430px);background:#fff;color:#193748;border-radius:20px;padding:22px;box-shadow:0 13px 34px #102a3a42;font-family:system-ui';\n  const title=document.createElement('h2');\n  title.style.cssText='font-size:20px;margin:0 0 12px';\n  title.textContent='Herinnering beheren';\n  const line=document.createElement('p');\n  line.style.cssText='font-size:14px;line-height:1.5;white-space:pre-line';\n  const id=m?String(m.storyId||m.id):'geen';\n  const date=m?.at?String(m.at).replace('T',' · '):'onbekend';\n  line.textContent='Herinnerings-ID: '+id+'\\nDatum: '+date+'\\n'+(m?.story||'')+'\\n\\n'+reason;\n  const close=document.createElement('button');\n  close.type='button';\n  close.textContent='Sluiten';\n  close.style.cssText='min-height:44px;border:0;border-radius:12px;background:#304653;color:#fff;padding:10px 18px;font:600 14px system-ui';\n  close.onclick=()=>cover.remove();\n  cover.addEventListener('click',e=>{if(e.target===cover)cover.remove()});\n  box.append(title,line,close);\n  cover.append(box);\n  document.body.append(cover);\n  close.focus();\n }\n async function destination(m){\n  if(!m)return{mode:'none'};\n  if(document.body.classList.contains('talera-recipient-presentation')||document.body.classList.contains('talera-guest-live'))return{mode:'guest'};\n  if(m._taleraLive&&m.storyId&&m._manageToken)return{mode:'cloud'};\n  const id=String(m.storyId||'');\n  if(m._taleraLocal&&/^local-[a-z0-9-]+$/i.test(id)){\n   try{\n    const store=window.TaleraMemories;\n    const row=typeof store?.get==='function'?await store.get(id):null;\n    if(row?.id===id&&row.source==='pwa-local')return{mode:'local'};\n   }catch(e){}\n  }\n  const isExample=m.isDemo===true||(Number.isInteger(m.id)&&m.id>=1&&m.id<=50);\n  return{mode:isExample?'example':'unavailable'};\n }\n pencil.addEventListener('click',async e=>{\n  e.preventDefault();\n  e.stopImmediatePropagation();\n  const m=active(),id=m?.id;\n  const target=await destination(m);\n  if(id!==active()?.id)return;\n  if(target.mode==='local'){\n   location.assign('/tell?edit='+encodeURIComponent(m.storyId));\n  }else if(target.mode==='cloud'){\n   location.assign('/tell/?edit='+encodeURIComponent(m.storyId)+'#token='+encodeURIComponent(m._manageToken));\n  }else if(target.mode==='example'){\n   try{\n    sessionStorage.setItem('talera-dev-example-edit-source-r20-v1',JSON.stringify({\n     id:String(m.id),at:String(m.at||''),title:String(m.story||'Voorbeeldherinnering'),\n     text:String(m.fullStory||m.story||''),image:String(m.image||'')\n    }));\n    location.assign('/tell?editDemo='+encodeURIComponent(String(m.id)));\n   }catch(err){infoDialog(m,'De bewerkpagina kon niet geopend worden: '+String(err?.message||err))}\n  }else{\n   infoDialog(m,target.mode==='guest'?'Deze herinnering is van iemand anders en is niet bewerkbaar.':'Deze herinnering is nog niet beschikbaar voor bewerken.');\n  }\n },true);\n rt.subscribe(updateLabel);\n document.querySelector('.timeline')?.addEventListener('pointerup',()=>setTimeout(updateLabel,180),{passive:true});\n window.addEventListener('pageshow',updateLabel,{passive:true});\n updateLabel();\n}\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();\n})();";
const PENCIL_CSS="#talera-r20-owner-pencil{\nposition:fixed!important;top:var(--talera-v27-back-y,116px)!important;right:15px!important;z-index:63!important;\nwidth:45px!important;height:45px!important;min-width:45px!important;min-height:45px!important;\ndisplay:grid!important;place-items:center!important;border-radius:50%!important;\nborder:1px solid rgba(255,255,255,.7)!important;background:rgba(18,46,63,.52)!important;\ncolor:#fff!important;font:500 23px/1 system-ui!important;\nbackdrop-filter:blur(9px)!important;-webkit-backdrop-filter:blur(9px)!important;\nbox-shadow:0 2px 8px rgba(0,0,0,.12)!important;touch-action:manipulation!important}\n#talera-r20-owner-pencil[hidden]{display:none!important}";
const REMOVE_JS="(()=>{\n'use strict';\nif(!['/tell','/tell/'].includes(location.pathname))return;\nconst id=new URLSearchParams(location.search).get('edit')||'';\nif(!/^local-[a-z0-9-]+$/i.test(id))return;\nlet attempts=0;\nasync function init(){\n const store=window.TaleraMemories,root=document.getElementById('app');\n if(!root||typeof store?.get!=='function'){if(++attempts<35)setTimeout(init,100);return}\n let record;try{record=await store.get(id)}catch(e){}\n if(record?.id!==id||record.source!=='pwa-local'||document.getElementById('talera-r20-editor-remove'))return;\n const line=document.createElement('div');line.id='talera-r20-editor-remove';\n const button=document.createElement('button');button.type='button';button.textContent='Herinnering volledig verwijderen';\n line.append(button);\n const footer=root.querySelector(':scope > .submit');\n if(footer)footer.before(line);else root.append(line);\n button.onclick=()=>{\n  const overlay=document.createElement('div');overlay.id='talera-r20-delete-confirm';\n  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');\n  overlay.setAttribute('aria-label','Verwijderen bevestigen');\n  const card=document.createElement('div');card.className='talera-r20-delete-card';\n  const title=document.createElement('h2');title.textContent='Herinnering verwijderen?';\n  const message=document.createElement('p');\n  message.textContent='Deze gepubliceerde herinnering en de niet elders gebruikte foto’s en stemopname worden definitief verwijderd.';\n  const actions=document.createElement('div');actions.className='talera-r20-delete-actions';\n  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Annuleren';\n  const confirm=document.createElement('button');confirm.type='button';confirm.textContent='Definitief verwijderen';confirm.className='talera-r20-delete-danger';\n  cancel.onclick=()=>overlay.remove();\n  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});\n  confirm.onclick=async()=>{\n   confirm.disabled=true;cancel.disabled=true;confirm.textContent='Verwijderen…';\n   try{\n    const latest=await store.get(id);\n    if(latest?.id!==id||latest.source!=='pwa-local')throw Error('Herinnering niet gevonden');\n    await store.remove(id);location.assign('/mijn-leven');\n   }catch(e){\n    const alert=card.querySelector('[role=\"alert\"]')||document.createElement('p');\n    alert.setAttribute('role','alert');alert.textContent='Verwijderen mislukt: '+String(e?.message||e);\n    card.append(alert);confirm.disabled=false;cancel.disabled=false;confirm.textContent='Definitief verwijderen';\n   }\n  };\n  actions.append(cancel,confirm);card.append(title,message,actions);overlay.append(card);document.body.append(overlay);cancel.focus();\n };\n}\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();\n})();";
const REMOVE_CSS="#talera-r20-editor-remove{display:flex;justify-content:flex-start;padding:12px 16px 18px}\n#talera-r20-editor-remove button{min-height:42px;padding:9px 12px;border:1px solid #d3dadf;border-radius:12px;color:#8b3535;background:#fff;font:600 13px/1.3 system-ui}\n#talera-r20-delete-confirm{position:fixed;inset:0;z-index:10050;background:rgba(12,30,42,.64);display:grid;place-items:center;padding:18px}\n#talera-r20-delete-confirm .talera-r20-delete-card{background:#fff;color:#193748;width:min(100%,430px);border-radius:20px;padding:22px;box-shadow:0 13px 34px #102a3a42}\n#talera-r20-delete-confirm h2{font:700 21px/1.2 system-ui;margin:0 0 12px}\n#talera-r20-delete-confirm p{font:450 14px/1.45 system-ui;margin:0 0 18px}\n#talera-r20-delete-confirm .talera-r20-delete-actions{display:flex;gap:10px;flex-wrap:wrap}\n#talera-r20-delete-confirm button{flex:1;min-height:46px;border-radius:12px;border:1px solid #d3dadf;background:#f5f7f8;color:#193748;font:650 13px/1.2 system-ui}\n#talera-r20-delete-confirm .talera-r20-delete-danger{background:#8a2f2a;color:white;border-color:#8a2f2a}";
const TALERA_DEV_HIDDEN_FILTER_JS="try {\n  const hiddenIds=JSON.parse(localStorage.getItem('talera-dev-hidden-examples-r20-v1')||'[]');\n  if(Array.isArray(hiddenIds)&&hiddenIds.length){\n    const ignored=new Set(hiddenIds.map(String));\n    for(let idx=MEMORIES.length-1;idx>=0;idx--){\n      const m=MEMORIES[idx];\n      if(ignored.has(String(m.id))&&(m.isDemo===true||(typeof m.id==='number'&&m.id>=1&&m.id<=50)))MEMORIES.splice(idx,1);\n    }\n  }\n}catch(error){console.warn('TALERA voorbeeldfilter niet geladen',error)}\n";
function taleraDevFilterHiddenExamples(html){
 const key='const EVENT_OFFSETS = MEMORIES.map(';
 if(html.split(key).length!==2)return html;
 return html.replace(key,TALERA_DEV_HIDDEN_FILTER_JS+'\n'+key);
}


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
  let out=html.replace("async function boot(){busy('TALERA openen','Concepten controleren');",helper+"async function boot(){busy('TALERA openen','Concepten controleren');");
  out=out.replace(keyBoot,"await readDraft();"+init+"const edit=new URLSearchParams(location.search).get('edit');");
  out=out.replace(keyWork,keyWork+";"+nativeButton);
  out=out.replace(keyRemove,"if(g.demoSourceId)taleraDevHideExampleAfterAction(g.demoSourceId);"+keyRemove);
  out=out.replace(keySaved,"if(g.demoSourceId)taleraDevHideExampleAfterAction(g.demoSourceId);"+keySaved);
  return{changed:true,html:out,reason:'native-pwa-editor-reused'};
}

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/__r20-edit/health')return Response.json({ok:true,development:true,baseline:'R20',uiOnly:true});
  if(!env?.R20_BASE?.fetch)return new Response('Goedgekeurde R20 servicebinding ontbreekt',{status:503});
  const upstream=await env.R20_BASE.fetch(request);
  if(request.method!=='GET'||!upstream.ok||!(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
  const photo=['/','/mijn-leven','/present','/present/'].includes(url.pathname);
  const editor=['/tell','/tell/'].includes(url.pathname)&&url.searchParams.has('edit');
  const demoEditor=['/tell','/tell/'].includes(url.pathname)&&url.searchParams.has('editDemo');
  if(!photo&&!editor&&!demoEditor)return upstream;
  let html=await upstream.text();
  if(!html.includes('</head>')||!html.includes('</body>'))return new Response(html,{status:upstream.status,headers:upstream.headers});
  if(photo){
   html=html.replace('</head>','<style id="talera-r20-owner-pencil-css">'+PENCIL_CSS+'</style></head>');
   html=html.replace('</body>','<script id="talera-r20-owner-pencil-js">'+PENCIL_JS+'</script></body>');
   html=taleraDevFilterHiddenExamples(html);
  }else if(demoEditor){
   const revised=taleraDevNativeEditorPatch(html);
   if(!revised.changed)return new Response('Bestaand bewerkscherm niet herkend: '+revised.reason,{status:503});
   html=revised.html;
  }else{
   html=html.replace('</head>','<style id="talera-r20-editor-remove-css">'+REMOVE_CSS+'</style></head>');
   html=html.replace('</body>','<script id="talera-r20-editor-remove-js">'+REMOVE_JS+'</script></body>');
  }
  const headers=new Headers(upstream.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-store');headers.set('x-talera-r20-dev','edit-pencil-only');
  return new Response(html,{status:upstream.status,statusText:upstream.statusText,headers});
 }
};
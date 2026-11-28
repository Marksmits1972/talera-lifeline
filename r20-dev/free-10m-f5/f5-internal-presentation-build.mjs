import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export (?=(?:async )?function )/gm,'');
export function installInternalPresentation(html,route){
 if(route!=='/present')return html;
 const one=(before,after)=>{assert.equal(html.split(before).length,2,'INTERNAL_PRESENT_SOURCE_DRIFT '+before.slice(0,90));html=html.replace(before,()=>after)};
 const wrapped='<script id="talera-zero-memory-adapter">';
 const start=html.indexOf(wrapped),end=html.indexOf('</script>',start+wrapped.length);
 assert.ok(start>=0&&end>start,'INTERNAL_PRESENT_ADAPTER_MISSING');
 let code=html.slice(start+wrapped.length,end);
 const patch=(a,b)=>{assert.equal(code.split(a).length,2,'INTERNAL_PRESENT_ADAPTER_DRIFT '+a.slice(0,90));code=code.replace(a,()=>b)};
 code=code.replaceAll('window.TaleraLibrary','presentationLibrary');
 const initialization=String.raw`
 const receivedKey=new URLSearchParams(location.search).get('received');
 let receivedProjection=null,receivedActive=true;
 let presentationLibrary=window.TaleraLibrary,store=window.TaleraMemories;
 const runtime=window.__taleraTimelineRuntime;
 if(receivedKey!==null){
  document.body.classList.add('talera-recipient-presentation');
  const t=key=>window.TaleraI18n?.t?.('menu.internal.'+key)||({backToNotifications:'Meldingen',receiveProgress:'Herinnering openen…',unavailable:'Deze herinnering is niet beschikbaar.'}[key]);
  const control=document.createElement('div');control.id='talera-received-control';
  const back=document.createElement('a');back.href='/meldingen';back.textContent='‹ '+t('backToNotifications');
  const status=document.createElement('span');status.setAttribute('role','status');status.textContent=t('receiveProgress');
  control.append(back,status);document.body.append(control);
  window.__taleraReceivedError=()=>{document.documentElement.classList.add('talera-received-loading');status.textContent=t('unavailable')};
  window.__taleraReceivedReady=()=>{status.remove();document.documentElement.classList.remove('talera-received-loading')};
  const projectionLib=(()=>{
   `+source('f5-internal-receive.mjs')+'\n'+source('f5-internal-presentation.mjs')+String.raw`
   return {openReceivedStore,makeReceivedProjection,sha};
  })();
  let receivedStore=null;
  try{
   const response=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error('ACCOUNT_REQUIRED');
   const account=(await response.json()).account?.id;
   const scope=await projectionLib.sha(new TextEncoder().encode('TALERA_FREE_BROWSER_MEMORY_V1:'+String(account).toLowerCase()));
   if(scope!=='__TALERA_RECEIVED_SCOPE__')throw Error('ACCOUNT_CHANGED');
   const current=()=>receivedActive;
   document.addEventListener('talera:auth-ready',event=>{const active=window.__taleraMoreMenu?.state()?.accountId;if(event.detail?.authenticated===false||(active&&active!==account)){receivedActive=false;window.__taleraReceivedError();location.replace('/meldingen')}});
   window.addEventListener('pagehide',()=>{receivedActive=false},{once:true});
   window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
   receivedStore=await projectionLib.openReceivedStore(account,{isCurrent:current});
   receivedProjection=await projectionLib.makeReceivedProjection(receivedKey,receivedStore,{isCurrent:current});
   window.__taleraReceivedPresentationLibrary=receivedProjection.library;
   store=presentationLibrary=receivedProjection.library;
  }catch(error){receivedStore?.close();window.__taleraReceivedError();return}
 }
 if(!store||!runtime){if(receivedProjection)window.__taleraReceivedError();return;}
 `;
 patch(' const store=window.TaleraMemories,runtime=window.__taleraTimelineRuntime;\n if(!store||!runtime)return;',initialization);
 patch("const selected=isLocalId(wanted)?map.get('pwa:'+wanted):","const selected=receivedProjection?memories[0]:isLocalId(wanted)?map.get('pwa:'+wanted):");
 // Keep the complete owner boot block intact, including bounded prewarm and
 // registration. The received route instead locks the same runtime to one
 // independently verified local row before its original hydrate/activate.
 patch('   const center=selected?.ms??runtime.currentMemory()?.ms??Date.now();',String.raw`   if(receivedProjection){
     if(!selected)throw Error('RECEIVED_MISSING');
     selected._taleraReceived=true;
     await hydrate(selected);
     runtime.restrictToMemory(selected);
     activate(selected);
     if(runtime.currentMemory()?.id!==selected.id||selected._photoLoading)throw Error('RECEIVED_NOT_OPEN');
     window.__taleraReceivedReady();
     await new Promise(requestAnimationFrame);
     const markVisible=async()=>{
       if(document.visibilityState!=='visible')return;
       document.removeEventListener('visibilitychange',markVisible);
       if(receivedActive&&runtime.currentMemory()?.id===selected.id)try{await receivedProjection.markSeen()}catch{}
     };
     if(document.visibilityState==='visible')await markVisible();
     else document.addEventListener('visibilitychange',markVisible);
   }else{
   const center=selected?.ms??runtime.currentMemory()?.ms??Date.now();`);
 patch('     if(visible?._taleraLocal)await hydrate(visible);\n   }','     if(visible?._taleraLocal)await hydrate(visible);\n   }\n   }');
 patch(" }catch(error){console.warn('TALERA geheugenbibliotheek niet geladen',error)}"," }catch(error){if(receivedProjection)window.__taleraReceivedError();console.warn('TALERA geheugenbibliotheek niet geladen',error)}");
 patch('   loaded.clear();','   loaded.clear();\n   receivedProjection?.dispose();');
 html=html.slice(0,start+wrapped.length)+code+html.slice(end);
 // Same video motor, but for a received memory its media ID must resolve
 // exclusively to the verified read-only projection, never the owner DB.
 one('const original=await window.TaleraLibrary?.blob?.(key);','const original=memory._taleraReceived?await window.__taleraReceivedPresentationLibrary?.blob?.(key):await window.TaleraLibrary?.blob?.(key);');
 one(' const library=window.TaleraLibrary;'," if(new URLSearchParams(location.search).has('received'))return;\n const library=window.TaleraLibrary;");
 one('</head>',`<style>html.talera-received-loading body>:not(#talera-received-control){visibility:hidden!important}html.talera-internal-received #talera-received-control{position:fixed;z-index:2147483646;top:env(safe-area-inset-top,0px);right:10px;display:flex;gap:8px;align-items:center;background:#fff;color:#243448;padding:8px 12px;border-radius:12px;font:inherit}html.talera-internal-received #talera-received-control a{color:inherit;text-decoration:none}html.talera-internal-received #talera-capture-place,html.talera-internal-received .talera-context-share,html.talera-internal-received .talera-memory-edit{display:none!important}</style><script>if(new URLSearchParams(location.search).has('received'))document.documentElement.classList.add('talera-internal-received','talera-received-loading');</script></head>`);
 return html;
}

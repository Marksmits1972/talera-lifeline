/* TALERA V11 — minimale fotoaanvulling na de bestaande vertelcyclus.
 * Alleen de bestaande stem-eindafhandeling krijgt één aanvullende functie.
 * Geen aanpassing aan opnemen, tijdcodes, videoafspelen, opslag of stijl.
 * Deze Worker is uitsluitend een veilige test-omhulling rond de beschermde stijlversie.
 */
export const VOICE_END_ORIGINAL="voice.addEventListener(\"ended\",function(){if(state.media&&state.media.pause)state.media.pause();if(!taleraStartOriginalRound()){mode(\"ready\");msg(\"Terugkijken afgelopen\")} $(\"clock\").textContent=clock(state.duration)});";
export const VOICE_END_WITH_PHOTOS="voice.addEventListener(\"ended\",function(){if(state.media&&state.media.pause)state.media.pause();if(!taleraV11ShowRemainingPhotos()){mode(\"ready\");msg(\"Terugkijken afgelopen\")} $(\"clock\").textContent=clock(state.duration)});";
export const PHOTO_HELPER="/* TALERA: one check at the end of the existing voice cycle.\n   Use the positions of the already stored photo IDs and spoken cues. */\nfunction taleraV11ShowRemainingPhotos(){\n  const used=new Set(state.cues.map(c=>Number(c.index)));\n  const rest=state.items.flatMap((item,index)=>\n    item.type==='image'&&!used.has(index)?[index]:[]);\n  if(!rest.length)return taleraStartOriginalRound();\n  const items=state.items, voiceId=state.voiceUrl;\n  let nextIndex=0;\n  // Stop the existing voice-following loop from restoring its last cue image.\n  mode('ready');\n  $('play').hidden=true;\n  function next(){\n    if(state.items!==items||state.voiceUrl!==voiceId)return;\n    if(nextIndex===rest.length){\n      if(!taleraStartOriginalRound()){\n        mode('ready');\n        $('play').hidden=false;\n        msg('Terugkijken afgelopen');\n      }\n      return;\n    }\n    show(rest[nextIndex++]);\n    setTimeout(next,4000);\n  }\n  next();\n  return true;\n}\n";
const SENTINEL='function taleraV11ShowRemainingPhotos(){';

export function addRemainingPhotos(html){
  if(typeof html!=='string')return{status:'not-html',html};
  if(html.includes(SENTINEL))return{status:'already-installed',html};
  const p=html.indexOf(VOICE_END_ORIGINAL);
  if(p<0||html.indexOf(VOICE_END_ORIGINAL,p+1)!==-1||
     !html.includes('function taleraStartOriginalRound(){')||
     !html.includes('taleraZero'))return{status:'anchor-unmatched',html};
  const modified=html.slice(0,p)+PHOTO_HELPER+'\n'+VOICE_END_WITH_PHOTOS+
    html.slice(p+VOICE_END_ORIGINAL.length);
  return{status:'installed',html:modified};
}


/* Tijdelijke, alleen-lezen diagnose voor de iPhone-proef. */
export const READ_ONLY_AUDIT_SCRIPT="(function(){\n  'use strict';\n  // Read-only observation of the ORIGINAL existing player.\n  // We only listen for INIT and voice/DOM events. No playback or storage writes.\n  if(window.__taleraV11ReadOnlyAudit)return;\n  window.__taleraV11ReadOnlyAudit=true;\n  const audio=document.getElementById('voice');\n  const view=document.getElementById('view');\n  const count=document.getElementById('count');\n  if(!audio||!view||!count)return;\n  const panel=document.createElement('aside');\n  panel.id='talera-v11-readonly-audit';\n  panel.setAttribute('aria-label','Tijdelijke controle van gesproken en resterende foto’s');\n  // Keep the diagnostic completely invisible inside the photo iframe.\n  // Only the small explicit UI on the top-level page is visible.\n  panel.hidden=true;\n  panel.style.display='none';\n  document.body.appendChild(panel);\n  let audit=null,ended=false,shownAfter=[];\n  const cueView=document.getElementById('cues');\n  function currentIndex(){\n    const item=view.querySelector(':scope > img[data-index],:scope > video[data-index]');\n    const index=Number(item?.dataset.index);\n    return Number.isInteger(index)&&item?index:null;\n  }\n  function observe(){\n    const index=currentIndex();\n    if(ended&&audit&&audit.remaining.includes(index)&&!shownAfter.includes(index))\n      shownAfter.push(index);\n  }\n  function sendToParent(){\n    // Only derived counts and 1-based positions, never media IDs/audio/blobs.\n    if(window.parent!==window)\n      window.parent.postMessage({taleraZero:true,type:'V11_DIAG',text:panel.textContent},location.origin);\n  }\n  function render(){\n    observe();\n    if(!audit){\n      panel.textContent='TALERA · DIAGNOSE (alleen lezen)\\nWachten op mediagegevens…';\n      sendToParent();\n      return;\n    }\n    const p=pos=>pos.length?pos.map(x=>x+1).join(', '):'geen';\n    const current=currentIndex();\n    const audioPosition=Number.isFinite(audio.currentTime)?audio.currentTime.toFixed(1)+'s':'—';\n    panel.textContent='TALERA · DIAGNOSE (alleen lezen)'+\n      '\\nMedia '+audit.total+' | Foto’s '+audit.photos+' | Video’s '+audit.videos+\n      '\\nSpraak: '+audit.cueCount+' tijdcodes, '+audit.usedPhotos+' foto’s ('+p(audit.usedPhotoPositions)+')'+\n      '\\nRestfoto’s: '+audit.remaining.length+' ('+p(audit.remaining)+')'+\n      '\\nStem afgelopen: '+(ended?'JA':'nee')+' | Audio '+audioPosition+\n      '\\nIn beeld: '+(current===null?'geen':String(current+1))+\n      ' | Na stem gezien: '+p(shownAfter);\n    sendToParent();\n  }\n  function updateCues(cues){\n    if(!audit||!Array.isArray(cues))return;\n    const used=new Set(cues.map(x=>Number(x?.index)));\n    const usedPhotoPositions=[],remaining=[];\n    for(let i=0;i<audit.mediaTypes.length;i++){\n      if(audit.mediaTypes[i]!=='image')continue;\n      if(used.has(i))usedPhotoPositions.push(i);\n      else remaining.push(i);\n    }\n    audit.cueCount=cues.length;\n    audit.usedPhotoPositions=usedPhotoPositions;\n    audit.usedPhotos=usedPhotoPositions.length;\n    audit.remaining=remaining;\n    render();\n  }\n  function readLiveCues(){\n    if(!audit||!cueView)return;\n    const raw=cueView.textContent.trim();\n    if(!raw||raw==='Nog geen opname'){updateCues([]);return;}\n    try{\n      const value=JSON.parse(raw);\n      if(Array.isArray(value?.cues))updateCues(value.cues);\n    }catch(e){}\n  }\n  window.addEventListener('message',function(event){\n    if(event.source!==window.parent||event.origin!==location.origin||\n      !event.data?.taleraZero||event.data.type!=='INIT')return;\n    const data=event.data;\n    const items=Array.isArray(data.items)?data.items:[];\n    const cues=Array.isArray(data.cues)?data.cues:[];\n    const mediaTypes=items.map(x=>x?.type==='video'?'video':'image');\n    audit={total:items.length,photos:mediaTypes.filter(x=>x==='image').length,\n      videos:mediaTypes.filter(x=>x==='video').length,\n      mediaTypes,cueCount:0,usedPhotos:0,usedPhotoPositions:[],remaining:[]};\n    ended=false;\n    shownAfter=[];\n    updateCues(cues);\n    // If the recorder already has newly collected cues, use those as well.\n    readLiveCues();\n  },true);\n  audio.addEventListener('ended',function(){ended=true;render()});\n  audio.addEventListener('play',render);\n  audio.addEventListener('pause',render);\n  if(cueView)new MutationObserver(readLiveCues).observe(cueView,{childList:true,subtree:true,characterData:true});\n  new MutationObserver(render).observe(view,{childList:true,subtree:true,characterData:true});\n  render();\n})();";
export const READ_ONLY_AUDIT_ID='talera-v11-readonly-audit-script';
export function addReadOnlyAudit(html){
  if(typeof html!=='string'||!html.includes('</body>'))return html;
  if(html.includes('id="'+READ_ONLY_AUDIT_ID+'"'))return html;
  const script='<script id="'+READ_ONLY_AUDIT_ID+'">'+READ_ONLY_AUDIT_SCRIPT+'</script>';
  return html.replace('</body>',script+'</body>');
}


/* Tijdelijke diagnoseknop op de bovenliggende presentatie-/vertelpagina. */
export const FRONT_DIAG_SCRIPT="(function(){\n 'use strict';\n // Diagnostic-only UI. No hooks into the narrator, database or media playback.\n if(window.__taleraV11FrontDiagnostic)return;\n window.__taleraV11FrontDiagnostic=true;\n const root=document.createElement('div');\n root.id='talera-v11-front-diagnostic';\n root.setAttribute('data-v11-debug','visible');\n root.style.cssText='position:fixed!important;z-index:2147483646!important;left:12px!important;bottom:calc(104px + env(safe-area-inset-bottom,0px))!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:7px!important;max-width:calc(100vw - 24px)!important;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif!important;color:#173549!important;pointer-events:none!important';\n const toggle=document.createElement('button');\n toggle.id='talera-v11-debug-toggle';\n toggle.type='button';\n toggle.textContent='🔎 Diagnose';\n toggle.setAttribute('aria-label','Open tijdelijke TALERA-diagnose');\n toggle.setAttribute('aria-expanded','false');\n toggle.style.cssText='appearance:none!important;display:block!important;pointer-events:auto!important;min-height:46px!important;padding:10px 16px!important;background:#fff!important;border:2px solid #193949!important;border-radius:24px!important;color:#173549!important;font:750 14px system-ui!important;box-shadow:0 4px 15px #0005!important';\n const panel=document.createElement('section');\n panel.id='talera-v11-debug-panel';\n panel.setAttribute('role','status');\n panel.setAttribute('aria-label','TALERA — diagnose van ontbrekende foto’s');\n panel.hidden=true;\n panel.style.cssText='display:none;pointer-events:auto!important;box-sizing:border-box!important;max-width:min(350px,calc(100vw - 24px))!important;max-height:min(55vh,490px)!important;overflow:auto!important;padding:14px!important;background:#fff!important;border:2px solid #193949!important;border-radius:16px!important;box-shadow:0 8px 30px #0005!important;color:#173549!important;font:13px/1.5 system-ui!important';\n const title=document.createElement('strong');\n title.textContent='TALERA · Diagnose (tijdelijk)';\n title.style.cssText='display:block;font-size:14px;margin-bottom:8px';\n const details=document.createElement('pre');\n details.id='talera-v11-debug-text';\n details.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:600 12px/1.55 system-ui;margin:4px 0 12px;color:#183347';\n let last='Wachten op vertelspeler…';\n function getFrameText(){\n   const iframe=document.querySelector('iframe.talera-zero-present-frame,iframe#taleraZeroIframe');\n   try{return iframe?.contentDocument?.getElementById('talera-v11-readonly-audit')?.textContent||''}\n   catch(e){return ''}\n }\n function refresh(){\n   const fromFrame=getFrameText();\n   if(fromFrame)last=fromFrame;\n   details.textContent=last;\n }\n const controls=document.createElement('div');\n controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap';\n function button(label){\n   const b=document.createElement('button');\n   b.type='button';b.textContent=label;\n   b.style.cssText='pointer-events:auto;min-height:40px;padding:9px 12px;border:1px solid #aac0ca;border-radius:10px;background:#eaf1f5;color:#193949;font:700 13px system-ui';\n   return b;\n }\n const update=button('Ververs');\n const copy=button('Kopieer');\n const close=button('Sluiten');\n update.addEventListener('click',refresh);\n copy.addEventListener('click',function(){\n   refresh();\n   const payload=details.textContent;\n   if(navigator.clipboard?.writeText)\n     navigator.clipboard.writeText(payload).then(()=>{copy.textContent='Gekopieerd ✓';})\n       .catch(()=>{copy.textContent='Maak screenshot';});\n   else copy.textContent='Maak screenshot';\n });\n function open(opened){\n   panel.hidden=!opened;\n   panel.style.display=opened?'block':'none';\n   toggle.setAttribute('aria-expanded',opened?'true':'false');\n   if(opened)refresh();\n }\n toggle.addEventListener('click',()=>open(panel.hidden));\n close.addEventListener('click',()=>open(false));\n controls.append(update,copy,close);\n panel.append(title,details,controls);\n root.append(panel,toggle);\n // Keep it on the highest parent surface, outside any photograph iframe.\n (document.body||document.documentElement).appendChild(root);\n root.addEventListener('pointerdown',event=>event.stopPropagation());\n root.addEventListener('pointerup',event=>event.stopPropagation());\n root.addEventListener('touchstart',event=>event.stopPropagation(),{passive:true});\n window.addEventListener('message',function(event){\n   if(event.origin!==location.origin||event.data?.taleraZero!==true||\n      event.data.type!=='V11_DIAG'||typeof event.data.text!=='string')return;\n   // Accept messages only from an actual TALERA narration iframe.\n   const frames=[...document.querySelectorAll('iframe.talera-zero-present-frame,iframe#taleraZeroIframe')];\n   if(!frames.some(frame=>frame.contentWindow===event.source))return;\n   last=event.data.text.slice(0,1200);\n   if(!panel.hidden)details.textContent=last;\n });\n})();";
export const FRONT_DIAG_ID='talera-v11-front-diagnose-script';
export function addFrontDiagnostic(html){
  if(typeof html!=='string'||!html.includes('</body>'))return{html,status:'anchor-unmatched'};
  if(html.includes('id="'+FRONT_DIAG_ID+'"'))return{html,status:'already-installed'};
  return{html:html.replace('</body>','<script id="'+FRONT_DIAG_ID+'">'+FRONT_DIAG_SCRIPT+'</script></body>'),status:'installed'};
}

export default{
  async fetch(request,env){
    if(!env?.STYLE_BASE?.fetch)
      return new Response('TALERA testbasis niet gevonden',{status:503});
    const upstream=await env.STYLE_BASE.fetch(request);
    const path=new URL(request.url).pathname;
    if(request.method!=='GET'||!upstream.ok||
       !(upstream.headers.get('content-type')||'').includes('text/html')||
       !['/vertelmodus-embed','/present','/tell'].includes(path))
      return upstream;
    const originalHtml=await upstream.text();
    let status='anchor-unmatched',responseHtml=originalHtml;
    if(path==='/vertelmodus-embed'){
      const result=addRemainingPhotos(originalHtml);
      status=result.status;
      responseHtml=status==='installed'?addReadOnlyAudit(result.html):result.html;
    }else{
      const result=addFrontDiagnostic(originalHtml);
      status=result.status;
      responseHtml=result.html;
    }
    const headers=new Headers(upstream.headers);
    if(status==='installed'){
      headers.delete('etag');
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.set('cache-control','no-store');
    }
    if(path==='/vertelmodus-embed')headers.set('x-talera-v11-photos',status);
    else headers.set('x-talera-v11-front-diagnostic',status);
    return new Response(responseHtml,{status:upstream.status,
      statusText:upstream.statusText,headers});
  }
};
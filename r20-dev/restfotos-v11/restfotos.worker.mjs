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
export const READ_ONLY_AUDIT_SCRIPT="(function(){\n  'use strict';\n  // Read-only observation of the ORIGINAL existing player.\n  // We only listen for INIT and voice/DOM events. No playback or storage writes.\n  if(window.__taleraV11ReadOnlyAudit)return;\n  window.__taleraV11ReadOnlyAudit=true;\n  const audio=document.getElementById('voice');\n  const view=document.getElementById('view');\n  const count=document.getElementById('count');\n  if(!audio||!view||!count)return;\n  const panel=document.createElement('aside');\n  panel.id='talera-v11-readonly-audit';\n  panel.setAttribute('aria-label','Tijdelijke controle van gesproken en resterende foto’s');\n  panel.style.cssText='position:fixed;z-index:2147483600;top:calc(10px + env(safe-area-inset-top,0px));right:8px;max-width:min(310px,calc(100vw - 16px));pointer-events:none;padding:8px 10px;border-radius:10px;border:1px solid #7492a8;background:rgba(255,255,255,.94);box-shadow:0 2px 8px #1234;color:#183347;font:600 11px/1.5 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;white-space:pre-line;overflow-wrap:anywhere';\n  document.body.appendChild(panel);\n  let audit=null,ended=false,shownAfter=[];\n  const cueView=document.getElementById('cues');\n  function currentIndex(){\n    const item=view.querySelector(':scope > img[data-index],:scope > video[data-index]');\n    const index=Number(item?.dataset.index);\n    return Number.isInteger(index)&&item?index:null;\n  }\n  function observe(){\n    const index=currentIndex();\n    if(ended&&audit&&audit.remaining.includes(index)&&!shownAfter.includes(index))\n      shownAfter.push(index);\n  }\n  function render(){\n    observe();\n    if(!audit){\n      panel.textContent='TALERA · DIAGNOSE (alleen lezen)\\nWachten op mediagegevens…';\n      return;\n    }\n    const p=pos=>pos.length?pos.map(x=>x+1).join(', '):'geen';\n    const current=currentIndex();\n    const audioPosition=Number.isFinite(audio.currentTime)?audio.currentTime.toFixed(1)+'s':'—';\n    panel.textContent='TALERA · DIAGNOSE (alleen lezen)'+\n      '\\nMedia '+audit.total+' | Foto’s '+audit.photos+' | Video’s '+audit.videos+\n      '\\nSpraak: '+audit.cueCount+' tijdcodes, '+audit.usedPhotos+' foto’s ('+p(audit.usedPhotoPositions)+')'+\n      '\\nRestfoto’s: '+audit.remaining.length+' ('+p(audit.remaining)+')'+\n      '\\nStem afgelopen: '+(ended?'JA':'nee')+' | Audio '+audioPosition+\n      '\\nIn beeld: '+(current===null?'geen':String(current+1))+\n      ' | Na stem gezien: '+p(shownAfter);\n  }\n  function updateCues(cues){\n    if(!audit||!Array.isArray(cues))return;\n    const used=new Set(cues.map(x=>Number(x?.index)));\n    const usedPhotoPositions=[],remaining=[];\n    for(let i=0;i<audit.mediaTypes.length;i++){\n      if(audit.mediaTypes[i]!=='image')continue;\n      if(used.has(i))usedPhotoPositions.push(i);\n      else remaining.push(i);\n    }\n    audit.cueCount=cues.length;\n    audit.usedPhotoPositions=usedPhotoPositions;\n    audit.usedPhotos=usedPhotoPositions.length;\n    audit.remaining=remaining;\n    render();\n  }\n  function readLiveCues(){\n    if(!audit||!cueView)return;\n    const raw=cueView.textContent.trim();\n    if(!raw||raw==='Nog geen opname'){updateCues([]);return;}\n    try{\n      const value=JSON.parse(raw);\n      if(Array.isArray(value?.cues))updateCues(value.cues);\n    }catch(e){}\n  }\n  window.addEventListener('message',function(event){\n    if(event.source!==window.parent||event.origin!==location.origin||\n      !event.data?.taleraZero||event.data.type!=='INIT')return;\n    const data=event.data;\n    const items=Array.isArray(data.items)?data.items:[];\n    const cues=Array.isArray(data.cues)?data.cues:[];\n    const mediaTypes=items.map(x=>x?.type==='video'?'video':'image');\n    audit={total:items.length,photos:mediaTypes.filter(x=>x==='image').length,\n      videos:mediaTypes.filter(x=>x==='video').length,\n      mediaTypes,cueCount:0,usedPhotos:0,usedPhotoPositions:[],remaining:[]};\n    ended=false;\n    shownAfter=[];\n    updateCues(cues);\n    // If the recorder already has newly collected cues, use those as well.\n    readLiveCues();\n  },true);\n  audio.addEventListener('ended',function(){ended=true;render()});\n  audio.addEventListener('play',render);\n  audio.addEventListener('pause',render);\n  if(cueView)new MutationObserver(readLiveCues).observe(cueView,{childList:true,subtree:true,characterData:true});\n  new MutationObserver(render).observe(view,{childList:true,subtree:true,characterData:true});\n  render();\n})();";
export const READ_ONLY_AUDIT_ID='talera-v11-readonly-audit-script';
export function addReadOnlyAudit(html){
  if(typeof html!=='string'||!html.includes('</body>'))return html;
  if(html.includes('id="'+READ_ONLY_AUDIT_ID+'"'))return html;
  const script='<script id="'+READ_ONLY_AUDIT_ID+'">'+READ_ONLY_AUDIT_SCRIPT+'</script>';
  return html.replace('</body>',script+'</body>');
}

export default{
  async fetch(request,env){
    if(!env?.STYLE_BASE?.fetch)
      return new Response('TALERA testbasis niet gevonden',{status:503});
    const upstream=await env.STYLE_BASE.fetch(request);
    if(request.method!=='GET'||
       new URL(request.url).pathname!=='/vertelmodus-embed'||
       !upstream.ok||
       !(upstream.headers.get('content-type')||'').includes('text/html'))
      return upstream;
    const {status,html}=addRemainingPhotos(await upstream.text());
    const responseHtml=status==='installed'?addReadOnlyAudit(html):html;
    const headers=new Headers(upstream.headers);
    if(status==='installed'){
      headers.delete('etag');
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.set('cache-control','no-store');
    }
    headers.set('x-talera-v11-photos',status);
    return new Response(responseHtml,{status:upstream.status,
      statusText:upstream.statusText,headers});
  }
};
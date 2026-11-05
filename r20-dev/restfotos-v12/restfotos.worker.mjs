/* TALERA V12 - safe, minimal extension around approved V9.
 * Three small source substitutions on two protected V9 HTML routes:
 *  1) /present: explicitly activate the already-hydrated current memory
 *     after restoring its saved local record on a fresh open.
 *     and restart its original player only when the previous iframe is gone.
 *  2) /vertelmodus-embed: at real voice-ended, display the remaining still
 *     images from the EXISTING cue/index mapping; then call the original
 *     video function exactly as before.
 * NO extra diagnostic, proxy player, storage change, or video interception.
 */
export const ORIGINAL_VOICE_END="voice.addEventListener(\"ended\",function(){if(state.media&&state.media.pause)state.media.pause();if(!taleraStartOriginalRound()){mode(\"ready\");msg(\"Terugkijken afgelopen\")} $(\"clock\").textContent=clock(state.duration)});";
export const PATCHED_VOICE_END="voice.addEventListener(\"ended\",function(){if(state.media&&state.media.pause)state.media.pause();if(!taleraV12RemainingPhotos()){mode(\"ready\");msg(\"Terugkijken afgelopen\")} $(\"clock\").textContent=clock(state.duration)});";
export const PHOTO_TAIL_HELPER="/* TALERA V12: only in PRESENTATION, after real voice ended.\n   Existing recording, cue creation and original video round are untouched. */\nfunction taleraV12RemainingPhotos(){\n  if(!document.body.classList.contains('present'))\n    return taleraStartOriginalRound();\n  const spoken=new Set(state.cues.map(c=>Number(c.index)));\n  const rest=[];\n  state.items.forEach((item,i)=>{\n    if(item.type==='image'&&!spoken.has(i))rest.push(i);\n  });\n  if(!rest.length)return taleraStartOriginalRound();\n  const originalItems=state.items,originalVoice=state.voiceUrl;\n  let nextIndex=0;\n  mode('ready');\n  function next(){\n    if(state.items!==originalItems||state.voiceUrl!==originalVoice||\n       state.mode==='playing'||state.mode==='recording')return;\n    if(nextIndex===rest.length){\n      if(!taleraStartOriginalRound()){\n        mode('ready');\n        $('play').hidden=false;\n        msg('Terugkijken afgelopen');\n      }\n      return;\n    }\n    show(rest[nextIndex++]);\n    $('play').hidden=true;\n    setTimeout(next,4000);\n  }\n  next();\n  return true;\n}\n";
export const ORIGINAL_PRESENTER_GUARD="const id=memory.id;\n   if(activeId===id)return;\n   disposePresentation();";
export const PATCHED_PRESENTER_GUARD="const id=memory.id;\n   if(activeId===id&&currentPresentation?.frame?.isConnected)return;\n   disposePresentation();";
export const ORIGINAL_RESTORE="if(visible?._taleraLocal)await hydrate(visible);";
export const PATCHED_RESTORE="if(visible?._taleraLocal){await hydrate(visible);activate(visible);}";
const MARKER='function taleraV12RemainingPhotos(){';

export function patchEmbed(html){
 if(typeof html!=='string')return{html,status:'not-html'};
 if(html.includes(MARKER))return{html,status:'already-installed'};
 const i=html.indexOf(ORIGINAL_VOICE_END);
 if(i<0||html.indexOf(ORIGINAL_VOICE_END,i+1)!==-1||
    !html.includes('function taleraStartOriginalRound(){')||
    !html.includes('function show(n)'))return{html,status:'anchor-unmatched'};
 return{html:html.slice(0,i)+PHOTO_TAIL_HELPER+'\n'+PATCHED_VOICE_END+
    html.slice(i+ORIGINAL_VOICE_END.length),status:'installed'};
}

export function patchPresentation(html){
 if(typeof html!=='string')return{html,status:'not-html'};
 if(html.includes(PATCHED_RESTORE)&&html.includes(PATCHED_PRESENTER_GUARD))
   return{html,status:'already-installed'};
 if(!html.includes("runtime.subscribe(activate);")||
    !html.includes("runtime.registerMemories(memories);"))
   return{html,status:'anchor-unmatched'};
 const swaps=[
  [ORIGINAL_PRESENTER_GUARD,PATCHED_PRESENTER_GUARD],
  [ORIGINAL_RESTORE,PATCHED_RESTORE]
 ];
 // Fail closed: require both exact original anchors and no duplicate.
 for(const [oldText] of swaps){
  const i=html.indexOf(oldText);
  if(i<0||html.indexOf(oldText,i+1)!==-1)return{html,status:'anchor-unmatched'};
 }
 let updated=html;
 for(const [oldText,newText] of swaps)updated=updated.replace(oldText,newText);
 return{html:updated,status:'installed'};
}

export default {
 async fetch(request,env){
  if(!env?.STYLE_BASE?.fetch)
    return new Response('Beschermde TALERA V9 basis ontbreekt',{status:503});
  const upstream=await env.STYLE_BASE.fetch(request);
  const path=new URL(request.url).pathname;
  if(request.method!=='GET'||!upstream.ok||
     (upstream.headers.get('content-type')||'').toLowerCase().indexOf('text/html')<0||
     !['/vertelmodus-embed','/present'].includes(path))
    return upstream;
  const source=await upstream.text();
  const result=path==='/vertelmodus-embed'?patchEmbed(source):patchPresentation(source);
  // Fail closed on upstream changes; NEVER force an incomplete rewrite.
  const headers=new Headers(upstream.headers);
  if(result.status==='installed'){
    headers.delete('etag');headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('cache-control','no-store');
  }
  headers.set('x-talera-v12-restfotos',result.status);
  return new Response(result.html,{status:upstream.status,
    statusText:upstream.statusText,headers});
 }
};

/* TALERA V12 — minimale restfoto-uitbreiding op de GOEDGEKEURDE V9 INLINE
 * presentatiemodus. GEEN iframe-speler of nieuwe mediacyclus.
 * Er verandert uitsluitend GET /present op exact twee plaatsen:
 * 1. één helper voor ongebruikte foto-ID's in de originele fotolaag;
 * 2. aan het eind van stemopname de bestaande helper aanroepen.
 * De originele taleraInlineVoiceEnded(), videoronde, recorder, opslaan,
 * tijdcodes, navigatie en alle andere routes blijven byte-identiek.
 */
export const INLINE_PHOTO_HELPER="/* After the recorded voice, show only photos whose existing media IDs\n   never appeared in the recorded cues. The native photo surface and the\n   original unmuted video replay remain the only presentation engines. */\nfunction taleraInlineRemainingPhotos(s){\n  if(s!==taleraInline||s.phase!=='narration')return;\n  const spoken=new Set(s.cues.map(c=>c.mediaId));\n  const remaining=[];\n  s.frames.forEach((frame,i)=>{\n    if(frame.kind==='photo'&&!spoken.has(frame.key))remaining.push(i);\n  });\n  if(!remaining.length){taleraInlineVoiceEnded(s);return;}\n  taleraInlineCleanVideo(s);\n  s.phase='remainingPhotos';\n  let nextIndex=0;\n  function next(){\n    if(s!==taleraInline||s.phase!=='remainingPhotos'||\n       runtime.currentMemory()?.id!==s.memory.id)return;\n    if(nextIndex===remaining.length){\n      s.ordinaryTimer=null;\n      s.phase='narration';\n      taleraInlineVoiceEnded(s);\n      return;\n    }\n    taleraInlineSetFrame(s,remaining[nextIndex++]);\n    s.ordinaryTimer=setTimeout(next,4000);\n  }\n  next();\n}\n";
export const ORIGINAL_AUDIO_END="audio.onended=()=>{stopTimer();tick();taleraInlineVoiceEnded(s)};";
export const PATCHED_AUDIO_END="audio.onended=()=>{stopTimer();tick();taleraInlineRemainingPhotos(s)};";
export const INSERT_ANCHOR="function taleraInlineVoiceEnded(s){";
export const INSTALLED_MARKER="function taleraInlineRemainingPhotos(s){";

export function addRemainingPhotosToInlinePlayer(html){
 if(typeof html!=='string')return{html,status:'not-html'};
 if(html.includes(INSTALLED_MARKER))return{html,status:'already-installed'};
 const required=[
  INSERT_ANCHOR,ORIGINAL_AUDIO_END,
  'function taleraInlineSetFrame(s,index){',
  'function taleraInlineReplayNext(s){',
  'function taleraInlineCleanVideo(s){'
 ];
 for(const token of required){
  const at=html.indexOf(token);
  if(at<0||html.indexOf(token,at+1)>=0)
    return{html,status:'anchor-unmatched'};
 }
 const before=html.indexOf(INSERT_ANCHOR);
 const after=html.indexOf(ORIGINAL_AUDIO_END);
 if(after<=before)return{html,status:'anchor-unmatched'};
 const patched=html.slice(0,before)+INLINE_PHOTO_HELPER+'\n'+html.slice(before);
 return{html:patched.replace(ORIGINAL_AUDIO_END,PATCHED_AUDIO_END),status:'installed'};
}

export default {
 async fetch(request,env){
  if(!env?.STYLE_BASE?.fetch)
   return new Response('Beschermde TALERA V9 basis ontbreekt',{status:503});
  const upstream=await env.STYLE_BASE.fetch(request);
  if(request.method!=='GET'||new URL(request.url).pathname!=='/present'||
     !upstream.ok||!(upstream.headers.get('content-type')||'').includes('text/html'))
   return upstream;
  const {html,status}=addRemainingPhotosToInlinePlayer(await upstream.text());
  const headers=new Headers(upstream.headers);
  if(status==='installed'){
   headers.delete('etag');headers.delete('content-length');
   headers.delete('content-encoding');
   headers.set('cache-control','no-store');
  }
  headers.set('x-talera-v12-inline-restfotos',status);
  return new Response(html,{status:upstream.status,statusText:upstream.statusText,headers});
 }
};

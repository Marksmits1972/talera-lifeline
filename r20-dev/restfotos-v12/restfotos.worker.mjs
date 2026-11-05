/* TALERA V12 — only two existing V9 completion branches change.
 * Original audio cues, silent narration video, original video replay WITH sound,
 * UI and storage stay intact. A single native photo tail follows the last video.
 * The normal voice-ended callback remains byte-identical to approved V9.
 */
export const INLINE_PHOTO_HELPER="/* Continue the approved V9 inline presentation AFTER the original video-sound round.\n   Stored cue IDs are normalized by V9; keep its original photos, media and voice. */\nfunction taleraInlineRemainingPhotos(s){\n  if(s!==taleraInline||(s.phase!=='narration'&&s.phase!=='originals'))return;\n  const used=new Set(s.cues.map(c=>c.mediaId));\n  const remaining=[];\n  s.frames.forEach((frame,i)=>{\n    if(frame.kind==='photo'&&!used.has(frame.key))remaining.push(i);\n  });\n  if(!remaining.length){s.phase='done';return;}\n  s.phase='remainingPhotos';\n  let cursor=0;\n  function next(){\n    if(s!==taleraInline||s.phase!=='remainingPhotos'||\n       runtime.currentMemory()?.id!==s.memory.id)return;\n    if(cursor===remaining.length){\n      s.ordinaryTimer=null;\n      s.phase='done';\n      return;\n    }\n    taleraInlineSetFrame(s,remaining[cursor++]);\n    s.ordinaryTimer=setTimeout(next,4000);\n  }\n  next();\n}\n";
export const ORIGINAL_VIDEO_DONE="if(!frame){taleraInlineCleanVideo(s);s.phase='done';return}";
export const PATCHED_VIDEO_DONE="if(!frame){taleraInlineCleanVideo(s);taleraInlineRemainingPhotos(s);return}";
export const ORIGINAL_NO_VIDEOS="if(!s.replayFrames.length){s.phase='done';return}";
export const PATCHED_NO_VIDEOS="if(!s.replayFrames.length){taleraInlineRemainingPhotos(s);return}";
export const INSERT_ANCHOR="function taleraInlineReplayNext(s){";
export const INSTALLED_MARKER="function taleraInlineRemainingPhotos(s){";

export function addRemainingPhotosToInlinePlayer(html){
  if(typeof html!=='string')return{html,status:'not-html'};
  if(html.includes(INSTALLED_MARKER))return{html,status:'already-installed'};
  for(const token of [INSERT_ANCHOR,ORIGINAL_VIDEO_DONE,ORIGINAL_NO_VIDEOS,
    "function taleraInlineSetFrame(s,index){",
    "function taleraInlineVoiceEnded(s){"]){
    const at=html.indexOf(token);
    if(at<0||html.indexOf(token,at+token.length)>=0)
      return{html,status:'anchor-unmatched'};
  }
  const insertAt=html.indexOf(INSERT_ANCHOR);
  let patched=html.slice(0,insertAt)+INLINE_PHOTO_HELPER+"\n"+html.slice(insertAt);
  patched=patched.replace(ORIGINAL_VIDEO_DONE,PATCHED_VIDEO_DONE);
  patched=patched.replace(ORIGINAL_NO_VIDEOS,PATCHED_NO_VIDEOS);
  return{html:patched,status:'installed'};
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

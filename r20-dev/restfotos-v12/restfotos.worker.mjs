/* TALERA V12 — isolated native V9 continuation, not a second player.
 * Original audio-onended handler, narrated cue clock, muted narrative videos,
 * media storage and existing video renderer are untouched.
 * After audio: replay narrated videos fully with their own sound using V9.
 * Then display every not-yet-narrated media item in its original saved order:
 * stills for 4 seconds, videos completely with their native sound.
 * Only the existing inline replay selection and two completion branches are patched.
 */
export const INLINE_PHOTO_HELPER="/* Continue in the one native V9 presentation. Reuse its native video player, photo surface and cleanup. */\nfunction taleraInlineRemainingPhotos(s){\n  if(s!==taleraInline||(s.phase!=='narration'&&s.phase!=='originals'))return;\n  const seen=new Set(s.cues.map(c=>c.mediaId));\n  const remaining=[];\n  s.frames.forEach((frame,i)=>{\n    if((frame.kind==='photo'||frame.kind==='video')&&!seen.has(frame.key))remaining.push({frame,index:i});\n  });\n  if(!remaining.length){s.phase='done';return;}\n  s.phase='remainingPhotos';\n  let cursor=0;\n  function next(){\n    if(s!==taleraInline||s.phase!=='remainingPhotos'||\n       runtime.currentMemory()?.id!==s.memory.id)return;\n    if(cursor===remaining.length){\n      s.ordinaryTimer=null;\n      taleraInlineCleanVideo(s);\n      s.phase='done';\n      return;\n    }\n    const item=remaining[cursor++];\n    taleraInlineSetFrame(s,item.index);\n    if(item.frame.kind==='video')taleraInlinePlayMedia(s,item.frame,false,next);\n    else s.ordinaryTimer=setTimeout(next,4000);\n  }\n  next();\n}\n";
export const ORIGINAL_VIDEO_SELECTION="s.replayFrames=s.frames.filter(f=>f.kind==='video');";
export const PATCHED_VIDEO_SELECTION="s.replayFrames=s.frames.filter(f=>f.kind==='video'&&s.cues.some(c=>c.mediaId===f.key));";
export const ORIGINAL_VIDEO_DONE="if(!frame){taleraInlineCleanVideo(s);s.phase='done';return}";
export const PATCHED_VIDEO_DONE="if(!frame){taleraInlineCleanVideo(s);taleraInlineRemainingPhotos(s);return}";
export const ORIGINAL_NO_VIDEOS="if(!s.replayFrames.length){s.phase='done';return}";
export const PATCHED_NO_VIDEOS="if(!s.replayFrames.length){taleraInlineRemainingPhotos(s);return}";
export const INSERT_ANCHOR="function taleraInlineReplayNext(s){";
export const INSTALLED_MARKER="function taleraInlineRemainingPhotos(s){";

export function addRemainingPhotosToInlinePlayer(html){
  if(typeof html!=='string')return{html,status:'not-html'};
  if(html.includes(INSTALLED_MARKER))return{html,status:'already-installed'};
  for(const token of [INSERT_ANCHOR,ORIGINAL_VIDEO_SELECTION,ORIGINAL_VIDEO_DONE,
    ORIGINAL_NO_VIDEOS,"function taleraInlineSetFrame(s,index){",
    "function taleraInlinePlayMedia(s,frame,muted,finished){",
    "function taleraInlineVoiceEnded(s){"]){
    const at=html.indexOf(token);
    if(at<0||html.indexOf(token,at+token.length)>=0)
      return{html,status:'anchor-unmatched'};
  }
  const insertAt=html.indexOf(INSERT_ANCHOR);
  let patched=html.slice(0,insertAt)+INLINE_PHOTO_HELPER+"\n"+html.slice(insertAt);
  patched=patched.replace(ORIGINAL_VIDEO_SELECTION,PATCHED_VIDEO_SELECTION);
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

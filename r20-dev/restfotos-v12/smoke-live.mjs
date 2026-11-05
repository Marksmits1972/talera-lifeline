/* Read-only verification against currently approved V9 HTML.
 * No Cloudflare API token, no deploy and no browser data mutation.
 */
import assert from 'node:assert/strict';
import {
  INLINE_PHOTO_HELPER, ORIGINAL_VIDEO_SELECTION, PATCHED_VIDEO_SELECTION,
  ORIGINAL_VIDEO_DONE, PATCHED_VIDEO_DONE, ORIGINAL_NO_VIDEOS,
  PATCHED_NO_VIDEOS, addRemainingPhotosToInlinePlayer
} from './restfotos.worker.mjs';

const approvedBase='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev';
const res=await fetch(approvedBase+'/present',{headers:{accept:'text/html'}});
assert.equal(res.status,200,'approved V9 /present must be reachable');
const html=await res.text();
const result=addRemainingPhotosToInlinePlayer(html);
if(result.status!=='installed'){
  const checks={
    replayFunction:'function taleraInlineReplayNext(s){',
    narratedVideoSelection:ORIGINAL_VIDEO_SELECTION,
    videoCompleted:ORIGINAL_VIDEO_DONE,
    noSpokenVideos:ORIGINAL_NO_VIDEOS,
    nativePhoto:'function taleraInlineSetFrame(s,index){',
    nativeVideo:'function taleraInlinePlayMedia(s,frame,muted,done){',
    voiceEnd:'function taleraInlineVoiceEnded(s){'
  };
  const counts=Object.fromEntries(Object.entries(checks).map(([name,token])=>[
    name,html.split(token).length-1
  ]));
  console.log('Read-only real V9 anchor counts:',JSON.stringify(counts));
  console.log('Native V9 media-function signatures:',JSON.stringify(html.match(/function taleraInlinePlayMedia\([^)]*\)\s*\{/g)||[]));
}
assert.equal(result.status,'installed','current V9 inline anchors must match exactly');
assert.equal(result.html.split(INLINE_PHOTO_HELPER).length-1,1);
assert.equal(result.html.split(PATCHED_VIDEO_SELECTION).length-1,1);
assert.equal(result.html.split(PATCHED_VIDEO_DONE).length-1,1);
assert.equal(result.html.split(PATCHED_NO_VIDEOS).length-1,1);
assert.equal(
  result.html.replace(INLINE_PHOTO_HELPER+'\n','')
    .replace(PATCHED_VIDEO_SELECTION,ORIGINAL_VIDEO_SELECTION)
    .replace(PATCHED_VIDEO_DONE,ORIGINAL_VIDEO_DONE)
    .replace(PATCHED_NO_VIDEOS,ORIGINAL_NO_VIDEOS),
  html,'no other original V9 HTML or JS may be changed');
console.log('PASS: real approved V9 inline HTML accepts exactly 1 helper and 3 tiny patches');
console.log('PASS: recorder, storage, CSS, story UI and all other V9 page bytes are untouched');

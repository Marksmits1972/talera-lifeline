// F5 only: preserve the approved recorder and post-narration video soundtrack.
// Safari may not composite a native video cover while opacity is zero;
// show the same existing silent video frame until its JPEG poster is ready.
// The existing editor preview video used to be audible while its recorder
// panel was hidden. Never mute the independent /present original sound round.
const originalVisibility='const mute=!!(panel&&!panel.hidden)';
const silentVisibility='const mute=true';
const originalVideoTag='controls playsinline preload="metadata"></video>';
const originalNativeOpacity='pointer-events:none;opacity:0;z-index:1';
const visibleNativeOpacity='pointer-events:none;opacity:1;z-index:1';
const silentVideoTag='muted controls playsinline preload="metadata"></video>';
export function muteEditorOnlyVideo(html){
 if(typeof html!=='string')throw Error('F5_EDITOR_HTML_MISSING');
 for(const anchor of [originalVisibility,originalVideoTag,originalNativeOpacity]){
  if(html.split(anchor).length!==2)throw Error('F5_EDITOR_VIDEO_MUTE_SOURCE_CHANGED');
 }
 return html.replace(originalVisibility,silentVisibility)
  .replace(originalVideoTag,silentVideoTag)
  .replace(originalNativeOpacity,visibleNativeOpacity);
}
export function undoEditorOnlyMute(html){
 return html.replace(silentVisibility,originalVisibility)
  .replace(silentVideoTag,originalVideoTag)
  .replace(visibleNativeOpacity,originalNativeOpacity);
}


// Reattach the already existing native cover on the first workbench render.
// A rejected autoplay promise on iPhone must not prevent a decoded frame
// from being captured. No presentation/player code is changed.
export function restoreEditorVideoCover(html){
 const anchors=[
  [" tiles.querySelectorAll('.tile').forEach(enableDrag);taleraV9EditorMediaControls(g);",
   " tiles.querySelectorAll('.tile').forEach(enableDrag);taleraV9EditorMediaControls(g);taleraV61AttachNativeCovers();"],
  ["main.querySelectorAll('.tile').forEach(enableDrag);$('addMore').onclick=",
   "main.querySelectorAll('.tile').forEach(enableDrag);taleraV61AttachNativeCovers();$('addMore').onclick="],
  ["void v.play().then(()=>setTimeout(()=>{if(v.isConnected){v.pause();void capture()}},250)).catch(()=>{});",
   "void v.play().then(()=>setTimeout(()=>{if(v.isConnected){v.pause();void capture()}},250)).catch(()=>{if(v.isConnected&&v.readyState>=2)void capture()});"],
  ["      pending=true;v.style.opacity='1';v.pause();\n      try{\n        const image=await drawnPreview(v,v.videoWidth,v.videoHeight);",
   "      pending=true;v.style.opacity='1';v.pause();\n      try{\n        await new Promise(done=>requestAnimationFrame(()=>done()));\n        if(!v.isConnected||!assets.has(id)||previewBlobs.has(id))return;\n        const image=await drawnPreview(v,v.videoWidth,v.videoHeight);"],
  ["    for(const e of ['loadeddata','seeked','canplay','timeupdate'])v.addEventListener(e,()=>void capture());",
   "    for(const e of ['loadeddata','seeked','canplay','timeupdate'])v.addEventListener(e,()=>{if(v.readyState>=2&&v.isConnected&&v.videoWidth&&v.videoHeight){v.pause();v.style.opacity='1';void capture()}});"]
 ];
 for(const [before,after] of anchors){
  if(html.split(before).length!==2)throw Error('F5_EDITOR_VIDEO_COVER_SOURCE_CHANGED');
  html=html.replace(before,()=>after);
 }
 return html;
}

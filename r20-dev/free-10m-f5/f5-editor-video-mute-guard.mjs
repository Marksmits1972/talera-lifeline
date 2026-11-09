// F5 only: preserve the approved recorder and post-narration video soundtrack.
// The existing editor preview video used to be audible while its recorder
// panel was hidden. Never mute the independent /present original sound round.
const originalVisibility='const mute=!!(panel&&!panel.hidden)';
const silentVisibility='const mute=true';
const originalVideoTag='controls playsinline preload="metadata"></video>';
const silentVideoTag='muted controls playsinline preload="metadata"></video>';
export function muteEditorOnlyVideo(html){
 if(typeof html!=='string')throw Error('F5_EDITOR_HTML_MISSING');
 for(const anchor of [originalVisibility,originalVideoTag]){
  if(html.split(anchor).length!==2)throw Error('F5_EDITOR_VIDEO_MUTE_SOURCE_CHANGED');
 }
 return html.replace(originalVisibility,silentVisibility)
  .replace(originalVideoTag,silentVideoTag);
}
export function undoEditorOnlyMute(html){
 return html.replace(silentVisibility,originalVisibility)
  .replace(silentVideoTag,originalVideoTag);
}

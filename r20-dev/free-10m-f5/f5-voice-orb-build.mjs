// The single original editor and the independent storyteller use one visual component.
// The generated guest shells, storage, audio player, and ordinary presentation are unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const orbSource=readFileSync(new URL('./f5-voice-orb.browser.js',import.meta.url),'utf8');
export function installVoiceOrb(html,route){
  if(route!=='/tell'&&route!=='/present')return html;
  function one(before,after,label){
    assert.equal(html.split(before).length,2,'TALERA_VOICE_ORB_SOURCE_DRIFT_'+label);
    html=html.replace(before,()=>after);
  }
  one('</head>','<script>\n'+orbSource+'\n</script></head>','COMPONENT');
  if(route==='/present')return html;
  one('  taleraZeroSession=s;','  taleraZeroSession=s;\n'+
`  let voiceOrb=null;
  const removeVoiceOrb=()=>{voiceOrb?.destroy();voiceOrb=null};
  const ensureVoiceOrb=recording=>{
    if(g.media.length){removeVoiceOrb();return null}
    if(!voiceOrb)try{voiceOrb=taleraMountVoiceOrb(frame,{recording})}
      catch(error){console.warn('TALERA voice visualization unavailable',error)}
    return voiceOrb;
  };
  const previewTick=()=>voiceOrb?.playbackTick(preview,(Number(g.voiceDurationMs)||0)/1000);
  preview.addEventListener('play',()=>{
    if(g.media.length)return;
    const orb=ensureVoiceOrb(false);
    if(orb)void orb.preparePlayback(assets.get(g.voice));
    previewTick();
  });
  for(const event of ['playing','pause','ended','timeupdate','seeking','seeked','loadedmetadata'])
    preview.addEventListener(event,previewTick);
  const onPageHide=event=>{if(!event.persisted)removeVoiceOrb()};
  window.addEventListener('pagehide',onPageHide);
  ensureVoiceOrb(true); // Resting visual only: no microphone or AudioContext.
`,'EDITOR_SESSION');
  one('  const cleanMedia=()=>{','  const cleanMedia=()=>{\n    removeVoiceOrb();','RECORD_CLEANUP');
  one('    preview.pause();panel.remove();document.body.classList.remove(\'talera-v61-inline-recording\');',
      '    preview.pause();window.removeEventListener(\'pagehide\',onPageHide);panel.remove();document.body.classList.remove(\'talera-v61-inline-recording\');','EDITOR_EXIT');
  one('      s.stream=await navigator.mediaDevices.getUserMedia({audio:true});',
      '      ensureVoiceOrb(true)?.prepareMic();\n      s.stream=await navigator.mediaDevices.getUserMedia({audio:true});','MICROPHONE_PREPARE');
  one('      r.start(1000);','      r.start(1000);voiceOrb?.startMic(s.stream,r);','MICROPHONE_EXISTING_STREAM');
  one("}finally{s.saving=false;window.TaleraI18n.setText(start,'core.tell.recordStart3');start.disabled=false}",
      "}finally{s.saving=false;window.TaleraI18n.setText(start,'core.tell.recordStart3');start.disabled=false;ensureVoiceOrb(!g.voice);if(g.voice)previewTick()}",'REST_AFTER_SAVE');
  return html;
}

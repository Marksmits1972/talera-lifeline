/**
 * TALERA V47 — isolated Story Player patch for V46's rendered /tell and /present HTML.
 * Only apply AFTER all historical HTML transformations have completed.
 * Fail closed when a required anchor is missing; never silently ship a partial player.
 * Does not touch the general timeline, RH19 presentation styling or other routes.
 */
export const STORY_PLAYER_V47_BUILD = "v47.2-narration-diagnostics-20261023";

export function patchV47Html(html, pathname) {
  if (typeof html !== "string") throw Error("V47 expects HTML");
  const isTell = pathname === "/tell" || pathname === "/tell/";
  const isPresent = pathname === "/present" || pathname === "/present/";
  if (!isTell && !isPresent) return html;
  const replaced = [];
  function patch(before, after, label, expected = 1) {
    const parts = html.split(before);
    if (parts.length - 1 !== expected)
      throw Error("TALERA V47 anchor " + label + ": " + (parts.length - 1) + " (expected " + expected + ")");
    html = parts.join(after);
    replaced.push(label);
  }
  function patchRegex(expression, replacement, label) {
    if (!expression.test(html)) throw Error("TALERA V47 anchor " + label + " missing");
    html = html.replace(expression, replacement);
    replaced.push(label);
  }

  if (isTell || isPresent) {
    patch(
      "function safeCues(value,count){if(!Array.isArray(value))return [];let r=[];for(const c of value.slice(0,500)){const t=Math.round(Number(c?.t)),index=Math.round(Number(c?.index));if(!Number.isFinite(t)||t<0||t>7200000||!Number.isInteger(index)||index<0||index>=count)continue;if(r.length&&t<r[r.length-1].t)continue;if(r.length&&r[r.length-1].index===index)continue;r.push({t,index})}return r;}",
      "function safeCues(value,items){if(!Array.isArray(value))return [];const ids=Array.isArray(items)?new Set(items.map(x=>String(x.id||x.key))):null;const count=Array.isArray(items)?items.length:Number(items)||0;const out=[];for(const c of value.slice(0,500)){const t=Math.round(Number(c?.t));if(!Number.isFinite(t)||t<0||t>7200000)continue;if(out.length&&t<out[out.length-1].t)continue;let m=null;if(typeof c?.mediaId==='string'&&ids?.has(c.mediaId))m={t,mediaId:c.mediaId};else if(Number.isInteger(c?.index)&&c.index>=0&&c.index<count)m={t,index:c.index};if(!m)continue;const last=out[out.length-1];if(last&&((m.mediaId&&last.mediaId===m.mediaId)||(Number.isInteger(m.index)&&last.index===m.index)))continue;out.push(m)}return out;}",
      "safe-cues"
    );
    patch(
      "files.push({key:id+':'+i,kind:kind,name:safeName(f.name||kind),mime:f.type||'',size:f.size});",
      "var aid=kind==='audio'?String(input.audioMediaId||''):String((Array.isArray(input.mediaIds)?input.mediaIds[i]:null)||'');if(!aid||aid.length>160)aid=crypto.randomUUID?crypto.randomUUID():'media-'+Date.now()+'-'+Math.random().toString(36).slice(2);files.push({key:id+':media:'+aid,id:aid,kind:kind,name:safeName(f.name||kind),mime:f.type||'',size:f.size});",
      "permanent-media-key"
    );
    patch(
      "safeCues(input.narrationCues,mediaUploads.length)",
      "safeCues(input.narrationCues,files.filter(i=>i.kind!=='audio'))",
      "validate-media-cues"
    );
    patch(
      "safeCues(input.narrationCues,(existing.items||[]).filter(i=>i.kind!=='audio').length)",
      "safeCues(input.narrationCues,(existing.items||[]).filter(i=>i.kind!=='audio'))",
      "edit-stable-cues"
    );
  }

  if (isTell) {
    patch(
      "voiceDurationMs:g.voiceDurationMs||0,existing:g.existing||''",
      "voiceDurationMs:g.voiceDurationMs||0,assetIdentity:g.assetIdentity||{},existing:g.existing||''",
      "draft-id-map"
    );
    patch(
      "entries.push([id,file]);if(it.kind==='audio')",
      "g.assetIdentity=g.assetIdentity||{};g.assetIdentity[id]=it.id||it.key;entries.push([id,file]);if(it.kind==='audio')",
      "edit-id-map"
    );
    patch(
      "narrationCues:g.voiceCues||[],narrationDurationMs:g.voiceDurationMs||0",
      "mediaIds:g.media.map(id=>(g.assetIdentity?.[id]||id)),audioMediaId:g.voice?(g.assetIdentity?.[g.voice]||g.voice):'',narrationCues:g.voiceCues||[],narrationDurationMs:g.voiceDurationMs||0",
      "save-id-map"
    );
    patch(
      "g.voiceCues=g.media.length?[{t:0,index:idx}]:[];",
      "g.voiceCues=g.media.length?[{t:0,mediaId:(g.assetIdentity?.[g.media[idx]]||g.media[idx])}]:[];",
      "first-media-marker"
    );
    patch(
      "g.voiceCues.push({t,index:idx})",
      "g.voiceCues.push({t,mediaId:(g.assetIdentity?.[g.media[idx]]||g.media[idx])})",
      "switch-media-marker",
      2
    );
    patch(
      "let i=g.voiceCues[0].index,t=0;",
      "let i=g.voiceCues[0].mediaId?g.media.findIndex(id=>(g.assetIdentity?.[id]||id)===g.voiceCues[0].mediaId):g.voiceCues[0].index,t=0;",
      "listen-first-id"
    );
    patch(
      "i=c.index;t=c.t}else break}",
      "i=c.mediaId?g.media.findIndex(id=>(g.assetIdentity?.[id]||id)===c.mediaId):c.index;t=c.t}else break}",
      "listen-next-id"
    );
  }

  if (isPresent) {
    patch(
      "frames.push({kind:item.kind,key:item.key,url});",
      "frames.push({kind:item.kind,key:item.key,id:item.id||item.key,url});",
      "hydrated-stable-id"
    );
    patchRegex(
      /function playbackAtTime\(\)\{[\s\S]*?\}\s*let voiceTicker=0;/,
      "function playbackAtTime(){const m=voiceMemory,p=activeAudio;if(!m||!p||runtime.currentMemory()?.id!==m.id)return;const frames=m._taleraFrames||[],cues=Array.isArray(m._taleraNarrationCues)?m._taleraNarrationCues:[];if(!frames.length||!cues.length)return;const ms=Math.max(0,(Number(p.currentTime)||0)*1000);let cue=null;for(const c of cues){if(c.t<=ms+10)cue=c;else break}if(!cue)return;const index=typeof cue.mediaId==='string'?frames.findIndex(f=>(f.id||f.key)===cue.mediaId):(Number.isInteger(cue.index)&&cue.index>=0&&cue.index<frames.length?cue.index:-1);if(index<0){window.__taleraV47CueStatus={state:'missing-media',at:Math.round(ms)};return}window.__taleraV47CueStatus={state:'resolved',at:Math.round(ms),index};window.__taleraV31SelectPhoto?.(m.id,index);const v=activeVideo;const frame=frames[index];if(!v||frame?.kind!=='video'||v.dataset.storyFrame!==m.id+'|'+index+'|'+frame.key)return;v.muted=true;v.defaultMuted=true;v.playsInline=true;const target=Math.max(0,(ms-cue.t)/1000);if(p.paused||p.ended){if(!v.paused)v.pause();return}if(Number.isFinite(v.duration)&&v.duration>0&&target>=v.duration){if(!v.paused)v.pause();if(v.currentTime<v.duration-.10)try{v.currentTime=target}catch(e){}return}if(v.readyState>=1&&Math.abs(v.currentTime-target)>.45)try{v.currentTime=target}catch(e){}if(v.paused&&!v.ended)void v.play().catch(()=>{})}let voiceTicker=0;",
      "single-audio-clock"
    );
    patchRegex(
      /const first=voiceMemory\._taleraNarrationCues\?\.\[0\]\?\.index\?\?0;\s*window\.__taleraV31SelectPhoto\?\.\(voiceMemory\.id,first\);/,
      "const cue=voiceMemory._taleraNarrationCues?.[0];const first=cue?.mediaId?voiceMemory._taleraFrames?.findIndex(f=>f.id===cue.mediaId):(Number.isInteger(cue?.index)?cue.index:-1);if(first>=0)window.__taleraV31SelectPhoto?.(voiceMemory.id,first);",
      "replay-first-id"
    );
    patchRegex(
      /memory\._taleraEndedVideoFrame=storyFrameId;\s*removeVideo\(\);\s*window\.__taleraRefreshPhotoIndicator\?\.\(\);/,
      "player.pause();player.style.opacity='1';window.__taleraRefreshPhotoIndicator?.();",
      "retain-last-video-frame"
    );
    patch(
      "  // When a story has a recorded narration, its saved cues are the ONLY",
      "  // V47.1: disable all tap-based photo advancement during narrated playback.\n  // Capture above RH19 handlers. Natural swipes and actual controls are unchanged.\n  (()=>{\n    let down=null;\n    const narrated=()=>{\n      const m=runtime.currentMemory();\n      return m?._taleraLocal&&(m._taleraItems?.some(x=>x.kind==='audio')||m._taleraNarrationCues?.length);\n    };\n    const isPanel=e=>Boolean(e.target?.closest?.('#memoryStoryScroll,#photoStage'));\n    const isControl=e=>Boolean(e.target?.closest?.('button,a,nav,input,select,textarea,label,[role=button]'));\n    window.addEventListener('pointerdown',e=>{if(narrated()&&isPanel(e)&&!isControl(e))down={x:e.clientX,y:e.clientY}},true);\n    window.addEventListener('touchstart',e=>{const t=e.touches?.[0];if(t&&narrated()&&isPanel(e)&&!isControl(e))down={x:t.clientX,y:t.clientY}},true);\n    const trap=e=>{\n      if(!narrated()||!isPanel(e)||isControl(e))return;\n      let x=e.clientX,y=e.clientY;\n      if(e.changedTouches?.length){x=e.changedTouches[0].clientX;y=e.changedTouches[0].clientY}\n      if(e.type!=='click'&&down&&Math.hypot(x-down.x,y-down.y)>13)return;\n      e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();\n    };\n    window.addEventListener('pointerup',trap,true);\n    window.addEventListener('touchend',trap,{capture:true,passive:false});\n    window.addEventListener('click',trap,true);\n  })();\n  // When a story has a recorded narration, its saved cues are the ONLY",
      "full-panel-tap-lock"
    );
    // Legacy recordings without permanent IDs are protected: no inferred carousel.
    // They can still be listened to; a separately approved compatibility pass is required.
  }
  if (isPresent) patch("</body>", "<script id=\"talera-v47-cue-diagnostic\">(function(){\n'use strict';\nvar alert=null,animation=0;\nfunction report(audio){\n var rt=window.__taleraTimelineRuntime,mem=rt&&rt.currentMemory();\n if(!mem||!mem._taleraLocal||!audio||audio.paused||audio.ended)return null;\n var items=mem._taleraItems||[],frames=mem._taleraFrames||[],cues=mem._taleraNarrationCues||[];\n if(!items.some(x=>x.kind==='audio'))return null;\n if(!Array.isArray(cues)||!cues.length)return 'Bij deze opname zijn geen fotomomenten opgeslagen. Je stem is bewaard; de foto’s kunnen zonder die tijdstempels niet automatisch wisselen.';\n var valid=cues.some(x=>(typeof x.mediaId==='string'&&frames.some(f=>f.id===x.mediaId||f.key===x.mediaId))||(Number.isInteger(x.index)&&x.index>=0&&x.index<frames.length));\n if(frames.length&& !valid)return 'De opgeslagen fotomomenten verwijzen niet naar deze foto’s. Je stem is veilig bewaard.';\n return null;\n}\nfunction draw(message){\n if(!message){if(alert)alert.hidden=true;return}\n if(!alert){\n  alert=document.createElement('div');alert.id='talera-v47-cue-warning';alert.setAttribute('role','status');\n  alert.style.cssText='position:fixed;left:14px;right:14px;bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:1000;max-width:470px;margin:0 auto;padding:11px 13px;border-radius:12px;background:rgba(20,43,65,.94);color:#fff;font:500 13px/1.4 system-ui;pointer-events:none;text-align:center';\n  document.body.appendChild(alert);\n }\n alert.textContent=message;alert.hidden=false;\n}\nfunction tick(e){\n var p=e?.target?.matches?.('audio.talera-local-audio')?e.target:document.querySelector('audio.talera-local-audio');\n if(!p)return;\n var mem=window.__taleraTimelineRuntime?.currentMemory();\n if(mem?._taleraLocal){\n  var c=mem._taleraNarrationCues||[],f=mem._taleraFrames||[];\n  window.__taleraStoryPlayerCueDiagnostic={timeSeconds:Number(p.currentTime)||0,audioPlaying:!p.paused,recordedCueCount:c.length,frameCount:f.length,mediaCount:mem._taleraItems?.filter(x=>x.kind==='photo'||x.kind==='video')?.length||0,resolvedCues:c.filter(x=>typeof x.mediaId==='string'?f.some(fr=>(fr.id||fr.key)===x.mediaId):Number.isInteger(x.index)&&x.index>=0&&x.index<f.length).length,activePhotoIndex:mem._photoIndex||0};\n }\n draw(report(p));\n}\n['play','playing','timeupdate','seeked','pause','ended','emptied'].forEach(name=>document.addEventListener(name,tick,true));\ndocument.addEventListener('visibilitychange',()=>{if(document.hidden)draw(null)});\n})();</script> </body>", "read-only-cue-warning");
  patch("</body>", "<script>window.__taleraStoryPlayerV47={version:'v47.2-narration-diagnostics-20261023',source:'V46 modern PWA',scope:'story-player-only'};<\/script></body>", "v47-health-marker");
  return html;
}

/**
 * TALERA V61 inline Vertelmodus staging.
 * Read-only proxy of the existing V61 worker; patch only returned /tell and
 * RH19 presentation HTML on this separate staging origin.
 * No database migration, account change, API key, or live V61 deployment.
 */
const BASE_NAME='talera-pwa-v61-opslag-onder-instellingen-20261101';
const BUILD='v61-inline-vertelmodus-r1-20261103';

function taleraInlineDispose(){
  const s=taleraInline;
  taleraInline=null;
  if(!s)return;
  if(s.timer)clearInterval(s.timer);
  if(s.audio){s.audio.pause();s.audio.removeAttribute('src');s.audio.remove()}
  if(s.video){s.video.pause();s.video.removeAttribute('src');s.video.remove()}
  if(s.panel)s.panel.remove();
  if(s.voiceUrl)URL.revokeObjectURL(s.voiceUrl);
  if(s.videoUrl)URL.revokeObjectURL(s.videoUrl);
}

function taleraInlineSync(s){
  if(!s||s!==taleraInline||runtime.currentMemory()?.id!==s.memory.id)return;
  const audioMs=Math.max(0,Math.round((Number(s.audio.currentTime)||0)*1000));
  let cue=null;
  for(const c of s.cues){if(c.t<=audioMs+15)cue=c;else break}
  if(cue&&Number.isInteger(cue.index)&&cue.index>=0&&cue.index<s.frames.length){
    if(s.memory._photoIndex!==cue.index)window.__taleraV31SelectPhoto?.(s.memory.id,cue.index);
    const selected=s.frames[cue.index];
    if(selected?.kind==='video'){
      void taleraInlineLoadVideo(s,selected,cue,audioMs);
    }else if(s.video){
      s.video.pause();s.video.remove();s.video=null;
      if(s.videoUrl){URL.revokeObjectURL(s.videoUrl);s.videoUrl=null}
      s.videoKey='';
    }
  }
  const secs=Math.floor(audioMs/1000);
  if(s.clock)s.clock.textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
}

async function taleraInlineLoadVideo(s,frame,cue,ms){
  if(!s||s!==taleraInline)return;
  if(s.videoKey!==frame.key){
    if(s.video){s.video.pause();s.video.remove();s.video=null}
    if(s.videoUrl){URL.revokeObjectURL(s.videoUrl);s.videoUrl=null}
    s.videoKey=frame.key;
    const video=document.createElement('video');
    video.className='talera-v61-inline-video';
    video.setAttribute('playsinline','');video.playsInline=true;
    video.muted=true;video.defaultMuted=true;video.controls=false;
    video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:12;pointer-events:none';
    stage.appendChild(video);s.video=video;
    try{
      const url=await store.mediaUrl(frame.key);
      if(s!==taleraInline||s.video!==video||s.videoKey!==frame.key){
        if(url)URL.revokeObjectURL(url);
        video.remove();return;
      }
      if(!url)throw Error('Videobestand ontbreekt');
      s.videoUrl=url;video.src=url;
    }catch(error){
      if(s.video===video){video.remove();s.video=null;s.videoKey=''}
      console.warn('TALERA inline-video niet geladen',error);
      return;
    }
  }
  const video=s.video;if(!video||s!==taleraInline)return;
  const target=Math.max(0,((Number(cue.videoAtMs)||0)+(ms-cue.t))/1000);
  if(video.readyState>=1){
    const limit=Number.isFinite(video.duration)&&video.duration>0?Math.max(0,video.duration-.05):target;
    if(Math.abs(video.currentTime-Math.min(limit,target))>.35){
      try{video.currentTime=Math.min(limit,target)}catch(e){}
    }
  }
  if(s.audio.paused||s.audio.ended){if(!video.paused)video.pause()}
  else if(video.paused)void video.play().catch(()=>{});
}

async function present(memory){
  if(!stage||!memory)return;
  if(activeId===memory.id)return;
  disposePresentation();
  activeId=memory.id;
  const own=++serial;
  const voice=memory._zeroItems.find(x=>x.kind==='audio');
  if(!voice)return;
  let blob;
  try{blob=await store.blob(voice.key)}catch(e){}
  if(activeId!==memory.id||serial!==own||runtime.currentMemory()?.id!==memory.id)return;
  if(!(blob instanceof Blob)||!blob.size){
    console.warn('TALERA: originele stemopname ontbreekt');
    return;
  }
  const audio=document.createElement('audio');
  audio.preload='metadata';audio.playsInline=true;audio.style.display='none';
  stage.appendChild(audio);
  const voiceUrl=URL.createObjectURL(blob);audio.src=voiceUrl;
  const panel=document.createElement('div');
  panel.className='talera-v61-inline-listen';
  panel.style.cssText='position:absolute;right:16px;bottom:76px;z-index:120;display:flex;align-items:center;gap:8px;padding:6px 9px 6px 6px;border:1px solid #d5e2e8;border-radius:26px;background:rgba(248,250,249,.95);box-shadow:0 3px 16px #142f4240;color:#173d52;pointer-events:auto';
  const button=document.createElement('button');
  button.type='button';button.textContent='▶';button.setAttribute('aria-label','Luister');
  button.style.cssText='width:42px;height:42px;border:0;border-radius:50%;background:#173d52;color:white;font:700 17px system-ui;cursor:pointer;touch-action:manipulation';
  const label=document.createElement('span');label.textContent='Luister';label.style.cssText='font:650 13px system-ui';
  const clock=document.createElement('span');clock.textContent='00:00';clock.style.cssText='font:500 12px system-ui;min-width:36px;font-variant-numeric:tabular-nums';
  panel.append(button,label,clock);stage.appendChild(panel);
  const frames=memory._zeroFrames||[];
  const cues=(memory._taleraNarrationCues||[]).filter(c=>Number.isFinite(Number(c.t))&&Number.isInteger(c.index)&&c.index>=0&&c.index<frames.length).map(c=>({t:Math.max(0,Number(c.t)),index:c.index,videoAtMs:Math.max(0,Number(c.videoAtMs)||0)})).sort((a,b)=>a.t-b.t);
  const s={memory,frames,cues,audio,voiceUrl,panel,button,label,clock,timer:null,video:null,videoKey:'',videoUrl:null};
  taleraInline=s;
  const tick=()=>taleraInlineSync(s);
  const stopTimer=()=>{if(s.timer){clearInterval(s.timer);s.timer=null}};
  button.addEventListener('click',async()=>{
    if(s!==taleraInline)return;
    if(audio.paused){try{await audio.play()}catch(e){label.textContent='Tik opnieuw om te luisteren'}}
    else audio.pause();
  });
  audio.addEventListener('play',()=>{
    button.textContent='Ⅱ';button.setAttribute('aria-label','Pauzeer');
    label.textContent='Luisteren';stopTimer();tick();s.timer=setInterval(tick,90);
  });
  audio.addEventListener('pause',()=>{
    button.textContent='▶';button.setAttribute('aria-label','Luister');
    label.textContent='Luister';stopTimer();tick();
  });
  audio.addEventListener('ended',()=>{stopTimer();button.textContent='↺';label.textContent='Opnieuw luisteren';tick()});
  audio.addEventListener('seeking',tick);audio.addEventListener('seeked',tick);
  audio.addEventListener('timeupdate',tick);
  tick();
}

async function showSimpleVideo(memory,frameData){
  if(!stage||!frameData)return;
  const id=memory.id+'|'+frameData.key;
  if(localVideo?.dataset.key===id)return;
  if(localVideo){localVideo.pause();localVideo.remove();localVideo=null}
  const element=document.createElement('video');
  element.className='talera-v61-inline-video';
  element.dataset.key=id;element.setAttribute('playsinline','');
  element.playsInline=true;element.controls=true;element.preload='metadata';
  element.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:12;object-fit:cover;background:#183347';
  stage.appendChild(element);localVideo=element;
  try{
    const url=await store.mediaUrl(frameData.key);
    if(localVideo!==element||runtime.currentMemory()?.id!==memory.id){if(url)URL.revokeObjectURL(url);element.remove();return}
    if(!url)throw Error('Video ontbreekt');
    element.src=url;void element.play().catch(()=>{});
    const owned=loaded.get(memory.id)||[];owned.push(url);loaded.set(memory.id,owned);
  }catch(e){console.warn('TALERA inline-video niet beschikbaar',e)}
}

function taleraV61RecordMark(index,force){
  const s=taleraZeroSession;
  if(!s||!s.recorder||s.recorder.state!=='recording'||!Number.isInteger(index)||index<0)return;
  const now=performance.now();
  const ms=Math.max(0,Math.round(now-s.started-s.paused));
  const last=s.cues[s.cues.length-1];
  if(last?.index===index&&!force)return;
  const cue={t:ms,index};
  const video=document.querySelector('#frame > video');
  if(video&&Number.isFinite(video.currentTime))cue.videoAtMs=Math.max(0,Math.round(video.currentTime*1000));
  s.cues.push(cue);
}

function openZeroPlayer(g){
  if(taleraZeroSession)return;
  const frame=$('frame');
  if(!frame){showError('Het fotovak is niet beschikbaar');return}
  const panel=document.createElement('section');
  panel.id='taleraV61RecControls';
  panel.setAttribute('aria-label','TALERA Vertelmodus');
  panel.innerHTML='<div class="talera-v61-rec-top"><strong>Vertellen bij mijn herinnering</strong><button type="button" id="taleraV61RecClose">Klaar</button></div><p id="taleraV61RecStatus" role="status">Je kunt nu inspreken terwijl je door de foto’s bladert.</p><div class="talera-v61-rec-actions"><button type="button" id="taleraV61RecPrev" aria-label="Vorige foto">‹</button><button type="button" id="taleraV61RecStart">● Opnemen</button><button type="button" id="taleraV61RecPause" hidden>Pauze</button><button type="button" id="taleraV61RecStop" hidden>Stop</button><button type="button" id="taleraV61RecNext" aria-label="Volgende foto">›</button></div><div class="talera-v61-rec-bottom"><span id="taleraV61RecClock">00:00</span><audio id="taleraV61RecPreview" controls hidden></audio></div>';
  document.body.appendChild(panel);
  document.body.classList.add('talera-v61-inline-recording');
  const el=id=>panel.querySelector('#'+id);
  const status=el('taleraV61RecStatus'),start=el('taleraV61RecStart'),pause=el('taleraV61RecPause'),stop=el('taleraV61RecStop'),close=el('taleraV61RecClose');
  const clock=el('taleraV61RecClock'),preview=el('taleraV61RecPreview');
  const s={g,panel,frame,stream:null,recorder:null,parts:[],cues:[],started:0,paused:0,pauseStart:0,saving:false,clockTimer:null,observer:null,skipClickUntil:0};
  taleraZeroSession=s;
  if(g.voice&&assets.get(g.voice)){preview.src=originalUrl(g.voice);preview.hidden=false}
  const elapsed=()=>Math.max(0,performance.now()-s.started-s.paused-(s.pauseStart?performance.now()-s.pauseStart:0));
  const updateClock=()=>{const n=Math.floor(elapsed()/1000);clock.textContent=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
  const videoAdjust=()=>{
    const v=frame.querySelector(':scope > video');if(!v)return;
    v.muted=true;v.defaultMuted=true;v.controls=false;v.playsInline=true;v.setAttribute('playsinline','');
    if(s.recorder?.state==='recording')void v.play().catch(()=>{});
    else if(!v.paused)v.pause();
  };
  s.observer=new MutationObserver(videoAdjust);
  s.observer.observe(frame,{childList:true});
  const onTouchStart=e=>{if(e.touches.length===1)s.touch={x:e.touches[0].clientX,y:e.touches[0].clientY}};
  const onTouchEnd=e=>{
    if(!s.touch)return;
    const dx=e.changedTouches[0].clientX-s.touch.x,dy=e.changedTouches[0].clientY-s.touch.y;
    s.touch=null;if(Math.abs(dx)>30||Math.abs(dy)>30)s.skipClickUntil=Date.now()+600;
  };
  const onClick=e=>{if(Date.now()<s.skipClickUntil||e.target.closest('button,video'))return;if(g.media.length>1)stepPhoto(g,1)};
  frame.addEventListener('touchstart',onTouchStart,{passive:true,capture:true});
  frame.addEventListener('touchend',onTouchEnd,{passive:true,capture:true});
  frame.addEventListener('click',onClick);
  const cleanMedia=()=>{
    if(s.clockTimer){clearInterval(s.clockTimer);s.clockTimer=null}
    if(s.stream){s.stream.getTracks().forEach(t=>t.stop());s.stream=null}
    videoAdjust();
  };
  const finish=()=>{
    if(s.saving||s.recorder&&s.recorder.state!=='inactive'){status.textContent='Stop eerst je opname en wacht tot deze is bewaard.';return}
    cleanMedia();
    s.observer?.disconnect();
    frame.removeEventListener('touchstart',onTouchStart,true);
    frame.removeEventListener('touchend',onTouchEnd,true);
    frame.removeEventListener('click',onClick);
    preview.pause();panel.remove();document.body.classList.remove('talera-v61-inline-recording');
    taleraZeroSession=null;
    if($('draft'))$('draft').textContent=g.voice?'Opname als concept bewaard':'Concept bewaard op dit toestel';
  };
  close.onclick=finish;
  el('taleraV61RecPrev').onclick=()=>{if(g.media.length>1)stepPhoto(g,-1)};
  el('taleraV61RecNext').onclick=()=>{if(g.media.length>1)stepPhoto(g,1)};
  start.onclick=async()=>{
    if(s.recorder||s.saving)return;
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status.textContent='Deze browser ondersteunt opnemen niet.';return}
    start.disabled=true;preview.pause();
    try{
      s.stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));
      const r=new MediaRecorder(s.stream,mime?{mimeType:mime}:undefined);
      s.recorder=r;s.parts=[];s.started=performance.now();s.paused=0;s.pauseStart=0;
      s.cues=g.media.length?[{t:0,index:idx}]:[];
      const v=frame.querySelector(':scope > video');
      if(v&&s.cues.length)s.cues[0].videoAtMs=Math.max(0,Math.round((v.currentTime||0)*1000));
      r.ondataavailable=e=>{if(e.data?.size)s.parts.push(e.data)};
      r.onerror=()=>{status.textContent='Opnemen mislukt. De vorige opname is behouden.';cleanMedia();s.recorder=null;start.disabled=false;start.hidden=false;pause.hidden=true;stop.hidden=true};
      r.onstop=async()=>{
        s.saving=true;status.textContent='Stem veilig bewaren…';
        const duration=Math.max(0,Math.round(elapsed())),type=r.mimeType||mime||'audio/webm';
        const blob=new Blob(s.parts,{type});
        cleanMedia();s.recorder=null;pause.hidden=true;stop.hidden=true;start.hidden=false;start.disabled=false;
        if(!blob.size){status.textContent='Geen opname ontvangen. De vorige opname blijft bestaan.';s.saving=false;return}
        const id=uid(),file=new File([blob],'mijn-stem.'+(type.includes('mp4')?'m4a':'webm'),{type});
        const old={voice:g.voice,cues:g.voiceCues,duration:g.voiceDurationMs,wave:g.voiceWave};
        try{
          await writeFiles([[id,file]]);
          assets.set(id,file);
          g.voice=id;g.voiceCues=s.cues.map(c=>({...c}));g.voiceDurationMs=duration;g.voiceWave=[];
          await saveDraft();
          preview.src=originalUrl(id);preview.hidden=false;status.textContent='Opname bewaard bij deze herinnering.';
          if(old.voice&&old.voice!==id){try{await deleteFiles([old.voice]);revoke(old.voice);assets.delete(old.voice)}catch(e){}}
        }catch(e){
          g.voice=old.voice;g.voiceCues=old.cues;g.voiceDurationMs=old.duration;g.voiceWave=old.wave;
          status.textContent='Bewaren niet gelukt: '+e.message+'. De vorige opname is behouden.';
        }finally{s.saving=false}
      };
      r.start(1000);start.hidden=true;pause.hidden=false;stop.hidden=false;
      status.textContent='Opname loopt. Tik of veeg om van foto te wisselen.';
      videoAdjust();s.clockTimer=setInterval(updateClock,350);
    }catch(e){cleanMedia();s.recorder=null;start.disabled=false;status.textContent='Microfoon niet beschikbaar: '+e.message}
  };
  pause.onclick=()=>{
    const r=s.recorder;if(!r)return;
    if(r.state==='recording'){
      r.pause();s.pauseStart=performance.now();pause.textContent='Hervatten';
      status.textContent='Opname gepauzeerd.';videoAdjust();
    }else if(r.state==='paused'){
      s.paused+=performance.now()-s.pauseStart;s.pauseStart=0;r.resume();
      taleraV61RecordMark(idx,true);pause.textContent='Pauze';
      status.textContent='Opname hervat.';videoAdjust();
    }
  };
  stop.onclick=()=>{if(s.recorder&&s.recorder.state!=='inactive'){stop.disabled=true;s.recorder.stop();status.textContent='Opname afronden…'}};
  videoAdjust();
}

const RECORD_CSS = '\n<style id="talera-v61-inline-record-css">'+
'body.talera-v61-inline-recording{overflow:hidden!important}'+
'body.talera-v61-inline-recording #frame{position:fixed!important;inset:0!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;z-index:2000!important;background:#173550!important;overflow:hidden!important}'+
'body.talera-v61-inline-recording #frame>img,body.talera-v61-inline-recording #frame>video{width:100%!important;height:100%!important;object-fit:contain!important;max-height:none!important;max-width:none!important}'+
'#taleraV61RecControls{position:fixed;z-index:2200;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));background:#f8f7f3;color:#173550;border-radius:20px;border:1px solid #d5e1e3;padding:12px;box-shadow:0 6px 30px #142c4760;font:500 14px/1.4 system-ui}'+
'#taleraV61RecControls .talera-v61-rec-top,#taleraV61RecControls .talera-v61-rec-actions{display:flex;align-items:center;justify-content:space-between;gap:7px}'+
'#taleraV61RecControls .talera-v61-rec-top strong{font:700 14px system-ui}'+
'#taleraV61RecControls .talera-v61-rec-top button{background:transparent;border:1px solid #bfcfd6;border-radius:20px;padding:8px 14px}'+
'#taleraV61RecControls p{margin:8px 0;color:#355668;font-size:12px}'+
'#taleraV61RecControls .talera-v61-rec-actions button{min-height:44px;min-width:44px;padding:8px 10px;border:1px solid #bed1da;border-radius:13px;background:#e5edf0;color:#14384d;font:700 14px system-ui}'+
'#taleraV61RecControls #taleraV61RecStart,#taleraV61RecControls #taleraV61RecStop{flex:1;background:#173d52;color:white}'+
'#taleraV61RecControls .talera-v61-rec-bottom{display:flex;align-items:center;gap:10px;margin-top:8px}'+
'#taleraV61RecControls audio{width:100%;max-width:100%;height:34px}'+
'#taleraV61RecControls [hidden]{display:none!important}</style>\n';

function patchPresent(html){
  const marker='<script id="talera-zero-memory-adapter">';
  const begin=html.indexOf(marker);
  if(begin<0)return {html,changed:false,reason:'no-local-rh19'};
  const end=html.indexOf('</script>',begin);
  if(end<0)return {html,changed:false,reason:'missing-script-end'};
  let block=html.slice(begin,end);
  const p=block.indexOf('async function present(memory){');
  const q=block.indexOf(' async function showSimpleVideo(memory,frameData){',p);
  const v=block.indexOf('function activate(memory){',q);
  if(p<0||q<0||v<0||!block.includes("frame.src='/vertelmodus-embed?mode=present'"))return{html,changed:false,reason:'upstream-changed'};
  const injected=['let taleraInline=null;',taleraInlineDispose.toString(),taleraInlineSync.toString(),taleraInlineLoadVideo.toString(),present.toString()].join('\n');
  block=block.slice(0,p)+injected+'\n '+showSimpleVideo.toString()+'\n '+block.slice(v);
  block=block.replace('function disposePresentation(){','function disposePresentation(){\n taleraInlineDispose();');
  block=block.replace('if(localVideo)locate(localVideo);','if(localVideo&&localVideo.parentElement!==stage)locate(localVideo);');
  if(block.includes("frame.src='/vertelmodus-embed?mode=present'")||!block.includes('taleraInlineSync'))return{html,changed:false,reason:'patch-incomplete'};
  return {html:html.slice(0,begin)+block+html.slice(end),changed:true,reason:'inline-presentation'};
}

function patchTell(html){
  const a=html.indexOf('function openZeroPlayer(g){');
  if(a<0)return{html,changed:false,reason:'no-tell'};
  const b=html.indexOf('\nfunction review(g){',a);
  const needle="if($('pos'))$('pos').textContent=(idx+1)+' / '+g.media.length}";
  if(b<0||!html.includes(needle))return{html,changed:false,reason:'upstream-changed'};
  const updated=html.slice(0,a)+taleraV61RecordMark.toString()+'\n'+openZeroPlayer.toString()+html.slice(b);
  const patched=updated.replace(needle,"if($('pos'))$('pos').textContent=(idx+1)+' / '+g.media.length;taleraV61RecordMark(idx)}");
  if(!patched.includes('taleraV61RecControls'))return{html,changed:false,reason:'patch-incomplete'};
  return{html:patched.replace('</head>',RECORD_CSS+'</head>'),changed:true,reason:'inline-recording'};
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/__v61-vertelmodus/health'){
      return Response.json({ok:true,build:BUILD,base:BASE_NAME,staging:true,noDataMigration:true});
    }
    if(!env?.V61_BASE?.fetch)return new Response('V61 service binding ontbreekt',{status:503});
    const upstream=await env.V61_BASE.fetch(request);
    if(request.method!=='GET'||!upstream.ok||!(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
    const html=await upstream.text();
    const result=html.includes('<script id="talera-zero-memory-adapter">')?patchPresent(html):
      html.includes('function openZeroPlayer(g){')?patchTell(html):{html,changed:false,reason:'not-applicable'};
    const headers=new Headers(upstream.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
    headers.set('cache-control','no-store');
    headers.set('x-talera-v61-vertelmodus',result.reason);
    return new Response(result.html,{status:upstream.status,statusText:upstream.statusText,headers});
  }
};
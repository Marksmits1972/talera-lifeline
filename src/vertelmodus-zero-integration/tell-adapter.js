
/* TALERA PWA <-> approved independent Vertelmodus. This adapter lives inside /tell.
   It does NOT implement voice timing, photo steps, or the recorder. */
let taleraZeroSession=null;
function openZeroPlayer(g){
 if(taleraZeroSession)return;
 const overlay=document.createElement('section');
 overlay.id='taleraZeroOverlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','TALERA Vertelmodus');
 overlay.innerHTML='<div class="talera-zero-head"><strong>Vertelmodus</strong><span id="taleraZeroSaveState"></span><button id="taleraZeroClose" type="button">Klaar</button></div><iframe id="taleraZeroIframe" title="Inspreken bij mijn herinnering" allow="microphone; autoplay"></iframe>';
 document.body.append(overlay);
 const child=overlay.querySelector('iframe');
 const close=overlay.querySelector('#taleraZeroClose');
 const status=overlay.querySelector('#taleraZeroSaveState');
 const session={overlay,child,g,mode:'idle',pending:false,init:false};
 taleraZeroSession=session;
 const origin=location.origin;
 const sendInit=()=>{
   if(session.init)return;session.init=true;
   const items=g.media.map(id=>{
     const file=assets.get(id);
     if(!file)return null;
     return {blob:file,type:kind(file)==='video'?'video':'image',name:file.name||''};
   }).filter(Boolean);
   child.contentWindow.postMessage({
     taleraZero:true,type:'INIT',items,voice:g.voice?assets.get(g.voice):null,
     cues:Array.isArray(g.voiceCues)?g.voiceCues:[],duration:g.voiceDurationMs||0
   },origin);
 };
 const onMessage=async event=>{
   if(event.source!==child.contentWindow||event.origin!==origin||!event.data?.taleraZero)return;
   const data=event.data;
   if(data.type==='READY')sendInit();
   if(data.type==='MODE'){
     session.mode=data.mode;
     close.disabled=Boolean(['recording','paused'].includes(data.mode)||session.pending);
   }
   if(data.type==='SAVE'){
     if(session.pending)return;
     if(!(data.audio instanceof Blob)||!data.audio.size){status.textContent='Geen stemopname';return}
     session.pending=true;close.disabled=true;status.textContent='Opname bewaren…';
     const old={voice:g.voice,cues:g.voiceCues,duration:g.voiceDurationMs};
     const id=uid(),type=data.audio.type||'audio/mp4';
     const file=new File([data.audio],'mijn-stem.'+(type.includes('mp4')?'m4a':'webm'),{type});
     try{
       await writeFiles([[id,file]]);
       assets.set(id,file);
       g.voice=id;
       g.voiceCues=Array.isArray(data.cues)?data.cues.map(c=>({...c})):[];
       g.voiceDurationMs=Math.max(0,Math.round(Number(data.duration)||0));
       await saveDraft();
       status.textContent='Opname bewaard';
       if(old.voice&&old.voice!==id){
         // Only after the new memory manifest was successfully stored.
         try{await deleteFiles([old.voice]);revoke(old.voice);assets.delete(old.voice)}catch(error){console.warn('Oude conceptopname opruimen kan later',error)}
       }
     }catch(error){
       g.voice=old.voice;g.voiceCues=old.cues;g.voiceDurationMs=old.duration;
       status.textContent='Bewaren mislukt: '+error.message;
       console.warn('Nieuwe vertelling is nog alleen in speler aanwezig',error);
     }finally{
       session.pending=false;close.disabled=['recording','paused'].includes(session.mode);
     }
   }
 };
 window.addEventListener('message',onMessage);
 const finish=()=>{
   if(session.pending||['recording','paused'].includes(session.mode)){
     status.textContent='Stop eerst je opname.';return;
   }
   window.removeEventListener('message',onMessage);
   overlay.remove();
   taleraZeroSession=null;
   if($('draft'))$('draft').textContent=g.voice?'Opname als concept bewaard':'Concept bewaard op dit toestel';
 };
 close.addEventListener('click',finish);
 child.src='/vertelmodus-embed?mode=record';
 child.addEventListener('load',()=>setTimeout(sendInit,50),{once:true});
}

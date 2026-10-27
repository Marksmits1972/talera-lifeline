
/* Original video sound round. Lives in the approved player closure, without replacing the voice clock. */
let taleraOriginalQueue=[],taleraOriginalIndex=-1,taleraOriginalActive=false,taleraReplayPointer=null,taleraManualFrame=null;
function taleraReplayDone(){
 taleraOriginalActive=false;
 taleraOriginalQueue=[];
 taleraOriginalIndex=-1;
 mode("ready");
 $("play").hidden=false;
 msg("Herinnering afgelopen");
}
function taleraReplayNext(){
 const item=taleraOriginalQueue[++taleraOriginalIndex];
 if(!item){taleraReplayDone();return}
 dispose();
 const el=document.createElement("video");
 el.src=item.url;el.dataset.index=item.index;
 el.playsInline=true;el.setAttribute("playsinline","");
 el.setAttribute("webkit-playsinline","");
 el.muted=false;el.defaultMuted=false;el.volume=1;
 el.preload="auto";el.controls=false;
 el.style.background="#eef1ed";
 el.addEventListener("ended",taleraReplayNext,{once:true});
 state.media=el;state.index=item.index;
 $("view").insertBefore(el,$("count"));
 $("count").textContent=(taleraOriginalIndex+1)+" / "+taleraOriginalQueue.length+" · Video met geluid";
 $("play").hidden=true;
 msg("Originele video met geluid");
 const resume=()=>{
  const p=el.play();
  if(p&&typeof p.catch==="function")p.catch(()=>{
   let btn=$("taleraSoundUnlock");
   if(!btn){
    btn=document.createElement("button");btn.id="taleraSoundUnlock";btn.type="button";
    btn.textContent="▶ Video met geluid";btn.style.cssText="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10;border:0;border-radius:14px;background:#fff;color:#173e50;padding:13px 18px;font-weight:700";
    $("view").appendChild(btn);
   }
   btn.hidden=false;
   btn.onclick=()=>{btn.hidden=true;el.play().catch(()=>{btn.hidden=false})};
  });
 };
 const oldBtn=$("taleraSoundUnlock");if(oldBtn)oldBtn.hidden=true;
 resume();
}
function taleraStartOriginalRound(){
 if(!document.body.classList.contains("present"))return false;
 taleraOriginalQueue=state.items.map((item,index)=>({...item,index})).filter(x=>x.type==="video");
 if(!taleraOriginalQueue.length)return false;
 taleraOriginalActive=true;taleraOriginalIndex=-1;taleraManualFrame=null;
 mode("ready");
 taleraReplayNext();
 return true;
}
/* Capture presentation gestures inside its iframe: swipe changes story; tap advances medium. */
$("view").addEventListener("pointerdown",e=>{
 if(!document.body.classList.contains("present")||e.target.closest("button"))return;
 taleraReplayPointer={x:e.clientX,y:e.clientY,id:e.pointerId};
},true);
$("view").addEventListener("pointerup",e=>{
 if(!document.body.classList.contains("present")||!taleraReplayPointer||taleraReplayPointer.id!==e.pointerId)return;
 const dx=e.clientX-taleraReplayPointer.x,dy=e.clientY-taleraReplayPointer.y;
 taleraReplayPointer=null;
 if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2){
  e.stopImmediatePropagation();e.preventDefault();
  window.parent.postMessage({taleraZero:true,type:"NEXT_STORY",direction:dx<0?1:-1},location.origin);
 }else if(Math.abs(dx)<18&&Math.abs(dy)<18){
  e.stopImmediatePropagation();e.preventDefault();
  if(taleraOriginalActive)taleraReplayNext();
  else if(state.mode==="playing"&&state.index<state.items.length-1){
   const cue=at(voice.currentTime*1000);
   taleraManualFrame={cueT:cue?cue.t:-1,index:state.index+1};
   show(taleraManualFrame.index);
  }
 }
},true);
$("view").addEventListener("pointercancel",()=>{taleraReplayPointer=null},true);

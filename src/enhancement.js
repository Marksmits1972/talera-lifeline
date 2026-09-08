export const enhancementStyle = String.raw`
/* TALERA / LIFELINE — CONSISTENT PHOTO-FIRST PRESENTATION
   Positive reference: IMG_2661 / IMG_2659.
   Every memory gets the same composition:
   - full photographic colour field behind the whole presentation
   - sharp contained original photo in front
   - timeline blur is made from that SAME photo, never a neutral panel
   - blur dissolves softly into the sharp image with no straight boundary
   - story dissolves softly into the neutral reading surface
   - V16 timeline mechanics remain untouched
*/
:root{
  --talera-deep:#0F2747;
  --talera-soft:#5B8FB9;
  --talera-neutral:#F7F4EF;
  --talera-text:#3E4A59;
}
html,body{margin:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:var(--talera-neutral)!important}
.app{width:100%!important;height:100dvh!important;overflow:hidden!important;display:grid!important;grid-template-rows:minmax(0,1fr) 60px!important;background:var(--talera-neutral)!important}
main{position:relative!important;width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important;display:block!important;background:var(--talera-neutral)!important}
.memory-space{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;border:0!important;border-radius:0!important;overflow:hidden!important;background:var(--talera-neutral)!important;box-shadow:none!important}
.photo-stage{position:absolute!important;inset:0!important;z-index:1!important;overflow:hidden!important;background:var(--talera-neutral)!important}
.photo-layer{position:absolute!important;inset:0!important;opacity:0;transform:translate3d(4%,0,0) scale(1.01);transition:opacity .30s ease,transform .38s cubic-bezier(.22,.72,.25,1)!important;will-change:opacity,transform}
.photo-layer.is-front{opacity:1;transform:translate3d(0,0,0) scale(1)}
/* This backdrop guarantees that portrait/landscape photos always continue
   as colour to every screen edge. It is the same source photo. */
.photo-backdrop{display:block!important;position:absolute!important;inset:-52px!important;width:calc(100% + 104px)!important;height:calc(100% + 104px)!important;object-fit:cover!important;object-position:center center!important;filter:blur(34px) saturate(1.02) brightness(.98)!important;opacity:.88!important;transform:scale(1.12)!important}
/* Keep the actual photograph recognisable instead of hard-cropping it. */
.example-photo{position:absolute!important;z-index:2!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;display:block!important;object-fit:contain!important;object-position:center center!important;filter:none!important;opacity:1!important;background:transparent!important}
.memory-space::before{display:none!important;content:none!important}
.memory-space::after{content:""!important;display:block!important;position:absolute!important;inset:0!important;z-index:3!important;pointer-events:none!important;background:linear-gradient(180deg,rgba(247,244,239,0) 0%,rgba(247,244,239,0) 58%,rgba(247,244,239,.04) 68%,rgba(247,244,239,.16) 77%,rgba(247,244,239,.48) 90%,rgba(247,244,239,.82) 100%)!important}
/* Timeline: never paint a colour/panel. Blur only what is already behind it. */
.timeline{position:absolute!important;z-index:20!important;left:0!important;right:0!important;top:0!important;width:100%!important;height:clamp(190px,24dvh,212px)!important;min-height:190px!important;overflow:visible!important;isolation:isolate!important;background:transparent!important;border:0!important;box-shadow:none!important;touch-action:none!important;user-select:none!important}
.timeline::before{content:""!important;display:block!important;position:absolute!important;left:0!important;right:0!important;top:0!important;height:calc(100% + 74px)!important;z-index:0!important;pointer-events:none!important;backdrop-filter:blur(17px) saturate(1.02)!important;-webkit-backdrop-filter:blur(17px) saturate(1.02)!important;background:transparent!important;-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 42%,rgba(0,0,0,.96) 55%,rgba(0,0,0,.80) 67%,rgba(0,0,0,.52) 78%,rgba(0,0,0,.24) 89%,transparent 100%)!important;mask-image:linear-gradient(to bottom,#000 0%,#000 42%,rgba(0,0,0,.96) 55%,rgba(0,0,0,.80) 67%,rgba(0,0,0,.52) 78%,rgba(0,0,0,.24) 89%,transparent 100%)!important}
.timeline::after{display:none!important;content:none!important}
.timeline canvas{position:relative!important;z-index:2!important;opacity:1!important;filter:none!important}
.center-needle{z-index:3!important}.focus{z-index:4!important}.zoom-hint{z-index:5!important}.debug-panel{z-index:20!important}
.memory-story-scroll{position:absolute!important;inset:0!important;z-index:8!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;scrollbar-width:none!important;touch-action:pan-y pan-x!important}
.memory-story-scroll::-webkit-scrollbar{display:none!important}
.memory-photo-air{height:62%!important;min-height:260px!important;pointer-events:none!important}
.memory-sheet{position:relative!important;min-height:78%!important;padding:58px 22px 96px!important;color:var(--talera-deep)!important;opacity:1!important;transform:translateY(0)!important;background:linear-gradient(180deg,rgba(247,244,239,0) 0px,rgba(247,244,239,.10) 50px,rgba(247,244,239,.34) 105px,rgba(247,244,239,.72) 170px,rgba(247,244,239,.94) 235px,rgb(247,244,239) 292px)!important;text-shadow:none!important;transition:opacity .22s ease,transform .28s ease,background .30s ease!important}
.memory-sheet.story-switching{opacity:.16!important;transform:translateY(7px)!important}
.memory-sheet::before{content:"↑"!important;position:absolute!important;top:24px!important;left:22px!important;font-size:14px!important;color:rgba(15,39,71,.44)!important;text-shadow:none!important}
.memory-sheet .date{color:rgba(15,39,71,.68)!important;font-size:13px!important;line-height:1.2!important;font-weight:720!important;margin:0 0 8px!important;letter-spacing:.01em!important;text-shadow:none!important}
.memory-sheet .story{color:var(--talera-deep)!important;font-size:17px!important;line-height:1.43!important;font-weight:620!important;max-width:35ch!important;white-space:pre-line!important;text-shadow:none!important}
.memory-sheet .story-more{margin-top:18px!important;padding-top:16px!important;border-top:1px solid rgba(15,39,71,.10)!important;color:var(--talera-text)!important;font-size:16px!important;line-height:1.58!important;font-weight:430!important;max-width:39ch!important;white-space:pre-line!important;text-shadow:none!important}
.memory-story-scroll.is-reading .memory-sheet{color:var(--talera-deep)!important;text-shadow:none!important;background:linear-gradient(180deg,rgba(247,244,239,.90) 0px,rgba(247,244,239,.98) 92px,rgb(247,244,239) 145px)!important}
.memory-story-scroll.is-reading .memory-sheet::before,.memory-story-scroll.is-reading .memory-sheet .date,.memory-story-scroll.is-reading .memory-sheet .story{color:var(--talera-deep)!important;text-shadow:none!important}
nav{position:relative!important;z-index:30!important;width:100%!important;height:60px!important;min-height:60px!important;max-height:60px!important;margin:0!important;padding:4px 20px 4px!important;display:grid!important;grid-template-columns:1fr 1fr 1fr!important;align-items:end!important;overflow:hidden!important;background:rgba(247,244,239,.98)!important;border-top:1px solid rgba(15,39,71,.07)!important;box-shadow:none!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important}
nav::before,nav::after{display:none!important;content:none!important}.nav-item{border:0!important;background:transparent!important;color:rgba(62,74,89,.58)!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-end!important;gap:2px!important;min-height:38px!important;padding:0 0 2px!important;font-size:9px!important;box-shadow:none!important;text-shadow:none!important;border-radius:0!important;width:auto!important;height:auto!important}.nav-item.active{color:var(--talera-deep)!important;font-weight:650!important}.nav-item>span:last-child{display:inline!important}.more{width:22px!important;color:currentColor!important;letter-spacing:3px!important;font-size:18px!important;line-height:1!important}.tell{justify-self:center!important;width:50px!important;height:50px!important;border:0!important;border-radius:50%!important;color:var(--talera-white,#FFFEFC)!important;background:var(--talera-deep)!important;box-shadow:0 9px 23px rgba(15,39,71,.17)!important;font-size:11px!important;font-weight:650!important}
`;

export const enhancementScript = String.raw`
(() => {
  const story = document.getElementById('memoryStoryScroll');
  const surface = document.getElementById('surface');
  if (!story || !surface) return;
  let pointerId=null,startX=0,startY=0,lastX=0,mode=null;
  story.addEventListener('pointerdown',(e)=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointerId=e.pointerId;startX=lastX=e.clientX;startY=e.clientY;mode=null},{passive:true});
  story.addEventListener('pointermove',(e)=>{if(e.pointerId!==pointerId)return;const dxTotal=e.clientX-startX;const dyTotal=e.clientY-startY;if(!mode&&(Math.abs(dxTotal)>9||Math.abs(dyTotal)>9)){mode=Math.abs(dxTotal)>Math.abs(dyTotal)*1.18?'horizontal':'vertical'}if(mode!=='horizontal')return;e.preventDefault();const dx=e.clientX-lastX;lastX=e.clientX;surface.dispatchEvent(new WheelEvent('wheel',{deltaX:-dx,deltaY:0,bubbles:true,cancelable:true}))},{passive:false});
  const end=(e)=>{if(e.pointerId!==pointerId)return;pointerId=null;mode=null};story.addEventListener('pointerup',end,{passive:true});story.addEventListener('pointercancel',end,{passive:true});
})();
`;

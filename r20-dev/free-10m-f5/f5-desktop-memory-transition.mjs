// Visual enhancement only: do not intercept the original Home hero click,
// change navigation, change memory identity, or participate on mobile.
import assert from 'node:assert/strict';
import {DESKTOP_HOME_MEDIA} from './f5-desktop-home-layout.mjs';

export function desktopMemoryDirection(fromHref,toHref){
 try{
  const from=new URL(fromHref),to=new URL(toHref);
  if(from.origin!==to.origin)return null;
  const home=u=>(u.pathname==='/'||u.pathname==='/mijn-leven')&&!u.search;
  const memory=u=>u.pathname==='/present'&&!!u.searchParams.get('memory')&&
   [...u.searchParams.keys()].every(k=>k==='memory')&&u.searchParams.getAll('memory').length===1;
  if(home(from)&&memory(to))return 'forward';
  if(memory(from)&&home(to))return 'back';
 }catch(_){}
 return null;
}

// Run in the existing page's head before pagereveal; no persistent state.
export function installDesktopMemoryTransitionEvents(win,doc,route,media,chooseDirection){
 const readyHome=()=>{const image=doc.getElementById('heroImage');return !!(image?.complete&&image.naturalWidth&&image.getAttribute('src'))};
 function matchHero(to){
  const href=doc.getElementById('heroCaption')?.dataset.presentHref;
  if(!href)return false;
  try{return new URL(href,win.location.href).href===new URL(to).href}catch(_){return false}
 }
 function run(event,activation,outgoing){
  const transition=event.viewTransition;if(!transition)return;
  // WebKit rejects ready when an intentionally skipped cross-document
  // transition never becomes ready. Handle that expected native abort;
  // leave other exceptions visible to the normal browser error handler.
  const handleAbort=error=>{if(error?.name!=='AbortError')throw error};
  transition.ready?.catch(handleAbort);
  const skip=()=>{
   transition.finished?.catch(handleAbort);
   transition.updateCallbackDone?.catch(handleAbort);
   transition.skipTransition();
  };
  const from=activation?.from?.url,to=activation?.entry?.url;
  const direction=chooseDirection(from,to);
  if(!win.matchMedia(media+' and (prefers-reduced-motion: no-preference)').matches||!direction){
   skip();return;
  }
  const expectHome=direction==='forward'?outgoing:!outgoing;
  if(expectHome!==(route==='/mijn-leven')){skip();return}
  const element=expectHome?doc.querySelector('.hero'):doc.getElementById('photoStage');
  // Never animate a blank Home hero or a click directed to a different memory.
  if(!element||(expectHome&&(!readyHome()||(outgoing&&!matchHero(to))))){
   skip();return;
  }
  const name='view-transition-name',prev=element.style.getPropertyValue(name),priority=element.style.getPropertyPriority(name);
  element.style.setProperty(name,'talera-desktop-memory');
  const cleanup=()=>{
   if(element.style.getPropertyValue(name)!=='talera-desktop-memory')return;
   if(prev)element.style.setProperty(name,prev,priority);else element.style.removeProperty(name);
  };
  transition.finished.then(cleanup,cleanup);
 }
 win.addEventListener('pageswap',e=>run(e,e.activation,true));
 win.addEventListener('pagereveal',e=>run(e,win.navigation?.activation,false));
}

export const desktopMemoryTransitionStyle=`<style id="talera-f5-desktop-memory-transition-style">
@media ${DESKTOP_HOME_MEDIA} and (prefers-reduced-motion: no-preference) {
  @view-transition { navigation: auto; }
  ::view-transition-group(talera-desktop-memory) {
    animation-duration: 420ms;
    animation-timing-function: cubic-bezier(.22,.65,.27,1);
  }
  ::view-transition-old(talera-desktop-memory) {
    animation: 420ms ease both talera-desktop-out;
  }
  ::view-transition-new(talera-desktop-memory) {
    animation: 420ms ease both talera-desktop-in;
  }
  ::view-transition-group(root) { animation-duration: 420ms; }
  @keyframes talera-desktop-out { 0%,55%{opacity:1}100%{opacity:0} }
  @keyframes talera-desktop-in { 0%,55%{opacity:0}100%{opacity:1} }
}
</style>`;

export function installDesktopMemoryTransition(html,route){
 if(route!=='/mijn-leven'&&route!=='/present')return html;
 assert.equal(html.split('</head>').length,2,'DESKTOP_TRANSITION_HEAD_DRIFT');
 assert.ok(!html.includes('id="talera-f5-desktop-memory-transition-style"'),'DESKTOP_TRANSITION_DUPLICATE');
 const marker=route==='/mijn-leven'?'id="heroImage"':'id="photoStage"';
 assert.ok(html.includes(marker),'DESKTOP_TRANSITION_SOURCE_DRIFT');
 const source='('+installDesktopMemoryTransitionEvents.toString()+')(window,document,'+
  JSON.stringify(route)+','+JSON.stringify(DESKTOP_HOME_MEDIA)+','+desktopMemoryDirection.toString()+');';
 assert.ok(!source.includes('</script>'));
 const script='<script id="talera-f5-desktop-memory-transition">'+source+'</script>';
 return html.replace('</head>',()=>desktopMemoryTransitionStyle+script+'</head>');
}

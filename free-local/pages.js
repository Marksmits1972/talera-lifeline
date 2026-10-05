import referenceWorker from '../src/reference-r19h2-carousel-combined-worker.js';
import {experienceCSS,quietCSS,guidedCSS} from './app-assets.js';
import {catalog,applyCatalog} from './texts.js';
import {freeTellGestures,freeTimelineGestures} from './gestures.js';
import {createPresentationControllerScript} from '../src/presentation-controller.js';
import {createTimelineVisualStateScript} from '../src/timeline-visual-state.js';

const CSP="default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; style-src 'unsafe-inline'; img-src 'self' blob: data:; media-src blob:; connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.hf.co https://cdn-lfs-eu-1.hf.co https://cas-bridge.xethub.hf.co https://us.aws.cdn.hf.co; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; worker-src 'self'";
export const htmlHeaders={'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':CSP,'referrer-policy':'no-referrer','x-talera-free-revision':'free-photo-prefetch-v26'};
let pages;
function boot(html) {
  html=html.replace('</head>',`<style>${experienceCSS}${quietCSS}${guidedCSS}</style></head>`);
  html=html.replace(/<script(\s[^>]*)?>/g,'<script type="text/talera"$1>');
  html=html.replace('</head>','<link rel="apple-touch-icon" href="/icon-192.png"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#0F2747"><meta name="apple-mobile-web-app-capable" content="yes"></head>');
  return html.replace('</body>',`<script>window.__taleraTexts=${JSON.stringify(catalog).replace(/</g,'\\u003c')};window.__taleraT=k=>window.__taleraTexts[k]||k;</script><script type="module" src="/local/bridge.js?revision=photo-prefetch-v26"></script></body>`);
}
export async function makePages() {
  if(pages)return pages;
  let tell=await (await referenceWorker.fetch(new Request('https://local.invalid/tell'),{},{})).text();
  // Replace the frozen UI's transport at its compatibility boundary. Never patch global fetch.
  tell=tell.replace(/\bfetch\(/g,'window.__taleraFreeApi(');
  tell=tell.replace('const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition||null;','const SpeechRecognition=null;');
  tell=tell.replace(/  async function startStopRecording\(btn\)\{[^\n]*\}/,'  async function startStopRecording(btn){window.__taleraFreeRecord?.();}');
  tell=tell.replace('  measure();\n  setSheet(sheet.classList.contains', '  window.__taleraFreeOpenText=()=>{setSheet(true,true);storyText?.focus();};\n  if(preview)preview.addEventListener("click",window.__taleraFreeOpenText);\n  measure();\n  setSheet(sheet.classList.contains');
  tell=tell.replace("if(closeButton)closeButton.addEventListener('click',()=>setSheet(false,true));","if(closeButton)closeButton.addEventListener('click',()=>{storyText?.dispatchEvent(new Event('change',{bubbles:true}));setSheet(false,true);});");
  tell=tell.replace('photoCache.set(item.id,item.url);',"const savedBlob=await (await api('/api/storylab-clean/photo?id='+encodeURIComponent(item.id))).blob();const compactUrl=URL.createObjectURL(savedBlob);photoCache.set(item.id,compactUrl);URL.revokeObjectURL(item.url);const oldPreview=previewPhotoUrls.get(item.id);if(oldPreview)URL.revokeObjectURL(oldPreview);previewPhotoUrls.set(item.id,compactUrl);");
  tell=tell.replace('location.href=data.handoffUrl;',"localStorage.removeItem('talera.free.draft');location.href=data.handoffUrl;");

  tell=tell.replaceAll('!state.photos.length||!state.date','!state.date');
  tell=tell.replace('accept="image/*,.heic,.heif"','accept="image/*,video/*"');
  tell=tell.replace('Daarna kun je gewoon naar de foto kijken en je verhaal vertellen.',catalog.pickerHelp);
  tell=tell.replace("if(!r.ok)throw new Error('upload '+r.status);","if(!r.ok){const failure=await r.json();throw new Error(failure.error||window.__taleraT('savePhotoError'));}");
  tell=tell.replace('failed++;','failed++;showNotice(e.message||window.__taleraT("savePhotoError"));');
  tell=tell.replace("if(failed)showNotice(failed===list.length?'Upload niet gelukt · probeer opnieuw':'Niet alle foto’s konden worden bewaard');",'');
  tell=tell.replace(/  async function addFiles\(files\)\{[\s\S]*?\n  async function removePhotoById/, '  async function addFiles(files){mediaUploading++;try{await window.__taleraFreeAddPhotos(files);}finally{mediaUploading=Math.max(0,mediaUploading-1);photoInput.value="";signalMedia();}}\n  async function removePhotoById');
  tell=tell.replace("photoInput.value='';await addFiles(chosen)","await addFiles(chosen)");
  tell=tell.replace('    setIndex:(index)=>', '    setState:async(next)=>{Object.assign(state,next);title.value=state.title||"";dateInput.value=state.date||"";dateText.textContent=formatDate(state.date);storyText.value=state.storyText||"";await renderPhoto();signalMedia();},\n    setIndex:(index)=>');
  tell=tell.replace('state.currentIndex=((Number(index)||0)%state.photos.length+state.photos.length)%state.photos.length', 'state.currentIndex=((Number(index)||0)%state.photos.length+state.photos.length)%state.photos.length;window.__taleraFreeSelectPhoto?.(state.currentIndex)');
  tell=tell.replaceAll('Tik om te vertellen','Tik om je tekst te schrijven').replaceAll('Tik en vertel','Tik en schrijf');
  tell=tell.replaceAll('Vertel verder','Schrijf verder').replaceAll('Kijk naar je foto en vertel wat er gebeurde','Kijk naar je foto en schrijf wat er gebeurde');
  tell=tell.replaceAll('Publiceer op tijdlijn','Op mijn tijdlijn').replaceAll('Plaats op tijdlijn','Op mijn tijdlijn');
  tell=tell.replaceAll('Upload niet gelukt · probeer opnieuw','Foto lokaal bewaren lukte niet · probeer opnieuw');
  tell=tell.replaceAll('Publiceren…','Lokaal bewaren…');
  tell=tell.replace('</head>','<style>.photo-voice-sub{max-width:300px}.screen.has-photo .talera-publish-timeline{display:flex}</style></head>');
  // Every fixed string changed for this proof goes through the central NL catalog.
  tell=tell.replace('<div class="more-list">',`<div class="more-list"><button id="freeDeviceOpen" class="more-item" type="button">${catalog.deviceTitle}</button><button id="freeDelete" class="more-item" type="button">${catalog.deleteMemory}</button><button id="backupTellOpen" class="more-item" type="button"><span>${catalog.backupTitle}</span><span>›</span></button>`);
  tell=tell.replace('<input id="editDate" type="date" />', `<select id="freeTimeKind" aria-label="Datum of tijdvak"><option value="day">Exacte datum</option><option value="season">Seizoen en jaartal</option></select><input id="editDate" type="date" /><div id="freeSeasonFields" hidden><select id="freeSeason" aria-label="Seizoen"><option value="voorjaar">Voorjaar</option><option value="zomer">Zomer</option><option value="herfst">Herfst</option><option value="winter">Winter</option></select><input id="freeSeasonYear" type="number" min="1" max="9999" placeholder="Jaartal" aria-label="Jaartal" /></div>`);
  tell=tell.replace("if(!v)return 'Wanneer was dit?';", "if(state.eventTime?.kind==='season')return state.eventTime.season+' '+state.eventTime.year;if(!v)return 'Wanneer was dit?';");
  tell=tell.replace("await api('/api/storylab-clean/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(state)}).catch(()=>{})", "const result=await api('/api/storylab-clean/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(state)});if(!result.ok)showNotice((await result.json()).error||window.__taleraT('storageUnavailable'))");
  tell=tell.replace("if(!v)return 'Wanneer was dit?';","if(!v)return state.datePrecision==='unknown'?window.__taleraT('unknownDate'):'Wanneer was dit?';");
  tell=applyCatalog(freeTellGestures(tell));

  let timeline=await (await referenceWorker.fetch(new Request('https://local.invalid/'),{},{})).text();
  // Explicit controller variants retain the proven swipe motor while omitting
  // legacy fitting and feedback that Free already owns.
  const controllerVariants={
    'talera-presentation-controller':createPresentationControllerScript({nativePhotoLayout:true,timelineFeedback:false}),
    'talera-timeline-visual-state-controller':createTimelineVisualStateScript({carouselWatchdog:false}),
  };
  for(const [id,script] of Object.entries(controllerVariants)){
    const pattern=new RegExp(`<script id="${id}">[\\s\\S]*?</script>`,'g');
    const matches=timeline.match(pattern);
    if(matches?.length!==1)throw new Error(`Expected one controller: ${id}`);
    timeline=timeline.replace(pattern,()=>`<script id="${id}">${script}</script>`);
  }
  // Keep the reference canvas, gestures and photo/text surfaces; remove remote service controllers.
  const removed=['talera-live-memory-integration-controller','talera-memory-presentation-controls-controller','talera-share-experience-controller','talera-timeline-photo-handoff-polish-script'];
  for(const id of removed)timeline=timeline.replace(new RegExp(`<script id="${id}">[\\s\\S]*?</script>`,'g'),'');
  timeline=timeline.replace('function formatMemoryDate(memory) {','function formatMemoryDate(memory) {if(memory.timeLabel)return memory.timeLabel;');
  timeline=timeline.replace('focusText.textContent=new Date(centerMs).toLocaleDateString', "focusText.textContent=nearestMemory(centerMs)?.datePrecision==='season'?nearestMemory(centerMs).timeLabel:new Date(centerMs).toLocaleDateString");
  timeline=timeline.replace(/const MEMORIES = \[[\s\S]*?\]\.map\(m => [^\n]+;/,'const MEMORIES = window.__taleraFreeMemories;');
  timeline=timeline.replace("const response=await fetch(src,{mode:'cors',cache:'force-cache'});", "const response=await window.__taleraFreePhotoResponse(src);");
  timeline=timeline.replace('const LIFE_START = new Date(1976,8,6).getTime();','const LIFE_START = Math.min(new Date(1976,8,6).getTime(),...MEMORIES_PLACEHOLDER);');
  // Bounds must include all selected dates. Declare memories before using them.
  timeline=timeline.replace('const LIFE_START = Math.min(new Date(1976,8,6).getTime(),...MEMORIES_PLACEHOLDER);','const LIFE_START = Math.min(new Date(1976,8,6).getTime(),...window.__taleraFreeMemories.map(m=>new Date(m.at).getTime()));');
  timeline=timeline.replace('const LIFE_END = new Date(2026,8,6).getTime();','const LIFE_END = Math.max(Date.now(),...window.__taleraFreeMemories.map(m=>new Date(m.at).getTime()));');
  timeline=timeline.replace(/https:\/\/images\.unsplash\.com\/[^"'<>\s]+/g,'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
  timeline=timeline.replace('<html lang="nl">','<html lang="nl" class="free-loading free-presentation">');
  timeline=timeline.replace('</head>',`<style>.free-loading .app{visibility:hidden}#freeEmpty{position:fixed;left:20px;right:20px;top:32%;z-index:30;display:grid;place-content:center;text-align:center;padding:20px;background:#F7F4EF;color:#0F2747;font-family:system-ui}#freeEmpty[hidden]{display:none}#freeEmpty a{color:#0F2747;padding:14px;font-weight:700}#freeEmpty p{max-width:330px;line-height:1.5}#freeEdit{position:fixed;right:18px;top:calc(260px + env(safe-area-inset-top));z-index:30;border:1px solid #fff;border-radius:50%;width:40px;height:40px;background:#F7F4EF;color:#0F2747}#freeError:empty{display:none}#freeError{padding:16px;position:fixed;top:15px;left:15px;right:15px;z-index:100;color:#0F2747;background:#F7F4EF}</style></head>`);
  timeline=timeline.replace('</body>',`<section id="freeEmpty" hidden><h1>TALERA</h1><p>${catalog.localNotice}</p><a href="/tell?new=1">${catalog.firstMemory}</a></section><button id="freeEdit" hidden aria-label="${catalog.editMemory}">✎</button><div id="freeError" role="alert"></div></body>`);
  timeline=timeline.replace('</body>',`<dialog id="freeStorageInfo" aria-labelledby="freeStorageTitle"><h2 id="freeStorageTitle">Beheer en instellingen</h2><p>Je gebruikt TALERA Free. Je verhalen staan op dit toestel. Hier beheer je de opslag, installatie en reservekopieën.</p><button id="freeDeviceOpen" type="button">${catalog.deviceTitle}</button><button id="backupTimelineOpen" type="button">${catalog.backupTitle}</button><button id="freeStorageClose" type="button">${catalog.storageClose}</button></dialog><style>#freeStorageInfo{box-sizing:border-box;width:calc(100% - 32px);max-width:440px;max-height:80dvh;overflow:auto;border:0;border-radius:20px;padding:24px;background:#F7F4EF;color:#0F2747;font:15px/1.5 system-ui}#freeStorageInfo::backdrop{background:rgba(0,0,0,.5)}#freeStorageInfo h2{font-size:21px}#backupTimelineOpen{width:100%;padding:12px;border:0;border-radius:12px;background:#173851;color:white;font:inherit;margin-bottom:10px}#freeStorageClose{width:100%;padding:12px;border:0;border-radius:12px;background:#0F2747;color:white;font:inherit}</style></body>`);
  // No reference narrative should flash before the local store has been read.
  timeline=timeline.replace(/(<div class="story" id="memoryStory">)[\s\S]*?(<\/div>)/,'$1$2');
  timeline=timeline.replace("  centerMs(){return centerMs},","  centerMs(){return centerMs},visibleBounds(){return bounds()},");
  timeline=applyCatalog(freeTimelineGestures(timeline));
  pages={tell:boot(tell),timeline:boot(timeline)};
  return pages;
}

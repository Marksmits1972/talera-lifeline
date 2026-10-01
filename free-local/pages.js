import referenceWorker from '../src/reference-r19h2-carousel-combined-worker.js';
import {catalog,applyCatalog} from './texts.js';

const CSP="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' blob: data:; media-src blob:; connect-src 'none'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; worker-src 'none'";
export const htmlHeaders={'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':CSP,'referrer-policy':'no-referrer','x-talera-free-revision':'free-local-photo-route-v1'};
let pages;
function boot(html) {
  html=html.replace(/<script(\s[^>]*)?>/g,'<script type="text/talera"$1>');
  return html.replace('</body>',`<script>window.__taleraTexts=${JSON.stringify(catalog).replace(/</g,'\\u003c')};window.__taleraT=k=>window.__taleraTexts[k]||k;</script><script type="module" src="/local/bridge.js"></script></body>`);
}
export async function makePages() {
  if(pages)return pages;
  let tell=await (await referenceWorker.fetch(new Request('https://local.invalid/tell'),{},{})).text();
  // Replace the frozen UI's transport at its compatibility boundary. Never patch global fetch.
  tell=tell.replace(/\bfetch\(/g,'window.__taleraFreeApi(');
  tell=tell.replace('const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition||null;','const SpeechRecognition=null;');
  tell=tell.replace(/  async function startStopRecording\(btn\)\{[^\n]*\}/,'  async function startStopRecording(btn){window.__taleraFreeOpenText?.();showNotice(window.__taleraT("audioLater"));}');
  tell=tell.replace('  measure();\n  setSheet(sheet.classList.contains', '  window.__taleraFreeOpenText=()=>{setSheet(true,true);storyText?.focus();};\n  if(preview)preview.addEventListener("click",window.__taleraFreeOpenText);\n  measure();\n  setSheet(sheet.classList.contains');
  tell=tell.replace("if(closeButton)closeButton.addEventListener('click',()=>setSheet(false,true));","if(closeButton)closeButton.addEventListener('click',()=>{storyText?.dispatchEvent(new Event('change',{bubbles:true}));setSheet(false,true);});");
  tell=tell.replace('Math.max(0,12-(state.photos||[]).length)','Math.max(0,1-(state.photos||[]).length)');
  tell=tell.replace('photoCache.set(item.id,item.url);',"const savedBlob=await (await api('/api/storylab-clean/photo?id='+encodeURIComponent(item.id))).blob();const compactUrl=URL.createObjectURL(savedBlob);photoCache.set(item.id,compactUrl);URL.revokeObjectURL(item.url);const oldPreview=previewPhotoUrls.get(item.id);if(oldPreview)URL.revokeObjectURL(oldPreview);previewPhotoUrls.set(item.id,compactUrl);");
  tell=tell.replace('location.href=data.handoffUrl;',"localStorage.removeItem('talera.free.draft');location.href=data.handoffUrl;");
  tell=tell.replace(/\bmultiple\b/g,'');
  tell=tell.replace('accept="image/*,.heic,.heif"','accept="image/*"');
  tell=tell.replace('Daarna kun je gewoon naar de foto kijken en je verhaal vertellen.',catalog.pickerHelp);
  tell=tell.replace("if(!r.ok)throw new Error('upload '+r.status);","if(!r.ok){const failure=await r.json();throw new Error(failure.error||window.__taleraT('savePhotoError'));}");
  tell=tell.replace('failed++;','failed++;showNotice(e.message||window.__taleraT("savePhotoError"));');
  tell=tell.replace("if(failed)showNotice(failed===list.length?'Upload niet gelukt · probeer opnieuw':'Niet alle foto’s konden worden bewaard');",'');
  tell=tell.replace('Maximaal 12 foto’s','Deze eerste proef bewaart één foto per herinnering');
  tell=tell.replaceAll('Tik om te vertellen','Tik om je tekst te schrijven').replaceAll('Tik en vertel','Tik en schrijf');
  tell=tell.replaceAll('Vertel verder','Schrijf verder').replaceAll('Kijk naar je foto en vertel wat er gebeurde','Kijk naar je foto en schrijf wat er gebeurde');
  tell=tell.replaceAll('Publiceer op tijdlijn','Op mijn tijdlijn').replaceAll('Plaats op tijdlijn','Op mijn tijdlijn');
  tell=tell.replaceAll('Upload niet gelukt · probeer opnieuw','Foto lokaal bewaren lukte niet · probeer opnieuw');
  tell=tell.replaceAll('Publiceren…','Lokaal bewaren…');
  tell=tell.replace('</head>','<style>.photo-voice-sub{max-width:300px}.screen.has-photo .talera-publish-timeline{display:flex}</style></head>');
  // Every fixed string changed for this proof goes through the central NL catalog.
  tell=applyCatalog(tell);

  let timeline=await (await referenceWorker.fetch(new Request('https://local.invalid/'),{},{})).text();
  // Keep the reference canvas, gestures and photo/text surfaces; remove remote service controllers.
  const removed=['talera-live-memory-integration-controller','talera-memory-presentation-controls-controller','talera-share-experience-controller','talera-timeline-photo-handoff-polish-script'];
  for(const id of removed)timeline=timeline.replace(new RegExp(`<script id="${id}">[\\s\\S]*?</script>`,'g'),'');
  timeline=timeline.replace(/const MEMORIES = \[[\s\S]*?\]\.map\(m => [^\n]+;/,'const MEMORIES = window.__taleraFreeMemories;');
  timeline=timeline.replace("const response=await fetch(src,{mode:'cors',cache:'force-cache'});", "const response=await window.__taleraFreePhotoResponse(src);");
  timeline=timeline.replace('const LIFE_START = new Date(1976,8,6).getTime();','const LIFE_START = Math.min(new Date(1976,8,6).getTime(),...MEMORIES_PLACEHOLDER);');
  // Bounds must include all selected dates. Declare memories before using them.
  timeline=timeline.replace('const LIFE_START = Math.min(new Date(1976,8,6).getTime(),...MEMORIES_PLACEHOLDER);','const LIFE_START = Math.min(new Date(1976,8,6).getTime(),...window.__taleraFreeMemories.map(m=>new Date(m.at).getTime()));');
  timeline=timeline.replace('const LIFE_END = new Date(2026,8,6).getTime();','const LIFE_END = Math.max(Date.now(),...window.__taleraFreeMemories.map(m=>new Date(m.at).getTime()));');
  timeline=timeline.replace(/https:\/\/images\.unsplash\.com\/[^"'<>\s]+/g,'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
  timeline=timeline.replace('<html lang="nl">','<html lang="nl" class="free-loading">');
  timeline=timeline.replace('</head>',`<style>.free-loading .app{visibility:hidden}#freeEmpty{position:fixed;left:20px;right:20px;top:32%;z-index:30;display:grid;place-content:center;text-align:center;padding:20px;background:#F7F4EF;color:#0F2747;font-family:system-ui}#freeEmpty[hidden]{display:none}#freeEmpty a{color:#0F2747;padding:14px;font-weight:700}#freeEmpty p{max-width:330px;line-height:1.5}#freeEdit{position:fixed;right:18px;top:calc(260px + env(safe-area-inset-top));z-index:30;border:1px solid #fff;border-radius:50%;width:40px;height:40px;background:#F7F4EF;color:#0F2747}#freeError:empty{display:none}#freeError{padding:16px;position:fixed;top:15px;left:15px;right:15px;z-index:100;color:#0F2747;background:#F7F4EF}</style></head>`);
  timeline=timeline.replace('</body>',`<section id="freeEmpty" hidden><h1>TALERA</h1><p>${catalog.localNotice}</p><a href="/tell?new=1">${catalog.firstMemory}</a></section><button id="freeEdit" hidden aria-label="${catalog.editMemory}">✎</button><div id="freeError" role="alert"></div></body>`);
  timeline=timeline.replace('</body>',`<dialog id="freeStorageInfo" aria-labelledby="freeStorageTitle"><h2 id="freeStorageTitle">${catalog.storageTitle}</h2><p>${catalog.pickerHelp}</p><p>${catalog.storageSteps}</p><p>${catalog.storageNext}</p><p>${catalog.storageWarning}</p><button id="freeStorageClose" type="button">${catalog.storageClose}</button></dialog><style>#freeStorageInfo{box-sizing:border-box;width:calc(100% - 32px);max-width:440px;max-height:80dvh;overflow:auto;border:0;border-radius:20px;padding:24px;background:#F7F4EF;color:#0F2747;font:15px/1.5 system-ui}#freeStorageInfo::backdrop{background:rgba(0,0,0,.5)}#freeStorageInfo h2{font-size:21px}#freeStorageClose{width:100%;padding:12px;border:0;border-radius:12px;background:#0F2747;color:white;font:inherit}</style></body>`);
  // No reference narrative should flash before the local store has been read.
  timeline=timeline.replace(/(<div class="story" id="memoryStory">)[\s\S]*?(<\/div>)/,'$1$2');
  timeline=applyCatalog(timeline);
  pages={tell:boot(tell),timeline:boot(timeline)};
  return pages;
}

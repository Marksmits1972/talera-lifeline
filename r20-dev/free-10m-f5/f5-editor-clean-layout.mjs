import assert from 'node:assert/strict';
import {DESKTOP_HOME_MEDIA} from './f5-desktop-home-layout.mjs';

// Approved TALERA editor redesign. Restrict all source edits to the original
// tag widget and the existing toolbar; no new routes, stores, or save path.
export function simplifyTellMemoryEditor(html){
 const a=html.indexOf('function setupV20Tags(g,details){'),b=html.indexOf('}function setupV10(',a);
 assert.ok(a>=0&&b>a,'EDITOR_CLEAN_TAG_OWNER_DRIFT');
 let tags=html.slice(a,b+1);
 const replace=(source,from,to,label)=>{
  assert.equal(source.split(from).length,2,'EDITOR_CLEAN_SOURCE_DRIFT_'+label);
  return source.replace(from,()=>to);
 };
 const tag=(from,to,label)=>{tags=replace(tags,from,to,label)};
 // Settings alone owns the catalog. Existing favorite and attached tags
 // remain selectable; attached non-favorites must never silently disappear.
 tag('<div class="talera-tags-confirm"><button type="button" class="talera-tag-apply"></button><button type="button" class="talera-tag-cancel"></button></div>','','CONFIRM_MARKUP');
 tag(",apply=box.querySelector('.talera-tag-apply'),cancel=box.querySelector('.talera-tag-cancel')",'','CONFIRM_REFERENCES');
 tag('let pending=new Set(),openFavorites=[];','let openFavorites=[];','PENDING_STATE');
 tag("const close=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false');pending.clear()};","const close=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false')};",'CLOSE');
 tag("   const chosen=pending.has(id(tag));b.setAttribute('aria-pressed',String(chosen));b.textContent=(chosen?'✓  ':'')+display(tag);\n   b.onclick=()=>{if(pending.has(id(tag)))pending.delete(id(tag));else pending.add(id(tag));paintChoices()};",
 `   const sync=()=>{
    const chosen=g.tags.some(x=>id(x)===id(tag));
    b.setAttribute('aria-pressed',String(chosen));b.textContent=(chosen?'✓  ':'')+display(tag);
    b.disabled=!chosen&&g.tags.length>=16;
   };
   b.addEventListener('talera:tag-selection',sync);sync();
   b.onclick=()=>{
    const chosen=g.tags.some(x=>id(x)===id(tag));
    if(!chosen&&g.tags.length>=16)return;
    // Only the ORIGINAL draft queue is used. The published memory remains
    // unchanged until its existing publish/save action is completed.
    g.tags=chosen?g.tags.filter(x=>id(x)!==id(tag)):clean([...g.tags,tag]);
    saveDraft();paintChips();
    // Keep the scroll position and keyboard focus instead of rebuilding chips.
    for(const choice of choices.querySelectorAll('.talera-tag-choice'))choice.dispatchEvent(new Event('talera:tag-selection'));
   };`,'DIRECT_SELECTION');
 tag("  apply.textContent=text('common.add','Toevoegen');cancel.textContent=text('common.cancel','Annuleren');\n",'','CONFIRM_LABELS');
 tag(" toggle.onclick=()=>{if(!panel.hidden){close();return}openFavorites=favorites();pending=new Set(openFavorites.filter(x=>g.tags.some(t=>id(x)===id(t))).map(id));panel.hidden=false;toggle.setAttribute('aria-expanded','true');paintChoices()};\n apply.onclick=()=>{\n  const oldOther=g.tags.filter(x=>!openFavorites.some(f=>id(f)===id(x)));\n  const selected=openFavorites.filter(x=>pending.has(id(x)));\n  g.tags=clean([...oldOther,...selected]).slice(0,16);\n  saveDraft();close();paintLabels();\n };\n cancel.onclick=close;",
 " toggle.onclick=()=>{if(!panel.hidden){close();return}openFavorites=clean([...favorites(),...g.tags]);panel.hidden=false;toggle.setAttribute('aria-expanded','true');paintChoices()};",'TOGGLE_AND_CONFIRM');
 // The preexisting collapsed attached-tag badges retain their functionality.
 // Expanded choices are the sole visible selection UI, not duplicate badges.
 assert.ok(tags.includes('saveDraft();paintChips()')&&!tags.includes('pending')&&!tags.includes('talera-tag-apply')&&!tags.includes('talera-tags-own-input'));
 html=html.slice(0,a)+tags+html.slice(b+1);
 // A validated existing edit parameter AND the current active original group
 // are required; a mere URL or a new memory can never acquire the Save label.
 const toolbarStart=html.indexOf('function taleraV16InstallToolbar(g){');
 const toolbarEnd=html.indexOf('function workView(){',toolbarStart);
 assert.ok(toolbarStart>=0&&toolbarEnd>toolbarStart,'EDITOR_CLEAN_TOOLBAR_DRIFT');
 let toolbar=html.slice(toolbarStart,toolbarEnd);
 toolbar=replace(toolbar,"  publish.textContent='Plaatsen';",
 `  const editExisting=typeof g.existing==='string'&&g.existing.length>0&&new URLSearchParams(location.search).get('edit')===g.existing;
  const placeLabel=()=>{
   window.TaleraI18n.setText(publish,editExisting?'core.editor.saveButton':'core.editor.publishButton');
   window.TaleraI18n.setTextAttribute(publish,'aria-label',editExisting?'core.editor.saveAria':'core.editor.publishAria');
  };
  placeLabel();
  if(editExisting){
   const refresh=()=>{if(!publish.isConnected){document.removeEventListener('talera:languagechange',refresh);return}placeLabel()};
   document.addEventListener('talera:languagechange',refresh);
  }`,'EDIT_SAVE_LABEL');
 toolbar=replace(toolbar,"\n  publish.setAttribute('aria-label','Plaatsen op tijdlijn');",'','LEGACY_PLACE_LABEL');
 html=html.slice(0,toolbarStart)+toolbar+html.slice(toolbarEnd);
 // Work-view only, including the signed-out rendering of the same editor.
 // Keep all original grid/toolbar geometry, semantics, and handlers.
 const css=`<style id="talera-editor-clean-layout-v1">
body:has(#app #main .work.talera-r16-editor) #app>header.top{background:#fff!important;padding-inline:8px 16px!important;}
body:has(#app #main .work.talera-r16-editor) #app>header.top>strong{visibility:hidden!important;}
/* A real centered glyph, independent of the original text node and grid
   track layout. The back button keeps its original accessible action. */
body:has(#app #main .work.talera-r16-editor) #app>header.top #back{width:45px!important;height:45px!important;min-width:45px!important;max-width:45px!important;min-height:45px!important;padding:0!important;display:grid!important;place-items:center!important;color:transparent!important;font-size:0!important;line-height:0!important;text-shadow:none!important;background:transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M16 4 8 12 16 20' stroke='%23476376' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 24px 24px no-repeat!important;}
body:has(#app #main .work.talera-r16-editor) #app>header.top #back::before,body:has(#app #main .work.talera-r16-editor) #app>header.top #back::after{content:none!important;display:none!important;}
body:has(#app #main .work.talera-r16-editor) #app>header.top #back>*{opacity:0!important;}
body:has(#app #main .work.talera-r16-editor) #talera-f5-edit-return-eye>svg{position:absolute!important;display:block!important;left:50%!important;top:50%!important;width:27px!important;height:27px!important;transform:translate(-50%,-50%)!important;margin:0!important;filter:none!important;}
/* Reference phone composition: raise title/date/grid together; place the
   original footer lower, identically in collapsed and expanded states. */
@media (max-width:767px){
 body:has(#app #main .work.talera-r16-editor) #app #main{padding-top:3px!important;padding-bottom:0!important;}
 #app #main .work.talera-compact-work.talera-r16-editor{padding-bottom:0!important;}
}
@media (max-width:767px) and (min-height:760px){
 #app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading{gap:5px!important;}
 #app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading #title{padding:3px 0!important;}
 #app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading #dateToggle{padding:4px 0!important;}
}
#app #main .work.talera-r16-editor #details #title{color:#0b1b3c!important;font-size:clamp(21px,5.9vw,24px)!important;font-weight:740!important;letter-spacing:-.035em!important;}
#app #main .work.talera-r16-editor #details #dateToggle{color:#224d7c!important;font-weight:600!important;}
#app #main .work.talera-compact-work.talera-r16-editor .talera-v9-remove-media{width:36px!important;height:36px!important;min-width:36px!important;max-width:36px!important;border:0!important;border-radius:50%!important;margin:2px!important;background:radial-gradient(circle at center,rgba(255,255,255,.96) 0 12px,transparent 12.5px)!important;color:#0b1b3c!important;box-shadow:none!important;text-shadow:none!important;font:500 21px/1 system-ui!important;display:grid!important;place-items:center!important;padding:0!important;}
#app #main .work.talera-r16-editor .talera-tags-v20{border-radius:15px!important;}
#app #main .work.talera-r16-editor .talera-tags-toggle{font-weight:600!important;white-space:nowrap!important;gap:6px!important;}
#app #main .work.talera-r16-editor .talera-tags-toggle[aria-expanded="true"]{border-bottom-left-radius:0!important;border-bottom-right-radius:0!important;}
#app #main .work.talera-r16-editor .talera-tags-toggle[aria-expanded="true"]+.talera-tags-selected{display:none!important;}
/* Two whole rows, including for long translated labels. Only the
   existing choices grid scrolls; padded panel edges never reveal a third
   clipped pill. 44px interaction rows, smaller visual pills. */
#app #main .work.talera-r16-editor .talera-tags-panel:not([hidden]){margin:0!important;padding:6px 8px!important;border:1px solid #dbe4ef!important;border-top:0!important;border-radius:0 0 15px 15px!important;background:#fff!important;box-sizing:border-box!important;max-height:none!important;overflow:hidden!important;}
#app #main .work.talera-r16-editor .talera-tags-panel[hidden]{display:none!important;}
#app #main .work.talera-r16-editor .talera-tags-choices{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-auto-rows:44px!important;gap:0 6px!important;align-content:start!important;box-sizing:border-box!important;margin:0!important;padding:0!important;max-height:var(--talera-tag-visible-height,88px)!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;scroll-snap-type:y mandatory!important;scrollbar-width:thin!important;scrollbar-color:#a9b9ca transparent!important;}
#app #main .work.talera-r16-editor .talera-tag-choice{position:relative!important;isolation:isolate!important;display:flex!important;align-items:center!important;justify-content:center!important;min-width:0!important;min-height:44px!important;height:44px!important;box-sizing:border-box!important;border-radius:24px!important;border:0!important;background:transparent!important;color:#0b1b3c!important;font:500 13px/1.12 system-ui!important;padding:4px 8px!important;max-width:100%!important;white-space:normal!important;scroll-snap-align:start!important;}
#app #main .work.talera-r16-editor .talera-tag-choice::before{content:""!important;position:absolute!important;inset:4px 0!important;border:1px solid #849bb4!important;border-radius:24px!important;background:#fff!important;z-index:-1!important;pointer-events:none!important;}
#app #main .work.talera-r16-editor .talera-tag-choice[aria-pressed="true"]{background:transparent!important;color:#234369!important;font-weight:650!important;}
#app #main .work.talera-r16-editor .talera-tag-choice[aria-pressed="true"]::before{background:#dbe6f5!important;border-color:#dbe6f5!important;}
#app #main .work.talera-r16-editor .talera-tag-choice:focus-visible{outline:2px solid #224d7c!important;outline-offset:-3px!important;}
#app #main .work.talera-r16-editor .talera-tag-choice:disabled{opacity:.52!important;}
/* Desktop workbench only: same fields/media nodes, same draft and save handlers.
   Location is deliberately not targeted; its separate project owns that feature. */
@media ${DESKTOP_HOME_MEDIA} {
 body:has(#app #main .work.talera-r16-editor) #app{
  width:100%!important;max-width:1440px!important;min-width:0!important;
  margin-inline:auto!important;box-sizing:border-box!important;
 }
 body:has(#app #main .work.talera-r16-editor) #app>header.top{
  padding:8px clamp(24px,3vw,44px)!important;min-height:64px!important;
  box-sizing:border-box!important;
 }
 body:not(.talera-v61-inline-recording):has(#app #main .work.talera-r16-editor) #app #main{
  flex:1 1 auto!important;min-height:0!important;padding:24px clamp(24px,3vw,44px) 32px!important;
  overflow-y:auto!important;overflow-x:hidden!important;
 }
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor{
  display:grid!important;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)!important;
  grid-auto-rows:min-content!important;gap:20px 32px!important;align-items:start!important;
  align-content:start!important;min-height:0!important;flex:0 0 auto!important;
  padding:0!important;
 }
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor #details{
  grid-column:1/-1!important;grid-row:1!important;
 }
 #app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading #title{
  font-size:30px!important;min-height:48px!important;
 }
 #app #main .work.talera-compact-work.talera-r16-editor .talera-v14-heading #dateToggle{
  font-size:16px!important;min-height:42px!important;
 }
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor>.talera-work-tiles{
  grid-column:1!important;grid-row:2 / span 2!important;
  margin:0!important;min-width:0!important;
 }
 #app #main .work.talera-compact-work.talera-r16-editor .talera-work-tiles .tiles{
  grid-template-columns:repeat(auto-fill,minmax(145px,1fr))!important;gap:14px!important;
 }
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor>.talera-tags-v20{
  grid-column:2!important;grid-row:2!important;min-width:0!important;
 }
 #app #main .work.talera-r16-editor .talera-tags-choices{
  grid-template-columns:repeat(3,minmax(0,1fr))!important;max-height:220px!important;
 }
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor>.work-tools.talera-r16-toolbar{
  grid-column:1/-1!important;justify-self:end!important;width:min(100%,630px)!important;
  margin:10px 0 0!important;padding:14px 0!important;gap:12px!important;
 }
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor>#error{
  grid-column:1/-1!important;
 }
 #app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar :is(#speak,#write){
  flex-direction:row!important;gap:9px!important;font-size:15px!important;
 }
 #app .work.talera-compact-work.talera-r16-editor .talera-r16-toolbar #publish{
  font-size:15px!important;min-height:48px!important;
 }

 /* Existing writer: room to read the photographs and write next to them.
    Preserve its native scrolling, auto-resize, text and done action. */
 #taleraWriterOverlay{box-sizing:border-box!important;width:100%!important;max-width:100%!important;}
 #taleraWriterOverlay .talera-writer-top{
  width:100%!important;max-width:1440px!important;margin-inline:auto!important;
  padding:16px clamp(24px,3vw,44px)!important;box-sizing:border-box!important;
 }
 #taleraWriterOverlay .talera-writer-body{
  display:grid!important;grid-template-columns:minmax(260px,.85fr) minmax(0,1.4fr)!important;
  align-items:start!important;align-content:start!important;gap:28px!important;
  width:100%!important;max-width:1440px!important;padding:28px clamp(24px,3vw,44px)!important;
  box-sizing:border-box!important;
 }
 #taleraWriterOverlay #taleraWriterPhotos:not([hidden]){
  grid-template-columns:repeat(auto-fill,minmax(130px,1fr))!important;
  gap:12px!important;margin:0!important;padding:0!important;border-bottom:0!important;
 }
 #taleraWriterOverlay #taleraWriterPhotos .talera-writer-thumbnail img{
  object-fit:contain!important;
 }
 #taleraWriterOverlay #taleraWriterText{
  min-height:max(360px,60dvh)!important;width:100%!important;min-width:0!important;
  padding:24px!important;font-size:18px!important;box-sizing:border-box!important;
 }
 #taleraWriterOverlay .talera-writer-body:has(#taleraWriterPhotos[hidden]){
  grid-template-columns:minmax(0,1fr)!important;
 }

 /* Existing recording player: keep controls clear of the whole source image.
    No new recorder, overlay state, inputs, audio handling or cue logic. */
 body.talera-v61-inline-recording #app .work.talera-compact-work #frame{
  inset:20px 24px 176px!important;width:calc(100% - 48px)!important;
  height:calc(100dvh - 196px)!important;max-height:none!important;
  box-sizing:border-box!important;border-radius:16px!important;
 }
 #taleraV61RecControls{
  left:50%!important;right:auto!important;bottom:20px!important;
  width:min(700px,calc(100% - 48px))!important;transform:translateX(-50%)!important;
  box-sizing:border-box!important;padding:16px 20px!important;
 }
 #taleraV61RecControls .talera-v61-rec-actions button{min-width:0!important;}
 #v30DateModal:not([hidden]) #v30DateBox{
  width:min(460px,calc(100vw - 48px))!important;max-width:100%!important;
  max-height:calc(100dvh - 48px)!important;overflow-y:auto!important;
  box-sizing:border-box!important;
 }
}
</style>`;
 return replace(html,'</head>',css+'</head>','STYLE_HEAD');
}

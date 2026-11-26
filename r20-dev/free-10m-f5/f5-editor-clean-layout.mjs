import assert from 'node:assert/strict';

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
  const placeLabel=()=>{const lang=String(window.TaleraI18n?.language||document.documentElement.lang||'nl').slice(0,2);
   const labels={nl:['Opslaan','Wijzigingen opslaan'],en:['Save','Save changes'],de:['Speichern','Änderungen speichern'],fr:['Enregistrer','Enregistrer les modifications'],es:['Guardar','Guardar cambios']};
   if(editExisting){const pair=labels[lang]||labels.nl;publish.textContent=pair[0];publish.setAttribute('aria-label',pair[1]);}
   else{publish.textContent='Plaatsen';publish.setAttribute('aria-label','Plaatsen op tijdlijn');}
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
body:has(#app #main .work.talera-r16-editor) #app>header.top{background:#fff!important;padding-inline:16px!important;}
body:has(#app #main .work.talera-r16-editor) #app>header.top>strong{visibility:hidden!important;}
body:has(#app #main .work.talera-r16-editor) #app>header.top #back{width:45px!important;height:45px!important;min-width:45px!important;max-width:45px!important;min-height:45px!important;padding:0!important;display:grid!important;place-items:center!important;background:transparent!important;}
body:has(#app #main .work.talera-r16-editor) #app>header.top #back::after{content:""!important;display:block!important;width:10px!important;height:10px!important;border-left:2.5px solid #476376!important;border-bottom:2.5px solid #476376!important;transform:rotate(45deg)!important;box-sizing:border-box!important;}
#app #main .work.talera-r16-editor #details #title{color:#0b1b3c!important;font-size:clamp(21px,5.9vw,24px)!important;font-weight:740!important;letter-spacing:-.035em!important;}
#app #main .work.talera-r16-editor #details #dateToggle{color:#476376!important;font-weight:600!important;}
#app #main .work.talera-compact-work.talera-r16-editor .talera-v9-remove-media{width:36px!important;height:36px!important;min-width:36px!important;max-width:36px!important;border:0!important;border-radius:50%!important;margin:2px!important;background:radial-gradient(circle at center,rgba(255,255,255,.96) 0 12px,transparent 12.5px)!important;color:#0b1b3c!important;box-shadow:none!important;text-shadow:none!important;font:500 21px/1 system-ui!important;display:grid!important;place-items:center!important;padding:0!important;}
#app #main .work.talera-r16-editor .talera-tags-v20{border-radius:15px!important;}
#app #main .work.talera-r16-editor .talera-tags-toggle{font-weight:600!important;white-space:nowrap!important;gap:6px!important;}
#app #main .work.talera-r16-editor .talera-tags-toggle[aria-expanded="true"]{border-bottom-left-radius:0!important;border-bottom-right-radius:0!important;}
#app #main .work.talera-r16-editor .talera-tags-toggle[aria-expanded="true"]+.talera-tags-selected{display:none!important;}
#app #main .work.talera-r16-editor .talera-tags-panel:not([hidden]){margin:0!important;padding:8px!important;border:1px solid #dbe4ef!important;border-top:0!important;border-radius:0 0 15px 15px!important;background:#fff!important;scrollbar-width:thin!important;scrollbar-color:#a9b9ca transparent!important;}
#app #main .work.talera-r16-editor .talera-tags-panel[hidden]{display:none!important;}
#app #main .work.talera-r16-editor .talera-tags-choices{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;align-content:start!important;max-height:none!important;overflow:visible!important;}
#app #main .work.talera-r16-editor .talera-tag-choice{min-width:0!important;min-height:42px!important;border-radius:24px!important;border:1px solid #849bb4!important;background:#fff!important;color:#234369!important;font:500 14px/1.25 system-ui!important;padding:7px 11px!important;max-width:100%!important;white-space:normal!important;}
#app #main .work.talera-r16-editor .talera-tag-choice[aria-pressed="true"]{background:#dbe6f5!important;border-color:#dbe6f5!important;color:#234369!important;font-weight:650!important;}
#app #main .work.talera-r16-editor .talera-tag-choice:focus-visible{outline:2px solid #224d7c!important;outline-offset:-3px!important;}
#app #main .work.talera-r16-editor .talera-tag-choice:disabled{opacity:.52!important;}
</style>`;
 return replace(html,'</head>',css+'</head>','STYLE_HEAD');
}

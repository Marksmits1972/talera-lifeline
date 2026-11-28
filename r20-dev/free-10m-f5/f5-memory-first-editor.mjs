import assert from 'node:assert/strict';

// Owner-approved 28 November. Adapt the existing /tell closure only. No new
// storage model, recorder, route, player, media mutations or save path.
export function installMemoryFirstEditor(html,{authenticated=true}={}){
 const one=(before,after,label)=>{
  assert.equal(html.split(before).length,2,'MEMORY_FIRST_SOURCE_DRIFT_'+label);
  html=html.replace(before,()=>after);
 };
 const start=html.indexOf('function startView(){main.innerHTML='),end=html.indexOf(';bindInput();',start);
 assert.ok(start>=0&&end>start,'MEMORY_FIRST_START_DRIFT');
 const markup='<section class="talera-memory-start"><p class="eyebrow" data-memory-text="eyebrow"></p><h1 data-memory-text="question"></h1><label class="picker talera-memory-entry"><span class="talera-memory-entry-icon talera-memory-photo" aria-hidden="true"></span><span class="talera-memory-entry-copy"><b data-memory-text="withPhotos"></b><span data-memory-text="withPhotosHint"></span></span><input id="photoInput" type="file" accept="image/*,video/*" multiple></label><button type="button" id="without" class="talera-memory-entry"><span class="talera-memory-entry-icon talera-memory-mic" aria-hidden="true"></span><span class="talera-memory-entry-copy"><b data-memory-text="withoutPhotos"></b><span data-memory-text="withoutPhotosHint"></span></span></button><p class="fine talera-memory-start-hint" data-memory-text="later"></p><div id="error" class="msg" hidden></div></section>';
 html=html.slice(0,start)+'function startView(){main.innerHTML='+JSON.stringify(markup)+
 ';taleraMemoryTranslate(main);window.TaleraI18n.setTextAttribute($("photoInput"),"aria-label","core.tell.memoryFirst.withPhotos")'+html.slice(end);
 // Keep the original native picker and original new-concept creation.
 if(authenticated)one("groups.push(g);saveDraft();open('work',g.id)};if(errorMsg)showError(errorMsg)}",
 "groups.push(g);saveDraft();open('work',g.id);openZeroPlayer(g)};if(errorMsg)showError(errorMsg)}",'DIRECT_VOICE');
 const a=html.indexOf('function setupV20Tags(g,details){'),b=html.indexOf('}function setupV10(',a);
 assert.ok(a>=0&&b>a,'MEMORY_FIRST_TAG_OWNER_DRIFT');
 html=html.slice(0,a)+String.raw`function setupV20Tags(g,details){
 const CANONICAL=['Familie','Vrienden','Vakantie','Jeugd','Baby','Basisschool','Middelbare school','Werk','Liefde','Kinderen','Verjaardag','Reizen','Studie','Sport','Hobby','Feest','Bruiloft','Wonen','Verhuizen','Huisdieren','Natuur','Gezondheid','Grootouders','Bijzondere momenten','Mijlpalen'];
 const KEYS=['family','friends','holiday','childhood','baby','primarySchool','secondarySchool','work','love','children','birthday','travel','study','sport','hobby','party','wedding','home','moving','pets','nature','health','grandparents','specialMoments','milestones'];
 const id=x=>String(x).toLocaleLowerCase('nl');
 const clean=a=>{const seen=new Set();return (Array.isArray(a)?a:[]).map(v=>String(v||'').trim().replace(/\s+/g,' ').slice(0,36)).filter(x=>{if(!x||seen.has(id(x)))return false;seen.add(id(x));return true})};
 const read=(key,fallback)=>{try{const v=localStorage.getItem(key);return v===null?fallback:clean(JSON.parse(v))}catch(_){return fallback}};
 const PREF='talera-kenmerken-voorkeuren-v1',CAT='talera-kenmerken-catalog-v1';
 const t=(key,params)=>window.TaleraI18n.t(key,params);
 const label=x=>{const index=CANONICAL.findIndex(n=>id(n)===id(x));return index<0?x:t('tag.name.'+KEYS[index])};
 g.tags=clean(g.tags).slice(0,16);
 const initialTopic=new URLSearchParams(location.search).get('theme');
 if(initialTopic&&!g.existing&&!g.tags.length)g.tags=clean([initialTopic]).slice(0,16);
 const box=document.createElement('div');box.className='talera-tags-v20';
 box.innerHTML='<button type="button" class="talera-tags-toggle" aria-haspopup="dialog" aria-expanded="false"></button><div class="talera-tags-selected" aria-live="polite"></div>';
 details.append(box);
 const toggle=box.querySelector('button'),summary=box.querySelector('.talera-tags-selected');
 const paint=()=>{
  window.TaleraI18n.setText(toggle,'core.tell.memoryFirst.tags');
  summary.textContent=g.tags.length?g.tags.map(label).join(' · '):'';
  summary.hidden=!g.tags.length;
 };
 paint();
 const onLanguage=()=>{if(!box.isConnected){document.removeEventListener('talera:languagechange',onLanguage);return}paint()};
 document.addEventListener('talera:languagechange',onLanguage);
 toggle.onclick=()=>{
  if(document.getElementById('taleraMemoryTagsDialog'))return;
  let pending=clean(g.tags),favorites=read(PREF,CANONICAL.slice(0,12)),catalog=read(CAT,[]),mode='select',saving=false;
  const initialFavorites=JSON.stringify(favorites),initialCatalog=JSON.stringify(catalog);
  const dialog=document.createElement('dialog');dialog.id='taleraMemoryTagsDialog';dialog.className='talera-tags-panel';
  dialog.setAttribute('aria-labelledby','taleraMemoryTagsTitle');
  dialog.innerHTML='<div class="talera-memory-tags-head"><button type="button" class="talera-tag-cancel"></button><button type="button" class="talera-tag-apply"></button></div><div class="talera-memory-tags-body"><h2 id="taleraMemoryTagsTitle"></h2><p class="talera-memory-tags-hint"></p><div class="talera-memory-tags-list"></div></div><div class="talera-memory-tags-foot"><form class="talera-memory-own-form" hidden><input maxlength="36" type="text"><button type="submit"></button></form><button type="button" class="talera-memory-own"></button><button type="button" class="talera-memory-manage"></button><p class="talera-memory-tags-status" role="status" hidden></p></div>';
  const q=s=>dialog.querySelector(s),list=q('.talera-memory-tags-list'),body=q('.talera-memory-tags-body'),done=q('.talera-tag-apply'),cancel=q('.talera-tag-cancel'),manage=q('.talera-memory-manage'),own=q('.talera-memory-own'),form=q('form'),input=q('input'),status=q('.talera-memory-tags-status');
  const set=(node,key)=>window.TaleraI18n.setText(node,key);
  const message=key=>{status.hidden=!key;status.textContent=key?t(key):''};
  const close=()=>{if(saving)return;dialog.close();dialog.remove();toggle.setAttribute('aria-expanded','false');toggle.focus({preventScroll:true})};
  function render(){
   set(q('#taleraMemoryTagsTitle'),mode==='select'?'core.tell.memoryFirst.tags':'tag.preferencesTitle');
   set(q('.talera-memory-tags-hint'),mode==='select'?'core.tell.memoryFirst.tagsHint':'tag.preferencesHelp');
   set(manage,mode==='select'?'core.tell.memoryFirst.manageTags':'core.tell.memoryFirst.backToTags');
   const all=clean([...CANONICAL,...catalog,...favorites,...pending]);
   list.replaceChildren();
   const group=(title,items)=>{
    if(!items.length)return;
    const h=document.createElement('h3');set(h,title);list.append(h);
    const grid=document.createElement('div');grid.className='talera-tags-choices';grid.setAttribute('role','group');grid.setAttribute('aria-label',t(title));list.append(grid);
    for(const tag of items){
     const b=document.createElement('button');b.type='button';b.className='talera-tag-choice';grid.append(b);
     const chosen=()=> (mode==='select'?pending:favorites).some(x=>id(x)===id(tag));
     b.textContent=label(tag);b.dataset.tag=tag;
     b.onclick=()=>{
      if(mode==='select'){
       if(chosen())pending=pending.filter(x=>id(x)!==id(tag));
       else if(pending.length<16)pending=clean([...pending,tag]);
      }else favorites=chosen()?favorites.filter(x=>id(x)!==id(tag)):clean([...favorites,tag]);
      sync();
     };
    }
   };
   group('tag.favoritesHeading',clean(favorites));
   group('core.tell.memoryFirst.moreTags',all.filter(x=>!favorites.some(f=>id(x)===id(f))));
   sync();
  }
  function sync(){
   for(const b of list.querySelectorAll('.talera-tag-choice')){
    const selected=(mode==='select'?pending:favorites).some(x=>id(x)===id(b.dataset.tag));
    b.setAttribute('aria-pressed',String(selected));
    b.disabled=mode==='select'&&!selected&&pending.length>=16;
   }
  }
  own.onclick=()=>{form.hidden=!form.hidden;if(!form.hidden)input.focus()};
  form.onsubmit=e=>{
   e.preventDefault();const name=clean([input.value])[0];
   if(!name)return;
   const all=clean([...CANONICAL,...catalog,...favorites,...pending]),existing=all.find(x=>id(x)===id(name)),value=existing||name;
   if(!existing)catalog=clean([...catalog,name]);
   favorites=clean([...favorites,value]);
   if(pending.length<16&&!pending.some(x=>id(x)===id(value)))pending=clean([...pending,value]);
   input.value='';form.hidden=true;render();message('');
  };
  manage.onclick=()=>{mode=mode==='select'?'manage':'select';body.scrollTop=0;render()};
  cancel.onclick=close;
  dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
  done.onclick=async()=>{
   if(saving)return;saving=true;done.disabled=cancel.disabled=true;
   const old=[...g.tags];let oldPref,oldCat,prefWritten=false,catWritten=false;
   const prefChanged=JSON.stringify(favorites)!==initialFavorites,catChanged=JSON.stringify(catalog)!==initialCatalog;
   try{
    if(prefChanged){oldPref=localStorage.getItem(PREF);localStorage.setItem(PREF,JSON.stringify(favorites));prefWritten=true;}
    if(catChanged){oldCat=localStorage.getItem(CAT);localStorage.setItem(CAT,JSON.stringify(catalog));catWritten=true;}
    g.tags=clean(pending).slice(0,16);
    await saveDraft();paint();saving=false;close();
   }catch(e){
    g.tags=old;
    try{if(prefWritten){if(oldPref===null)localStorage.removeItem(PREF);else localStorage.setItem(PREF,oldPref)}if(catWritten){if(oldCat===null)localStorage.removeItem(CAT);else localStorage.setItem(CAT,oldCat)}}catch(_){}
    saving=false;done.disabled=cancel.disabled=false;message('tag.saveFailure');
   }
  };
  set(cancel,'common.cancel');set(done,'core.tell.writerDone');set(own,'tag.makeOwn');set(form.querySelector('button'),'common.add');
  window.TaleraI18n.setTextAttribute(input,'placeholder','tag.ownExample');window.TaleraI18n.setTextAttribute(input,'aria-label','tag.ownLabel');
  document.body.append(dialog);toggle.setAttribute('aria-expanded','true');render();dialog.showModal();
 };
}`+html.slice(b+1);
 // Move original nodes instead of duplicating any action or handler.
 one('function workView(){',String.raw`function taleraMemoryTranslate(root){
  for(const el of root.querySelectorAll('[data-memory-text]'))window.TaleraI18n.setText(el,'core.tell.memoryFirst.'+el.dataset.memoryText);
 }
 function taleraMemoryRefresh(g){
  const tr=(el,key,params)=>window.TaleraI18n.setText(el,'core.tell.memoryFirst.'+key,params);
  const speak=$('speak'),write=$('write');if(!speak||!write)return;
  const card=speak.closest('.talera-memory-story-action');
  if(!card)return;
  const hasVoice=!!g.voice;
  card.classList.toggle('has-voice',hasVoice);
  const work=card.closest('.talera-memory-first'),hero=work?.querySelector('.talera-memory-hero'),tiles=work?.querySelector('.talera-work-tiles'),actions=work?.querySelector('.talera-memory-actions');
  if(work&&hero&&tiles&&actions&&hasVoice&&!g.media.length&&card.parentElement!==work){hero.after(card);card.after(tiles);tiles.after(actions)}
  if(work&&actions&&(!hasVoice||g.media.length)&&card.parentElement!==actions)actions.prepend(card);
  tr(speak,hasVoice?'spoken':g.media.length?'tellPhotos':'tellStory');window.TaleraI18n.setTextAttribute(speak,'aria-label','core.tell.memoryFirst.'+(hasVoice?'spoken':g.media.length?'tellPhotos':'tellStory'));
  const hint=card.querySelector('.talera-memory-story-hint');
  if(hasVoice){
   const seconds=Math.max(0,Math.floor(Number(g.voiceDurationMs||0)/1000));
   tr(hint,'voiceHint',{minutes:Math.floor(seconds/60),seconds:String(seconds%60).padStart(2,'0')});
  }else tr(hint,'tellHint');
  tr(write,g.text?.trim()?'written':'writeStory');
  const preview=write.closest('.talera-memory-write-action')?.querySelector('.talera-memory-text-preview');
  if(preview){preview.textContent=g.text||'';preview.hidden=!g.text?.trim()}
 }
 function taleraMemoryFirst(g){
  const work=main.querySelector('.work.talera-r16-editor'),details=$('details'),tiles=work?.querySelector('.talera-work-tiles'),toolbar=work?.querySelector('.talera-r16-toolbar'),tags=work?.querySelector('.talera-tags-v20'),speak=$('speak'),write=$('write');
  if(!work||!details||!tiles||!toolbar||!tags||!speak||!write)return;
  work.classList.add('talera-memory-first');
  work.classList.toggle('talera-memory-has-media',!!g.media.length);
  const hero=document.createElement('div');hero.className='talera-memory-hero';
  hero.innerHTML='<h2 data-memory-text="memory"></h2><p data-memory-text="memoryHint"></p>';
  work.prepend(hero);taleraMemoryTranslate(hero);
  const actions=document.createElement('div');actions.className='talera-memory-actions';
  const story=document.createElement('div');story.className='talera-memory-story-action';
  const hint=document.createElement('span');hint.className='talera-memory-story-hint';hint.setAttribute('aria-hidden','true');
  story.append(speak,hint);actions.append(story);story.addEventListener('click',e=>{if(!speak.contains(e.target))speak.click()});
  const writing=document.createElement('div');writing.className='talera-memory-write-action';
  const preview=document.createElement('span');preview.className='talera-memory-text-preview';
  writing.append(write,preview);actions.append(writing);
  tiles.after(actions);actions.after(details);details.after(tags);
  const add=tiles.querySelector('.talera-v9-add-media');
  if(add){
   // Reuse the existing native file input and original add handler.
   tiles.append(add);window.TaleraI18n.setText(add,'core.tell.memoryFirst.addPhotos');
  }
  const grid=tiles.querySelector('.tiles');
  grid.style.setProperty('--talera-strip-count',String(Math.max(1,g.media.length)));
  [...grid.querySelectorAll(':scope > .tile')].forEach((tile,i)=>tile.style.setProperty('--talera-strip-position',String(i+1)));
  [...grid.querySelectorAll(':scope > .talera-v9-remove-media')].forEach((remove,i)=>remove.style.setProperty('--talera-strip-position',String(i+1)));
  if(!g.media.length){
   grid.hidden=true;work.classList.add('talera-memory-no-media');
   // After a spoken story, the story is prominent; photos are a peer next action.
   if(g.voice){hero.after(story);story.after(tiles);tiles.after(actions)}
  }
  const count=document.createElement('span');count.className='talera-memory-media-count';
  if(g.media.length){window.TaleraI18n.setText(count,'core.tell.memoryFirst.mediaCount',{count:g.media.length});tiles.append(count)}
  window.TaleraI18n.setTextAttribute($('title'),'placeholder','core.tell.memoryFirst.title');
  taleraMemoryRefresh(g);
 }
 function workView(){`,'WORK_HELPERS');
 one('taleraV16InstallToolbar(g);','taleraV16InstallToolbar(g);taleraMemoryFirst(g);','WORK_LAYOUT');
 one("input.blur();overlay.remove();","input.blur();overlay.remove();taleraMemoryRefresh(g);",'WRITER_RETURN');
 one('taleraZeroSession=null;\n    if($(\'draft\'))','taleraZeroSession=null;\n    taleraMemoryRefresh(g);\n    if($(\'draft\'))','RECORDER_RETURN');
 return html.replace('</head>',memoryFirstCss+'</head>');
}

const memoryFirstCss=String.raw`<style id="talera-memory-first-editor">
#main:has(.talera-memory-start){background:#F8F7F4!important}
.talera-memory-start{display:flex;flex-direction:column;gap:16px;padding:12px 4px 24px;color:#071A3D}
.talera-memory-start h1{font-size:clamp(24px,6vw,32px);line-height:1.16;margin:0 0 5px;font-weight:750;letter-spacing:-.025em}
.talera-memory-start .eyebrow{color:#23497E;font-size:12px;letter-spacing:.16em}
#main .talera-memory-start .talera-memory-entry{position:relative!important;box-sizing:border-box!important;display:flex!important;flex-direction:row!important;margin:0!important;align-items:center!important;justify-content:flex-start!important;gap:13px!important;width:100%!important;min-height:125px!important;padding:18px 15px!important;border:1px solid #CDD8E4!important;border-radius:18px!important;background:#fff!important;color:#071A3D!important;text-align:left!important;cursor:pointer!important;font:inherit!important;overflow:hidden}
.talera-memory-entry::after{content:'›';margin-left:auto;color:#23497E;font-size:24px;flex:none}
.talera-memory-entry .talera-memory-entry-copy{display:flex;flex-direction:column;gap:7px;min-width:0;flex:1}
.talera-memory-entry-copy b{font-size:19px;color:#071A3D}
.talera-memory-entry-copy>span{font-size:14px;color:#52677F;line-height:1.35;font-weight:400}
.talera-memory-entry-icon{width:50px;height:50px;flex:none;background:#EAF0F7;border-radius:13px;display:grid;place-items:center;color:#23497E}
.talera-memory-photo::before{content:'';width:25px;height:22px;border:2px solid currentColor;border-radius:4px;background:linear-gradient(145deg,transparent 50%,#C1D1E7 51%)}
.talera-memory-mic::before{content:'🎙';font-size:25px}
#main .talera-memory-entry input{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;opacity:0!important;cursor:pointer!important}
.talera-memory-start-hint{text-align:center;color:#66778B!important;font-size:12px!important;line-height:1.4}
body:has(#app #main .work.talera-r16-editor.talera-memory-first) #app>header.top>strong{visibility:visible!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first{gap:10px!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-memory-hero h2{font-size:23px;line-height:1.2;margin:0 0 4px;color:#071A3D}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-memory-hero p{font-size:13px;color:#66778B;margin:0 0 4px}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first #details{order:0!important;border-top:1px solid #E4E7EB!important;padding:6px 0!important;margin:0!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first #details :is(#title,#dateToggle){font:550 15px/1.35 system-ui!important;min-height:44px!important;letter-spacing:0!important;margin:0!important;text-align:left!important;padding:7px 0!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-v14-heading{gap:2px!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-work-tiles{position:relative!important;display:flex!important;flex-wrap:wrap!important;justify-content:space-between!important;gap:5px!important;align-items:center!important;margin:0!important;padding:0!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-work-tiles .tiles{width:100%!important;min-width:0!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-work-tiles .tiles[hidden]{display:none!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-v9-add-media{order:3!important;flex:none!important;width:auto!important;height:auto!important;min-height:44px!important;padding:8px 10px!important;aspect-ratio:auto!important;font:650 13px/1.25 system-ui!important;color:#23497E!important;border:0!important;background:#fff!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-memory-media-count{order:2;color:#52677F;font-size:12px}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first.talera-memory-no-media .talera-v9-add-media{width:100%!important;min-height:76px!important;text-align:left!important;border:1px solid #CDD8E4!important;border-radius:15px!important;padding:18px!important;font-size:17px!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first :is(.talera-memory-story-action,.talera-memory-write-action){position:relative!important;display:flex;flex-direction:column;gap:3px;min-width:0;flex:none}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-memory-actions{display:flex;flex-direction:column;gap:8px;width:100%;min-width:0}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-memory-story-action{background:#EAF0F7;border-radius:15px;padding:12px 15px;min-height:77px;justify-content:center;box-sizing:border-box}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-memory-story-action.has-voice{min-height:96px}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first :is(#speak,#write){font:700 17px/1.25 system-ui!important;display:block!important;text-align:left!important;min-height:44px!important;width:100%!important;background:transparent!important;color:#23497E!important;box-shadow:none!important;border:none!important;padding:4px 0!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first #write{font-size:15px!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-memory-story-hint{color:#52677F;font-size:13px;pointer-events:none}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-memory-text-preview{color:#52677F;font-size:13px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-memory-text-preview[hidden]{display:none!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-tags-toggle{border:0!important;min-height:44px!important;background:transparent!important;color:#52677F!important;padding:6px 0!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-tags-toggle::after{transform:rotate(-45deg)!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-tags-selected{font-size:12px;color:#52677F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-tags-selected[hidden]{display:none!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-r16-toolbar .talera-r16-divider{display:none!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-r16-toolbar{grid-template-columns:minmax(0,1fr)!important}
#app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-r16-toolbar #publish{width:100%!important;grid-column:1/-1!important;flex:1 1 100%!important;min-height:50px!important;height:50px!important;max-height:50px!important}
body.talera-v61-inline-recording .talera-memory-first :is(.talera-memory-hero,.talera-memory-actions,.talera-memory-story-action,.talera-memory-write-action){display:none!important}
#app #main .work.talera-r16-editor.talera-memory-first .talera-memory-story-action{cursor:pointer}
#app #main .work.talera-r16-editor.talera-memory-first #speak{position:relative;padding-left:37px!important}
#app #main .work.talera-r16-editor.talera-memory-first #speak::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:27px;height:27px;border-radius:50%;background:#23497E}
#app #main .work.talera-r16-editor.talera-memory-first #speak::after{content:'🎙';position:absolute;left:5px;top:50%;transform:translateY(-50%);font-size:16px;color:white}
#app #main .work.talera-r16-editor.talera-memory-first .has-voice #speak::after{content:'';left:10px;width:0;height:0;border-left:9px solid white;border-top:6px solid transparent;border-bottom:6px solid transparent}
#app #main .work.talera-r16-editor.talera-memory-first .talera-memory-story-hint{margin-left:37px}
#taleraMemoryTagsDialog{position:fixed;inset:0;margin:auto;box-sizing:border-box;padding:0;width:min(100%,680px);height:100dvh;max-width:100%;max-height:100dvh;background:white;color:#071A3D;border:0;overflow:hidden}
#taleraMemoryTagsDialog:not([open]){display:none!important}
#taleraMemoryTagsDialog[open]{display:flex!important;flex-direction:column}
#taleraMemoryTagsDialog::backdrop{background:rgba(7,26,61,.28)}
#taleraMemoryTagsDialog .talera-memory-tags-head,#taleraMemoryTagsDialog .talera-memory-tags-foot{padding:12px 16px;flex:none;background:#fff}
#taleraMemoryTagsDialog .talera-memory-tags-head{display:flex;justify-content:space-between;align-items:center;padding-top:max(12px,env(safe-area-inset-top))}
#taleraMemoryTagsDialog .talera-memory-tags-foot{display:flex;flex-direction:column;gap:3px;padding-bottom:max(12px,env(safe-area-inset-bottom));border-top:1px solid #E4E7EB}
#taleraMemoryTagsDialog .talera-memory-tags-body{flex:1 1 0;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 16px 16px}
#taleraMemoryTagsDialog h2{font:750 24px/1.2 system-ui;color:#071A3D;margin:12px 0 6px}
#taleraMemoryTagsDialog h3{font:650 13px/1.3 system-ui;color:#23497E;margin:13px 0 5px}
#taleraMemoryTagsDialog .talera-memory-tags-hint{font-size:13px;color:#66778B;margin:0 0 17px}
#taleraMemoryTagsDialog .talera-tags-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px 7px}
#taleraMemoryTagsDialog button{font:600 14px/1.2 system-ui;min-height:44px;border:0;padding:6px 10px;color:#23497E;background:white;cursor:pointer;border-radius:11px;box-sizing:border-box}
#taleraMemoryTagsDialog .talera-tag-choice{position:relative;isolation:isolate;min-width:0;overflow-wrap:anywhere;white-space:normal;font:500 13px/1.15 system-ui;padding:8px 6px;min-height:44px}
#taleraMemoryTagsDialog .talera-tag-choice::before{content:'';position:absolute;inset:3px 0;border:1px solid #C7D2DF;border-radius:22px;z-index:-1;background:#fff}
#taleraMemoryTagsDialog .talera-tag-choice[aria-pressed=true]{color:white;font-weight:650}
#taleraMemoryTagsDialog .talera-tag-choice[aria-pressed=true]::before{background:#23497E;border-color:#23497E}
#taleraMemoryTagsDialog .talera-tag-choice:disabled{opacity:.53}
#taleraMemoryTagsDialog .talera-tag-apply{background:#071A3D;color:white;min-width:74px}
#taleraMemoryTagsDialog .talera-memory-own{background:#EDF2F8;color:#23497E}
#taleraMemoryTagsDialog .talera-memory-manage{font-size:12px;color:#52677F}
#taleraMemoryTagsDialog form:not([hidden]){display:flex;gap:8px}
#taleraMemoryTagsDialog form input{min-width:0;flex:1;border:1px solid #C7D2DF;border-radius:10px;font:16px system-ui;padding:8px}
#taleraMemoryTagsDialog form button{background:#23497E;color:white}
#taleraMemoryTagsDialog .talera-memory-tags-status{color:#842E38;font-size:13px}
@media(max-width:359px){#taleraMemoryTagsDialog .talera-tags-choices{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:1023px),(hover:none),(pointer:coarse){
 #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-work-tiles .tiles:not([hidden]){display:grid!important;grid-template-columns:repeat(var(--talera-strip-count,1),minmax(44px,108px))!important;grid-template-rows:minmax(58px,auto)!important;grid-auto-columns:minmax(44px,108px)!important;grid-auto-flow:column!important;gap:4px!important;justify-content:start!important;overflow-x:auto!important;overflow-y:hidden!important;touch-action:pan-x!important;overscroll-behavior-x:contain}
 #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first .talera-work-tiles .tiles>:is(.tile,.talera-v9-remove-media){grid-row:1!important;grid-column:var(--talera-strip-position)!important}
 #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first  .talera-work-tiles .tile{aspect-ratio:1!important;min-height:58px!important}
 #taleraWriterOverlay #taleraWriterPhotos:not([hidden]){display:grid!important;grid-template-columns:none!important;grid-template-rows:52px!important;grid-auto-columns:52px!important;grid-auto-flow:column!important;overflow-x:auto!important;overflow-y:hidden!important;gap:7px!important;padding:5px 2px!important;margin-bottom:6px!important}
 #taleraWriterOverlay #taleraWriterPhotos .talera-writer-thumbnail{aspect-ratio:1!important;max-height:52px!important}
 #taleraWriterOverlay #taleraWriterText{font-size:16px!important}
}
@media(min-width:1024px) and (hover:hover) and (pointer:fine){
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)!important;grid-auto-rows:min-content!important}
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first>.talera-memory-hero{grid-column:1/-1!important;grid-row:1!important}
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first>.talera-work-tiles{grid-column:1!important;grid-row:2 / span 3!important}
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first>.talera-memory-actions{grid-column:2!important;grid-row:2!important}
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first>#details{grid-column:2!important;grid-row:3!important}
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first>.talera-tags-v20{grid-column:2!important;grid-row:4!important}
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first>.talera-memory-story-action{grid-column:1!important;grid-row:2!important}
 body:not(.talera-v61-inline-recording) #app #main .work.talera-compact-work.talera-r16-editor.talera-memory-first.talera-memory-no-media:has(>.talera-memory-story-action)>.talera-work-tiles{grid-column:1!important;grid-row:3!important}
}
</style>`;

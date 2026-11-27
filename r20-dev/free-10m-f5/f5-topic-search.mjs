import assert from 'node:assert/strict';

// Extend the existing owner-topic selection, not the presentation engine.
// This inline code is identical on Home and /present; no media or network API.
export function createTopicSearch(){
  const fragmentPrefix='#talera-kenmerken=';
  const key=value=>String(value||'').trim().replace(/\s+/g,' ').slice(0,36).trim().toLocaleLowerCase('nl');
  function parse(hash,search=''){
    if(!String(hash).startsWith(fragmentPrefix))return null;
    // A conflicting route or an invalid/empty selection must never show all.
    if(search)return [];
    try{
      const tags=JSON.parse(decodeURIComponent(hash.slice(fragmentPrefix.length)));
      if(!Array.isArray(tags)||tags.some(tag=>typeof tag!=='string'||!key(tag)))return [];
      return [...new Set(tags.map(key))];
    }catch(_){return [];}
  }
  // The recipient's capability link uses the same compiled presentation.
  // A personal filter is active only on the ordinary owner route.
  const selection=loc=>loc.pathname==='/present'?parse(loc.hash,loc.search):null;
  function href(tags){
    const selected=[...new Set(tags.map(key).filter(Boolean))];
    return '/present'+fragmentPrefix+encodeURIComponent(JSON.stringify(selected));
  }
  function matches(tags,selected){
    if(!selected?.length||!Array.isArray(tags))return false;
    const available=new Set(tags.map(key));
    return selected.every(tag=>available.has(tag));
  }
  // Intersect the already-indexed existing Home topic entries. Count stable
  // memory IDs, not tags or photos. No second read from IndexedDB.
  function intersect(entries,selected){
    if(!selected.size)return [];
    const groups=[];
    for(const tag of selected){
      const entry=entries.get(tag);
      if(!entry)return [];
      groups.push(entry.ids);
    }
    groups.sort((a,b)=>a.size-b.size);
    return [...groups[0]].filter(id=>groups.every(group=>group.has(id)));
  }
  const translate=(name,params)=>window.TaleraI18n.t('core.topicSearch.'+name,params);
  let home=null;
  const relabel=()=>{if(home){home.summary.textContent=translate('toggle');home.legend.textContent=translate('choose');home.submit.textContent=translate('open');home.update?.();}};
  function render(grid,available){
    if(!available.length){
      home?.root.remove();
      document.removeEventListener('talera:languagechange',relabel);
      home=null;
      return;
    }
    if(!home){
      const root=document.createElement('details');
      root.id='talera-characteristic-search';
      root.setAttribute('data-talera-explicit-language','');
      const summary=document.createElement('summary');
      const field=document.createElement('fieldset');
      const legend=document.createElement('legend');
      const choices=document.createElement('div');
      choices.className='talera-characteristic-choices';
      const status=document.createElement('p');
      status.setAttribute('role','status');
      const submit=document.createElement('button');
      submit.type='button';
      field.append(legend,choices,status,submit);
      root.append(summary,field);
      grid.after(root);
      home={root,summary,legend,choices,status,submit,entries:new Map(),selected:new Set(),inputs:new Map()};
      document.addEventListener('talera:languagechange',relabel);
      submit.addEventListener('click',()=>{
        if(!home||!intersect(home.entries,home.selected).length)return;
        location.assign(href([...home.selected]));
      });
    }
    const {summary,legend,choices,status,submit,selected,inputs}=home;
    const entries=new Map();
    for(const entry of available){
      const k=key(entry.name);
      if(!k)continue;
      if(!entries.has(k))entries.set(k,{name:entry.name,ids:new Set()});
      for(const row of entry.memories)if(row?.id)entries.get(k).ids.add(String(row.id));
    }
    home.entries=entries;
    // When a selected tag disappears, do not silently broaden the selection.
    if([...selected].some(k=>!entries.has(k)))selected.clear();
    const update=()=>{
      const count=intersect(entries,selected).length;
      status.textContent=selected.size?translate(count===0?'zero':count===1?'one':'many',{count}):translate('choose');
      submit.disabled=!count;
    };
    for(const [k,input] of inputs)if(!entries.has(k)){
      input.parentElement.remove();inputs.delete(k);
    }
    // Preserve focus, native checkboxes and the scroll position on refresh.
    let position=choices.firstElementChild;
    for(const [k,entry] of entries){
      let input=inputs.get(k);
      if(!input){
        const label=document.createElement('label');
        input=document.createElement('input');
        input.type='checkbox';
        const name=document.createElement('span');
        label.append(input,name);
        inputs.set(k,input);
        input.addEventListener('change',()=>{
          if(input.checked)selected.add(k);else selected.delete(k);
          home.update();
        });
      }
      const label=input.parentElement;
      label.lastElementChild.textContent=entry.name;
      input.checked=selected.has(k);
      if(label!==position)choices.insertBefore(label,position);
      position=label.nextElementSibling;
    }
    home.update=update;
    relabel();
  }
  function showEmpty(){
    let root=document.getElementById('talera-characteristic-empty');
    if(!root){
      root=document.createElement('section');
      root.id='talera-characteristic-empty';
      root.setAttribute('data-talera-explicit-language','');
      root.setAttribute('role','status');
      root.append(document.createElement('p'),document.createElement('a'));
      root.lastElementChild.href='/mijn-leven';
      document.body.append(root);
      document.addEventListener('talera:languagechange',showEmpty);
    }
    root.firstElementChild.textContent=translate('zero');
    root.lastElementChild.textContent=translate('back');
  }
  return {key,parse,selection,href,matches,intersect,render,showEmpty};
}

const browser='<script id="talera-characteristic-search-script">window.__taleraCharacteristicSearch=('+createTopicSearch.toString()+')();</script>';
const style='<style id="talera-characteristic-search-style">'+
  '#talera-characteristic-search{margin:10px 0 16px;color:inherit;text-align:left}'+
  '#talera-characteristic-search summary{cursor:pointer;min-height:44px;display:list-item;padding:12px 4px;box-sizing:border-box;font:inherit;font-weight:600}'+
  '#talera-characteristic-search fieldset{min-width:0;border:1px solid #7291a555;border-radius:12px;padding:12px;margin:0}'+
  '#talera-characteristic-search legend{padding:0 6px;font-size:14px}'+
  '.talera-characteristic-choices{max-height:min(42vh,340px);overflow-y:auto;overscroll-behavior:contain}'+
  '.talera-characteristic-choices label{display:flex;align-items:center;gap:12px;min-height:44px;padding:6px;box-sizing:border-box;cursor:pointer;overflow-wrap:anywhere}'+
  '.talera-characteristic-choices input{flex:none;width:20px;height:20px;accent-color:#284d67}'+
  '#talera-characteristic-search p{font-size:14px;margin:10px 0}'+
  '#talera-characteristic-search button,#talera-characteristic-empty a{display:block;min-height:44px;box-sizing:border-box;padding:10px 16px;border:0;border-radius:10px;background:#284d67;color:#fff;font:inherit;text-align:center}'+
  '#talera-characteristic-search button{width:100%;cursor:pointer}'+
  '#talera-characteristic-search button:disabled{opacity:.5;cursor:default}'+
  '#talera-characteristic-empty{position:fixed;z-index:9999;top:50%;left:50%;transform:translate(-50%,-50%);width:min(86%,340px);box-sizing:border-box;padding:20px;border-radius:16px;color:#173a5d;background:#fff;text-align:center;box-shadow:0 4px 24px #0003}'+
  '</style>';
function replaceOne(html,before,after,label){
  assert.equal(html.split(before).length,2,'F5_CHARACTERISTIC_SEARCH_SOURCE_DRIFT_'+label);
  return html.replace(before,()=>after);
}
function include(html){return replaceOne(html,'<head>','<head>'+browser+style,'HEAD');}
export function installCharacteristicSearchHome(html){
  const available="const available=[...topics.values()].sort((a,b)=>normalized(a.name).localeCompare(normalized(b.name),'nl'));";
  html=replaceOne(html,available,available+"\n if(location.pathname==='/mijn-leven')window.__taleraCharacteristicSearch.render(grid,available);",'HOME_TOPICS');
  return include(html);
}
export function installCharacteristicSearchPresentation(html){
  const active='const TALERA_ACTIVE_TOPIC = new URLSearchParams(location.search).get("theme")||"";';
  html=replaceOne(html,active,active+'\nconst TALERA_ACTIVE_FEATURES=window.__taleraCharacteristicSearch.selection(location);','ACTIVE');
  const scope='const taleraMatchesScope = m => taleraMatchesTopic(m.tags) && taleraMatchesDecade(m) && (!TALERA_ACTIVE_TOPIC || !!m._taleraLocal);';
  html=replaceOne(html,scope,'const taleraMatchesScope = m => TALERA_ACTIVE_FEATURES!==null ? (!!m._taleraLocal && window.__taleraCharacteristicSearch.matches(m.tags,TALERA_ACTIVE_FEATURES)) : (taleraMatchesTopic(m.tags) && taleraMatchesDecade(m) && (!TALERA_ACTIVE_TOPIC || !!m._taleraLocal));','SCOPE');
  const condition='if(TALERA_ACTIVE_TOPIC){';
  assert.equal(html.split(condition).length,3,'F5_CHARACTERISTIC_SEARCH_SOURCE_DRIFT_CONDITIONS');
  html=html.replaceAll(condition,'if(TALERA_ACTIVE_TOPIC||TALERA_ACTIVE_FEATURES!==null){');
  const empty="if(!incoming.length){location.replace('/mijn-leven');return 0;}";
  html=replaceOne(html,empty,"if(!incoming.length){if(TALERA_ACTIVE_FEATURES!==null){MEMORIES.splice(0,MEMORIES.length);taleraRebuildDensity();window.__taleraCharacteristicSearch.showEmpty();}else location.replace('/mijn-leven');return 0;}",'EMPTY');
  const guard="if(new URLSearchParams(location.search).has('theme'))document.documentElement.classList.add('talera-topic-loading');";
  html=replaceOne(html,guard,"if(new URLSearchParams(location.search).has('theme')||window.__taleraCharacteristicSearch.selection(location)!==null)document.documentElement.classList.add('talera-topic-loading');window.addEventListener('hashchange',event=>{const api=window.__taleraCharacteristicSearch;if(api.selection(new URL(event.oldURL))!==null||api.selection(new URL(event.newURL))!==null)location.reload();});",'GUARD');
  // Limit conversion, map and initial cover warming to matching *own* rows.
  // The same existing date order, IDs, media and timeline are retained.
  const conversion='const memories=rows.map(toMemory).filter(Boolean);';
  html=replaceOne(html,conversion,"const memories=(TALERA_ACTIVE_FEATURES===null?rows:rows.filter(row=>row?.source==='pwa-local'&&window.__taleraCharacteristicSearch.matches(row.tags,TALERA_ACTIVE_FEATURES))).map(toMemory).filter(Boolean);",'METADATA');
  return include(html);
}

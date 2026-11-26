import {languageCatalog} from './f5-language-catalog.mjs';
export const languages=Object.freeze(Object.keys(languageCatalog));
export const preferenceKey='talera-interface-language-v1';
export function chooseLanguage(preferred,device=[]){
 const supported=x=>typeof x==='string'&&Object.hasOwn(languageCatalog,x);
 if(supported(preferred))return preferred;
 for(const raw of device){const l=String(raw).toLowerCase().split('-')[0];if(supported(l))return l}
 return 'en';
}
export function requestLanguage(request){
 return chooseLanguage(null,(request?.headers?.get('accept-language')||'').split(',').map(item=>item.split(';')[0].trim()));
}
export function translate(language,key,params={}){
 const text=languageCatalog[language]?.[key]??languageCatalog.en[key];
 if(typeof text!=='string')throw Error('TALERA_MISSING_LANGUAGE_KEY: '+key);
 return text.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(whole,name)=>Object.hasOwn(params,name)?String(params[name]):whole);
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function languageText(key,params={}){return esc(translate('nl',key,params))}
export function languageSpan(key,params={},boldParam){
 const data=Object.keys(params).length?' data-talera-params="'+esc(JSON.stringify(params))+'"':'';
 const b=boldParam?' data-talera-bold="'+esc(boldParam)+'"':'';
 const text=boldParam?languageText(key,{...params,[boldParam]:'{'+boldParam+'}'}).replace('{'+boldParam+'}','<strong>'+esc(params[boldParam])+'</strong>'):languageText(key,params);
 return '<span data-talera-text="'+esc(key)+'"'+data+b+'>'+text+'</span>';
}
// Browser only receives the exact subset for this route. The same offline shell contains it.
export function languageBootstrap(prefixes){
 const packs=Object.fromEntries(languages.map(l=>[l,Object.fromEntries(Object.entries(languageCatalog[l]).filter(([key])=>prefixes.some(p=>key.startsWith(p))))]));
 const safe=JSON.stringify(packs).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return "("+function(packs,prefKey){
  const has=l=>typeof l==='string'&&Object.prototype.hasOwnProperty.call(packs,l);
  let saved;try{saved=localStorage.getItem(prefKey)}catch{}
  const browser=(navigator.languages?.length?navigator.languages:[navigator.language]).map(x=>String(x).toLowerCase().split('-')[0]);
  const language=has(saved)?saved:browser.find(has)||'en';
  const t=(key,params={})=>{
   const value=packs[language]?.[key]??packs.en[key];
   if(typeof value!=='string')throw Error('TALERA_MISSING_LANGUAGE_KEY: '+key);
   return value.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(whole,k)=>Object.prototype.hasOwnProperty.call(params,k)?String(params[k]):whole);
  };
  window.TaleraLanguage=Object.freeze({language,t});
  document.documentElement.lang=language;
  for(const el of document.querySelectorAll('[data-talera-text]')){
   const params=JSON.parse(el.dataset.taleraParams||'{}'),bold=el.dataset.taleraBold;
   if(bold){
    const chunks=t(el.dataset.taleraText,{...params,[bold]:'{'+bold+'}'}).split('{'+bold+'}');
    const strong=document.createElement('strong');strong.textContent=String(params[bold]);
    el.replaceChildren(chunks[0],strong,chunks.slice(1).join('{'+bold+'}'));
   }else el.textContent=t(el.dataset.taleraText,params);
  }
  for(const attr of ['aria-label','title','placeholder','alt']){
   for(const el of document.querySelectorAll('[data-talera-'+attr+']'))el.setAttribute(attr,t(el.getAttribute('data-talera-'+attr)));
  }
 }.toString()+")("+safe+","+JSON.stringify(preferenceKey)+");";
}

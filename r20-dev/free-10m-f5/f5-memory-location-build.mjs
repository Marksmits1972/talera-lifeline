import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const moduleSource=readFileSync(new URL('./f5-memory-location.mjs',import.meta.url),'utf8');
const split=moduleSource.indexOf('export function mountMemoryLocationEditor(');
assert.ok(split>0&&!moduleSource.includes('</script'));
const shared=moduleSource.slice(0,split).replaceAll('export function ','function ');
const editor=moduleSource.slice(split).replaceAll('export function ','function ');
const flags=JSON.parse(readFileSync(new URL('./f5-capture-flags.json',import.meta.url),'utf8')).positions;
const codes=Object.keys(flags).filter(code=>!['AN','CS'].includes(code)); // obsolete country codes, never offer for new manual selection
const sprite=readFileSync(new URL('./f5-capture-flags.png',import.meta.url)).toString('base64');
export const memoryLocationCountryCodes=Object.freeze(codes);
export const memoryLocationSharedSource=shared;
const exact=(html,a,b,label)=>{assert.equal(html.split(a).length,2,'MEMORY_LOCATION_DRIFT_'+label);return html.replace(a,()=>b)};
export function installMemoryLocationStore(html){
 // Insert before the original save marker, which must remain unchanged for
 // the existing canonical-ID and atomic transaction adapters.
 const save='async function save(input,uploads,editId){';
 html=exact(html,save,shared+'\nconst taleraLocationCountryCodes='+JSON.stringify(codes)+';\n'+save,'SAVE_SOURCE');
 html=exact(html,"place:place||existing.place||'',text:text,tags:tags,","place:place||existing.place||'',text:text,tags:tags,...manualLocationPatch(existing,input,taleraLocationCountryCodes),",'TEXT_SAVE');
 html=exact(html,"place:place,text:text,tags:Array.isArray(input.tags)?","place:place,text:text,...manualLocationPatch(existing,input,taleraLocationCountryCodes),tags:Array.isArray(input.tags)?",'MEDIA_SAVE');
 return html;
}
export function installMemoryLocationEditor(html){
 const hook='function workView(){';
 html=exact(html,hook,shared+'\n'+editor+'\n'+hook,'WORK_VIEW');
 const mount='taleraV16InstallToolbar(g);';
 html=exact(html,mount,mount+"\n mountMemoryLocationEditor({g,anchor:main.querySelector('.talera-tags-v20'),saveDraft,readStory:id=>mem.get(id),flagPositions:"+JSON.stringify(flags)+",codes:"+JSON.stringify(codes)+"});",'MOUNT');
 // Optional key absent from existing drafts. Canonical-ID adapter still sees
 // its exact unchanged voiceDurationMs/ existing tail.
 const snapshot='function snapshot(){return groups.map(g=>({tags:';
 html=exact(html,snapshot,"function snapshot(){return groups.map(g=>({...(Object.hasOwn(g,'manualLocation')?{manualLocation:g.manualLocation}:{}),tags:",'DRAFT');
 const boot='existing:row.id},entries=[];';
 html=exact(html,boot,"existing:row.id,...(Object.hasOwn(row,'manualLocation')?{manualLocation:row.manualLocation}:{})},entries=[];",'LOAD');
 const write='mem.save({title,date:g.date,time:';
 html=exact(html,write,"mem.save({... (Object.hasOwn(g,'manualLocation')?{manualLocation:g.manualLocation}:{}),title,date:g.date,time:",'PUBLISH');
 const css=`<style id="talera-memory-location-css">
#app #main .work .talera-memory-location{margin:5px 0 8px;min-width:0;flex:none;background:#f5f8fc;color:#173b64;border:1px solid #dbe4ef;border-radius:15px;box-sizing:border-box}
.talera-memory-location [hidden]{display:none!important}
/* A compact two-row photo grid has limited space. Opening the existing
   characteristics keeps its approved two visible rows and footer geometry.
   The optional location section reappears immediately when it is closed. */
@media(max-height:760px){#app #main .work:has(.talera-work-tiles .tile:nth-child(4)):has(.talera-tags-toggle[aria-expanded="true"]) .talera-memory-location{display:none!important}}
#app #main .work .talera-location-toggle{display:flex;align-items:center;width:100%;gap:9px;min-height:48px;background:transparent;border:0;padding:10px 12px;color:#224d7c;border-radius:15px;font:700 clamp(13px,3.85vw,15px)/1.32 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;text-align:left;cursor:pointer}
.talera-location-pin{width:22px;height:22px;display:block;flex:none}.talera-location-pin svg{display:block;width:100%;height:100%}
.talera-location-title{flex:1;min-width:0}
.talera-location-chevron{width:9px;height:9px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;box-sizing:border-box;transform:rotate(45deg);margin:0 2px 4px 0;flex:none}
.talera-location-toggle[aria-expanded="true"] .talera-location-chevron{transform:rotate(225deg);margin:4px 2px 0 0}
.talera-location-panel{padding:0 12px 12px;display:grid;gap:5px}
.talera-location-label{font:700 14px/1.3 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#173b64;margin:6px 0 0}
#app #main .work .talera-location-country,#app #main .work .talera-location-city{width:100%;box-sizing:border-box;min-height:44px;padding:8px 12px;background:white;color:#0b1b3c;border:1px solid #b9c8da;border-radius:10px;font:500 16px/1.3 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;min-width:0}
#app #main .work .talera-location-country{display:flex;align-items:center;text-align:left;gap:8px;cursor:pointer}
.talera-location-country-name{flex:1;min-width:0;overflow-wrap:anywhere}
.talera-location-country.empty .talera-location-country-name,.talera-location-city::placeholder,.talera-location-search::placeholder{color:#687c91;opacity:1}
.talera-location-flag{display:block;flex:0 0 16px;width:16px;height:11px;background-repeat:no-repeat;background-image:url(data:image/png;base64,${sprite})}
.talera-location-status{font:400 12px/1.4 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#657a91;margin:4px 0 0}
#app #main .work .talera-location-clear{background:transparent;border:0;color:#224d7c;text-align:left;font-size:13px;font-weight:600;min-height:36px;padding:4px 0;cursor:pointer}
.talera-location-dialog{position:fixed;inset:auto 0 0;margin:0 auto;max-width:520px;width:100%;max-height:min(79dvh,600px);box-sizing:border-box;padding:9px 16px max(14px,env(safe-area-inset-bottom));border:0;border-radius:22px 22px 0 0;background:#fff;color:#0b1b3c;overflow:hidden}
.talera-location-dialog[open]{display:flex;flex-direction:column;gap:8px}
.talera-location-dialog::backdrop{background:rgba(12,24,43,.48)}
.talera-location-grip{width:36px;height:4px;border-radius:4px;background:#b7c2cf;margin:0 auto;flex:none}
.talera-location-dialog-header{display:flex;align-items:center;justify-content:center;position:relative;min-height:44px;flex:none}
.talera-location-dialog-header h2{margin:0;padding:0 44px;font:700 18px/1.3 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;text-align:center}
.talera-location-dialog .talera-location-close{position:absolute;right:0;top:0;min-height:44px;min-width:44px;font-size:26px;padding:0;border:0;background:transparent;color:#0b1b3c}
.talera-location-dialog .talera-location-search{box-sizing:border-box;width:100%;min-height:44px;border:1px solid #dbe4ef;background:#f5f8fc;border-radius:16px;color:#0b1b3c;padding:10px 12px;font-size:16px;flex:none}
.talera-location-choices{overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;min-height:0;-webkit-overflow-scrolling:touch}
.talera-location-dialog .talera-location-choice{display:flex;align-items:center;gap:12px;min-height:44px;width:100%;box-sizing:border-box;padding:10px 5px;border:0;border-bottom:1px solid #e4e9f1;background:white;color:#0b1b3c;font:600 16px/1.3 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;text-align:left;cursor:pointer}
.talera-location-dialog .talera-location-choice[aria-pressed="true"]{background:#eaf1fa}
.talera-location-no-results{color:#657a91;padding:10px 5px}
.talera-memory-location :focus-visible{outline:2px solid #224d7c;outline-offset:2px}
</style>`;
 return exact(html,'</head>',css+'</head>','STYLE');
}

export const WORKBLAD_DIRECT_OPEN_GUARD_SCRIPT = String.raw`<script>(function(){
var fresh=false,resolved=false,userPickedDate=false;
try{
  var q=new URLSearchParams(location.search);
  fresh=!q.get('edit');
}catch(e){fresh=true}
if(!fresh)return;

function hasMeaningfulDraft(){
  try{
    if(typeof state==='undefined')return false;
    if(String(state.workTitle||'').trim())return true;
    if(String(state.workText||'').trim())return true;
    if(Array.isArray(state.workMedia)&&state.workMedia.length)return true;
    if(state.audioBlob||state.hasExistingAudio)return true;
    return false;
  }catch(e){return false}
}
function clearVisibleDate(){
  if(userPickedDate)return;
  try{if(typeof state!=='undefined')state.workDate=''}catch(e){}
  var el=document.getElementById('workDate');
  if(el){
    el.value='';
    el.placeholder='Wanneer speelde dit verhaal zich af?';
  }
}
async function clearPersistedDateOnlyDraft(){
  try{
    var db=await new Promise(function(ok,no){
      var r=indexedDB.open('talera-workblad-v2',1);
      r.onsuccess=function(){ok(r.result)};
      r.onerror=function(){no(r.error)};
      r.onupgradeneeded=function(){if(!r.result.objectStoreNames.contains('drafts'))r.result.createObjectStore('drafts',{keyPath:'id'})};
    });
    await new Promise(function(ok,no){
      var tx=db.transaction('drafts','readwrite');
      var store=tx.objectStore('drafts');
      var get=store.get('current');
      get.onsuccess=function(){
        var d=get.result;
        var meaningful=d&&(String(d.title||'').trim()||String(d.text||'').trim()||(Array.isArray(d.photos)&&d.photos.length)||d.audio);
        if(d&&!meaningful)store.delete('current');
      };
      tx.oncomplete=ok;tx.onerror=function(){no(tx.error)};
    });
    db.close();
  }catch(e){}
  try{
    var p=JSON.parse(localStorage.getItem('talera-workblad-text-v2')||'null');
    if(p&&!String(p.title||'').trim()&&!String(p.text||'').trim())localStorage.removeItem('talera-workblad-text-v2');
  }catch(e){}
}
function reconcile(){
  if(resolved||userPickedDate)return;
  if(hasMeaningfulDraft()){
    resolved=true;
    return;
  }
  clearVisibleDate();
  clearPersistedDateOnlyDraft();
}

document.addEventListener('input',function(e){
  if(e.target&&e.target.id==='workDate'&&document.querySelector('.talera-date-backdrop')){
    userPickedDate=true;
    resolved=true;
  }
},true);

clearVisibleDate();
[40,120,260,520,900,1400].forEach(function(ms){setTimeout(reconcile,ms)});
window.addEventListener('pageshow',function(){setTimeout(reconcile,60)});
})();</scr`+`ipt>`;

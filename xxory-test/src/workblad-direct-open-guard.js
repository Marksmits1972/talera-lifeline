export const WORKBLAD_DIRECT_OPEN_GUARD_SCRIPT = String.raw`<script>(function(){
function isDirectFreshOpen(){
  try{
    var q=new URLSearchParams(location.search);
    return !q.get('edit')&&!q.get('at')&&q.get('new')!=='1';
  }catch(e){return true}
}
function hasMeaningfulDraft(){
  try{
    if(typeof state==='undefined')return true;
    if(String(state.workTitle||'').trim())return true;
    if(String(state.workText||'').trim())return true;
    if(Array.isArray(state.workMedia)&&state.workMedia.length)return true;
    if(state.audioBlob||state.hasExistingAudio)return true;
    return false;
  }catch(e){return true}
}
async function clearDateOnlyDraft(){
  if(!isDirectFreshOpen()||hasMeaningfulDraft())return;
  try{
    if(typeof state!=='undefined')state.workDate='';
    var el=document.getElementById('workDate');
    if(el){el.value='';el.placeholder='Wanneer speelde dit verhaal zich af? Bijvoorbeeld zomer 1987';}
  }catch(e){}
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
        if(d&&!String(d.title||'').trim()&&!String(d.text||'').trim()&&!(Array.isArray(d.photos)&&d.photos.length)&&!d.audio){store.delete('current')}
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
setTimeout(clearDateOnlyDraft,0);
})();</scr`+`ipt>`;

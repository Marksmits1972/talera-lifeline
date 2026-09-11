export const WORKBLAD_AUDIO_PERSIST_SCRIPT = String.raw`<script>(function(){
async function persistEditedAudio(){
  if(typeof state==='undefined')return;
  if(!state.editingStoryId||!state.editingToken)return;
  if(!(state.audioBlob instanceof Blob)||!state.audioBlob.size)return;

  var fd=new FormData();
  fd.append('audio',state.audioBlob,'verhaal-opname');
  fd.append('durationSeconds',String(Number(state.duration)||0));
  var res=await fetch('/api/integration/stories/'+encodeURIComponent(state.editingStoryId)+'/audio',{
    method:'PUT',
    headers:{'authorization':'Bearer '+state.editingToken},
    body:fd
  });
  var data={};
  try{data=await res.json()}catch(e){}
  if(!res.ok)throw new Error(data.error||'De gesproken opname kon niet worden opgeslagen.');
  state.hasExistingAudio=true;
}

function install(){
  var b=document.getElementById('workFinish');
  if(!b||b.dataset.audioPersistWrapped==='1')return;
  var original=b.onclick;
  if(typeof original!=='function')return;
  b.dataset.audioPersistWrapped='1';
  b.onclick=async function(e){
    if(b.dataset.audioSaving==='1')return;
    b.dataset.audioSaving='1';
    b.disabled=true;
    try{
      await persistEditedAudio();
      return await original.call(this,e);
    }catch(error){
      if(typeof state!=='undefined')state.workError=error&&error.message?error.message:'De gesproken opname kon niet worden opgeslagen.';
      if(typeof renderWorkblad==='function')renderWorkblad();
    }finally{
      b.dataset.audioSaving='0';
      b.disabled=false;
    }
  };
}

var observer=new MutationObserver(install);
observer.observe(document.documentElement,{childList:true,subtree:true});
install();
})();</scr`+`ipt>`;

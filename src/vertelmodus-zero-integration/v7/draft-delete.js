
/* V7 draft deletion. Only the selected card, with explicit confirmation. */
function taleraV7AskDelete(gid){
 const g=groups.find(x=>x.id===gid);if(!g||document.getElementById('taleraV7DeleteDialog'))return;
 const dlg=document.createElement('div');dlg.id='taleraV7DeleteDialog';dlg.setAttribute('role','dialog');
 dlg.setAttribute('aria-modal','true');dlg.setAttribute('aria-label','Herinnering verwijderen');
 dlg.innerHTML='<div class="talera-v7-delete-sheet"><h2>Herinnering verwijderen?</h2>'+
 '<p>Weet je zeker dat je deze herinnering wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</p>'+
 (g.existing?'<p>Een al gepubliceerde herinnering blijft op je tijdlijn staan. Alleen dit bewerkconcept wordt verwijderd.</p>':'')+
 '<div class="talera-v7-delete-actions"><button type="button" id="taleraV7Cancel">Annuleren</button>'+
 '<button type="button" id="taleraV7Confirm">Verwijderen</button></div></div>';
 document.body.append(dlg);
 const cancel=()=>dlg.remove();
 dlg.querySelector('#taleraV7Cancel').onclick=cancel;
 dlg.addEventListener('click',e=>{if(e.target===dlg)cancel()});
 dlg.querySelector('#taleraV7Confirm').onclick=async()=>{
  const confirm=dlg.querySelector('#taleraV7Confirm');
  confirm.disabled=true;confirm.textContent='Bezig…';
  try{
   await queue;await savingOriginals;
   const oldGroups=groups;
   groups=groups.filter(x=>x!==g);
   try{await saveDraft()}catch(err){groups=oldGroups;throw err}
   const unused=[...new Set([...g.media,...(g.voice?[g.voice]:[])])].filter(id=>!groups.some(x=>x.media.includes(id)||x.voice===id));
   if(unused.length){
    try{await deleteFiles(unused.flatMap(id=>[id,'preview:'+id]))}
    catch(e){console.warn('TALERA: orphan cleanup was not completed',e)}
    unused.forEach(id=>{revoke(id);assets.delete(id)});
   }
   dlg.remove();if(current===gid)current=groups[0]?.id||'';
   if(groups.length)open('overview');else open('start');
  }catch(e){confirm.disabled=false;confirm.textContent='Verwijderen';showError('Verwijderen is niet gelukt: '+e.message)}
 };
 dlg.querySelector('#taleraV7Cancel').focus();
}


/* V7 deletion of local (not shared) published memories on Mijn leven.
   The core TaleraMemories.remove uses one IndexedDB transaction for the story
   and only unreferenced file keys, including phone renditions. */
(function(){
 if(window.__taleraV7DeleteInstalled)return;
 window.__taleraV7DeleteInstalled=true;
 let refresh=0;
 function bind(){
  for(const a of document.querySelectorAll('a[href*="/present?memory=local-"]')){
   const href=new URL(a.href,location.href),id=href.searchParams.get('memory');
   if(!id||!/^local-[a-z0-9-]+$/i.test(id))continue;
   const card=a.closest('.memory-card,.story-card,article,.card,li')||a.parentElement;
   if(!card||card.querySelector('.talera-v7-published-delete'))continue;
   card.classList.add('talera-v7-published-card');
   const del=document.createElement('button');
   del.type='button';del.className='talera-v7-published-delete';
   del.setAttribute('aria-label','Herinnering verwijderen');del.title='Herinnering verwijderen';
   del.textContent='×';card.appendChild(del);
   del.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    if(document.getElementById('taleraV7PublishedConfirm'))return;
    const overlay=document.createElement('section');
    overlay.id='taleraV7PublishedConfirm';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Herinnering verwijderen');
    overlay.innerHTML='<div class="talera-v7-published-sheet"><h2>Herinnering verwijderen?</h2>'+
     '<p>Weet je zeker dat je deze herinnering wilt verwijderen? Foto’s, tekst en stemopname worden verwijderd en kunnen niet worden teruggehaald.</p>'+
     '<div><button type="button" id="taleraV7PublishedCancel">Annuleren</button>'+
     '<button type="button" id="taleraV7PublishedConfirmButton">Verwijderen</button></div></div>';
    document.body.append(overlay);
    const cancel=()=>overlay.remove();
    overlay.querySelector('#taleraV7PublishedCancel').onclick=cancel;
    overlay.querySelector('#taleraV7PublishedConfirmButton').onclick=async()=>{
     const action=overlay.querySelector('#taleraV7PublishedConfirmButton');action.disabled=true;action.textContent='Bezig…';
     try{
      if(typeof window.TaleraMemories?.remove!=='function')throw Error('Opslag is nog niet beschikbaar');
      await window.TaleraMemories.remove(id);
      overlay.remove();
      // Rebuild all timeline indexes, cards and active selections from surviving records.
      location.assign('/mijn-leven');
     }catch(err){
      action.disabled=false;action.textContent='Verwijderen';
      let msg=overlay.querySelector('[role="alert"]');
      if(!msg){msg=document.createElement('p');msg.setAttribute('role','alert');overlay.querySelector('.talera-v7-published-sheet').append(msg)}
      msg.textContent='Verwijderen mislukt: '+err.message;
     }
    };
    overlay.querySelector('#taleraV7PublishedCancel').focus();
   });
  }
 }
 const schedule=()=>{if(!refresh)refresh=requestAnimationFrame(()=>{refresh=0;bind()})};
 const watch=new MutationObserver(schedule);
 watch.observe(document.documentElement,{subtree:true,childList:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();

/* Injected INSIDE existing /tell closure after setupV10; reuses tileHtml, enableDrag, saveDraft. */
function taleraCompactWorkbench(g){
 const work=main.querySelector('.work'),details=$('details'),frame=$('frame');
 if(!work||!details||!frame)return;
 work.classList.add('talera-compact-work');
 const tiles=document.createElement('section');
 tiles.className='talera-work-tiles card';
 tiles.dataset.group=g.id;
 tiles.setAttribute('aria-label','Beelden van deze herinnering. Houd vast om te verslepen.');
 tiles.innerHTML='<div class="tiles">'+g.media.map(id=>tileHtml(id,g.id)).join('')+'</div>';
 details.insertAdjacentElement('afterend',tiles);
 tiles.querySelectorAll('.tile').forEach(enableDrag);
 const speak=$('speak'),write=$('write');
 if(speak)speak.textContent='🎙 Vertellen';
 if(write){
  write.textContent='✎ Schrijven';
  write.onclick=()=>{
   if($('taleraWriterOverlay'))return;
   const overlay=document.createElement('section');
   overlay.id='taleraWriterOverlay';
   overlay.setAttribute('role','dialog');
   overlay.setAttribute('aria-modal','true');
   overlay.setAttribute('aria-label','Schrijf jouw herinnering');
   overlay.innerHTML='<div class="talera-writer-top"><strong>Mijn verhaal</strong><button id="taleraWriterDone" type="button">Klaar</button></div><div class="talera-writer-body"><textarea id="taleraWriterText" aria-label="Schrijf jouw herinnering" placeholder="Schrijf jouw herinnering…"></textarea></div>';
   document.body.appendChild(overlay);
   const editor=$('taleraWriterText'),original=$('story');
   editor.value=original.value;
   editor.addEventListener('input',()=>{
    original.value=editor.value;
    original.dispatchEvent(new Event('input',{bubbles:true}));
   });
   const close=()=>{overlay.remove();if($('draft'))$('draft').textContent='Tekst als concept bewaard'};
   $('taleraWriterDone').onclick=close;
   editor.focus();
  };
 }
}
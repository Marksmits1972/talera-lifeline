
/* V7 reliable writer: same g, same #story and existing taleraV4WriterMotion. */
function taleraV7OpenWriter(g){
 if(!g)return;
 let overlay=document.getElementById('taleraWriterOverlay');
 if(overlay){overlay.querySelector('#taleraWriterText')?.focus();return}
 const original=document.getElementById('story');
 if(!original){showError('Het schrijfveld is nog niet klaar. Probeer opnieuw.');return}
 overlay=document.createElement('section');
 overlay.id='taleraWriterOverlay';overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Schrijf jouw herinnering');
 overlay.innerHTML='<div class="talera-writer-top"><strong>Schrijven</strong><button type="button" id="taleraWriterDone">Klaar</button></div>'+
 '<div class="talera-writer-body"><div id="taleraWriterPhotos" aria-label="Beelden bij deze herinnering"></div>'+
 '<textarea id="taleraWriterText" aria-label="Schrijf jouw herinnering" placeholder="Wat wil je over dit moment vertellen?"></textarea></div>';
 const strip=overlay.querySelector('#taleraWriterPhotos');
 strip.innerHTML=g.media.map((id,index)=>{
  const file=assets.get(id);
  return '<div class="talera-writer-thumbnail"><img src="'+escapeHtml(url(id))+'" alt="Beeld '+(index+1)+'">'+
  (kind(file)==='video'?'<span aria-label="Video">▶</span>':'')+'</div>';
 }).join('');
 if(!g.media.length)strip.hidden=true;
 document.body.append(overlay);
 const input=overlay.querySelector('#taleraWriterText');
 input.value=g.text||original.value||'';
 const changed=()=>{
  g.text=input.value;
  original.value=input.value;
  original.dispatchEvent(new Event('input',{bubbles:true}));
 };
 input.addEventListener('input',changed);
 taleraV4WriterMotion(overlay,input);
 let closing=false;
 const close=()=>{
  if(closing)return;closing=true;
  changed();
  overlay.__taleraDisposeWriterV4?.();
  input.blur();overlay.remove();
  saveDraft().catch(e=>showError('Je tekst kon nog niet worden bewaard: '+e.message));
  document.getElementById('write')?.focus({preventScroll:true});
 };
 overlay.querySelector('#taleraWriterDone').onclick=close;
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
 requestAnimationFrame(()=>input.focus({preventScroll:true}));
}
function taleraV7WriterDelegate(e){
 const button=e.target.closest('#write');
 if(!button||!document.getElementById('app')?.contains(button))return;
 const g=active();if(!g)return;
 e.preventDefault();e.stopImmediatePropagation();
 taleraV7OpenWriter(g);
}
document.addEventListener('click',taleraV7WriterDelegate,true);

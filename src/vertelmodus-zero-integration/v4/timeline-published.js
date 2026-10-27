/* On /mijn-leven?published=<id>, reveal the actual card saved in TaleraMemories. */
(function taleraV4ShowPublished(){
 const id=new URLSearchParams(location.search).get('published');
 if(!id||!id.startsWith('local-'))return;
 let completed=false;
 const found=()=>{
  if(completed)return true;
  const url='/present?memory='+encodeURIComponent(id);
  const link=[...document.querySelectorAll('a[href]')].find(a=>a.getAttribute('href')===url);
  if(!link)return false;
  const card=link.closest('.card,article,li,.memory-card,.story-card')||link;
  card.classList.add('talera-v4-recent');
  const info=document.createElement('div');
  info.id='taleraV4Published';
  info.setAttribute('role','status');
  info.textContent='Je herinnering staat op je tijdlijn';
  document.body.append(info);
  completed=true;
  requestAnimationFrame(()=>card.scrollIntoView({behavior:'smooth',block:'center'}));
  return true;
 };
 if(found())return;
 const watch=new MutationObserver(()=>{if(found())watch.disconnect()});
 watch.observe(document.documentElement,{subtree:true,childList:true});
 setTimeout(()=>watch.disconnect(),8500);
})();
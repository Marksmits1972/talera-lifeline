(function(){
 const params=new URLSearchParams(location.search),id=params.get('published');
 if(!id||!/^local-[\w-]+$/.test(id))return;
 let tries=0,found=false;
 const run=async()=>{
  if(found)return;
  if(!window.TaleraMemories?.get){if(++tries<100)setTimeout(run,90);return}
  let row;
  try{row=await window.TaleraMemories.get(id)}catch(e){return}
  if(!row||row.id!==id)return;
  found=true;
  const old=document.getElementById('taleraV4Published');
  if(old)old.hidden=true;
  const container=document.createElement('div');
  container.id='taleraV6Published';
  container.setAttribute('role','status');
  const msg=document.createElement('div');
  msg.className='talera-v6-success-text';
  const when=/^\d{4}-\d{2}-\d{2}$/.test(row.date||'')
   ?new Date(row.date+'T12:00:00').toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'})
   :'de gekozen datum';
  msg.textContent='Op je tijdlijn geplaatst · '+when;
  const view=document.createElement('a');
  view.textContent='Bekijk herinnering';
  view.href='/present?memory='+encodeURIComponent(id);
  view.setAttribute('aria-label','Bekijk je opgeslagen herinnering op de tijdlijn');
  container.append(msg,view);
  document.body.append(container);
  if(old){const watch=new MutationObserver(()=>{const b=document.getElementById('taleraV4Published');if(b)b.hidden=true});watch.observe(document.body,{childList:true,subtree:true});setTimeout(()=>watch.disconnect(),9000)}
 };
 run();
})();
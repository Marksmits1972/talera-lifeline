// Migration entry for old cached shells. This route is never cached by old workers.
const button=document.getElementById('update'),status=document.getElementById('status');
let requested=false;
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(requested)location.replace('/');});
button.onclick=async()=>{
  button.disabled=true;status.textContent='De nieuwste app wordt voorbereid…';
  try{
    if(!navigator.serviceWorker){location.replace('/');return;}
    const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
    await registration.update();
    if(registration.installing)await new Promise((resolve,reject)=>{
      const worker=registration.installing,timer=setTimeout(()=>reject(new Error('De update is nog niet klaar. Probeer opnieuw.')),30000);
      const check=()=>{if(worker.state==='installed'||worker.state==='redundant'){clearTimeout(timer);worker.state==='installed'?resolve():reject(new Error('De update kon niet worden voorbereid. Probeer opnieuw.'));}};
      worker.addEventListener('statechange',check);check();
    });
    if(registration.waiting){requested=true;registration.waiting.postMessage({type:'ACTIVATE'});status.textContent='De app wordt bijgewerkt. Je herinneringen blijven bewaard.';}
    else location.replace('/');
  }catch(error){status.textContent=error.message;button.disabled=false;}
};

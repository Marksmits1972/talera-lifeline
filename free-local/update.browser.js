// Old links show the presentation immediately while the shell updates in the background.
(async()=>{if(!navigator.serviceWorker)return;try{
  let activating=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(activating)location.replace('/');});
  const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
  await registration.update();
  const activate=()=>{if(registration.waiting){activating=true;registration.waiting.postMessage({type:'ACTIVATE'});}else if(!registration.installing)location.replace('/');};
  if(registration.installing)registration.installing.addEventListener('statechange',activate);activate();
}catch{/* Existing local presentation stays usable. */}})();

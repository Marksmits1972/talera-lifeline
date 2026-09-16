export const WORKBLAD_MANAGEMENT_COMPAT_SCRIPT = String.raw`<script id="talera-management-compat">
(() => {
  const NATIVE_ACCEPT='image/jpeg,image/png,image/webp';

  function removeLegacyCleanup(){
    const panel=document.getElementById('talera-story-photo-cleanup-panel');
    if(panel)panel.remove();
    const style=document.getElementById('talera-story-photo-cleanup-style');
    if(style)style.remove();
  }

  function setPhotoStatus(message,bad=false){
    const node=document.querySelector('.talera-storytelling-status');
    if(!node)return;
    node.textContent=String(message||'');
    node.classList.toggle('show',Boolean(message));
    node.classList.toggle('bad',Boolean(message&&bad));
  }

  function refreshStorytelling(){
    requestAnimationFrame(()=>window.__taleraStorytellingPage?.refresh?.(true));
  }

  async function acceptNativePhotoInput(input){
    const files=Array.from(input.files||[]);
    if(!files.length)return;
    setPhotoStatus(files.length===1?'Foto wordt toegevoegd…':files.length+' foto’s worden toegevoegd…');
    try{
      const api=window.__taleraStorytellingActions;
      if(!api||typeof api.addPhotos!=='function')throw new Error('Foto toevoegen is nog niet gekoppeld.');
      const result=await api.addPhotos(files);
      setPhotoStatus(files.length===1?'Foto toegevoegd.':'Foto’s toegevoegd.');
      refreshStorytelling();
      if(result&&result.pending){
        input.dataset.taleraSelectionHeld='1';
      }else{
        input.value='';
        input.dataset.taleraSelectionHeld='0';
      }
    }catch(error){
      input.value='';
      input.dataset.taleraSelectionHeld='0';
      setPhotoStatus('Foto toevoegen lukt nog niet: '+String(error?.message||error),true);
    }
  }

  function makeNativePhotoLabel(source,labelText,ariaLabel){
    if(!source||source.dataset.taleraNativePhoto==='1')return source;
    const label=document.createElement('label');
    label.className=source.className;
    if(source.id)label.id=source.id;
    label.dataset.taleraNativePhoto='1';
    label.setAttribute('aria-label',ariaLabel||labelText||'Foto toevoegen');
    label.style.position='relative';
    label.style.cursor='pointer';
    label.style.overflow='hidden';
    label.textContent=labelText||source.textContent||'Foto toevoegen';

    const input=document.createElement('input');
    input.type='file';
    // Benoem expliciet web-veilige uitvoerformaten. Op iOS/WebKit wordt een foto uit
    // de fotobibliotheek dan zo nodig als compatibele JPEG aangeboden in plaats van
    // dat TALERA een niet-weergeefbare HEIC-blob als preview probeert te gebruiken.
    input.accept=NATIVE_ACCEPT;
    input.multiple=true;
    input.setAttribute('aria-label',ariaLabel||'Kies foto’s');
    input.style.position='absolute';
    input.style.inset='0';
    input.style.width='100%';
    input.style.height='100%';
    input.style.opacity='0';
    input.style.cursor='pointer';
    input.style.zIndex='3';
    input.style.pointerEvents='auto';
    // Houd de zojuist gekozen File-objecten gekoppeld zolang de achtergrond-
    // voorbereiding nog loopt. Wis pas vlak vóór een volgende bewuste keuze,
    // zodat iOS de tijdelijke fotobron niet voortijdig hoeft vrij te geven.
    input.addEventListener('click',()=>{
      if(input.dataset.taleraSelectionHeld==='1'){
        input.value='';
        input.dataset.taleraSelectionHeld='0';
      }
    });
    input.addEventListener('change',()=>acceptNativePhotoInput(input));

    label.appendChild(input);
    source.replaceWith(label);
    return label;
  }

  function installNativePhotoInputs(){
    const shell=document.querySelector('.talera-storytelling-shell');
    if(!shell)return;

    const top=shell.querySelector('#taleraStoryAddPhoto:not([data-talera-native-photo="1"])');
    if(top)makeNativePhotoLabel(top,'+ foto','Foto toevoegen');

    const central=shell.querySelector('.talera-storytelling-add-main:not([data-talera-native-photo="1"])');
    if(central)makeNativePhotoLabel(central,'+','Foto toevoegen');

    const legacy=shell.querySelector('#taleraStoryPhotoInput');
    if(legacy){
      legacy.disabled=true;
      legacy.setAttribute('data-talera-disabled-proxy','1');
    }
  }

  function reconcile(){
    removeLegacyCleanup();
    installNativePhotoInputs();
  }

  document.addEventListener('talera:storytelling-photos-added',refreshStorytelling);
  document.addEventListener('talera:storytelling-photos-prepared',refreshStorytelling);
  reconcile();
  addEventListener('pageshow',reconcile);
  new MutationObserver(()=>requestAnimationFrame(reconcile)).observe(document.documentElement,{subtree:true,childList:true});
})();
</scr`+`ipt>`;

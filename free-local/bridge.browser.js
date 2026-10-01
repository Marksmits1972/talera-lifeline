import {storage} from '/local/storage.js';
import {compactPhoto} from '/local/media.js';
import {t} from '/local/copy.browser.js';
const params=new URLSearchParams(location.hash.slice(1));
let id=params.get('edit')||localStorage.getItem('talera.free.draft')||crypto.randomUUID();
if(new URLSearchParams(location.search).get('new')==='1'){id=crypto.randomUUID();history.replaceState(null,'',location.pathname+location.hash);}
localStorage.setItem('talera.free.draft',id);
let draft={id,title:'',date:'',datePrecision:'unknown',storyText:'',photos:[],createdAt:Date.now(),status:'draft'};
let queue=Promise.resolve();
let failed=false;
function message(text) {const el=document.getElementById('notice');if(el){el.textContent=text;el.classList.add('show');}}
function serialized(action){const next=queue.then(action);queue=next.catch(()=>{});return next;}
const ready=storage.story(id).then(saved=>{if(saved)draft=saved;}).catch(error=>{failed=true;message(error.message);throw error;});
// Compatibility boundary for the frozen UI. Responses are constructed on this device.
window.__taleraFreeApi=async function(path,options={}) {
  try {
    await ready;if(failed)throw new Error(t('storageUnavailable'));
    const url=new URL(path,location.origin),method=options.method||'GET';
    if(url.origin!==location.origin)throw new Error(t('localOnly'));
    if(url.pathname==='/api/storylab-clean/state') {
      if(method==='GET') {await queue;return Response.json(draft);}
      if(method==='PUT')return await serialized(async()=>{
        const input=JSON.parse(options.body);
        const next={...draft,...input,id,datePrecision:input.date?'day':'unknown',status:draft.status};
        // UI metadata is not allowed to overwrite stored blob properties.
        draft=await storage.save(next);
        return Response.json(draft);
      });
    }
    if(url.pathname==='/api/storylab-clean/photo') {
      const mediaId=url.searchParams.get('id');
      if(method==='PUT')return await serialized(async()=>{
        const compact=await compactPhoto(options.body,mediaId);
        await storage.putMedia(compact);
        return Response.json({ok:true,bytes:compact.blob.size,thumbnailBytes:compact.thumbnail.size});
      });
      if(method==='GET') {const media=await storage.media(mediaId);return media?new Response(media.blob):new Response('',{status:404});}
      // The inherited UI removes the reference next; commit that before deleting bytes.
      if(method==='DELETE')return Response.json({ok:true});
    }
    if(url.pathname==='/api/storylab-clean/publish'&&method==='POST')return await serialized(async()=>{
      if(!draft.photos.length||!draft.date)throw new Error(t('choosePhotoDate'));
      if(!draft.storyText.trim())throw new Error(t('writeFirst'));
      draft=await storage.save({...draft,status:'published'});
      return Response.json({ok:true,handoffUrl:'/#story='+encodeURIComponent(id)});
    });
    throw new Error(t('later'));
  }catch(error){message(error.name==='QuotaExceededError'?t('storageFull'):error.message);return Response.json({error:error.message},{status:409});}
};
window.__taleraFreeStorage=storage;
if(location.pathname.startsWith('/tell')) {
  await ready.catch(()=>{});
  for(const script of document.querySelectorAll('script[type="text/talera"]')) {
    const running=document.createElement('script');running.textContent=script.textContent;document.body.appendChild(running);
  }
  const save=document.getElementById('timelinePublish');
  save?.addEventListener('click',event=>{
    const stop=key=>{event.stopImmediatePropagation();message(t(key));};
    if(failed){stop('storageUnavailable');return;}
    if(window.__taleraStoryLabMedia?.isUploading()){stop('photoBusy');return;}
    if(!document.getElementById('dateInput').value){
      stop('addDate');document.getElementById('editBtn').click();document.getElementById('editDate').focus();return;
    }
    if(!document.getElementById('storyText').value.trim()){
      stop('writeFirst');window.__taleraFreeOpenText?.();
    }
  },true);
}else {
  document.querySelector('.tell')?.addEventListener('click',()=>location.href='/tell?new=1',true);
  document.querySelector('.more')?.closest('button')?.addEventListener('click',()=>document.getElementById('freeStorageInfo').showModal());
  document.getElementById('freeStorageClose')?.addEventListener('click',()=>document.getElementById('freeStorageInfo').close());
  try {
    const stories=(await storage.stories()).filter(story=>story.status==='published').sort((a,b)=>a.date.localeCompare(b.date));
    const urls=[],photoBlobs=new Map();
    window.__taleraFreePhotoResponse=async url=>photoBlobs.has(url)?new Response(photoBlobs.get(url)):new Response('',{status:404});
    window.__taleraFreeMemories=[];
    for(const story of stories) {
      const photo=await storage.media(story.photos[0]?.id);
      if(!photo)throw new Error(t('missingPhoto'));
      const url=URL.createObjectURL(photo.blob);urls.push(url);photoBlobs.set(url,photo.blob);
      window.__taleraFreeMemories.push({id:story.id,storyId:story.id,at:story.date+'T12:00:00',ms:new Date(story.date+'T12:00:00').getTime(),story:story.title||story.storyText.slice(0,90),fullStory:story.storyText,image:url,photos:[url]});
    }
    if(!stories.length) {
      document.getElementById('freeEmpty').hidden=false;
    }else {
      for(const script of document.querySelectorAll('script[type="text/talera"]')) {
        const running=document.createElement('script');running.textContent=script.textContent;document.body.appendChild(running);
      }
      const runtime=window.__taleraTimelineRuntime;
      const target=runtime.findMemory({storyId:new URLSearchParams(location.hash.slice(1)).get('story')})||window.__taleraFreeMemories.at(-1);
      runtime.setCenter(new Date(target.at).getTime());runtime.writeMemory(target);runtime.draw();
      document.documentElement.classList.remove('free-loading');
      const edit=document.getElementById('freeEdit');edit.hidden=false;edit.onclick=()=>location.href='/tell#edit='+encodeURIComponent(runtime.currentMemory().storyId);
    }
    window.addEventListener('pagehide',event=>{if(!event.persisted)urls.forEach(url=>URL.revokeObjectURL(url));});
    document.documentElement.classList.remove('free-loading');
  }catch(error){document.getElementById('freeError').textContent=error.message;document.documentElement.classList.remove('free-loading');}
}

import {storage} from '/local/storage.js';
import {compactPhoto} from '/local/media.js';
import {t} from '/local/copy.browser.js';
import {importPhotos} from '/local/photos.js';
import {installTellExperience,installTimelineExperience,installDeviceExperience} from '/local/experience.js';
import {installBackup} from '/local/backup-ui.js';
const params=new URLSearchParams(location.hash.slice(1));
let id=params.get('edit')||localStorage.getItem('talera.free.draft')||crypto.randomUUID();
if(new URLSearchParams(location.search).get('new')==='1'){id=crypto.randomUUID();history.replaceState(null,'',location.pathname+location.hash);}
localStorage.setItem('talera.free.draft',id);
let draft={id,title:'',date:'',datePrecision:'unset',storyText:'',photos:[],createdAt:Date.now(),status:'draft'};
let queue=Promise.resolve();
let failed=false;
function message(text) {const el=document.getElementById('notice');if(el){el.textContent=text;el.classList.add('show');clearTimeout(el.__freeNoticeTimer);el.__freeNoticeTimer=setTimeout(()=>el.classList.remove('show'),4500);}}
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
        const next={...draft,...input,id,datePrecision:input.date?(input.datePrecision==='year'?'year':'day'):(input.datePrecision==='unknown'?'unknown':'unset'),status:draft.status};
        // UI metadata is not allowed to overwrite stored blob properties.
        draft=await storage.save(next);
        window.dispatchEvent(new CustomEvent('talera-free-saved',{detail:{hasPhotos:draft.photos.length>0}}));
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
      if(!draft.photos.length||(!draft.date&&draft.datePrecision!=='unknown'))throw new Error(t('choosePhotoDate'));
      if(!draft.storyText.trim()&&!draft.audioId)throw new Error(t('writeFirst'));
      draft=await storage.save({...draft,status:'published'});
      return Response.json({ok:true,handoffUrl:'/#story='+encodeURIComponent(id)});
    });
    throw new Error(t('later'));
  }catch(error){message(error.name==='QuotaExceededError'?t('storageFull'):error.message);return Response.json({error:error.message},{status:409});}
};
window.__taleraFreeStorage=storage;
installBackup({storage,exclusive:serialized,beforeExport:async()=>{
  await ready;await queue;if(window.__taleraFreeRecording?.busy())throw new Error(t('audioFinishFirst'));
  if(window.__taleraStoryLabMedia?.isUploading())throw new Error(t('photoBusy'));
  if(location.pathname.startsWith('/tell')){
    const response=await window.__taleraFreeApi('/api/storylab-clean/state',{method:'PUT',body:JSON.stringify({...draft,title:document.getElementById('title').value,date:document.getElementById('dateInput').value,storyText:document.getElementById('storyText').value})});
    if(!response.ok)throw new Error((await response.json()).error);
  }
}});
installDeviceExperience();
if(location.pathname.startsWith('/tell')) {
  await ready.catch(()=>{});
  for(const script of document.querySelectorAll('script[type="text/talera"]')) {
    const running=document.createElement('script');running.textContent=script.textContent;document.body.appendChild(running);
  }
  window.__taleraFreeAddPhotos=files=>importPhotos(files,{getStory:()=>draft,existingFingerprints:async()=>(await storage.stories()).flatMap(story=>story.photos.map(photo=>photo.fingerprint).filter(Boolean)),preview:url=>{document.getElementById('bgPhoto').src=url;document.getElementById('screen').classList.add('has-photo');},progress:(done,duplicates,failures,total,error)=>message(error||`${done} / ${total} ${t('photoProgress')}${duplicates?' · '+duplicates+' '+t('photoDuplicate'):''}${failures?' · '+failures+' '+t('photoFailedCount'):''}`),commit:(media,photo)=>serialized(async()=>{
    const next={...draft,title:document.getElementById('title').value,date:document.getElementById('dateInput').value,storyText:document.getElementById('storyText').value,photos:[...draft.photos,photo],currentIndex:draft.photos.length};
    if(!next.date&&photo.captureDate){message(t('photoDateFound'));document.getElementById('editDate').value=photo.captureDate;document.getElementById('editModal').classList.add('open');}
    draft=await storage.commitMedia(next,media);await window.__taleraStoryLabMedia.setState(draft);
    window.dispatchEvent(new CustomEvent('talera-free-saved',{detail:{hasPhotos:true}}));
  })}).catch(error=>message(error.message)).finally(()=>window.__taleraStoryLabMedia.setState(draft));
  installTellExperience({getStory:()=>draft,storage,exclusive:serialized,notice:message,saveAudio:async audio=>{
    draft=await storage.commitMedia({...draft,title:document.getElementById('title').value,date:document.getElementById('dateInput').value,storyText:document.getElementById('storyText').value,audioId:audio.id},audio);await window.__taleraStoryLabMedia.setState(draft);
    window.dispatchEvent(new CustomEvent('talera-free-saved',{detail:{hasPhotos:draft.photos.length>0}}));
  }});
  document.getElementById('freeUnknownDate')?.addEventListener('click',()=>serialized(async()=>{draft=await storage.save({...draft,date:'',datePrecision:'unknown'});await window.__taleraStoryLabMedia.setState(draft);document.getElementById('editModal').classList.remove('open');}));
  const save=document.getElementById('timelinePublish');
  save?.addEventListener('click',event=>{
    const stop=key=>{event.stopImmediatePropagation();message(t(key));};
    if(window.__taleraFreeRecording?.busy()){stop('audioFinishFirst');return;}
    if(failed){stop('storageUnavailable');return;}
    if(window.__taleraStoryLabMedia?.isUploading()){stop('photoBusy');return;}
    if(!document.getElementById('dateInput').value&&draft.datePrecision!=='unknown'){
      stop('addDate');document.getElementById('editBtn').click();document.getElementById('editDate').focus();return;
    }
    if(!document.getElementById('storyText').value.trim()&&!draft.audioId){
      stop('writeFirst');window.__taleraFreeOpenText?.();
    }
  },true);
}else {
  document.querySelector('.tell')?.addEventListener('click',()=>location.href='/tell?new=1',true);
  document.querySelector('.more')?.closest('button')?.addEventListener('click',()=>document.getElementById('freeStorageInfo').showModal());
  document.getElementById('freeStorageClose')?.addEventListener('click',()=>document.getElementById('freeStorageInfo').close());
  try {
    const stories=(await storage.stories()).filter(story=>story.status==='published').sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const urls=[],photoBlobs=new Map();
    window.__taleraFreePhotoResponse=async url=>photoBlobs.has(url)?new Response(photoBlobs.get(url)):new Response('',{status:404});
    window.__taleraFreeMemories=[];
    for(const story of stories) {
      const url='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      window.__taleraFreeMemories.push({id:story.id,storyId:story.id,at:(story.date||new Date(story.createdAt||Date.now()).toISOString().slice(0,10))+'T12:00:00',ms:new Date((story.date||new Date(story.createdAt||Date.now()).toISOString().slice(0,10))+'T12:00:00').getTime(),audioId:story.audioId||'',datePrecision:story.datePrecision,story:story.title||story.storyText.slice(0,90)||t('audioTitle'),fullStory:story.storyText,image:url,photos:[url]});
    }
    if(!stories.length) {
      document.getElementById('freeEmpty').hidden=false;
    }else {
      for(const script of document.querySelectorAll('script[type="text/talera"]')) {
        const running=document.createElement('script');running.textContent=script.textContent;document.body.appendChild(running);
      }
      const runtime=window.__taleraTimelineRuntime;
      installTimelineExperience({runtime,storage,registerPhoto:(url,blob)=>photoBlobs.set(url,blob),releasePhoto:url=>photoBlobs.delete(url)});
      const target=runtime.findMemory({storyId:new URLSearchParams(location.hash.slice(1)).get('story')})||window.__taleraFreeMemories.at(-1);
      runtime.setCenter(new Date(target.at).getTime());runtime.writeMemory(target);runtime.draw();
      window.dispatchEvent(new CustomEvent('talera-free-saved',{detail:{hasPhotos:true,complete:true}}));
      document.documentElement.classList.remove('free-loading');
      const edit=document.getElementById('freeEdit');edit.hidden=false;edit.onclick=()=>location.href='/tell#edit='+encodeURIComponent(runtime.currentMemory().storyId);
    }
    window.addEventListener('pagehide',event=>{if(!event.persisted)urls.forEach(url=>URL.revokeObjectURL(url));});
    document.documentElement.classList.remove('free-loading');
  }catch(error){document.getElementById('freeError').textContent=error.message;document.documentElement.classList.remove('free-loading');}
}

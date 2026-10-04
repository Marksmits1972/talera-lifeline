import {storage} from '/local/storage.js';
import {compactPhoto} from '/local/media.js';
import {t} from '/local/copy.browser.js';
import {importPhotos} from '/local/photos.js';
import {installTellExperience,installTimelineExperience,installDeviceExperience} from '/local/experience.js';
import {validTime,seasonTime,timelineStories,timeLabel} from '/local/dates.js';
import {installTellMedia} from '/local/tell-media.js';
import {installGuidedTell} from '/local/guided.js';
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
        const date=document.getElementById('dateInput')?.value??input.date;
        const eventTime=date?undefined:(draft.eventTime||input.eventTime);
        const next={...draft,...input,title:document.getElementById('title')?.value??input.title,titleSource:(document.getElementById('title')?.value??input.title)!==draft.title?'manual':draft.titleSource,storyText:document.getElementById('storyText')?.value??input.storyText,date,eventTime,id,datePrecision:date?(input.datePrecision==='year'?'year':'day'):(eventTime?.kind==='season'?'season':'unset'),status:draft.status};
        // UI metadata is not allowed to overwrite stored blob properties.
        if(next.storyText!==draft.storyText)delete next.analysis;
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
      if(method==='GET') {const media=await storage.media(mediaId);return media?new Response(media.kind==='video'?media.thumbnail:media.blob):new Response('',{status:404});}
      // The inherited UI removes the reference next; commit that before deleting bytes.
      if(method==='DELETE')return Response.json({ok:true});
    }
    if(url.pathname==='/api/storylab-clean/publish'&&method==='POST')return await serialized(async()=>{
      if(!validTime(draft))throw new Error('Kies een datum of een seizoen met jaartal.');
      if(!draft.photos.length&&!draft.storyText.trim()&&!draft.audioId)throw new Error(t('writeFirst'));
      draft=await storage.save({...draft,status:'published',postedAt:draft.postedAt||Date.now()});
      return Response.json({ok:true,handoffUrl:'/#story='+encodeURIComponent(id)});
    });
    throw new Error(t('later'));
  }catch(error){message(error.name==='QuotaExceededError'?t('storageFull'):error.message);return Response.json({error:error.message},{status:409});}
};
window.__taleraFreeStorage=storage;
async function flushDraft(){
  await ready;await queue;if(window.__taleraFreeRecording?.busy())throw new Error(t('audioFinishFirst'));
  if(window.__taleraStoryLabMedia?.isUploading())throw new Error(t('photoBusy'));
  if(location.pathname.startsWith('/tell')){
    const response=await window.__taleraFreeApi('/api/storylab-clean/state',{method:'PUT',body:JSON.stringify({...draft,title:document.getElementById('title').value,date:document.getElementById('dateInput').value,storyText:document.getElementById('storyText').value})});
    if(!response.ok)throw new Error((await response.json()).error);
  }
}
installBackup({storage,exclusive:serialized,beforeExport:flushDraft});
installDeviceExperience({beforeReload:flushDraft,storage,exclusive:serialized});
if(location.pathname.startsWith('/tell')) {
  await ready.catch(()=>{});
  for(const script of document.querySelectorAll('script[type="text/talera"]')) {
    const running=document.createElement('script');running.textContent=script.textContent;document.body.appendChild(running);
  }
  window.__taleraFreeAddPhotos=files=>importPhotos(files,{getStory:()=>draft,onDuplicate:photo=>serialized(async()=>{draft=await storage.save({...draft,currentIndex:draft.photos.findIndex(p=>p.id===photo.id)});await window.__taleraStoryLabMedia.setState(draft);window.dispatchEvent(new Event('talera-free-saved'));}),preview:url=>{document.getElementById('bgPhoto').src=url;document.getElementById('screen').classList.add('has-photo');},progress:(done,duplicates,failures,total,error)=>message(error||`${done} / ${total} ${t('photoProgress')}${duplicates?' · '+duplicates+' '+t('photoDuplicate'):''}${failures?' · '+failures+' '+t('photoFailedCount'):''}`),commit:(media,photo)=>serialized(async()=>{
    const next={...draft,title:document.getElementById('title').value,date:document.getElementById('dateInput').value,storyText:document.getElementById('storyText').value,photos:[...draft.photos,photo],currentIndex:draft.photos.length};
    draft=await storage.commitMedia(next,media);await window.__taleraStoryLabMedia.setState(draft);
    window.dispatchEvent(new CustomEvent('talera-free-saved',{detail:{hasPhotos:true}}));
  })}).catch(error=>message(error.message)).finally(()=>window.__taleraStoryLabMedia.setState(draft));
  installTellExperience({getStory:()=>draft,storage,exclusive:serialized,notice:message,saveAudio:async audio=>{
    draft=await storage.commitMedia({...draft,title:document.getElementById('title').value,date:document.getElementById('dateInput').value,storyText:document.getElementById('storyText').value,audioId:audio.id},audio);const latestText=document.getElementById('storyText').value;if(draft.storyText!==latestText)draft=await storage.save({...draft,storyText:latestText});draft={...draft,storyText:document.getElementById('storyText').value};await window.__taleraStoryLabMedia.setState(draft);
    window.dispatchEvent(new CustomEvent('talera-free-saved',{detail:{hasPhotos:draft.photos.length>0}}));
  }});
  installTellMedia({getStory:()=>draft,storage,notice:message,remove:id=>serialized(async()=>{const photos=draft.photos.filter(p=>p.id!==id);draft=await storage.save({...draft,title:document.getElementById('title').value,storyText:document.getElementById('storyText').value,photos,currentIndex:Math.min(draft.currentIndex||0,Math.max(0,photos.length-1))});await window.__taleraStoryLabMedia.setState(draft);window.dispatchEvent(new Event('talera-free-saved'));})});
  installGuidedTell({getStory:()=>draft,flush:flushDraft,notice:message,saveAnalysis:(analysis,current)=>serialized(async()=>{if(!current())return false;draft=await storage.save({...draft,analysis});return current();}),saveTitle:(title,current,titleSource='ai')=>serialized(async()=>{if(!current())return false;draft=await storage.save({...draft,title,titleSource});return current();})});
  setTimeout(()=>window.dispatchEvent(new Event('talera-guided-ready')),250);
  const timeKind=document.getElementById('freeTimeKind'),seasonFields=document.getElementById('freeSeasonFields');
  const syncTime=()=>{seasonFields.hidden=timeKind.value!=='season';document.getElementById('editDate').hidden=timeKind.value==='season';};
  timeKind.onchange=syncTime;
  document.getElementById('editBtn').addEventListener('click',()=>{timeKind.value=draft.eventTime?.kind==='season'?'season':'day';document.getElementById('freeSeason').value=draft.eventTime?.season||'voorjaar';document.getElementById('freeSeasonYear').value=draft.eventTime?.year||'';syncTime();});
  document.getElementById('saveEdit').addEventListener('click',event=>{
    event.stopImmediatePropagation();const date=timeKind.value==='day'?document.getElementById('editDate').value:'';
    let eventTime;try{eventTime=timeKind.value==='season'?seasonTime(document.getElementById('freeSeason').value,Number(document.getElementById('freeSeasonYear').value)):undefined;if(!validTime({date,eventTime}))throw new Error('Kies een datum of een seizoen met jaartal.');const today=new Date();if(date&&date>today.toISOString().slice(0,10)||eventTime&&new Date(eventTime.year,{voorjaar:2,zomer:5,herfst:8,winter:-1}[eventTime.season],1)>today)throw new Error('Kies een datum of tijdvak dat al is begonnen.');}catch(error){message(error.message);return;}
    serialized(async()=>{draft=await storage.save({...draft,title:document.getElementById('editTitle').value,titleSource:document.getElementById('editTitle').value!==draft.title?'manual':draft.titleSource,date,eventTime,datePrecision:eventTime?'season':'day'});await window.__taleraStoryLabMedia.setState(draft);document.getElementById('editModal').classList.remove('open');}).catch(error=>message(error.message));
  },true);
  const save=document.getElementById('timelinePublish');
  save?.addEventListener('click',event=>{
    const stop=key=>{event.stopImmediatePropagation();message(t(key));};
    if(window.__taleraFreeSpeech?.busy()){event.stopImmediatePropagation();message('Je gesproken tekst wordt nog verwerkt.');return;}
    if(window.__taleraFreeRecording?.busy()){stop('audioFinishFirst');return;}
    if(failed){stop('storageUnavailable');return;}
    if(window.__taleraStoryLabMedia?.isUploading()){stop('photoBusy');return;}
    if(!validTime({...draft,date:document.getElementById('dateInput').value})){
      stop('addDate');document.getElementById('editBtn').click();document.getElementById('editDate').focus();return;
    }
    if(!draft.photos.length&&!document.getElementById('storyText').value.trim()&&!draft.audioId){
      stop('writeFirst');window.__taleraFreeOpenText?.();
    }
  },true);
}else {
  document.querySelector('.tell')?.addEventListener('click',()=>location.href='/tell?new=1',true);
  document.querySelector('.more')?.closest('button')?.addEventListener('click',()=>document.getElementById('freeStorageInfo').showModal());
  document.getElementById('freeStorageClose')?.addEventListener('click',()=>document.getElementById('freeStorageInfo').close());
  try {
    const stories=timelineStories((await storage.stories()).filter(story=>story.status==='published'));
    const urls=[],photoBlobs=new Map();
    window.__taleraFreePhotoResponse=async url=>photoBlobs.has(url)?new Response(photoBlobs.get(url)):new Response('',{status:404});
    window.__taleraFreeMemories=[];
    for(const story of stories) {
      const url='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      window.__taleraFreeMemories.push({id:story.id,storyId:story.id,at:new Date(story.displayMs).toISOString(),ms:story.displayMs,timeLabel:timeLabel(story),audioId:story.audioId||'',datePrecision:story.datePrecision,story:story.title||story.storyText.slice(0,90)||t('audioTitle'),fullStory:story.storyText,image:url,photos:[url]});
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

function installCloseButtons(){for(const surface of document.querySelectorAll('dialog,.modal .card')){if(surface.querySelector('.free-close'))continue;const button=document.createElement('button');button.type='button';button.className='free-close';button.textContent='×';button.setAttribute('aria-label','Sluiten');button.onclick=()=>surface.tagName==='DIALOG'?(surface.dispatchEvent(new Event('cancel',{cancelable:true}))&&surface.close()):surface.closest('.modal').classList.remove('open');surface.prepend(button);}}
installCloseButtons();new MutationObserver(installCloseButtons).observe(document.body,{childList:true});

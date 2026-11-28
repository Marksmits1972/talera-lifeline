// Internal send uses the same original local library as WhatsApp, but no guest
// link, public pointer, preview upload or separate recipient media copy.
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const MEDIA=/^[A-Za-z0-9_.:-]{1,240}$/;
const MAX=96*1048576;
const requireValid=(ok,code='INTERNAL_SEND_INVALID')=>{if(!ok)throw Error(code)};
const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function internalSendOriginal({memory,library,contacts,requestId,expiresAt,mimeFor,post,upload,isCurrent=()=>true,onProgress=()=>{}}){
 const check=()=>requireValid(isCurrent(),'ACCOUNT_CHANGED');
 check();requireValid(memory?._taleraLocal&&/^local-[a-z0-9-]{8,90}$/i.test(memory.storyId||'')&&!memory._taleraReceived);
 requireValid(Array.isArray(contacts)&&contacts.length>0&&contacts.length<=1000&&contacts.every(x=>ID.test(x))&&new Set(contacts).size===contacts.length&&ID.test(requestId)&&Number.isSafeInteger(expiresAt));
 const row=await library.get(memory.storyId);check();
 requireValid(row&&row.id===memory.storyId&&Array.isArray(row.items)&&row.items.length<=24,'INTERNAL_ORIGINAL_MISSING');
 const title=String(row.title??''),storyText=String(row.text??''),eventDate=String(row.date??'');
 requireValid(title.length<=180&&storyText.length<=12000&&/^\d{0,4}(?:-\d{2}-\d{2})?$/.test(eventDate)&&(row.items.length||storyText.trim()));
 const manifest={version:1,items:[],posters:[],narrationCues:[],narrationDurationMs:Number.isSafeInteger(row.narrationDurationMs)&&row.narrationDurationMs>=0?row.narrationDurationMs:0,datePrecision:String(row.datePrecision||'unknown').slice(0,20),time:String(row.time||'12:00:00').slice(0,20)};
 const sources=[],keys=new Set();let total=0,count=0;
 for(const item of row.items){
  requireValid(item&&['photo','video','audio'].includes(item.kind)&&MEDIA.test(item.key)&&!keys.has(item.key),'INTERNAL_ORIGINAL_MISSING');
  keys.add(item.key);
  const blob=await library.blob(item.key);check();
  requireValid(blob instanceof Blob&&blob.size>0,'INTERNAL_ORIGINAL_MISSING');
  const mime=await mimeFor(item,blob,sources.length+1);check();
  const parts=Math.ceil(blob.size/1048576);total+=blob.size;count+=parts;
  requireValid(total<=MAX&&parts<=96&&count<=192,'INTERNAL_TOO_LARGE');
  sources.push({item,blob,mime,parts});manifest.items.push({kind:item.kind,mediaId:item.key,mime,size:blob.size,parts,hashes:[]});
 }
 const cues=Array.isArray(row.narrationCues)?row.narrationCues:[];
 requireValid(cues.length<=1000,'INTERNAL_CUE_INVALID');
 for(const cue of cues){
  requireValid(cue&&Number.isSafeInteger(cue.t)&&cue.t>=0&&Number.isSafeInteger(cue.index)&&cue.index>=0,'INTERNAL_CUE_INVALID');
  const c={...cue};
  if(c.mediaId){
   const index=row.items.findIndex(x=>x.key===c.mediaId&&['photo','video'].includes(x.kind));requireValid(index>=0,'INTERNAL_CUE_INVALID');
   c.mediaIndex=index;delete c.mediaId;
  }
  manifest.narrationCues.push(c);
 }
 // Optional *existing* posters only. Never transcode an original video.
 const posters=[];
 for(const [index,src] of sources.entries()){
  if(src.item.kind!=='video')continue;
  requireValid(!keys.has(src.item.key+':phone-v1'),'INTERNAL_ORIGINAL_MISSING');
  const still=await library.blob(src.item.key+':phone-v1');check();
  if(!(still instanceof Blob)||!still.size||still.size>1500000||!['image/jpeg','image/png','image/webp'].includes(still.type)||total+still.size>MAX)continue;
  total+=still.size;posters.push({index,blob:still});
 }
 check();
 const staged=await post({action:'stage',localMemoryId:row.id,requestId,expiresAt,contacts,title,storyText,eventDate,consent:true});check();
 requireValid(staged?.ok&&/^[a-f0-9]{64}$/.test(staged.key),'INTERNAL_STAGE_FAILED');
 if(['ready','delivered'].includes(staged.state))return {ok:true,key:staged.key,state:staged.state};
 requireValid(['draft','sealed','sealing'].includes(staged.state),'INTERNAL_STAGE_FAILED');
 let transferred=0;
 const write=async(path,blob,hash)=>{
  if(staged.state==='draft'){
   const r=await upload(staged.key,path,blob);check();
   requireValid(r?.ok&&r.sha256===hash,'INTERNAL_UPLOAD_HASH');
  }
  transferred+=blob.size;onProgress(total?Math.min(99,Math.floor(transferred/total*100)):0);
 };
 for(const [index,s] of sources.entries())for(let part=0;part<s.parts;part++){
  check();const blob=s.blob.slice(part*1048576,(part+1)*1048576,s.mime),hash=await sha(await blob.arrayBuffer());check();
  manifest.items[index].hashes.push(hash);await write('/media/'+index+'/'+part,blob,hash);
 }
 for(const {index,blob} of posters){
  check();const hash=await sha(await blob.arrayBuffer());check();
  await write('/poster/'+index,blob,hash);
  manifest.posters.push({mediaIndex:index,mime:blob.type,size:blob.size,sha256:hash});
 }
 check();const final=await post({action:'finalize',key:staged.key,manifest,consent:true});check();
 requireValid(final?.ok&&['ready','delivered'].includes(final.state),'INTERNAL_FINALIZE_FAILED');
 onProgress(100);return {ok:true,key:staged.key,state:final.state};
}

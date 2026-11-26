// TALERA Free: preserve original published media IDs while editing a draft.
// Preserve the private draft-to-original mapping and reuse existing derived
// video poster sidecars. Never rewrite a published original or its poster.
// A nonempty image MIME is not proof of a decodable cached thumbnail.
// Decode the existing local image, with bounded wait, and revoke its URL.
// On failure the approved silent native frame fallback remains available.
export function isDecodableEditorPoster(blob){
 if(!(blob instanceof Blob)||!blob.size||!blob.type.startsWith('image/'))return Promise.resolve(false);
 return new Promise(resolve=>{
  let url,image,timer,finished=false;
  const finish=ok=>{
   if(finished)return;finished=true;
   clearTimeout(timer);
   if(image){image.onload=null;image.onerror=null;image.removeAttribute('src')}
   if(url)URL.revokeObjectURL(url);
   resolve(ok);
  };
  try{
   url=URL.createObjectURL(blob);image=new Image();
   image.onload=()=>finish(image.naturalWidth>0&&image.naturalHeight>0);
   image.onerror=()=>finish(false);
   timer=setTimeout(()=>finish(false),1500);
   image.src=url;
  }catch(_){finish(false)}
 });
}

export function retainEditorCanonicalMediaIds(html){
 if(typeof html!=='string'||!html.includes('talera-memory-store-v1'))
  throw Error('TALERA_EDITOR_LIBRARY_SOURCE_MISSING');
 const exact=(a,b,label)=>{
  const n=html.split(a).length-1;
  if(n!==1)throw Error('TALERA_EDITOR_LIBRARY_DRIFT_'+label+':'+n);
  html=html.replace(a,b);
 };
 const original="if(entries.length)await writeFiles(entries);entries.forEach(([id,f])=>assets.set(id,f));";
 const mapping=`if(g.existing){
  const refs=(row.items||[]).map(item=>item?.key);
  if(refs.length!==entries.length||refs.some(key=>typeof key!=='string'||!key))
   throw Error('De oorspronkelijke mediaverwijzingen zijn onvolledig. De herinnering blijft ongewijzigd.');
  g.canonicalByDraft=Object.fromEntries(entries.map(([draftId],i)=>[draftId,refs[i]]));
 }
 `;
 const restorePosters=`
 // Published video posters are optional derivative images, not originals.
 // Use the exact original ID in the same account-local library.
 const videoPosters=[];
 const taleraValidPoster=(${isDecodableEditorPoster.toString()});
 await Promise.all(entries.map(async ([draftId],i)=>{
  const item=row.items[i];
  if(item?.kind!=='video')return;
  try{
   const poster=await mem.blob(item.key+':phone-v1');
   if(await taleraValidPoster(poster)){
    previewBlobs.set(draftId,poster);
    videoPosters.push(['preview:'+draftId,poster]);
   }
  }catch(_){} // A missing derivative may never prevent opening an original.
 }));
 if(videoPosters.length)try{await writeFiles(videoPosters)}catch(_){}
 `;
 exact(original,mapping+original+restorePosters,'EDIT_BOOT_MEDIA_MAP');
 exact("voiceDurationMs:g.voiceDurationMs||0,existing:g.existing||''}))",
  "voiceDurationMs:g.voiceDurationMs||0,existing:g.taleraSavedReceipt?.existing||g.existing||'',canonicalByDraft:(g.taleraSavedReceipt?.canonicalByDraft||g.canonicalByDraft)?{...(g.taleraSavedReceipt?.canonicalByDraft||g.canonicalByDraft)}:null}))",
  'DRAFT_CANONICAL_ID_SNAPSHOT');
 return html;
}

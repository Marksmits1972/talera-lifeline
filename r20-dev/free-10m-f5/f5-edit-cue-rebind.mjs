// Narrow, F5-only correction for a VERIFIED editor mapping defect.
//
// On /tell?edit=local-..., the original TALERA boot() rebuilds every
// original File from private local IndexedDB under a NEW draft media UUID.
// Its original narrationCues still reference canonical row.items[].key.
// The published R20 media-ID guard correctly rejects those old IDs against
// the new draft UUIDs AFTER mem.save; this can leave an unnecessary failed
// publish despite the original media Blobs being intact.
//
// Rebind existing cue IDs to the freshly reconstructed draft IDs while
// original row.items and newly created draft files are both in scope.
// If a referenced original ID is missing, throw BEFORE writing the draft,
// preserving the existing published story. Never alter cue times or media.
export function alignEditedNarrationCueRefs(html) {
 if(typeof html!=='string'||!html.includes('talera-memory-store-v1'))
   throw Error('TALERA_F5_EDIT_SOURCE_MISSING');
 const needle='if(entries.length)await writeFiles(entries);entries.forEach(([id,f])=>assets.set(id,f));';
 const count=html.split(needle).length-1;
 if(count!==1)throw Error('TALERA_F5_EDIT_CUE_PATCH_MARKER_CHANGED:'+count);
 const correction=`if(g.voice&&Array.isArray(g.voiceCues)&&g.voiceCues.length){
  const source=(row.items||[]).filter(it=>it.kind==='photo'||it.kind==='video');
  if(source.length!==g.media.length)throw Error('De oorspronkelijke beeldvolgorde is gewijzigd; bestaande opname niet overschrijven.');
  g.voiceCues=g.voiceCues.map(c=>{
    const originalIndex=(typeof c?.mediaId==='string'&&c.mediaId)
      ?source.findIndex(it=>it.key===c.mediaId):Number(c?.index);
    if(!Number.isInteger(originalIndex)||originalIndex<0||
      originalIndex>=g.media.length||!g.media[originalIndex])
      throw Error('Het oorspronkelijke media-ID ontbreekt. De gepubliceerde herinnering blijft ongewijzigd.');
    return {...c,index:originalIndex,mediaId:g.media[originalIndex]};
  });
 }
 `;
 return html.replace(needle,correction+needle);
}

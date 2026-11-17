// TALERA Free: preserve original published media IDs while editing a draft.
// Adds only private metadata to the existing editor draft manifest. No UI,
// existing media writes, account changes, deletion, or second database.
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
 exact(original,mapping+original,'EDIT_BOOT_MEDIA_MAP');
 exact("voiceDurationMs:g.voiceDurationMs||0,existing:g.existing||''}))",
  "voiceDurationMs:g.voiceDurationMs||0,existing:g.existing||'',canonicalByDraft:g.canonicalByDraft?{...g.canonicalByDraft}:null}))",
  'DRAFT_CANONICAL_ID_SNAPSHOT');
 return html;
}

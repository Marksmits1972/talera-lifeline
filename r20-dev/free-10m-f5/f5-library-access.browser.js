// TALERA Free: one account-local library interface, shared by existing players.
// This file has NO storage schema, UI, Worker, cloud, or media-writing side effects.
// The existing TaleraMemories store remains the sole owner of IndexedDB/IDs.
(function attachTaleraLibraryFactory(root){
 'use strict';
 const validId=value=>typeof value==='string'&&value.length>0&&value.length<=4096;
 const requireId=(value,label)=>{
  if(!validId(value))throw Error('TALERA_LIBRARY_INVALID_'+label);
  return value;
 };
 function create(store){
  if(!store||typeof store.list!=='function'||typeof store.get!=='function'||
     typeof store.blob!=='function'||typeof store.mediaUrl!=='function')
   throw Error('TALERA_LIBRARY_STORAGE_INTERFACE_MISSING');
  const readStory=async id=>{
   requireId(id,'STORY_ID');
   const result=await store.get(id);
   if(!result||result.id!==id)throw Error('TALERA_LIBRARY_STORY_NOT_FOUND');
   return result;
  };
  const listStories=async()=>{
   const result=await store.list();
   if(!Array.isArray(result))throw Error('TALERA_LIBRARY_INVALID_STORY_LIST');
   return result;
  };
  const originalBlob=async id=>{
   requireId(id,'MEDIA_ID');
   const file=await store.blob(id);
   if(!(file instanceof Blob)||!file.size)
    throw Error('TALERA_LIBRARY_ORIGINAL_MEDIA_NOT_FOUND');
   return file;
  };
  const mediaUrl=async id=>{
   requireId(id,'MEDIA_ID');
   // Same missing-file behavior as the approved motor. The motor decides
   // whether a missing optional cover or original media ends the phase.
   return store.mediaUrl(id);
  };
  const displayUrl=async id=>{
   requireId(id,'MEDIA_ID');
   return typeof store.displayUrl==='function'?store.displayUrl(id):store.mediaUrl(id);
  };
  // Returns permanent catalog references; does not create or move original files.
  const orderedMedia=async id=>{
   const story=await readStory(id);
   if(!Array.isArray(story.items))throw Error('TALERA_LIBRARY_INVALID_MEDIA_LIST');
   return story.items.map((item,index)=>{
    if(!validId(item?.key))throw Error('TALERA_LIBRARY_INVALID_MEDIA_REFERENCE');
    return Object.freeze({mediaId:item.key,kind:item.kind,index});
   });
  };
  // Compatibility boundary for ALREADY-HYDRATED player state. This is temporary
  // display data, not a second library or a replacement for the stored row.
  const playback=memory=>{
   if(!memory||memory.id===undefined)throw Error('TALERA_LIBRARY_INVALID_PLAYBACK_MEMORY');
   const items=Array.isArray(memory._zeroItems)?memory._zeroItems:
     (Array.isArray(memory.items)?memory.items:[]);
   const frames=Array.isArray(memory._zeroFrames)?memory._zeroFrames:[];
   const cues=Array.isArray(memory._taleraNarrationCues)?memory._taleraNarrationCues:
     (Array.isArray(memory.narrationCues)?memory.narrationCues:[]);
   return Object.freeze({
    voice:items.find(item=>item?.kind==='audio')||null,
    hasVoice:items.some(item=>item?.kind==='audio'),
    frames, cues
   });
  };
  const api={
   listStories,readStory,orderedMedia,originalBlob,mediaUrl,displayUrl,playback,
   // Compatibility names used by the two approved playback engines.
   // Original read-signatures remain compatible, including null on a miss.
   list:(...args)=>store.list(...args),
   get:(...args)=>store.get(...args),
   blob:id=>{requireId(id,'MEDIA_ID');return store.blob(id)},
   // Writing stays controlled by the existing editor/storage implementation;
   // neither player receives a second database handle or a write method.
   localOnly:true
  };
  return Object.freeze(api);
 }
 Object.defineProperty(root,'TaleraLibraryFactory',{
  configurable:false,enumerable:false,writable:false,
  value:Object.freeze({create,version:1})
 });
})(globalThis);

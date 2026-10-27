/* TALERA clean media loader, lives in the local RH19 adapter closure.
   Replaces V38 story-video preload functionality without legacy player naming. */
// Clean TALERA media-loader: video belongs to the same memory and presentation.
  const pendingLocalVideos=new Map();
  async function localVideoSource(memory,frame){
    if(!memory||!frame?.key)throw Error('Videobestand ontbreekt');
    if(!memory._taleraVideoUrls)memory._taleraVideoUrls=new Map();
    const cached=memory._taleraVideoUrls.get(frame.key);
    if(cached)return cached;
    const key=memory.id+'|'+frame.key;
    if(!pendingLocalVideos.has(key)){
      const task=(async()=>{
        const url=await store.mediaUrl(frame.key);
        if(!url)throw Error('Videobestand is niet beschikbaar');
        const current=loaded.get(memory.id);
        if(!current){URL.revokeObjectURL(url);throw Error('Herinnering is intussen gesloten')}
        memory._taleraVideoUrls.set(frame.key,url);
        current.push(url);
        return url;
      })();
      pendingLocalVideos.set(key,task);
    }
    try{return await pendingLocalVideos.get(key)}
    finally{pendingLocalVideos.delete(key)}
  }
  function localVideoPrefetch(memory){
    const frames=memory?._taleraFrames||[];
    const index=Math.max(0,Number(memory?._photoIndex)||0);
    const upcoming=frames.slice(index+1).find(x=>x.kind==='video');
    if(upcoming)void localVideoSource(memory,upcoming).catch(()=>{});
  }
  

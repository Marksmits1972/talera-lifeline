// Bounded, shared reads for the presentation and its neighbouring stories.
export function createPhotoCache({storage,register=()=>{},release=()=>{},limit=12,keep=()=>null}){
  const entries=new Map(),pending=new Map();let closed=false;
  function touch(id,item){entries.delete(id);entries.set(id,item);return item;}
  async function get(id){
    if(entries.has(id))return touch(id,entries.get(id));
    if(pending.has(id))return pending.get(id);
    const request=(async()=>{
      const item=await storage.media(id);if(!item||closed)return null;
      const poster=item.kind==='video'?item.thumbnail:item.blob;
      const url=URL.createObjectURL(poster),image=new window.Image();image.src=url;
      try{if(image.decode)await image.decode();}catch{/* The visible image retains normal browser error handling. */}
      if(closed){URL.revokeObjectURL(url);return null;}
      const entry=touch(id,{item,url,image});register(url,poster);
      while(entries.size>limit){const candidate=[...entries].find(([key])=>key!==keep());if(!candidate)break;const [oldId,old]=candidate;entries.delete(oldId);release(old.url);URL.revokeObjectURL(old.url);}
      return entry;
    })();
    pending.set(id,request);
    try{return await request;}finally{pending.delete(id);}
  }
  function close(){closed=true;for(const entry of entries.values()){release(entry.url);URL.revokeObjectURL(entry.url);}entries.clear();}
  return {get,close};
}

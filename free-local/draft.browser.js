// Own the editable story. UI state is a projection; storage acknowledgements
// must never replace edits made while an IndexedDB transaction was pending.
export function createDraft(initial,onChange=()=>{}) {
  let value={...initial},revision=0,persisted;
  const equal=(a,b)=>a===b||(a&&b&&typeof a==='object'&&typeof b==='object'&&JSON.stringify(a)===JSON.stringify(b));
  function patch(changes){
    const next={...value,...changes};
    if(next.storyText!==value.storyText)delete next.analysis;
    if(Object.keys(next).some(key=>!equal(next[key],value[key]))||Object.keys(value).some(key=>!(key in next))){value=next;revision++;onChange(value);}
    return value;
  }
  function hydrate(saved){value={...saved};persisted=value;revision++;onChange(value);}
  async function save(write,changes={},rollback=[]){
    const before=value;
    patch(changes);
    if(persisted&&equal(value,persisted))return value;
    let first=true;
    for(;;){
      const snapshot=value,version=revision;
      let saved;
      try{saved=await write(snapshot,first);}
      catch(error){
        if(first)patch(Object.fromEntries(rollback.filter(key=>equal(value[key],snapshot[key])).map(key=>[key,before[key]])));
        throw error;
      }
      first=false;persisted=saved;
      // Only storage metadata belongs to the acknowledgement. All editable
      // fields still belong to this concept, including newer live transcripts.
      value={...value,updatedAt:saved.updatedAt};onChange(value);
      if(version===revision)return value;
    }
  }
  return {get current(){return value;},patch,hydrate,save};
}

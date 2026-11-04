try {
  const hiddenIds=JSON.parse(localStorage.getItem('talera-dev-hidden-examples-r20-v1')||'[]');
  if(Array.isArray(hiddenIds)&&hiddenIds.length){
    const ignored=new Set(hiddenIds.map(String));
    for(let idx=MEMORIES.length-1;idx>=0;idx--){
      const m=MEMORIES[idx];
      if(ignored.has(String(m.id))&&(m.isDemo===true||(typeof m.id==='number'&&m.id>=1&&m.id<=50)))MEMORIES.splice(idx,1);
    }
  }
}catch(error){console.warn('TALERA voorbeeldfilter niet geladen',error)}

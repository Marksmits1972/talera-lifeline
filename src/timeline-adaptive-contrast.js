export const timelineAdaptiveContrastStyle = String.raw`
/* TALERA — adaptive REST contrast for the timeline only.
   This presentation layer does not touch timeline geometry, navigation,
   direct grip, scale/speed logic, marker/date mapping or snapping. */
.timeline{
  --timeline-rest-opacity:.34;
  --timeline-rest-filter:saturate(.68) contrast(.82) brightness(.88) drop-shadow(0 0 1px rgba(255,255,255,.56));
}

/* On a dark/mixed photo band, render the resting ruler as a soft light trace. */
.timeline[data-rest-contrast="light"]{
  --timeline-rest-opacity:.34;
  --timeline-rest-filter:brightness(0) invert(1) opacity(.92) drop-shadow(0 1px 2px rgba(15,39,71,.24));
}

/* On a light photo band, keep the familiar restrained TALERA dark ruler. */
.timeline[data-rest-contrast="dark"]{
  --timeline-rest-opacity:.34;
  --timeline-rest-filter:saturate(.70) contrast(.90) brightness(.72) drop-shadow(0 0 1px rgba(255,255,255,.62));
}

/* Mixed/high-detail backgrounds get a little extra edge separation, not extra opacity. */
.timeline[data-rest-detail="busy"]{
  --timeline-rest-opacity:.36;
}
.timeline[data-rest-contrast="light"][data-rest-detail="busy"]{
  --timeline-rest-filter:brightness(0) invert(1) opacity(.94) drop-shadow(0 1px 2px rgba(15,39,71,.34)) drop-shadow(0 0 2px rgba(255,255,255,.16));
}
.timeline[data-rest-contrast="dark"][data-rest-detail="busy"]{
  --timeline-rest-filter:saturate(.70) contrast(.94) brightness(.68) drop-shadow(0 0 1.5px rgba(255,255,255,.78)) drop-shadow(0 1px 2px rgba(15,39,71,.18));
}
`;

export const timelineAdaptiveContrastScript = String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  const stage=document.getElementById('photoStage');
  if(!timeline||!stage)return;

  let runToken=0;
  let settleTimer=0;
  let lastSrc='';
  let lastMode='dark';

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  function frontPhoto(){
    return stage.querySelector('.photo-layer.is-front .example-photo') || stage.querySelector('.example-photo');
  }

  function apply(mode,busy=false){
    lastMode=mode==='light'?'light':'dark';
    timeline.dataset.restContrast=lastMode;
    if(busy)timeline.dataset.restDetail='busy';
    else delete timeline.dataset.restDetail;
  }

  function fallbackFromPageTone(img){
    /* Safe fallback when pixel access is blocked by a remote image host.
       White edge separation guarantees a visibility floor on any photograph. */
    apply(lastMode||'dark',true);
  }

  async function analyse(){
    const token=++runToken;
    const img=frontPhoto();
    if(!img||!img.src)return;
    const src=img.currentSrc||img.src;
    lastSrc=src;

    try{
      const response=await fetch(src,{mode:'cors',cache:'force-cache'});
      if(!response.ok)throw new Error('image fetch');
      const blob=await response.blob();
      const bitmap=await createImageBitmap(blob);
      if(token!==runToken){bitmap.close();return;}

      const sample=document.createElement('canvas');
      const sw=72,sh=28;
      sample.width=sw;sample.height=sh;
      const ctx=sample.getContext('2d',{willReadFrequently:true});
      if(!ctx){bitmap.close();return;}

      /* Sample the upper image zone that visually sits behind the timeline.
         The exact UI geometry is intentionally not fed back into the motor. */
      const sourceH=Math.max(1,Math.round(bitmap.height*.24));
      ctx.drawImage(bitmap,0,0,bitmap.width,sourceH,0,0,sw,sh);
      bitmap.close();

      const data=ctx.getImageData(0,0,sw,sh).data;
      let lumSum=0,lumSq=0,count=0;
      for(let i=0;i<data.length;i+=4){
        if(data[i+3]<24)continue;
        const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255;
        const lum=.2126*r+.7152*g+.0722*b;
        lumSum+=lum;lumSq+=lum*lum;count++;
      }
      if(!count)throw new Error('no pixels');
      const mean=lumSum/count;
      const variance=Math.max(0,lumSq/count-mean*mean);
      const std=Math.sqrt(variance);

      /* Hysteresis avoids colour flapping around the middle tone. */
      let mode=lastMode;
      if(mean<.43)mode='light';
      else if(mean>.57)mode='dark';
      const busy=std>.22 || (mean>.40&&mean<.60&&std>.16);
      apply(mode,busy);
    }catch(e){
      if(token===runToken)fallbackFromPageTone(img);
    }
  }

  function schedule(delay=260){
    clearTimeout(settleTimer);
    settleTimer=setTimeout(analyse,delay);
  }

  /* Initial conservative state: dark ruler plus a light edge floor. */
  apply('dark',true);
  schedule(80);

  /* Re-evaluate only after the photo has settled; never on timeline pointermove. */
  const observer=new MutationObserver(mutations=>{
    let relevant=false;
    for(const m of mutations){
      if(m.type==='attributes'&&(m.attributeName==='class'||m.attributeName==='src')){relevant=true;break;}
    }
    if(relevant)schedule(300);
  });
  observer.observe(stage,{subtree:true,attributes:true,attributeFilter:['class','src']});

  stage.addEventListener('load',e=>{
    if(e.target&&e.target.classList&&e.target.classList.contains('example-photo'))schedule(180);
  },true);

  /* The runtime subscription is the cleanest signal when a memory settles. */
  const bindRuntime=()=>{
    const runtime=window.__taleraTimelineRuntime;
    if(runtime&&typeof runtime.subscribe==='function'){
      runtime.subscribe(()=>schedule(320));
      return true;
    }
    return false;
  };
  if(!bindRuntime())setTimeout(bindRuntime,300);
})();
`;

export const timelineAdaptiveContrastStyle = String.raw`
/* TALERA — adaptive REST contrast for the timeline only.
   This presentation layer does not touch timeline geometry, navigation,
   direct grip, scale/speed logic, marker/date mapping or snapping. */
.timeline{
  --timeline-rest-opacity:.50;
  --timeline-rest-filter:saturate(.86) contrast(1.06) brightness(.84) drop-shadow(0 0 1px rgba(255,255,255,.82)) drop-shadow(0 1px 1px rgba(15,39,71,.30));
}

/* Dark photo band: a soft light ruler with a dark edge floor. */
.timeline[data-rest-contrast="light"]{
  --timeline-rest-opacity:.52;
  --timeline-rest-filter:brightness(0) invert(1) opacity(.96) drop-shadow(0 1px 2px rgba(15,39,71,.42)) drop-shadow(0 0 1px rgba(255,255,255,.80));
}

/* Light photo band: keep the ruler dark enough that pale skies/walls can never
   swallow it. It remains secondary to the photo, but has a real visibility floor. */
.timeline[data-rest-contrast="dark"]{
  --timeline-rest-opacity:.54;
  --timeline-rest-filter:saturate(.90) contrast(1.24) brightness(.62) drop-shadow(0 0 1px rgba(255,255,255,.72)) drop-shadow(0 1px 1.5px rgba(15,39,71,.48));
}

/* Mixed/high-detail backgrounds get slightly more edge separation, not a loud ruler. */
.timeline[data-rest-detail="busy"]{
  --timeline-rest-opacity:.56;
}
.timeline[data-rest-contrast="light"][data-rest-detail="busy"]{
  --timeline-rest-filter:brightness(0) invert(1) opacity(.98) drop-shadow(0 1px 2px rgba(15,39,71,.48)) drop-shadow(0 0 2px rgba(255,255,255,.28));
}
.timeline[data-rest-contrast="dark"][data-rest-detail="busy"]{
  --timeline-rest-filter:saturate(.92) contrast(1.30) brightness(.58) drop-shadow(0 0 1.5px rgba(255,255,255,.82)) drop-shadow(0 1px 2px rgba(15,39,71,.54));
}
`;

export const timelineAdaptiveContrastScript = String.raw`
(()=>{
  const timeline=document.querySelector('.timeline');
  const stage=document.getElementById('photoStage');
  if(!timeline||!stage)return;

  let runToken=0;
  let settleTimer=0;
  let lastMode='dark';

  function frontPhoto(){
    return stage.querySelector('.photo-layer.is-front .example-photo') || stage.querySelector('.example-photo');
  }

  function apply(mode,busy=false){
    lastMode=mode==='light'?'light':'dark';
    timeline.dataset.restContrast=lastMode;
    if(busy)timeline.dataset.restDetail='busy';
    else delete timeline.dataset.restDetail;
  }

  function fallback(){
    /* Remote photos can deny pixel access. The conservative dark ruler keeps a
       guaranteed floor against the most failure-prone case: very light photos. */
    apply('dark',true);
  }

  async function analyse(){
    const token=++runToken;
    const img=frontPhoto();
    if(!img||!img.src)return;
    const src=img.currentSrc||img.src;

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

      /* Only the upper photographic zone behind the ruler matters. */
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

      let mode=lastMode;
      if(mean<.45)mode='light';
      else if(mean>.55)mode='dark';
      const busy=std>.20 || (mean>.40&&mean<.60&&std>.15);
      apply(mode,busy);
    }catch(e){
      if(token===runToken)fallback();
    }
  }

  function schedule(delay=260){
    clearTimeout(settleTimer);
    settleTimer=setTimeout(analyse,delay);
  }

  apply('dark',true);
  schedule(80);

  /* Re-evaluate only after a photo settles; never during timeline pointermove. */
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

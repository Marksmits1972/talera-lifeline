export const enhancementStyle = String.raw`
:root{
  --active-photo:none;
  --timeline-ink:#0F2747;
  --timeline-veil:rgba(247,250,252,.72);
}

/* Immersive photo concept: one continuous photographic world. */
main{ position:relative; }
.memory-space{ background:#dfe7ec !important; }
.photo-stage{ inset:0 !important; background:#dfe7ec !important; }
.photo-backdrop{
  inset:-48px !important;
  width:calc(100% + 96px) !important;
  height:calc(100% + 96px) !important;
  filter:blur(34px) saturate(.92) brightness(1.04) !important;
  opacity:.42 !important;
}
.example-photo{
  inset:0 !important;
  left:0 !important;
  top:0 !important;
  width:100% !important;
  height:100% !important;
  object-fit:cover !important;
  object-position:center center !important;
}
.memory-space::after{
  background:linear-gradient(180deg,
    rgba(15,39,71,.03) 0%,
    rgba(15,39,71,0) 42%,
    rgba(15,39,71,.06) 64%,
    rgba(15,39,71,.28) 86%,
    rgba(15,39,71,.42) 100%) !important;
}

/* Intro text sits on the photograph. The reading surface comes from below. */
.memory-photo-air{ height:61% !important; min-height:210px !important; }
.memory-sheet{
  min-height:92% !important;
  padding:40px 22px 110px !important;
  color:#fff !important;
  background:linear-gradient(180deg,
    rgba(255,255,255,0) 0px,
    rgba(255,255,255,0) 108px,
    rgba(255,255,255,.16) 162px,
    rgba(255,255,255,.76) 238px,
    rgba(255,255,255,.96) 310px,
    #fff 390px) !important;
  text-shadow:0 2px 14px rgba(8,24,44,.38);
}
.memory-sheet::before{ color:rgba(255,255,255,.66) !important; }
.memory-sheet .date,
.memory-sheet .story{
  color:#fff !important;
}
.memory-sheet .story-more{
  color:#24374d !important;
  text-shadow:none !important;
}
.memory-story-scroll.is-reading .memory-sheet{
  color:var(--talera-deep) !important;
  text-shadow:none !important;
  background:linear-gradient(180deg,
    rgba(255,255,255,.92) 0px,
    #fff 96px) !important;
}
.memory-story-scroll.is-reading .memory-sheet::before{ color:rgba(15,39,71,.40) !important; }
.memory-story-scroll.is-reading .memory-sheet .date,
.memory-story-scroll.is-reading .memory-sheet .story{ color:var(--talera-deep) !important; }

/* Timeline keeps its position, but visually floats in the photo atmosphere. */
.timeline{
  position:relative;
  isolation:isolate;
  background:transparent !important;
  border-color:rgba(255,255,255,.18) !important;
}
.timeline::before{
  content:"";
  position:absolute;
  inset:-26px;
  z-index:0;
  background-image:var(--active-photo);
  background-size:cover;
  background-position:center top;
  filter:blur(25px) saturate(.82) brightness(1.04);
  transform:scale(1.08);
}
.timeline::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:1;
  background:var(--timeline-veil);
  backdrop-filter:blur(7px);
  -webkit-backdrop-filter:blur(7px);
}
.timeline canvas{ position:relative; z-index:2; transition:filter .28s ease; }
.center-needle{ z-index:3 !important; background:linear-gradient(180deg,rgba(15,39,71,.04),var(--timeline-ink) 15%,var(--timeline-ink) 88%,rgba(15,39,71,.04)) !important; }
.focus{ z-index:4 !important; color:var(--timeline-ink) !important; background:rgba(255,255,255,.72) !important; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }

/* Bottom navigation belongs to the same photograph rather than a separate bar. */
nav{
  position:relative;
  isolation:isolate;
  overflow:hidden;
  background:transparent !important;
  border-top:1px solid rgba(255,255,255,.14) !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
}
nav::before{
  content:"";
  position:absolute;
  inset:-32px;
  z-index:0;
  background-image:var(--active-photo);
  background-size:cover;
  background-position:center bottom;
  filter:blur(26px) saturate(.78) brightness(.72);
  transform:scale(1.12);
}
nav::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:1;
  background:rgba(15,39,71,.18);
}
nav > *{ position:relative; z-index:2; }
.nav-item{ color:rgba(255,255,255,.78) !important; text-shadow:0 1px 8px rgba(8,24,44,.28); }
.nav-item.active{ color:#fff !important; }
.tell{ background:rgba(255,255,255,.88) !important; color:var(--talera-deep) !important; box-shadow:0 7px 20px rgba(8,24,44,.20) !important; }

@media (max-height:700px){
  .memory-photo-air{ height:58% !important; min-height:180px !important; }
}
`;

export const enhancementScript = String.raw`
(() => {
  const root = document.documentElement;
  const surface = document.getElementById('surface');
  const photoStage = document.getElementById('photoStage');
  const timelineCanvas = document.getElementById('timelineCanvas');
  if (!surface || !photoStage) return;

  const DEEP = [15,39,71];
  const LIGHT = [220,234,246];

  const mix = (a,b,t) => a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  const rgb = a => `rgb(${a[0]}, ${a[1]}, ${a[2]})`;

  function activePhoto(){
    return photoStage.querySelector('.photo-layer.is-front .example-photo') || photoStage.querySelector('.example-photo');
  }

  function setPhotoAtmosphere(img){
    if (!img) return;
    const src = img.currentSrc || img.src;
    if (!src) return;
    root.style.setProperty('--active-photo', `url("${src.replace(/"/g,'\\"')}")`);
    analyseTop(src);
  }

  function analyseTop(src){
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = () => {
      try{
        const c = document.createElement('canvas');
        c.width = 32; c.height = 12;
        const x = c.getContext('2d', {willReadFrequently:true});
        x.drawImage(probe, 0, 0, probe.naturalWidth, Math.max(1, probe.naturalHeight * .24), 0, 0, 32, 12);
        const d = x.getImageData(0,0,32,12).data;
        let lum=0, sat=0, n=0;
        for(let i=0;i<d.length;i+=4){
          const r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;
          const max=Math.max(r,g,b), min=Math.min(r,g,b);
          lum += .2126*r + .7152*g + .0722*b;
          sat += max-min;
          n++;
        }
        lum/=n; sat/=n;

        /* Dark photo top -> light Talera blue. Light photo top -> deep Talera blue. */
        const contrast = Math.max(0, Math.min(1, 1-lum));
        const lightAmount = Math.max(0, Math.min(1, contrast * .96));
        const ink = mix(DEEP, LIGHT, lightAmount);
        root.style.setProperty('--timeline-ink', rgb(ink));

        const veilAlpha = .46 + lum * .34;
        root.style.setProperty('--timeline-veil', `rgba(247,250,252,${veilAlpha.toFixed(2)})`);

        if (timelineCanvas){
          const brightness = 0.72 + lightAmount * 1.35;
          const saturate = 1.08 - lightAmount * .18;
          timelineCanvas.style.filter = `brightness(${brightness.toFixed(2)}) saturate(${saturate.toFixed(2)})`;
        }
      }catch(e){
        root.style.setProperty('--timeline-ink','#0F2747');
        root.style.setProperty('--timeline-veil','rgba(247,250,252,.72)');
        if (timelineCanvas) timelineCanvas.style.filter = '';
      }
    };
    probe.onerror = () => {
      root.style.setProperty('--timeline-ink','#0F2747');
      root.style.setProperty('--timeline-veil','rgba(247,250,252,.72)');
    };
    probe.src = src;
  }

  let lastSrc='';
  function refresh(){
    const img=activePhoto();
    if(!img) return;
    const src=img.currentSrc || img.src;
    if(src && src!==lastSrc){
      lastSrc=src;
      setPhotoAtmosphere(img);
    }
  }

  const observer = new MutationObserver(() => requestAnimationFrame(refresh));
  observer.observe(photoStage,{subtree:true,attributes:true,attributeFilter:['src','class']});
  photoStage.addEventListener('load', refresh, true);
  refresh();
})();
`;

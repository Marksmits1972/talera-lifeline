export const enhancementStyle = String.raw`
:root{
  --active-photo:none;
  --timeline-ink:#0F2747;
  --timeline-veil:rgba(247,250,252,.34);
}

/* One continuous photographic world: no card edges between timeline, photo and controls. */
.app{ background:transparent !important; }
main{ position:relative; background:transparent !important; }
.memory-space{ background:transparent !important; overflow:hidden; }
.photo-stage{ inset:0 !important; background:transparent !important; }
.photo-layer{ overflow:visible !important; }
.photo-backdrop{
  inset:-72px !important;
  width:calc(100% + 144px) !important;
  height:calc(100% + 144px) !important;
  object-fit:cover !important;
  object-position:center center !important;
  filter:blur(28px) saturate(.96) brightness(1.02) !important;
  opacity:.48 !important;
  transform:scale(1.06) !important;
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

/* The image fades softly into its own colour field; never into a separate block. */
.memory-space::after{
  background:linear-gradient(180deg,
    rgba(15,39,71,0) 0%,
    rgba(15,39,71,0) 52%,
    rgba(15,39,71,.025) 67%,
    rgba(15,39,71,.08) 82%,
    rgba(15,39,71,.15) 100%) !important;
}

.memory-photo-air{ height:61% !important; min-height:210px !important; }
.memory-sheet{
  min-height:92% !important;
  padding:40px 22px 110px !important;
  color:#fff !important;
  background:linear-gradient(180deg,
    rgba(255,255,255,0) 0px,
    rgba(255,255,255,0) 118px,
    rgba(255,255,255,.08) 180px,
    rgba(255,255,255,.48) 258px,
    rgba(255,255,255,.90) 340px,
    #fff 430px) !important;
  text-shadow:0 2px 14px rgba(8,24,44,.38);
}
.memory-sheet::before{ color:rgba(255,255,255,.66) !important; }
.memory-sheet .date,
.memory-sheet .story{ color:#fff !important; }
.memory-sheet .story-more{ color:#24374d !important; text-shadow:none !important; }
.memory-story-scroll.is-reading .memory-sheet{
  color:var(--talera-deep) !important;
  text-shadow:none !important;
  background:linear-gradient(180deg,rgba(255,255,255,.92) 0px,#fff 96px) !important;
}
.memory-story-scroll.is-reading .memory-sheet::before{ color:rgba(15,39,71,.40) !important; }
.memory-story-scroll.is-reading .memory-sheet .date,
.memory-story-scroll.is-reading .memory-sheet .story{ color:var(--talera-deep) !important; }

/* Timeline floats inside the same photo colours. The blur eases out toward the sharp image. */
.timeline{
  position:relative;
  isolation:isolate;
  overflow:hidden;
  background:transparent !important;
  border-top:0 !important;
  border-bottom:0 !important;
}
.timeline::before{
  content:"";
  position:absolute;
  inset:-44px -34px -28px;
  z-index:0;
  background-image:var(--active-photo);
  background-size:cover;
  background-position:center top;
  filter:blur(18px) saturate(.94) brightness(1.02);
  transform:scale(1.07);
}
.timeline::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:1;
  background:linear-gradient(180deg,
    rgba(247,250,252,.50) 0%,
    var(--timeline-veil) 48%,
    rgba(247,250,252,.16) 78%,
    rgba(247,250,252,0) 100%);
  backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
}
.timeline canvas{ position:relative; z-index:2; transition:filter .28s ease; }
.center-needle{
  z-index:3 !important;
  background:linear-gradient(180deg,rgba(15,39,71,.04),var(--timeline-ink) 15%,var(--timeline-ink) 88%,rgba(15,39,71,.04)) !important;
}
.focus{
  z-index:4 !important;
  color:var(--timeline-ink) !important;
  background:rgba(255,255,255,.60) !important;
  border-color:rgba(255,255,255,.34) !important;
  backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);
}

/* Remove the visible seam between timeline and the sharp photograph. */
.timeline + .memory-space{ margin-top:-18px !important; padding-top:18px !important; }
.photo-stage{ top:-18px !important; }

/* Bottom controls use the same image colours and fade into them, instead of sitting on a bar. */
nav{
  position:relative;
  isolation:isolate;
  overflow:hidden;
  margin-top:-16px;
  padding-top:18px !important;
  background:transparent !important;
  border-top:0 !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
}
nav::before{
  content:"";
  position:absolute;
  inset:-54px -34px -34px;
  z-index:0;
  background-image:var(--active-photo);
  background-size:cover;
  background-position:center bottom;
  filter:blur(20px) saturate(.92) brightness(.86);
  transform:scale(1.08);
}
nav::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:1;
  background:linear-gradient(180deg,
    rgba(15,39,71,0) 0%,
    rgba(15,39,71,.05) 38%,
    rgba(15,39,71,.16) 100%);
}
nav > *{ position:relative; z-index:2; }
.nav-item{ color:rgba(255,255,255,.82) !important; text-shadow:0 1px 8px rgba(8,24,44,.30); }
.nav-item.active{ color:#fff !important; }
.tell{ background:rgba(255,255,255,.88) !important; color:var(--talera-deep) !important; box-shadow:0 7px 20px rgba(8,24,44,.20) !important; }

@media (max-height:700px){
  .memory-photo-air{ height:58% !important; min-height:180px !important; }
}
`;

export const enhancementScript = [
  "(() => {",
  "  const root = document.documentElement;",
  "  const surface = document.getElementById('surface');",
  "  const photoStage = document.getElementById('photoStage');",
  "  const timelineCanvas = document.getElementById('timelineCanvas');",
  "  if (!surface || !photoStage) return;",
  "  const DEEP = [15,39,71];",
  "  const LIGHT = [220,234,246];",
  "  const mix = (a,b,t) => a.map((v,i)=>Math.round(v+(b[i]-v)*t));",
  "  const rgb = a => 'rgb(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';",
  "  function activePhoto(){",
  "    return photoStage.querySelector('.photo-layer.is-front .example-photo') || photoStage.querySelector('.example-photo');",
  "  }",
  "  function setPhotoAtmosphere(img){",
  "    if (!img) return;",
  "    const src = img.currentSrc || img.src;",
  "    if (!src) return;",
  "    root.style.setProperty('--active-photo', 'url(\\\"' + src.replace(/\\\"/g,'\\\\\\\"') + '\\\")');",
  "    analyseTop(src);",
  "  }",
  "  function analyseTop(src){",
  "    const probe = new Image();",
  "    probe.crossOrigin = 'anonymous';",
  "    probe.onload = () => {",
  "      try{",
  "        const c = document.createElement('canvas');",
  "        c.width = 32; c.height = 12;",
  "        const x = c.getContext('2d', {willReadFrequently:true});",
  "        x.drawImage(probe, 0, 0, probe.naturalWidth, Math.max(1, probe.naturalHeight * .24), 0, 0, 32, 12);",
  "        const d = x.getImageData(0,0,32,12).data;",
  "        let lum=0, n=0;",
  "        for(let i=0;i<d.length;i+=4){",
  "          const r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;",
  "          lum += .2126*r + .7152*g + .0722*b;",
  "          n++;",
  "        }",
  "        lum/=n;",
  "        const contrast = Math.max(0, Math.min(1, 1-lum));",
  "        const lightAmount = Math.max(0, Math.min(1, contrast * .96));",
  "        const ink = mix(DEEP, LIGHT, lightAmount);",
  "        root.style.setProperty('--timeline-ink', rgb(ink));",
  "        const veilAlpha = .18 + lum * .24;",
  "        root.style.setProperty('--timeline-veil', 'rgba(247,250,252,' + veilAlpha.toFixed(2) + ')');",
  "        if (timelineCanvas){",
  "          const brightness = 0.78 + lightAmount * 1.18;",
  "          const saturate = 1.04 - lightAmount * .12;",
  "          timelineCanvas.style.filter = 'brightness(' + brightness.toFixed(2) + ') saturate(' + saturate.toFixed(2) + ')';",
  "        }",
  "      }catch(e){",
  "        root.style.setProperty('--timeline-ink','#0F2747');",
  "        root.style.setProperty('--timeline-veil','rgba(247,250,252,.30)');",
  "        if (timelineCanvas) timelineCanvas.style.filter = '';",
  "      }",
  "    };",
  "    probe.onerror = () => {",
  "      root.style.setProperty('--timeline-ink','#0F2747');",
  "      root.style.setProperty('--timeline-veil','rgba(247,250,252,.30)');",
  "    };",
  "    probe.src = src;",
  "  }",
  "  let lastSrc='';",
  "  function refresh(){",
  "    const img=activePhoto();",
  "    if(!img) return;",
  "    const src=img.currentSrc || img.src;",
  "    if(src && src!==lastSrc){",
  "      lastSrc=src;",
  "      setPhotoAtmosphere(img);",
  "    }",
  "  }",
  "  const observer = new MutationObserver(() => requestAnimationFrame(refresh));",
  "  observer.observe(photoStage,{subtree:true,attributes:true,attributeFilter:['src','class']});",
  "  photoStage.addEventListener('load', refresh, true);",
  "  refresh();",
  "})();"
].join("\n");

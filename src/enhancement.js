export const enhancementStyle = String.raw`
:root{
  --active-photo:none;
  --timeline-ink:#0F2747;
  --timeline-veil:rgba(247,250,252,.24);
  --photo-shadow:rgba(8,24,44,.30);
}

/* =========================================================
   LIFELINE IMMERSIVE PRESENTATION
   V16/V23 timeline mechanics stay untouched.
   The photograph becomes the canvas. Timeline, story and
   controls float inside one continuous memory.
   ========================================================= */

html,body{ background:#0F2747 !important; }
.app{
  position:relative;
  background:transparent !important;
}
main{
  position:relative !important;
  display:block !important;
  min-height:0;
  height:100%;
  overflow:hidden;
  background:transparent !important;
}

/* The memory occupies the complete main canvas, including the area behind the timeline. */
.memory-space{
  position:absolute !important;
  inset:0 !important;
  width:100%;
  height:100%;
  margin:0 !important;
  overflow:hidden !important;
  background:transparent !important;
}
.photo-stage{
  position:absolute !important;
  inset:0 !important;
  z-index:1;
  overflow:hidden !important;
  background:#0F2747 !important;
}
.photo-layer{
  position:absolute;
  inset:0;
  overflow:hidden !important;
  transition:opacity .42s ease, transform .52s cubic-bezier(.22,.72,.25,1) !important;
  will-change:opacity,transform;
}
.photo-backdrop{
  position:absolute !important;
  inset:-76px !important;
  width:calc(100% + 152px) !important;
  height:calc(100% + 152px) !important;
  object-fit:cover !important;
  object-position:center center !important;
  filter:blur(34px) saturate(.96) brightness(.88) !important;
  opacity:.62 !important;
  transform:scale(1.08) !important;
}
.example-photo{
  position:absolute !important;
  inset:0 !important;
  left:0 !important;
  top:0 !important;
  width:100% !important;
  height:100% !important;
  max-width:none !important;
  display:block !important;
  object-fit:cover !important;
  object-position:center center !important;
  filter:none !important;
  opacity:1 !important;
  background:transparent !important;
}

/* One soft photographic veil. No visible card or block boundaries. */
.memory-space::before{
  content:"" !important;
  display:block !important;
  position:absolute;
  inset:0;
  z-index:2;
  pointer-events:none;
  background:
    linear-gradient(180deg,
      rgba(6,18,34,.16) 0%,
      rgba(6,18,34,.03) 22%,
      rgba(6,18,34,0) 48%,
      rgba(6,18,34,.05) 66%,
      rgba(6,18,34,.30) 100%);
}
.memory-space::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:3;
  pointer-events:none;
  background:linear-gradient(180deg,
    rgba(15,39,71,0) 0%,
    rgba(15,39,71,0) 54%,
    rgba(15,39,71,.035) 68%,
    rgba(15,39,71,.10) 82%,
    rgba(15,39,71,.20) 100%);
}

/* Timeline is an overlay at the top rather than a separate horizontal block. */
.timeline{
  position:absolute !important;
  z-index:20 !important;
  left:0;
  right:0;
  top:0;
  height:clamp(154px,20dvh,184px) !important;
  min-height:154px !important;
  overflow:hidden;
  isolation:isolate;
  background:transparent !important;
  border:0 !important;
  box-shadow:none !important;
  touch-action:none;
}
.timeline::before{
  content:"";
  position:absolute;
  inset:-52px -38px -22px;
  z-index:0;
  background-image:var(--active-photo);
  background-size:cover;
  background-position:center top;
  filter:blur(22px) saturate(.98) brightness(.94);
  transform:scale(1.08);
  opacity:.96;
}
.timeline::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:1;
  background:linear-gradient(180deg,
    rgba(247,250,252,.56) 0%,
    var(--timeline-veil) 42%,
    rgba(247,250,252,.11) 72%,
    rgba(247,250,252,0) 100%);
  backdrop-filter:blur(5px);
  -webkit-backdrop-filter:blur(5px);
}
.timeline canvas{
  position:relative;
  z-index:2;
  transition:filter .28s ease, opacity .24s ease;
}
.center-needle{
  z-index:3 !important;
  background:linear-gradient(180deg,
    rgba(15,39,71,.02),
    var(--timeline-ink) 15%,
    var(--timeline-ink) 88%,
    rgba(15,39,71,.02)) !important;
}
.focus{
  z-index:4 !important;
  color:var(--timeline-ink) !important;
  background:rgba(255,255,255,.54) !important;
  border-color:rgba(255,255,255,.30) !important;
  box-shadow:0 5px 18px rgba(8,24,44,.08);
  backdrop-filter:blur(7px);
  -webkit-backdrop-filter:blur(7px);
}
.zoom-hint{ z-index:5 !important; }

/* Vertical reading is independent of horizontal time travel. */
.memory-story-scroll{
  position:absolute !important;
  inset:0 !important;
  z-index:8 !important;
  overflow-y:auto !important;
  overflow-x:hidden !important;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior-y:contain;
  scrollbar-width:none;
  touch-action:pan-y;
}
.memory-story-scroll::-webkit-scrollbar{ display:none; }
.memory-photo-air{
  height:63% !important;
  min-height:285px !important;
  pointer-events:none;
}
.memory-sheet{
  position:relative;
  min-height:86% !important;
  padding:46px 22px 112px !important;
  color:#fff !important;
  text-shadow:0 2px 16px var(--photo-shadow);
  background:linear-gradient(180deg,
    rgba(255,255,255,0) 0px,
    rgba(255,255,255,0) 96px,
    rgba(255,255,255,.05) 160px,
    rgba(255,255,255,.24) 235px,
    rgba(255,255,255,.64) 320px,
    rgba(255,255,255,.93) 420px,
    #fff 500px) !important;
  transition:opacity .24s ease, transform .30s ease, background .34s ease !important;
}
.memory-sheet::before{
  content:"↑" !important;
  top:22px !important;
  color:rgba(255,255,255,.62) !important;
  text-shadow:0 1px 8px rgba(8,24,44,.28);
}
.memory-sheet .date,
.memory-sheet .story{
  color:#fff !important;
}
.memory-sheet .date{
  font-size:13px !important;
  font-weight:720 !important;
  margin-bottom:8px !important;
}
.memory-sheet .story{
  font-size:17px !important;
  line-height:1.44 !important;
  font-weight:620 !important;
  max-width:35ch !important;
}
.memory-sheet .story-more{
  color:#24374d !important;
  text-shadow:none !important;
  font-size:16px !important;
  line-height:1.62 !important;
}
.memory-story-scroll.is-reading .memory-sheet{
  color:var(--talera-deep) !important;
  text-shadow:none !important;
  background:linear-gradient(180deg,
    rgba(255,255,255,.90) 0px,
    rgba(255,255,255,.98) 92px,
    #fff 150px) !important;
}
.memory-story-scroll.is-reading .memory-sheet::before{
  color:rgba(15,39,71,.38) !important;
  text-shadow:none;
}
.memory-story-scroll.is-reading .memory-sheet .date,
.memory-story-scroll.is-reading .memory-sheet .story{
  color:var(--talera-deep) !important;
}

/* While travelling through time, let the photographs move; keep text quiet. */
html.is-scrubbing .memory-sheet{
  opacity:.22 !important;
  transform:translateY(8px) !important;
}
html.is-scrubbing .timeline canvas{ opacity:.92; }
html.is-scrubbing .photo-layer{
  transition:opacity .16s linear, transform .18s linear !important;
}

/* Bottom actions are part of the same photographic space, not a separate bar. */
nav{
  position:relative;
  z-index:30;
  isolation:isolate;
  overflow:hidden;
  margin-top:-18px;
  padding-top:18px !important;
  background:transparent !important;
  border:0 !important;
  box-shadow:none !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
}
nav::before{
  content:"";
  position:absolute;
  inset:-64px -40px -36px;
  z-index:0;
  background-image:var(--active-photo);
  background-size:cover;
  background-position:center bottom;
  filter:blur(24px) saturate(.94) brightness(.68);
  transform:scale(1.10);
}
nav::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:1;
  background:linear-gradient(180deg,
    rgba(8,24,44,0) 0%,
    rgba(8,24,44,.13) 44%,
    rgba(8,24,44,.32) 100%);
}
nav > *{ position:relative; z-index:2; }
.nav-item{
  color:rgba(255,255,255,.78) !important;
  text-shadow:0 1px 9px rgba(8,24,44,.36);
}
.nav-item.active{ color:#fff !important; }
.tell{
  background:rgba(255,255,255,.90) !important;
  color:var(--talera-deep) !important;
  box-shadow:0 8px 22px rgba(8,24,44,.24) !important;
}

@media (max-height:700px){
  .timeline{ height:148px !important; min-height:148px !important; }
  .memory-photo-air{ height:59% !important; min-height:230px !important; }
  .memory-sheet{ padding-top:42px !important; }
}
`;

export const enhancementScript = [
  "(() => {",
  "  const root = document.documentElement;",
  "  const surface = document.getElementById('surface');",
  "  const photoStage = document.getElementById('photoStage');",
  "  const timelineCanvas = document.getElementById('timelineCanvas');",
  "  if (!surface || !photoStage) return;",
  "",
  "  const DEEP = [15,39,71];",
  "  const LIGHT = [226,237,247];",
  "  const mix = (a,b,t) => a.map((v,i)=>Math.round(v+(b[i]-v)*t));",
  "  const rgb = a => 'rgb(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';",
  "",
  "  function visiblePhoto(){",
  "    const layers = [...photoStage.querySelectorAll('.photo-layer')];",
  "    let best = null;",
  "    let bestOpacity = -1;",
  "    for (const layer of layers){",
  "      const opacity = parseFloat(getComputedStyle(layer).opacity || '0');",
  "      if (opacity > bestOpacity){",
  "        bestOpacity = opacity;",
  "        best = layer.querySelector('.example-photo');",
  "      }",
  "    }",
  "    return best || photoStage.querySelector('.example-photo');",
  "  }",
  "",
  "  function setPhotoAtmosphere(img){",
  "    if (!img) return;",
  "    const src = img.currentSrc || img.src;",
  "    if (!src) return;",
  "    root.style.setProperty('--active-photo', 'url(\\\"' + src.replace(/\\\"/g,'\\\\\\\"') + '\\\")');",
  "    analysePhoto(src);",
  "  }",
  "",
  "  function analysePhoto(src){",
  "    const probe = new Image();",
  "    probe.crossOrigin = 'anonymous';",
  "    probe.onload = () => {",
  "      try{",
  "        const c = document.createElement('canvas');",
  "        c.width = 32; c.height = 18;",
  "        const x = c.getContext('2d', {willReadFrequently:true});",
  "        x.drawImage(probe, 0, 0, probe.naturalWidth, Math.max(1,probe.naturalHeight*.30), 0, 0, 32, 18);",
  "        const d = x.getImageData(0,0,32,18).data;",
  "        let lum=0, n=0;",
  "        for(let i=0;i<d.length;i+=4){",
  "          const r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;",
  "          lum += .2126*r + .7152*g + .0722*b; n++;",
  "        }",
  "        lum/=Math.max(1,n);",
  "        const lightAmount = Math.max(0,Math.min(1,(1-lum)*.94));",
  "        const ink = mix(DEEP,LIGHT,lightAmount);",
  "        root.style.setProperty('--timeline-ink',rgb(ink));",
  "        root.style.setProperty('--timeline-veil','rgba(247,250,252,'+(.12+lum*.22).toFixed(2)+')');",
  "        if(timelineCanvas){",
  "          const brightness=.82+lightAmount*1.06;",
  "          timelineCanvas.style.filter='brightness('+brightness.toFixed(2)+') saturate(.96)';",
  "        }",
  "      }catch(e){",
  "        root.style.setProperty('--timeline-ink','#0F2747');",
  "        root.style.setProperty('--timeline-veil','rgba(247,250,252,.24)');",
  "        if(timelineCanvas) timelineCanvas.style.filter='';",
  "      }",
  "    };",
  "    probe.onerror = () => {",
  "      root.style.setProperty('--timeline-ink','#0F2747');",
  "      root.style.setProperty('--timeline-veil','rgba(247,250,252,.24)');",
  "    };",
  "    probe.src=src;",
  "  }",
  "",
  "  let lastSrc='';",
  "  function refresh(){",
  "    const img=visiblePhoto();",
  "    if(!img) return;",
  "    const src=img.currentSrc || img.src;",
  "    if(src && src!==lastSrc){",
  "      lastSrc=src;",
  "      setPhotoAtmosphere(img);",
  "    }",
  "  }",
  "",
  "  const observer=new MutationObserver(()=>requestAnimationFrame(refresh));",
  "  observer.observe(photoStage,{subtree:true,attributes:true,attributeFilter:['src','class','style']});",
  "  photoStage.addEventListener('load',refresh,true);",
  "",
  "  let scrubTimer=0;",
  "  const startScrub=()=>{ root.classList.add('is-scrubbing'); clearTimeout(scrubTimer); };",
  "  const endScrub=()=>{ clearTimeout(scrubTimer); scrubTimer=setTimeout(()=>root.classList.remove('is-scrubbing'),150); };",
  "  surface.addEventListener('pointerdown',startScrub,{passive:true});",
  "  surface.addEventListener('pointerup',endScrub,{passive:true});",
  "  surface.addEventListener('pointercancel',endScrub,{passive:true});",
  "  surface.addEventListener('wheel',()=>{ startScrub(); endScrub(); },{passive:true});",
  "",
  "  refresh();",
  "})();"
].join("\n");

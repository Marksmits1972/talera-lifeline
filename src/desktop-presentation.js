/*
 * TALERA large-screen presentation mode — approved TV reference, 29 Sep 2026.
 * Phone remains controller/editor. Large screens are presentation only.
 */
export const desktopPresentationStyle = String.raw`
@media (min-width:768px){
  html,body,.app,main,.memory-space,.photo-stage,.photo-layer{width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important}
  html,body,.app{height:100dvh!important;background:#0F2747!important}
  .memory-space{position:absolute!important;inset:0!important;overflow:hidden!important}
  .photo-stage,.photo-layer{position:absolute!important;inset:0!important}
  .photo-backdrop{inset:-72px!important;width:calc(100% + 144px)!important;height:calc(100% + 144px)!important;object-fit:cover!important;opacity:.78!important;filter:blur(34px) saturate(1.02) brightness(.90)!important}
  .example-photo,.photo-aligned-blur{max-width:none!important}
  .photo-layer.talera-landscape .example-photo{inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center center!important;-webkit-mask-image:none!important;mask-image:none!important}
  .photo-layer.talera-landscape .photo-aligned-blur{opacity:0!important}

  /* Approved TV composition: compact timeline high in the picture, edge-to-edge flow. */
  .timeline{position:absolute!important;left:0!important;right:0!important;top:0!important;z-index:20!important;height:214px!important;min-height:214px!important;isolation:isolate!important;--timeline-rest-opacity:1;overflow:visible!important;display:block!important;visibility:visible!important}
  .timeline::before,.timeline::after{display:none!important}
  .timeline canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;visibility:visible!important}
  .timeline canvas,.timeline.is-active canvas,.timeline.is-timeline-engaged canvas,.timeline.is-timeline-afterglow canvas{
    opacity:1!important;transform:none!important;filter:drop-shadow(0 1px 2px rgba(255,255,255,.86))!important
  }
  .talera-tv-memories{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden}
  .talera-tv-memory{position:absolute;transform:translateX(-50%);border-radius:11px;background:rgba(255,255,255,.92);padding:3px;box-shadow:0 5px 14px rgba(15,39,71,.24),0 0 0 1px rgba(255,255,255,.7);transition:left .55s cubic-bezier(.2,.75,.2,1),top .55s cubic-bezier(.2,.75,.2,1)}
  .talera-tv-memory img{display:block;width:100%;height:100%;object-fit:cover;border-radius:8px}
  .talera-tv-memory::after{content:"";position:absolute;left:50%;top:100%;width:1.5px;height:var(--stem,18px);background:rgba(15,74,132,.82);transform:translateX(-50%)}
  .talera-tv-memory-count{position:absolute;right:-7px;top:-7px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#0F2747;color:#fff;font:700 10px/20px Inter,-apple-system,sans-serif;text-align:center;box-shadow:0 2px 7px rgba(15,39,71,.3)}
  .talera-tv-memory-dot{position:absolute;left:50%;top:calc(100% + var(--stem,18px) - 5px);width:10px;height:10px;border-radius:50%;background:#1767b1;border:2px solid rgba(255,255,255,.96);transform:translateX(-50%);box-shadow:0 1px 4px rgba(15,39,71,.25)}

  .timeline .center-needle,.timeline.is-active .center-needle,.timeline.is-timeline-engaged .center-needle,.timeline.is-marker-afterglow .center-needle{
    z-index:7!important;width:2px!important;height:91px!important;top:67px!important;bottom:auto!important;margin-top:0!important;opacity:1!important;background:linear-gradient(180deg,rgba(15,39,71,.2),#0F4A84 22%,#0F4A84 100%)!important;box-shadow:0 0 0 1px rgba(255,255,255,.28)!important;filter:none!important
  }
  .timeline .center-needle::before{box-shadow:0 0 0 4px rgba(255,255,255,.78),0 2px 8px rgba(15,39,71,.3)!important}
  main .timeline .focus,main .timeline.is-active .focus,main .timeline.is-timeline-engaged .focus,main .timeline.is-timeline-afterglow .focus,main .timeline.is-marker-afterglow .focus{
    z-index:9!important;top:31px!important;transform:translateX(-50%)!important;padding:8px 16px!important;border-radius:999px!important;font-weight:750!important;letter-spacing:-.01em!important;color:#0F2747!important;background:#fff!important;border:1px solid rgba(15,39,71,.12)!important;box-shadow:0 6px 16px rgba(15,39,71,.20)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;opacity:1!important
  }

  /* Only the story heading remains, centered low over the photograph. */
  .memory-photo-air{height:64%!important;min-height:360px!important}
  .memory-sheet{padding:0 clamp(44px,6vw,104px) 54px!important;background:linear-gradient(180deg,transparent 0%,transparent 62%,rgba(6,18,30,.18) 100%)!important;display:flex!important;justify-content:center!important;align-items:flex-end!important}
  .memory-sheet::before{display:none!important}
  .memory-sheet .story{max-width:min(920px,76vw)!important;margin:0 auto!important;text-align:center!important;font-size:clamp(28px,2.35vw,42px)!important;line-height:1.08!important;font-weight:700!important;letter-spacing:-.022em!important;color:#fff!important;text-wrap:balance!important;-webkit-text-stroke:.2px rgba(15,39,71,.18);text-shadow:0 2px 4px rgba(6,18,30,.72),0 8px 26px rgba(6,18,30,.42)!important}
  .memory-sheet .story-more,.memory-date{display:none!important}
  nav,.talera-context-share,.talera-memory-edit,.talera-memory-audio,.talera-audio-consent,.talera-memory-manager{display:none!important}
  .memory-story-scroll{bottom:0!important;z-index:12!important;pointer-events:none!important}
  .memory-caption{display:block!important;visibility:visible!important;opacity:1!important}
  .memory-sheet{position:absolute!important;left:0!important;right:0!important;bottom:0!important;min-height:0!important;height:auto!important}
  .memory-sheet .story{display:block!important;visibility:visible!important;opacity:1!important;color:#fff!important}
  .talera-tv-axis{position:absolute;left:28px;right:28px;top:150px;height:2px;background:rgba(23,103,177,.82);box-shadow:0 1px 2px rgba(255,255,255,.9);z-index:4}
  .talera-tv-axis::before,.talera-tv-axis::after{content:"";position:absolute;top:50%;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 5px rgba(15,39,71,.24);transform:translateY(-50%)}
  .talera-tv-axis::before{left:-9px}.talera-tv-axis::after{right:-9px}
  .talera-tv-tick{position:absolute;bottom:-1px;width:2px;border-radius:2px;background:#1767b1;transform:translateX(-50%)}
  .talera-tv-tick.is-minor{height:7px;opacity:.68}.talera-tv-tick.is-major{height:15px;opacity:.95}
  .talera-tv-title{position:fixed;left:50%;bottom:46px;z-index:30;transform:translateX(-50%);width:min(900px,78vw);margin:0;text-align:center;color:#fff;font:700 clamp(28px,2.35vw,42px)/1.08 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.022em;text-shadow:0 2px 4px rgba(6,18,30,.78),0 8px 26px rgba(6,18,30,.48);pointer-events:none}
}
`;

export const desktopPresentationScript = String.raw`
(()=>{
  const large=()=>window.matchMedia('(min-width:768px)').matches;
  const classify=img=>{
    if(!large()||!img||!img.naturalWidth||!img.naturalHeight)return;
    const layer=img.closest('.photo-layer');if(!layer)return;
    const landscape=(img.naturalWidth/img.naturalHeight)>=1.18;
    layer.classList.toggle('talera-landscape',landscape);layer.classList.toggle('talera-portrait',!landscape);
  };
  const scan=()=>document.querySelectorAll('.example-photo').forEach(img=>{if(img.complete)classify(img);img.addEventListener('load',()=>classify(img),{passive:true,once:true})});
  scan();new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('resize',scan,{passive:true});

  const timeline=document.querySelector('.timeline');
  if(!timeline||!large())return;
  timeline.classList.add('is-active','is-timeline-engaged','is-timeline-afterglow','is-marker-afterglow');

  const axis=document.createElement('div');axis.className='talera-tv-axis';
  for(let i=1;i<40;i++){const t=document.createElement('i');t.className='talera-tv-tick '+(i%5===0?'is-major':'is-minor');t.style.left=(i/40*100)+'%';axis.appendChild(t)}
  timeline.appendChild(axis);

  const layer=document.createElement('div');layer.className='talera-tv-memories';timeline.appendChild(layer);
  const title=document.createElement('div');title.className='talera-tv-title';document.body.appendChild(title);

  const render=()=>{
    const rt=window.__taleraTimelineRuntime;if(!rt||!large())return;
    const memories=rt.memories?rt.memories():[];const bounds=rt.bounds?rt.bounds():null;if(!bounds)return;
    const start=bounds[0],end=bounds[1],span=Math.max(1,end-start),w=timeline.clientWidth,active=rt.activeMemoryId();
    const visible=memories.filter(m=>m.ms>=start&&m.ms<=end&&m.id!==active).map(m=>({m,x:(m.ms-start)/span*w})).sort((a,b)=>a.x-b.x);
    const groups=[];
    for(const item of visible){const prev=groups[groups.length-1];if(prev&&Math.abs(item.x-prev.x)<34){prev.items.push(item.m);prev.x=(prev.x*(prev.items.length-1)+item.x)/prev.items.length}else groups.push({x:item.x,items:[item.m]})}
    layer.replaceChildren();
    groups.forEach((g,i)=>{
      if(g.x<34||g.x>w-34)return;
      const n=g.items.length,m=g.items[Math.floor((n-1)/2)];
      const base=n>=4?84:n>=2?74:62, aspect=[.84,1.08,1.22,.94][i%4];
      const width=Math.round(base*aspect),height=base,lift=[12,34,20,44,26][i%5],stem=14+lift;
      const el=document.createElement('div');el.className='talera-tv-memory';el.style.left=g.x+'px';el.style.width=width+'px';el.style.height=height+'px';el.style.top=Math.max(7,150-stem-height)+'px';el.style.setProperty('--stem',stem+'px');
      const img=document.createElement('img');img.src=m.image;img.alt='';img.decoding='async';el.appendChild(img);
      if(n>1){const badge=document.createElement('span');badge.className='talera-tv-memory-count';badge.textContent=String(n);el.appendChild(badge)}
      const dot=document.createElement('span');dot.className='talera-tv-memory-dot';el.appendChild(dot);layer.appendChild(el);
    });
    const current=rt.currentMemory?rt.currentMemory():null;
    title.textContent=current&&current.story?current.story:'';
  };
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})};
  window.addEventListener('talera:timeline-draw',schedule);window.addEventListener('resize',schedule,{passive:true});
  setInterval(schedule,180);
  setTimeout(schedule,0);setTimeout(schedule,250);setTimeout(schedule,800);
})();
`;

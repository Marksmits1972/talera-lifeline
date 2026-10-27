
/* Runs inside existing taleraCompactWorkbench(g) after document.body.appendChild(overlay).
   Uses the SAME media IDs, previews, order and object URLs as the existing TALERA editor. */
const photoStrip=document.createElement('div');
photoStrip.id='taleraWriterPhotos';
photoStrip.setAttribute('aria-label','Beelden bij deze herinnering');
photoStrip.innerHTML=g.media.map((id,i)=>{
 const f=assets.get(id),isVideo=kind(f)==='video';
 return '<div class="talera-writer-thumbnail"><img src="'+escapeHtml(url(id))+
  '" alt="Beeld '+(i+1)+'">'+(isVideo?'<span aria-label="Video">▶</span>':'')+'</div>';
}).join('');
if(g.media.length)overlay.querySelector('.talera-writer-top').after(photoStrip);

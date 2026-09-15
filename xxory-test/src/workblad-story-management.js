export async function handleStoryManagement(request, env) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/v9\/story\/([A-Za-z0-9_-]{16,80})$/);
  if (!match || request.method !== 'DELETE') return null;
  if (!env.DB) return json({ error:'Opslagbinding ontbreekt.' }, 500);

  const storyId = match[1];
  const token = bearer(request.headers.get('authorization'));
  if (!token) return json({ error:'Beheerautorisatie ontbreekt.' }, 401);

  const story = await env.DB.prepare(`
    SELECT id, status, manage_token_hash
    FROM stories
    WHERE id = ? LIMIT 1
  `).bind(storyId).first();
  if (!story || story.status !== 'active') return json({ error:'Herinnering niet gevonden.' }, 404);

  const tokenHash = await sha256Text(token);
  if (!story.manage_token_hash || String(story.manage_token_hash) !== tokenHash) {
    return json({ error:'Je hebt geen toegang om deze herinnering te verwijderen.' }, 403);
  }

  const deletedAt = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE stories
    SET status = 'deleted', updated_at = ?
    WHERE id = ? AND status = 'active'
  `).bind(deletedAt, storyId).run();

  // Bewuste soft-delete: audio, tekst en foto's blijven voorlopig bewaard zodat
  // een foutieve verwijdering later herstelbaar kan worden gemaakt.
  return json({ ok:true, storyId, deletedAt, softDeleted:true });
}

export const WORKBLAD_STORY_MANAGEMENT_SCRIPT = String.raw`<script id="talera-story-management">
(() => {
  const TIMELINE_URL='https://talera-timeline-prototype.mark-a39.workers.dev/';
  const ROOT_ID='talera-story-manage-bar';
  const SHEET_ID='talera-story-manage-sheet';
  let mediaUrls=[];
  let mounting=false;

  function ctx(){
    const q=new URLSearchParams(location.search);
    const storyId=q.get('edit')||'';
    if(!storyId)return null;
    const h=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
    let token=h.get('token')||'';
    if(storyId&&token)try{sessionStorage.setItem('talera-edit-token:'+storyId,token)}catch(e){}
    if(storyId&&!token)try{token=sessionStorage.getItem('talera-edit-token:'+storyId)||''}catch(e){}
    return storyId&&token?{storyId,token}:null;
  }

  function auth(token){return {'authorization':'Bearer '+token}}
  function revokeMedia(){mediaUrls.forEach(url=>{try{URL.revokeObjectURL(url)}catch(e){}});mediaUrls=[]}

  function ensureStyle(){
    if(document.getElementById('talera-story-management-style'))return;
    const style=document.createElement('style');
    style.id='talera-story-management-style';
    style.textContent=`
      .talera-story-manage-bar{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 2px}
      .talera-story-manage-button{min-height:46px;border:0;border-radius:15px;padding:0 12px;font:750 13px/1.15 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
      .talera-story-manage-photos{color:#0F2747;background:rgba(220,234,246,.72);box-shadow:inset 0 0 0 1px rgba(15,39,71,.08)}
      .talera-story-manage-delete{color:#8A2F2A;background:rgba(193,79,69,.10);box-shadow:inset 0 0 0 1px rgba(193,79,69,.18)}
      .talera-manage-backdrop{position:fixed;inset:0;z-index:140;background:rgba(15,39,71,.24);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;align-items:flex-end;justify-content:center;padding:12px 10px max(12px,env(safe-area-inset-bottom))}
      .talera-manage-sheet{width:min(100%,560px);max-height:min(82dvh,720px);overflow:hidden;border-radius:26px;background:#fffdfa;color:#0F2747;box-shadow:0 24px 70px rgba(15,39,71,.26);display:flex;flex-direction:column}
      .talera-manage-head{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;padding:12px 12px 8px;border-bottom:1px solid rgba(15,39,71,.07)}
      .talera-manage-head h2{margin:0;text-align:center;font:780 19px/1.1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
      .talera-manage-close{width:44px;height:44px;border:0;border-radius:50%;background:rgba(220,234,246,.62);color:#0F2747;font:700 23px/1 system-ui}
      .talera-manage-body{padding:12px;overflow:auto;-webkit-overflow-scrolling:touch}
      .talera-manage-intro{margin:0 0 12px;color:#647181;font:520 13px/1.4 system-ui}
      .talera-manage-photo-list{display:grid;gap:10px}
      .talera-manage-photo{display:grid;grid-template-columns:88px minmax(0,1fr);gap:12px;align-items:center;padding:9px;border-radius:18px;background:#f5f4f1;box-shadow:inset 0 0 0 1px rgba(15,39,71,.07)}
      .talera-manage-photo img{width:88px;height:88px;border-radius:13px;display:block;object-fit:cover;background:#e8e5df}
      .talera-manage-photo-copy{min-width:0;display:grid;gap:7px}
      .talera-manage-photo-label{font:720 12px/1.2 system-ui;color:#526071}
      .talera-manage-photo-remove{min-height:46px;border:0;border-radius:14px;color:#8A2F2A;background:#fff;box-shadow:inset 0 0 0 1px rgba(193,79,69,.18);font:750 13px/1 system-ui}
      .talera-manage-empty{padding:18px 8px;text-align:center;color:#647181;font:560 13px/1.4 system-ui}
      .talera-delete-card{padding:8px 2px 2px;text-align:center}
      .talera-delete-card h3{margin:4px 0 8px;font:790 24px/1.08 system-ui;letter-spacing:-.02em}
      .talera-delete-card p{margin:0 auto;max-width:38ch;color:#647181;font:520 14px/1.42 system-ui}
      .talera-delete-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}
      .talera-delete-cancel,.talera-delete-confirm{min-height:52px;border:0;border-radius:16px;font:760 14px/1 system-ui}
      .talera-delete-cancel{background:rgba(220,234,246,.68);color:#0F2747}
      .talera-delete-confirm{background:#8A2F2A;color:#fff}
      .talera-delete-confirm:disabled,.talera-manage-photo-remove:disabled{opacity:.5}
      .talera-manage-error{margin-top:10px;color:#8A2F2A;font:650 12px/1.35 system-ui}
      @media(max-width:600px){.talera-story-manage-bar{gap:6px}.talera-story-manage-button{min-height:44px;padding:0 9px;font-size:12px}.talera-manage-sheet{max-height:86dvh}.talera-manage-photo{grid-template-columns:82px minmax(0,1fr)}.talera-manage-photo img{width:82px;height:82px}}
    `;
    document.head.appendChild(style);
  }

  function closeSheet(){
    revokeMedia();
    const node=document.getElementById(SHEET_ID);
    if(node)node.remove();
  }

  function shell(title){
    closeSheet();
    const back=document.createElement('div');
    back.id=SHEET_ID;
    back.className='talera-manage-backdrop';
    back.innerHTML='<section class="talera-manage-sheet" role="dialog" aria-modal="true"><header class="talera-manage-head"><span></span><h2></h2><button type="button" class="talera-manage-close" aria-label="Sluiten">×</button></header><div class="talera-manage-body"></div></section>';
    back.querySelector('h2').textContent=title;
    back.querySelector('.talera-manage-close').addEventListener('click',closeSheet);
    back.addEventListener('click',e=>{if(e.target===back)closeSheet()});
    document.body.appendChild(back);
    return back.querySelector('.talera-manage-body');
  }

  async function storyDetail(context){
    const response=await fetch('/api/integration/stories/'+encodeURIComponent(context.storyId),{headers:auth(context.token),cache:'no-store'});
    let data={};try{data=await response.json()}catch(e){}
    if(!response.ok)throw new Error(data.error||'Deze herinnering kon niet worden geopend.');
    return data;
  }

  async function openPhotos(context){
    const body=shell('Foto’s beheren');
    body.innerHTML='<p class="talera-manage-intro">Hier staan alleen de foto’s van deze herinnering. Verwijderen heeft geen invloed op andere verhalen.</p><div class="talera-manage-empty">Foto’s laden…</div>';
    try{
      const detail=await storyDetail(context);
      const items=Array.isArray(detail.media)?detail.media.filter(item=>item.mediaType==='image'):[];
      body.innerHTML='<p class="talera-manage-intro">Tik bij een foto op <strong>Verwijder foto</strong>. Je kunt meerdere foto’s achter elkaar opruimen.</p><div class="talera-manage-photo-list"></div>';
      const list=body.querySelector('.talera-manage-photo-list');
      if(!items.length){list.innerHTML='<div class="talera-manage-empty">Er staan geen foto’s meer in deze herinnering.</div>';return}
      for(const item of items){
        let src='';
        try{
          const response=await fetch(item.url,{headers:auth(context.token),cache:'no-store'});
          if(response.ok){const blob=await response.blob();src=URL.createObjectURL(blob);mediaUrls.push(src)}
        }catch(e){}
        const row=document.createElement('div');row.className='talera-manage-photo';
        const img=document.createElement('img');img.alt='Foto in deze herinnering';if(src)img.src=src;row.appendChild(img);
        const copy=document.createElement('div');copy.className='talera-manage-photo-copy';
        const label=document.createElement('div');label.className='talera-manage-photo-label';label.textContent=item.role==='start'?'Voorste foto':'Foto';copy.appendChild(label);
        const remove=document.createElement('button');remove.type='button';remove.className='talera-manage-photo-remove';remove.textContent='Verwijder foto';
        remove.addEventListener('click',async()=>{
          remove.disabled=true;remove.textContent='Verwijderen…';
          const response=await fetch('/api/v9/story-photo/'+encodeURIComponent(context.storyId)+'/'+encodeURIComponent(item.id),{method:'DELETE',headers:auth(context.token),cache:'no-store'});
          let data={};try{data=await response.json()}catch(e){}
          if(!response.ok||!data.ok){remove.disabled=false;remove.textContent='Verwijder foto';const error=document.createElement('div');error.className='talera-manage-error';error.textContent=data.error||'De foto kon niet worden verwijderd.';copy.appendChild(error);return}
          if(src){try{URL.revokeObjectURL(src)}catch(e){}mediaUrls=mediaUrls.filter(url=>url!==src)}
          row.remove();
          if(!list.querySelector('.talera-manage-photo'))list.innerHTML='<div class="talera-manage-empty">Er staan geen foto’s meer in deze herinnering.</div>';
        });
        copy.appendChild(remove);row.appendChild(copy);list.appendChild(row);
      }
    }catch(error){body.innerHTML='<div class="talera-manage-error">'+String(error&&error.message||'Foto’s laden mislukt.')+'</div>'}
  }

  async function openDelete(context){
    const body=shell('Herinnering verwijderen');
    let title='deze herinnering';
    try{const detail=await storyDetail(context);if(detail&&detail.title)title='“'+detail.title+'”'}catch(e){}
    const card=document.createElement('div');card.className='talera-delete-card';
    card.innerHTML='<h3>Verwijder '+title+'?</h3><p>De herinnering verdwijnt direct van je tijdlijn. Foto’s en audio worden voorlopig veilig bewaard zodat herstel later mogelijk blijft.</p><div class="talera-delete-actions"><button type="button" class="talera-delete-cancel">Annuleren</button><button type="button" class="talera-delete-confirm">Verwijder herinnering</button></div><div class="talera-manage-error" hidden></div>';
    body.appendChild(card);
    card.querySelector('.talera-delete-cancel').addEventListener('click',closeSheet);
    card.querySelector('.talera-delete-confirm').addEventListener('click',async e=>{
      const button=e.currentTarget;button.disabled=true;button.textContent='Verwijderen…';
      const response=await fetch('/api/v9/story/'+encodeURIComponent(context.storyId),{method:'DELETE',headers:auth(context.token),cache:'no-store'});
      let data={};try{data=await response.json()}catch(err){}
      if(!response.ok||!data.ok){button.disabled=false;button.textContent='Verwijder herinnering';const error=card.querySelector('.talera-manage-error');error.hidden=false;error.textContent=data.error||'De herinnering kon niet worden verwijderd.';return}
      try{sessionStorage.removeItem('talera-edit-token:'+context.storyId)}catch(err){}
      location.href=TIMELINE_URL+'?cleanup='+Date.now();
    });
  }

  function mount(){
    const context=ctx();if(!context||mounting)return;
    ensureStyle();
    const kicker=document.querySelector('.work-kicker');
    if(!kicker)return;
    const finish=document.getElementById('workFinish');if(finish)finish.textContent='Wijzigingen opslaan';
    if(document.getElementById(ROOT_ID))return;
    mounting=true;
    const bar=document.createElement('div');bar.id=ROOT_ID;bar.className='talera-story-manage-bar';
    bar.innerHTML='<button type="button" class="talera-story-manage-button talera-story-manage-photos">Foto’s beheren</button><button type="button" class="talera-story-manage-button talera-story-manage-delete">Verwijder herinnering</button>';
    bar.querySelector('.talera-story-manage-photos').addEventListener('click',()=>openPhotos(context));
    bar.querySelector('.talera-story-manage-delete').addEventListener('click',()=>openDelete(context));
    kicker.insertAdjacentElement('afterend',bar);
    mounting=false;
  }

  mount();
  new MutationObserver(mount).observe(document.documentElement,{subtree:true,childList:true});
  addEventListener('pagehide',revokeMedia,{once:true});
})();
</scr`+`ipt>`;

function bearer(value) {
  const match = String(value || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

async function sha256Text(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store, max-age=0'}
  });
}

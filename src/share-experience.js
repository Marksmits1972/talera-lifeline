export const shareExperienceStyle = String.raw`
:root{
  --share-deep:#0F2747;
  --share-blue:#315f87;
  --share-soft:#5B8FB9;
  --share-accent:#E7A98B;
  --share-paper:#FAF9F6;
  --share-card:#FFFFFF;
  --share-soft-panel:#F1F4F6;
  --share-ink:#26384f;
  --share-muted:#6e7b8c;
  --share-sheet-height:min(81dvh,720px);
  --share-sheet-radius:32px;
}

body.talera-share-open{overscroll-behavior:none}
.talera-context-share{
  position:absolute!important;
  right:20px!important;
  bottom:166px!important;
  width:46px!important;
  min-width:46px!important;
  height:46px!important;
  padding:0!important;
  border:1.5px solid rgba(255,255,255,.72)!important;
  color:#fff!important;
  background:var(--share-blue)!important;
  box-shadow:0 6px 19px rgba(15,39,71,.28),inset 0 1px 0 rgba(255,255,255,.22)!important;
}
.talera-context-share svg{width:21px;height:21px;display:block;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.talera-share-shell{
  position:fixed;
  inset:0;
  z-index:80;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  pointer-events:none;
  visibility:hidden;
  background:rgba(6,18,30,0);
  transition:background .28s ease,visibility 0s linear .34s;
}
.talera-share-shell.is-open{
  pointer-events:auto;
  visibility:visible;
  background:rgba(6,18,30,.16);
  transition:background .28s ease,visibility 0s;
}
.talera-share-panel{
  position:relative;
  width:min(100%,560px);
  height:var(--share-sheet-height);
  color:var(--share-ink);
  transform:translate3d(0,104%,0);
  transition:transform .42s cubic-bezier(.22,.78,.25,1);
  isolation:isolate;
  overflow:hidden;
  border-radius:var(--share-sheet-radius) var(--share-sheet-radius) 0 0;
  background:var(--share-paper);
  box-shadow:0 -18px 48px rgba(15,39,71,.16);
}
.talera-share-shell.is-open .talera-share-panel{transform:translate3d(0,0,0)}

/* One solid work surface replaces the former translucent frost. */
.talera-share-panel::before{
  content:"";
  position:absolute;
  z-index:0;
  inset:0;
  background:linear-gradient(180deg,#fff 0,var(--share-paper) 118px,var(--share-paper) 100%);
  pointer-events:none;
}
.talera-share-panel::after{display:none;content:none}
.talera-share-card{
  position:relative;
  z-index:1;
  height:100%;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  border-radius:var(--share-sheet-radius) var(--share-sheet-radius) 0 0;
  background:transparent;
}
.talera-share-grip{
  width:38px;
  height:4px;
  flex:0 0 auto;
  margin:11px auto 4px;
  border-radius:999px;
  background:rgba(15,39,71,.18);
}
.talera-share-header{
  min-height:52px;
  padding:2px 20px 8px;
  display:grid;
  grid-template-columns:40px 1fr 40px;
  align-items:center;
  background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(250,249,246,.94));
}
.talera-share-back,.talera-share-close{
  width:40px;
  height:40px;
  border:0;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  color:var(--share-deep);
  background:var(--share-card);
  box-shadow:inset 0 0 0 1px rgba(15,39,71,.07);
  font:700 23px/1 system-ui,-apple-system,sans-serif;
}
.talera-share-back[hidden]{display:block!important;visibility:hidden!important;pointer-events:none!important}
.talera-share-brand{text-align:center;color:var(--share-deep)}
.talera-share-brand strong{display:block;font:760 12px/1 system-ui,-apple-system,sans-serif;letter-spacing:.17em}
.talera-share-brand span{display:block;margin-top:4px;font:560 10px/1 system-ui,-apple-system,sans-serif;color:rgba(15,39,71,.55)}
.talera-share-body{
  flex:1 1 auto;
  min-height:0;
  padding:4px 20px calc(26px + env(safe-area-inset-bottom));
  overflow-y:auto;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
  background:var(--share-paper);
}
.talera-share-body::-webkit-scrollbar{display:none}
.talera-account-card{
  width:100%;
  min-height:86px;
  padding:13px 15px;
  border:0;
  border-radius:22px;
  display:grid;
  grid-template-columns:52px 1fr 20px;
  gap:13px;
  align-items:center;
  color:var(--share-ink);
  text-align:left;
  background:linear-gradient(135deg,#fff 0,#f3f6f8 100%);
  box-shadow:inset 0 0 0 1px rgba(15,39,71,.07),0 7px 20px rgba(15,39,71,.06);
}
.talera-account-avatar{width:52px;height:52px;border-radius:18px;display:flex;align-items:center;justify-content:center;color:#fff;background:var(--share-deep);font:760 17px/1 system-ui,-apple-system,sans-serif;letter-spacing:.02em}
.talera-account-card strong{display:block;color:var(--share-deep);font:740 15px/1.2 system-ui,-apple-system,sans-serif}
.talera-account-card small{display:block;margin-top:5px;color:var(--share-muted);font:520 11px/1.3 system-ui,-apple-system,sans-serif}
.talera-account-arrow{color:rgba(15,39,71,.35);font-size:22px}
.talera-share-title{margin:5px 0 7px;color:var(--share-deep);font:760 clamp(25px,7vw,34px)/1.05 system-ui,-apple-system,sans-serif;letter-spacing:-.025em}
.talera-share-intro{margin:0 0 18px;color:var(--share-muted);font:500 14px/1.42 system-ui,-apple-system,sans-serif}
.talera-share-section-label{margin:22px 2px 9px;color:rgba(15,39,71,.57);font:720 10px/1.2 system-ui,-apple-system,sans-serif;letter-spacing:.09em;text-transform:uppercase}
.talera-share-memory{
  display:grid;
  grid-template-columns:76px 1fr;
  gap:13px;
  align-items:center;
  min-height:88px;
  padding:9px;
  border-radius:21px;
  background:var(--share-card);
  box-shadow:inset 0 0 0 1px rgba(15,39,71,.06),0 7px 20px rgba(15,39,71,.06);
}
.talera-share-memory img{width:76px;height:70px;display:block;object-fit:cover;border-radius:15px;background:#dbe4ea}
.talera-share-memory small{display:block;margin-bottom:4px;color:var(--share-soft);font:730 10px/1.2 system-ui,-apple-system,sans-serif;letter-spacing:.04em;text-transform:uppercase}
.talera-share-memory strong{display:-webkit-box;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:var(--share-deep);font:700 14px/1.27 system-ui,-apple-system,sans-serif}
.talera-share-memory time{display:block;margin-top:5px;color:var(--share-muted);font:520 11px/1.2 system-ui,-apple-system,sans-serif}
.talera-share-options{display:grid;gap:10px}
.talera-share-option{
  width:100%;
  min-height:78px;
  padding:14px 15px;
  border:0;
  border-radius:20px;
  display:grid;
  grid-template-columns:42px 1fr 20px;
  gap:12px;
  align-items:center;
  color:var(--share-ink);
  text-align:left;
  background:var(--share-card);
  box-shadow:inset 0 0 0 1px rgba(15,39,71,.07),0 7px 20px rgba(15,39,71,.06);
}
.talera-share-option:active{transform:scale(.985)}
.talera-share-option-icon{width:42px;height:42px;border-radius:15px;display:flex;align-items:center;justify-content:center;color:#fff;background:var(--share-blue);font:720 17px/1 system-ui,-apple-system,sans-serif;box-shadow:0 6px 17px rgba(49,95,135,.18)}
.talera-share-option strong{display:block;color:var(--share-deep);font:720 15px/1.22 system-ui,-apple-system,sans-serif}
.talera-share-option small{display:block;margin-top:4px;color:var(--share-muted);font:500 12px/1.35 system-ui,-apple-system,sans-serif}
.talera-share-option-arrow{color:rgba(15,39,71,.35);font-size:22px}
.talera-share-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.talera-share-choice{
  min-height:64px;
  padding:10px 8px;
  border:0;
  border-radius:17px;
  color:var(--share-deep);
  background:var(--share-card);
  box-shadow:inset 0 0 0 1px rgba(15,39,71,.08);
  font:680 13px/1.22 system-ui,-apple-system,sans-serif;
}
.talera-share-choice.is-selected{color:#fff;background:var(--share-blue);box-shadow:0 7px 19px rgba(49,95,135,.19),inset 0 0 0 1px rgba(255,255,255,.24)}
.talera-share-circle-list{display:grid;gap:8px}
.talera-share-circle{width:100%;min-height:56px;padding:10px 13px;border:0;border-radius:17px;display:flex;align-items:center;gap:11px;text-align:left;color:var(--share-deep);background:var(--share-card);box-shadow:inset 0 0 0 1px rgba(15,39,71,.07)}
.talera-share-circle i{width:18px;height:18px;border:2px solid rgba(15,39,71,.25);border-radius:50%;box-sizing:border-box}
.talera-share-circle.is-selected{background:var(--share-card);box-shadow:inset 0 0 0 2px var(--share-blue),0 6px 16px rgba(49,95,135,.08)}
.talera-share-circle.is-selected i{border:5px solid var(--share-blue)}
.talera-share-circle span{font:700 14px/1.15 system-ui,-apple-system,sans-serif}
.talera-share-circle small{display:block;margin-top:3px;color:var(--share-muted);font:500 11px/1.25 system-ui,-apple-system,sans-serif}
.talera-share-private-note{display:flex;gap:8px;align-items:flex-start;margin:12px 1px 0;color:var(--share-muted);font:540 11px/1.35 system-ui,-apple-system,sans-serif}
.talera-share-primary,.talera-share-secondary{
  width:100%;
  min-height:52px;
  margin-top:16px;
  border:0;
  border-radius:18px;
  font:730 14px/1 system-ui,-apple-system,sans-serif;
}
.talera-share-primary{color:#fff;background:var(--share-blue);box-shadow:0 9px 24px rgba(49,95,135,.22),inset 0 1px 0 rgba(255,255,255,.20)}
.talera-share-primary:disabled{opacity:.48;box-shadow:none}
.talera-share-secondary{margin-top:9px;color:var(--share-deep);background:var(--share-card);box-shadow:inset 0 0 0 1px rgba(15,39,71,.08)}
.talera-share-text-action{display:block;margin:14px auto 0;padding:8px 12px;border:0;color:var(--share-muted);background:transparent;font:650 12px/1 system-ui,-apple-system,sans-serif}
.talera-share-notice{margin:13px 0 0;padding:12px 13px;border-radius:16px;color:var(--share-muted);background:var(--share-soft-panel);font:520 11px/1.42 system-ui,-apple-system,sans-serif}
.talera-share-success{width:58px;height:58px;margin:8px auto 13px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background:var(--share-blue);font:750 25px/1 system-ui,-apple-system,sans-serif;box-shadow:0 9px 24px rgba(49,95,135,.22)}
.talera-share-center{text-align:center}
.talera-share-center .talera-share-intro{max-width:36ch;margin-left:auto;margin-right:auto}
.talera-share-preview-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:15px}
.talera-share-preview-actions .talera-share-primary,.talera-share-preview-actions .talera-share-secondary{margin:0;min-height:50px}
.talera-whatsapp-card{margin-top:14px;overflow:hidden;border-radius:20px;background:#fff;box-shadow:inset 0 0 0 1px rgba(15,39,71,.07),0 8px 22px rgba(15,39,71,.07)}
.talera-whatsapp-visual{position:relative;height:142px;overflow:hidden;background:linear-gradient(135deg,var(--share-deep),var(--share-blue))}
.talera-whatsapp-visual img{width:100%;height:100%;display:block;object-fit:cover}
.talera-whatsapp-visual::after{content:"";position:absolute;inset:34% 0 0;background:linear-gradient(180deg,transparent,rgba(8,25,45,.82));pointer-events:none}
.talera-whatsapp-brand{position:absolute;z-index:1;left:14px;bottom:12px;color:#fff;text-shadow:0 2px 8px rgba(6,18,30,.28)}
.talera-whatsapp-brand strong{display:block;font:760 11px/1 system-ui,-apple-system,sans-serif;letter-spacing:.17em}
.talera-whatsapp-brand span{display:block;margin-top:6px;max-width:32ch;font:700 13px/1.22 system-ui,-apple-system,sans-serif}
.talera-whatsapp-copy{padding:11px 13px 12px}
.talera-whatsapp-copy small{display:block;color:var(--share-muted);font:540 10px/1.25 system-ui,-apple-system,sans-serif}
.talera-whatsapp-copy strong{display:-webkit-box;margin-top:4px;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:var(--share-deep);font:700 13px/1.25 system-ui,-apple-system,sans-serif}
.talera-preview-consent{width:100%;min-height:52px;margin-top:10px;padding:10px 12px;border:0;border-radius:16px;display:flex;align-items:center;gap:10px;text-align:left;color:var(--share-deep);background:var(--share-card);box-shadow:inset 0 0 0 1px rgba(15,39,71,.08);font:650 12px/1.3 system-ui,-apple-system,sans-serif}
.talera-preview-switch{position:relative;flex:0 0 auto;width:40px;height:23px;border-radius:999px;background:rgba(110,123,140,.24);transition:background .18s ease}
.talera-preview-switch::after{content:"";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(15,39,71,.18);transition:transform .18s ease}
.talera-preview-consent[aria-pressed="true"] .talera-preview-switch{background:var(--share-blue)}
.talera-preview-consent[aria-pressed="true"] .talera-preview-switch::after{transform:translateX(17px)}
.talera-preview-consent small{display:block;margin-top:2px;color:var(--share-muted);font:520 10px/1.3 system-ui,-apple-system,sans-serif}
.talera-share-status-list{display:grid;gap:9px}
.talera-share-person{padding:13px;border-radius:18px;background:var(--share-card);box-shadow:inset 0 0 0 1px rgba(15,39,71,.06),0 6px 17px rgba(15,39,71,.05)}
.talera-share-person-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.talera-share-person strong{color:var(--share-deep);font:710 14px/1.2 system-ui,-apple-system,sans-serif}
.talera-share-person p{margin:6px 0 0;color:var(--share-muted);font:500 11px/1.35 system-ui,-apple-system,sans-serif}
.talera-share-status{flex:0 0 auto;padding:6px 8px;border-radius:999px;color:var(--share-deep);background:rgba(91,143,185,.13);font:720 9px/1 system-ui,-apple-system,sans-serif;text-transform:uppercase;letter-spacing:.04em}
.talera-share-status.is-action{color:#7a3d24;background:rgba(231,169,139,.28)}
.talera-share-status.is-muted{color:var(--share-muted);background:rgba(110,123,140,.10)}
.talera-share-person button{margin-top:9px;padding:7px 9px;border:0;border-radius:11px;color:var(--share-blue);background:rgba(91,143,185,.10);font:680 11px/1 system-ui,-apple-system,sans-serif}
.talera-share-empty{padding:24px 17px;border-radius:22px;text-align:center;background:var(--share-card);box-shadow:inset 0 0 0 1px rgba(15,39,71,.06),0 6px 17px rgba(15,39,71,.05)}
.talera-share-empty strong{display:block;color:var(--share-deep);font:710 15px/1.2 system-ui,-apple-system,sans-serif}
.talera-share-empty p{margin:7px auto 0;max-width:34ch;color:var(--share-muted);font:500 12px/1.45 system-ui,-apple-system,sans-serif}
.talera-recipient-photo{position:relative;height:190px;margin:3px 0 15px;overflow:hidden;border-radius:24px;background:#dbe4ea;box-shadow:0 10px 26px rgba(15,39,71,.10)}
.talera-recipient-photo img{width:100%;height:100%;display:block;object-fit:cover}
.talera-recipient-photo span{position:absolute;left:12px;bottom:11px;padding:7px 10px;border-radius:999px;color:#fff;background:rgba(15,39,71,.64);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font:690 10px/1 system-ui,-apple-system,sans-serif}
.talera-share-quote{margin:0 0 14px;color:var(--share-deep);font:730 21px/1.15 system-ui,-apple-system,sans-serif;letter-spacing:-.015em}
.talera-share-security{margin:14px 0 0;color:var(--share-muted);font:520 11px/1.4 system-ui,-apple-system,sans-serif;text-align:center}
.talera-share-toast{position:fixed;z-index:90;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));width:min(320px,calc(100% - 34px));padding:12px 14px;border-radius:16px;transform:translate(-50%,18px);opacity:0;pointer-events:none;color:#fff;background:rgba(15,39,71,.92);box-shadow:0 10px 30px rgba(6,18,30,.24);font:620 12px/1.35 system-ui,-apple-system,sans-serif;text-align:center;transition:opacity .2s ease,transform .2s ease}
.talera-share-toast.show{opacity:1;transform:translate(-50%,0)}

/* A received single-story invitation lands in the normal presentation canvas.
   The invitation sheet and owner-only commands never become a second UI layer. */
body.talera-recipient-presentation .talera-context-share,
body.talera-recipient-presentation .talera-memory-edit,
body.talera-recipient-presentation nav .tell,
body.talera-recipient-presentation nav .nav-item:last-child{display:none!important}
body.talera-recipient-presentation nav{grid-template-columns:1fr!important}
body.talera-recipient-presentation nav .home{grid-column:1!important}

@media(max-width:380px){
  :root{--share-sheet-radius:27px;--share-sheet-height:min(83dvh,700px)}
  .talera-share-body{padding-left:15px;padding-right:15px}
  .talera-share-header{padding-left:15px;padding-right:15px}
  .talera-share-title{font-size:25px}
}
@media(max-width:430px){.talera-context-share{right:18px!important;bottom:157px!important;width:44px!important;min-width:44px!important;height:44px!important}}
@media(max-height:690px){
  :root{--share-sheet-height:86dvh}
  .talera-recipient-photo{height:145px}
  .talera-share-title{font-size:24px}
}
@media(prefers-reduced-motion:reduce){
  .talera-share-shell,.talera-share-panel,.talera-share-toast{transition:none!important}
}
`;

export const shareExperienceScript = String.raw`
(()=>{
  const runtime=window.__taleraTimelineRuntime;
  const moreButton=document.querySelector('.more')&&document.querySelector('.more').closest('button');
  const memorySpace=document.querySelector('.memory-space');
  if(!runtime||!moreButton||!memorySpace)return;

  const STORAGE_KEY='talera-share-prototype-v1';
  const OWNER_NAME='Mark';
  const query=new URLSearchParams(location.search);
  const demoView=query.get('talera_demo')||'';
  const inviteToken=(query.get('talera_invite')||'').replace(/[^a-f0-9]/g,'').slice(0,32);
  const state={view:'hub',history:[],duration:'30 dagen',circle:'Binnenkring',kind:'story',invite:null,recipientListening:false,previewPhoto:true,invitePreview:null,preparingShare:false,preparedShareUrl:'',preparedWhatsAppUrl:'',previewError:'',previewGeneration:0};
  let previousFocus=null;
  let toastTimer=0;

  const contextShare=document.createElement('button');
  contextShare.type='button';
  contextShare.className='talera-memory-tool talera-context-share';
  contextShare.setAttribute('aria-label','Deel deze herinnering');
  contextShare.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m0 0L7.7 7.3M12 3l4.3 4.3M5 11.5v7A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-7"/></svg>';
  const toolLayer=document.querySelector('.talera-memory-tools')||memorySpace;
  toolLayer.appendChild(contextShare);

  const shell=document.createElement('div');
  shell.className='talera-share-shell';
  shell.hidden=true;
  shell.setAttribute('aria-hidden','true');
  shell.innerHTML='<section class="talera-share-panel" role="dialog" aria-modal="true" aria-label="TALERA menu"><div class="talera-share-card"><div class="talera-share-grip" aria-hidden="true"></div><header class="talera-share-header"><button class="talera-share-back" type="button" data-action="back" aria-label="Terug">‹</button><div class="talera-share-brand"><strong>TALERA</strong><span>persoonlijk bewaard</span></div><button class="talera-share-close" type="button" data-action="close" aria-label="Sluiten">×</button></header><div class="talera-share-body" tabindex="-1"></div></div></section><div class="talera-share-toast" role="status" aria-live="polite"></div>';
  document.body.appendChild(shell);

  const body=shell.querySelector('.talera-share-body');
  const backButton=shell.querySelector('.talera-share-back');
  const toast=shell.querySelector('.talera-share-toast');

  function escapeHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function memory(){return runtime.currentMemory()||{}}
  function memoryTitle(item=memory()){
    if((state.view==='recipient-story'||state.view==='recipient-timeline')&&state.invitePreview&&state.invitePreview.title)return state.invitePreview.title;
    return String(item.title||item.story||'Mijn herinnering').replace(/\s+/g,' ').trim()||'Mijn herinnering';
  }
  function memoryImage(item=memory()){
    if((state.view==='recipient-story'||state.view==='recipient-timeline')&&state.invitePreview&&state.invitePreview.imageUrl)return state.invitePreview.imageUrl;
    const photos=Array.isArray(item.photos)?item.photos:[];
    return photos[item._photoIndex||0]||item.image||'';
  }
  function memoryDate(item=memory()){
    const value=Number(item.ms)||Date.parse(item.at||'');
    if(!Number.isFinite(value))return '';
    try{return new Date(value).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'})}catch(e){return ''}
  }
  function memoryCard(label='Actieve herinnering'){
    return '<div class="talera-share-memory"><img class="talera-share-memory-image" alt=""><div><small>'+escapeHtml(label)+'</small><strong>'+escapeHtml(memoryTitle())+'</strong><time>'+escapeHtml(memoryDate())+'</time></div></div>';
  }
  function hydrateImages(){
    const src=memoryImage();
    if(!src)return;
    body.querySelectorAll('.talera-share-memory-image,.talera-recipient-image,.talera-whatsapp-preview-image').forEach(img=>{img.src=src});
  }
  function buttonOption(view,icon,title,copy){
    return '<button class="talera-share-option" type="button" data-view="'+view+'"><span class="talera-share-option-icon" aria-hidden="true">'+icon+'</span><span><strong>'+title+'</strong><small>'+copy+'</small></span><span class="talera-share-option-arrow" aria-hidden="true">›</span></button>';
  }
  function buttonAction(action,icon,title,copy){
    return '<button class="talera-share-option" type="button" data-action="'+action+'"><span class="talera-share-option-icon" aria-hidden="true">'+icon+'</span><span><strong>'+title+'</strong><small>'+copy+'</small></span><span class="talera-share-option-arrow" aria-hidden="true">›</span></button>';
  }
  function title(text,intro){return '<h1 class="talera-share-title">'+text+'</h1><p class="talera-share-intro">'+intro+'</p>'}

  function renderHub(){
    return title('Meer','Je account, mensen en algemene TALERA-instellingen op één plek.')+
      '<button class="talera-account-card" type="button" data-view="profile"><span class="talera-account-avatar" aria-hidden="true">MS</span><span><strong>Mark Smits</strong><small>Maak je TALERA-account compleet</small></span><span class="talera-account-arrow" aria-hidden="true">›</span></button>'+
      '<p class="talera-share-section-label">Delen en mensen</p><div class="talera-share-options">'+
      buttonOption('people','○','Mijn mensen','Uitnodigingen, toegang en jouw privékringen')+
      buttonOption('shared-with-me','⌁','Met mij gedeeld','Verhalen die anderen persoonlijk met jou deelden')+
      '</div><p class="talera-share-section-label">Account en beheer</p><div class="talera-share-options">'+
      buttonOption('subscription','€','Mijn abonnement','Pakket, betalen en facturen')+
      buttonOption('privacy','◇','Privacy en beveiliging','Inloggen, apparaten en jouw gegevens')+
      buttonOption('notifications','•','Meldingen','Alleen de berichten die voor jou nodig zijn')+
      buttonOption('settings','⚙','Instellingen','Taal, toegankelijkheid en weergave')+
      '</div><p class="talera-share-section-label">Ondersteuning</p><div class="talera-share-options">'+
      buttonOption('help','?','Hulp en over TALERA','Uitleg, contact, voorwaarden en privacy')+
      '</div>';
  }
  function renderChoice(){
    return title('Wat wil je delen?','De actieve herinnering staat al voor je klaar. Je hoeft niets opnieuw te selecteren.')+memoryCard()+
      '<p class="talera-share-section-label">Kies wat iemand mag zien</p><div class="talera-share-options">'+
      buttonOption('story-settings','1','Alleen dit verhaal','Een tijdelijke, intrekbare uitnodiging zonder toegang tot andere verhalen')+
      buttonOption('timeline-settings','∞','Mijn tijdlijn','Blijvende toegang tot alleen de verhalen die jij voor die persoon openstelt')+
      '</div><div class="talera-share-notice">Opslaan en delen blijven gescheiden. Delen verandert niets aan jouw opgeslagen verhaal.</div>';
  }
  function renderStorySettings(){
    const values=['24 uur','7 dagen','30 dagen','Geen einddatum'];
    return title('Alleen dit verhaal','De ontvanger kan dit verhaal bekijken en beluisteren, maar niet downloaden of doorsturen.')+memoryCard()+
      '<p class="talera-share-section-label">Hoelang blijft de uitnodiging geldig?</p><div class="talera-share-choice-grid">'+values.map(v=>'<button class="talera-share-choice '+(state.duration===v?'is-selected':'')+'" type="button" data-duration="'+v+'">'+v+'</button>').join('')+'</div>'+
      '<button class="talera-share-primary" type="button" data-action="create-story-invite">Uitnodiging maken</button><div class="talera-share-security">Standaard 30 dagen · altijd eerder in te trekken</div>';
  }
  function renderTimelineSettings(){
    const circles=[['Binnenkring','Ziet alles behalve verhalen die Alleen ik zijn'],['Vertrouwde kring','Ziet Vertrouwde kring en Ruime kring'],['Ruime kring','Ziet alleen jouw algemenere verhalen']];
    return title('Mijn tijdlijn','De ontvanger vraagt eerst toegang aan. Jij keurt die aanvraag daarna eenmalig goed.')+
      '<p class="talera-share-section-label">Kies de toegang voor deze persoon</p><div class="talera-share-circle-list">'+circles.map(([name,copy])=>'<button class="talera-share-circle '+(state.circle===name?'is-selected':'')+'" type="button" data-circle="'+name+'"><i aria-hidden="true"></i><span>'+name+'<small>'+copy+'</small></span></button>').join('')+'</div>'+
      '<div class="talera-share-private-note"><span aria-hidden="true">◉</span><span>Deze keuze is alleen zichtbaar voor jou. De ontvanger ziet nooit in welke kring hij of zij staat.</span></div>'+
      '<button class="talera-share-primary" type="button" data-action="create-timeline-invite">Tijdlijnuitnodiging maken</button>';
  }
  function renderReady(){
    const timeline=state.kind==='timeline';
    const detail=timeline?'Toegang: '+state.circle+' · goedkeuring blijft nodig':'Geldig: '+state.duration+' · alleen dit verhaal';
    const intro=state.preparingShare?'TALERA maakt de veilige WhatsApp-uitnodiging gereed.':state.previewError?'De foto kon niet veilig worden voorbereid. Je kunt wel een gewone TALERA-link versturen.':'De uitnodiging is volledig voorbereid. WhatsApp opent direct zodra je op de knop drukt.';
    return '<div class="talera-share-center"><div class="talera-share-success" aria-hidden="true">✓</div>'+title(state.preparingShare?'Uitnodiging voorbereiden':'Uitnodiging staat klaar',intro)+'</div>'+memoryCard(timeline?'Tijdlijnuitnodiging':'Gedeeld verhaal')+
      '<div class="talera-share-notice">'+escapeHtml(detail)+'</div><div class="talera-whatsapp-card" aria-label="Voorbeeld van de WhatsApp-uitnodiging"><div class="talera-whatsapp-visual">'+(state.previewPhoto?'<img class="talera-whatsapp-preview-image" alt="">':'')+'<div class="talera-whatsapp-brand"><strong>TALERA</strong><span>'+escapeHtml(timeline?OWNER_NAME+' nodigt je uit op zijn tijdlijn':memoryTitle())+'</span></div></div><div class="talera-whatsapp-copy"><small>talera-timeline-prototype.mark-a39.workers.dev</small><strong>'+escapeHtml(timeline?'Bekijk de levensverhalen die '+OWNER_NAME+' met je deelt':OWNER_NAME+' deelt een persoonlijke herinnering met je')+'</strong></div></div><button class="talera-preview-consent" type="button" data-action="toggle-preview-photo" aria-pressed="'+(state.previewPhoto?'true':'false')+'"><span class="talera-preview-switch" aria-hidden="true"></span><span>Foto tonen in WhatsApp-voorbeeld<small>Er wordt alleen een verkleinde uitnodigingsminiatuur gemaakt.</small></span></button>'+(state.previewError?'<div class="talera-share-notice">'+escapeHtml(state.previewError)+'</div>':'')+'<div class="talera-share-preview-actions"><button class="talera-share-secondary" type="button" data-action="preview-recipient">Voorbeeld ontvanger</button><button class="talera-share-primary" type="button" data-action="share-whatsapp" '+(state.preparingShare||!state.preparedWhatsAppUrl?'disabled':'')+'>'+(state.preparingShare?'Voorbereiden…':'Via WhatsApp')+'</button></div><button class="talera-share-secondary" type="button" data-action="close">Terug naar mijn tijdlijn</button>';
  }
  function renderPeople(){
    const stored=loadPrototype().invites||[];
    const newest=stored.slice(-1)[0];
    const generated=newest?'<article class="talera-share-person"><div class="talera-share-person-top"><strong>Nieuwe uitnodiging</strong><span class="talera-share-status">Aangemaakt</span></div><p>'+(newest.kind==='timeline'?'Tijdlijn · '+escapeHtml(newest.circle):'Eén verhaal · '+escapeHtml(newest.duration))+'</p></article>':'';
    return title('Mijn mensen','Alleen jij ziet de interne toegang en vertrouwenskringen.')+
      '<div class="talera-share-status-list">'+generated+
      '<article class="talera-share-person"><div class="talera-share-person-top"><strong>Peter</strong><span class="talera-share-status is-action">Wacht op jou</span></div><p>Vraagt toegang tot jouw tijdlijn.</p><button type="button" data-view="access-request">Aanvraag bekijken</button></article>'+
      '<article class="talera-share-person"><div class="talera-share-person-top"><strong>Anja</strong><span class="talera-share-status">Actief</span></div><p>Vertrouwde kring · alleen zichtbaar voor jou.</p><button type="button" data-action="prototype-manage">Toegang beheren</button></article>'+
      '<article class="talera-share-person"><div class="talera-share-person-top"><strong>Oude uitnodiging</strong><span class="talera-share-status is-muted">Verlopen</span></div><p>Los verhaal · de verwijzing is niet meer beschikbaar.</p></article></div>'+
      '<button class="talera-share-primary" type="button" data-view="timeline-settings">Nieuwe tijdlijnuitnodiging</button><div class="talera-share-notice">TALERA laat niet zien hoe vaak of hoe lang iemand luistert.</div>';
  }
  function renderAccessRequest(){
    return title('Toegang aanvragen','Peter heeft een account bevestigd en vraagt toegang tot jouw levenslijn.')+
      '<article class="talera-share-person"><div class="talera-share-person-top"><strong>Peter</strong><span class="talera-share-status is-action">Wacht op jou</span></div><p>De ontvanger ziet jouw gekozen kring niet.</p></article>'+
      '<div class="talera-share-notice">Bij goedkeuren krijgt Peter toegang tot alle bestaande en toekomstige verhalen die binnen de door jou gekozen kring vallen.</div>'+
      '<button class="talera-share-primary" type="button" data-action="approve-request">Toestaan</button><button class="talera-share-secondary" type="button" data-action="deny-request">Weigeren</button>';
  }
  function renderSharedWithMe(){
    return title('Met mij gedeeld','Hier bewaar je verwijzingen naar verhalen die anderen persoonlijk met jou delen.')+
      '<div class="talera-share-empty"><strong>Geen losse kopieën</strong><p>Foto, video en audio blijven bij de oorspronkelijke verteller. Als toegang verloopt of wordt ingetrokken, wordt ook deze verwijzing ontoegankelijk.</p></div>'+memoryCard('Voorbeeld van een verwijzing')+
      '<div class="talera-share-notice">Ontvangen verhalen worden niet tussen jouw eigen herinneringen geplaatst.</div>';
  }
  function renderProfile(){
    return title('Mijn profiel','Je identiteit en accountgegevens blijven gescheiden van de verhalen die je bewaart.')+
      '<div class="talera-share-empty"><strong>Mark Smits</strong><p>Je profiel is zichtbaar als afzender wanneer je iemand persoonlijk uitnodigt.</p></div>'+
      '<p class="talera-share-section-label">Account</p><div class="talera-share-options">'+
      buttonAction('prototype-account','◉','Persoonsgegevens','Naam, profielfoto en contactgegevens')+
      buttonAction('prototype-account','↗','Inloggen en herstel','Mobiel nummer, e-mail en later passkeys')+
      '</div><button class="talera-share-primary" type="button" data-action="prototype-account">Account compleet maken</button>';
  }
  function renderSubscription(){
    return title('Mijn abonnement','Hier komt straks een rustig overzicht van je TALERA-pakket en betalingen.')+
      '<div class="talera-share-empty"><strong>Nog geen abonnement gekoppeld</strong><p>De definitieve betaalmodellen worden hier toegevoegd zodra ze inhoudelijk zijn vastgesteld.</p></div>'+
      '<p class="talera-share-section-label">Beheer</p><div class="talera-share-options">'+
      buttonAction('prototype-account','€','Pakket en betaalmethode','Bekijk straks je pakket en betaalgegevens')+
      buttonAction('prototype-account','≡','Facturen','Een overzicht van betalingen en facturen')+'</div>';
  }
  function renderPrivacy(){
    return title('Privacy en beveiliging','Jij bepaalt wie binnen TALERA bij jouw persoonlijke verhalen kan.')+
      '<div class="talera-share-options">'+
      buttonAction('prototype-account','◇','Inloggen en herstel','Beveiligde toegang zonder zelfbedacht wachtwoord')+
      buttonAction('prototype-account','▣','Mijn apparaten','Bekijk en beëindig actieve sessies')+
      buttonAction('prototype-account','○','Mijn gegevens','Privacykeuzes, toestemming en gegevensbeheer')+'</div>'+
      '<div class="talera-share-notice">Verhalen en media worden in de productiefase uitsluitend na servercontrole geleverd.</div>';
  }
  function renderNotifications(){
    return title('Meldingen','TALERA meldt alleen wat aandacht of een beslissing van jou nodig heeft.')+
      '<div class="talera-share-options">'+
      buttonAction('prototype-setting','•','Toegangsaanvragen','Een melding wanneer iemand toegang vraagt')+
      buttonAction('prototype-setting','✓','Bevestigingen','Een korte bevestiging na belangrijke wijzigingen')+
      buttonAction('prototype-setting','–','Geen luistercontrole','Geen meldingen over openen, duur of luisterfrequentie')+'</div>';
  }
  function renderSettings(){
    return title('Instellingen','Pas de algemene werking van TALERA aan zonder je verhalen te veranderen.')+
      '<div class="talera-share-options">'+
      buttonAction('prototype-setting','NL','Taal','Nederlands')+
      buttonAction('prototype-setting','Aa','Toegankelijkheid','Tekstgrootte, contrast en bediening')+
      buttonAction('prototype-setting','◐','Weergave','Rust, beweging en visuele voorkeuren')+'</div>';
  }
  function renderHelp(){
    return title('Hulp en over TALERA','Uitleg en belangrijke informatie blijven altijd gemakkelijk bereikbaar.')+
      '<div class="talera-share-options">'+
      buttonAction('prototype-account','?','Hulp bij TALERA','Antwoorden en uitleg over vertellen, bewaren en delen')+
      buttonAction('prototype-account','✉','Contact','Neem contact op met TALERA')+
      buttonAction('prototype-account','§','Voorwaarden en privacy','Gebruiksvoorwaarden en privacybeleid')+'</div>';
  }
  function renderRecipientStory(){
    const demo=demoView==='recipient-story';
    return '<div class="talera-share-center">'+title(OWNER_NAME+' deelt een herinnering met je','Je kunt dit persoonlijke verhaal binnen TALERA bekijken en beluisteren.')+'</div>'+(demo?'<div class="talera-share-notice">Je bekijkt de WhatsApp-voorbeeldroute. Deze link geeft nog geen echte toegang tot persoonlijke media.</div>':'')+'<div class="talera-recipient-photo"><img class="talera-recipient-image" alt="Gedeelde herinnering"><span>Persoonlijk met jou gedeeld</span></div><p class="talera-share-quote">'+escapeHtml(demo?'Voorbeeld van een gedeelde herinnering':memoryTitle())+'</p>'+
      '<button class="talera-share-primary" type="button" data-action="recipient-listen">'+(state.recipientListening?'Pauze':'Luisteren')+'</button><button class="talera-share-secondary" type="button" data-action="recipient-memory">Roept dit bij jou een eigen herinnering op?</button><div class="talera-share-security">Geen download · niet opnieuw door te sturen</div>';
  }
  function renderRecipientTimeline(){
    return '<div class="talera-share-center">'+title(OWNER_NAME+' nodigt je uit','Bekijk de levensverhalen die persoonlijk met jou worden gedeeld. Jouw toegangsniveau wordt niet getoond.')+'</div>'+(demoView==='recipient-timeline'?'<div class="talera-share-notice">Je bekijkt de WhatsApp-voorbeeldroute. Er wordt nog geen echt account of toegangsverzoek aangemaakt.</div>':'')+memoryCard('Een voorproefje van de tijdlijn')+
      '<p class="talera-share-section-label">Veilig aanmelden zonder wachtwoord</p><div class="talera-share-choice-grid"><button class="talera-share-choice is-selected" type="button" data-action="prototype-register">Mobiel nummer</button><button class="talera-share-choice" type="button" data-action="prototype-register">E-mailadres</button></div><button class="talera-share-primary" type="button" data-action="request-access">Toegang aanvragen</button><div class="talera-share-security">Na verificatie beslist '+OWNER_NAME+' eenmalig over jouw aanvraag.</div>';
  }
  function renderWaiting(){
    return '<div class="talera-share-center"><div class="talera-share-success" aria-hidden="true">✓</div>'+title('Aanvraag verstuurd',OWNER_NAME+' ontvangt nu een verzoek. Pas na goedkeuring wordt de gefilterde tijdlijn zichtbaar.')+'</div><div class="talera-share-empty"><strong>Je hoeft niets meer te doen</strong><p>TALERA laat het weten zodra de toegang is goedgekeurd.</p></div><button class="talera-share-secondary" type="button" data-action="close">Sluiten</button>';
  }
  function renderAfterSave(){
    return '<div class="talera-share-center">'+title('Je verhaal is veilig opgeslagen','Wil je deze herinnering nu met iemand delen? Later kan altijd zonder dat er iets verloren gaat.')+'</div>'+memoryCard('Nieuw opgeslagen')+'<button class="talera-share-primary" type="button" data-view="share-choice">Nu delen</button><button class="talera-share-secondary" type="button" data-action="close">Later</button>';
  }

  function render(){
    const views={
      hub:renderHub,
      'share-choice':renderChoice,
      'story-settings':renderStorySettings,
      'timeline-settings':renderTimelineSettings,
      ready:renderReady,
      people:renderPeople,
      'access-request':renderAccessRequest,
      'shared-with-me':renderSharedWithMe,
      profile:renderProfile,
      subscription:renderSubscription,
      privacy:renderPrivacy,
      notifications:renderNotifications,
      settings:renderSettings,
      help:renderHelp,
      'recipient-story':renderRecipientStory,
      'recipient-timeline':renderRecipientTimeline,
      waiting:renderWaiting,
      'after-save':renderAfterSave
    };
    body.innerHTML=(views[state.view]||renderHub)();
    backButton.hidden=state.history.length===0||state.view==='after-save';
    body.scrollTop=0;
    hydrateImages();
    requestAnimationFrame(()=>{const focus=body.querySelector('button');if(focus)focus.focus({preventScroll:true})});
  }
  function setBackgroundInert(value){
    const main=document.querySelector('main');
    const nav=document.querySelector('nav');
    if(main)main.inert=value;
    if(nav)nav.inert=value;
  }
  function open(view='hub'){
    if(!shell.hidden&&shell.classList.contains('is-open')){go(view);return}
    previousFocus=document.activeElement;
    state.view=view;state.history=[];state.recipientListening=false;
    shell.hidden=false;shell.setAttribute('aria-hidden','false');
    document.body.classList.add('talera-share-open');setBackgroundInert(true);
    document.dispatchEvent(new CustomEvent('talera:overlay-change',{detail:{open:true,name:'share'}}));
    render();
    requestAnimationFrame(()=>shell.classList.add('is-open'));
  }
  function close(){
    shell.classList.remove('is-open');shell.setAttribute('aria-hidden','true');
    document.body.classList.remove('talera-share-open');setBackgroundInert(false);
    document.dispatchEvent(new CustomEvent('talera:overlay-change',{detail:{open:false,name:'share'}}));
    setTimeout(()=>{shell.hidden=true;state.history=[];if(previousFocus&&previousFocus.focus)previousFocus.focus({preventScroll:true})},360);
  }
  function go(view){state.history.push(state.view);state.view=view;render()}
  function back(){if(!state.history.length){close();return}state.view=state.history.pop();render()}
  function showToast(message){clearTimeout(toastTimer);toast.textContent=message;toast.classList.add('show');toastTimer=setTimeout(()=>toast.classList.remove('show'),2800)}
  function loadPrototype(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch(e){return {}}}
  function saveInvite(kind){
    const data=loadPrototype();
    const list=Array.isArray(data.invites)?data.invites:[];
    const record={id:'prototype-'+Date.now(),kind,duration:state.duration,circle:state.circle,status:'created',createdAt:Date.now()};
    list.push(record);data.invites=list.slice(-8);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch(e){}
    state.invite=record;state.kind=kind;state.preparedShareUrl='';state.preparedWhatsAppUrl='';state.previewError='';go('ready');prepareShare();
  }
  async function imageElementFromBlob(blob){
    const url=URL.createObjectURL(blob);
    const img=new Image();
    img.src=url;
    try{
      if(img.decode)await img.decode();
      else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
      return img;
    }finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}
  }
  function wrapCanvasText(ctx,text,maxWidth,maxLines){
    const raw=String(text||'').trim(),words=raw.split(/\s+/).filter(Boolean),lines=[];
    let line='',used=0;
    for(const word of words){
      const trial=line?line+' '+word:word;
      if(ctx.measureText(trial).width>maxWidth&&line){lines.push(line);used+=line.length+1;line=word;if(lines.length===maxLines-1)break}
      else line=trial;
    }
    if(line&&lines.length<maxLines){lines.push(line);used+=line.length}
    if(used<raw.length&&lines.length)lines[lines.length-1]=lines[lines.length-1].replace(/[.,;:!?]?$/,'…');
    return lines;
  }
  async function makeInvitationThumbnail(){
    const canvas=document.createElement('canvas');
    canvas.width=1200;canvas.height=630;
    const ctx=canvas.getContext('2d');
    const base=ctx.createLinearGradient(0,0,1200,630);
    base.addColorStop(0,'#0F2747');base.addColorStop(1,'#315f87');
    ctx.fillStyle=base;ctx.fillRect(0,0,1200,630);
    if(state.previewPhoto){
      try{
        const response=await fetch(memoryImage());
        if(!response.ok)throw new Error('image');
        const img=await imageElementFromBlob(await response.blob());
        const scale=Math.max(1200/img.naturalWidth,630/img.naturalHeight);
        const width=img.naturalWidth*scale,height=img.naturalHeight*scale;
        ctx.drawImage(img,(1200-width)/2,(630-height)/2,width,height);
      }catch(e){}
    }
    const shade=ctx.createLinearGradient(0,170,0,630);
    shade.addColorStop(0,'rgba(7,22,40,0)');shade.addColorStop(1,'rgba(7,22,40,.88)');
    ctx.fillStyle=shade;ctx.fillRect(0,140,1200,490);
    ctx.fillStyle='#fff';ctx.font='700 28px system-ui,-apple-system,sans-serif';ctx.fillText('T A L E R A',64,438);
    ctx.font='700 43px system-ui,-apple-system,sans-serif';
    const headline=state.kind==='timeline'?OWNER_NAME+' nodigt je uit':memoryTitle();
    wrapCanvasText(ctx,headline,1060,2).forEach((line,index)=>ctx.fillText(line,64,500+index*50));
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('thumbnail')),'image/jpeg',.84));
  }
  async function createPreviewLink(timeline){
    const form=new FormData();
    form.append('image',await makeInvitationThumbnail(),'talera-uitnodiging.jpg');
    form.append('title',memoryTitle());
    form.append('kind',timeline?'timeline':'story');
    form.append('duration',timeline?'30 dagen':state.duration);
    form.append('hasPhoto',state.previewPhoto?'1':'0');
    const response=await fetch('/api/share-preview',{method:'POST',body:form});
    if(!response.ok)throw new Error('preview '+response.status);
    const result=await response.json();
    if(!result||!result.shareUrl)throw new Error('preview response');
    return result.shareUrl;
  }
  function fallbackShareUrl(timeline){
    const fallback=new URL(location.origin+location.pathname);
    fallback.searchParams.set('talera_demo',timeline?'recipient-timeline':'recipient-story');
    return fallback.toString();
  }
  function whatsAppUrl(shareUrl,timeline){
    const message=timeline
      ?OWNER_NAME+' nodigt je via TALERA uit om zijn levensverhalen te bekijken.\n\nOpen de uitnodiging:\n'+shareUrl
      :OWNER_NAME+' deelt via TALERA een persoonlijke herinnering met je:\n“'+memoryTitle()+'”\n\nOpen de uitnodiging:\n'+shareUrl;
    return 'https://wa.me/?text='+encodeURIComponent(message);
  }
  async function prepareShare(){
    const timeline=state.kind==='timeline';
    const generation=++state.previewGeneration;
    state.preparingShare=true;state.preparedShareUrl='';state.preparedWhatsAppUrl='';state.previewError='';
    if(state.view==='ready')render();
    let shareUrl='';
    try{shareUrl=await createPreviewLink(timeline)}catch(e){
      shareUrl=fallbackShareUrl(timeline);
      state.previewError=state.previewPhoto?'Fotovoorvertoning tijdelijk niet beschikbaar. De gewone uitnodigingslink staat wel klaar.':'';
    }
    if(generation!==state.previewGeneration)return;
    state.preparedShareUrl=shareUrl;
    state.preparedWhatsAppUrl=whatsAppUrl(shareUrl,timeline);
    state.preparingShare=false;
    if(state.view==='ready')render();
  }
  function shareViaWhatsApp(){
    if(!state.preparedWhatsAppUrl){showToast('Wacht heel even tot de uitnodiging klaarstaat.');return}
    location.href=state.preparedWhatsAppUrl;
  }
  async function loadInvitePreview(){
    if(!inviteToken)return;
    try{
      const response=await fetch('/api/share-preview/meta/'+inviteToken,{cache:'no-store'});
      if(!response.ok)return;
      state.invitePreview=await response.json();
    }catch(e){}
  }
  function recipientStoryMemory(){
    const source=runtime.currentMemory()||{};
    const headline=(state.invitePreview&&state.invitePreview.title)||String(source.title||source.story||'Gedeelde herinnering');
    const originalStory=String(source.story||'');
    let fullStory=String(source.fullStory||headline);
    if(originalStory&&fullStory.startsWith(originalStory))fullStory=headline+fullStory.slice(originalStory.length);
    const photos=Array.isArray(source.photos)&&source.photos.length?source.photos.slice():[source.image].filter(Boolean);
    return Object.assign({},source,{
      id:'recipient:'+inviteToken,
      title:headline,
      story:headline,
      fullStory:fullStory||headline,
      image:photos[0]||source.image||'',
      photos:photos,
      _photoIndex:0,
      _taleraSharedRecipient:true
    });
  }
  function activateRecipientPresentation(){
    const shared=recipientStoryMemory();
    document.body.classList.add('talera-recipient-presentation');
    contextShare.hidden=true;
    if(typeof runtime.restrictToMemory==='function')runtime.restrictToMemory(shared);
    else{runtime.setCenter(shared.ms);runtime.writeMemory(shared);runtime.draw()}
    document.dispatchEvent(new CustomEvent('talera:recipient-presentation',{detail:{scope:'story',token:inviteToken}}));
  }

  moreButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open('hub')},true);
  contextShare.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open('share-choice')},true);
  shell.addEventListener('click',e=>{
    if(e.target===shell){close();return}
    const target=e.target.closest('button');
    if(!target)return;
    const view=target.dataset.view;
    if(view){go(view);return}
    if(target.dataset.duration){state.duration=target.dataset.duration;render();return}
    if(target.dataset.circle){state.circle=target.dataset.circle;render();return}
    const action=target.dataset.action;
    if(action==='close'){close();return}
    if(action==='back'){back();return}
    if(action==='create-story-invite'){saveInvite('story');return}
    if(action==='create-timeline-invite'){saveInvite('timeline');return}
    if(action==='preview-recipient'){go(state.kind==='timeline'?'recipient-timeline':'recipient-story');return}
    if(action==='toggle-preview-photo'){state.previewPhoto=!state.previewPhoto;prepareShare();return}
    if(action==='share-whatsapp'){shareViaWhatsApp();return}
    if(action==='prototype-manage'){showToast('Hier komen straks verplaatsen en toegang intrekken.');return}
    if(action==='prototype-account'){showToast('Dit onderdeel is voorbereid en wordt aangesloten zodra de account- en betaalbasis gereed is.');return}
    if(action==='prototype-setting'){showToast('Deze voorkeur wordt in de accountfase aangesloten.');return}
    if(action==='approve-request'){showToast('Toegang goedgekeurd. De ontvanger ziet alleen de toegestane tijdlijn.');back();return}
    if(action==='deny-request'){showToast('De aanvraag is geweigerd. Er is geen tijdlijntoegang gegeven.');back();return}
    if(action==='recipient-listen'){
      const audioButton=document.querySelector('.talera-memory-audio:not([hidden])');
      if(audioButton)audioButton.click();
      state.recipientListening=!state.recipientListening;render();return;
    }
    if(action==='recipient-memory'){showToast('Voor zelf vertellen maakt de ontvanger eerst een eigen TALERA-account.');return}
    if(action==='prototype-register'){body.querySelectorAll('.talera-share-choice').forEach(b=>b.classList.remove('is-selected'));target.classList.add('is-selected');showToast('In het prototype wordt nog geen echte verificatie verstuurd.');return}
    if(action==='request-access'){go('waiting');return}
  });
  document.addEventListener('keydown',e=>{
    if(shell.hidden)return;
    if(e.key==='Escape'){e.preventDefault();close();return}
    if(e.key!=='Tab')return;
    const focusable=Array.from(shell.querySelectorAll('button:not([hidden]):not([disabled]),[tabindex="0"]')).filter(el=>el.offsetParent!==null);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  });
  document.addEventListener('talera:new-memory-landed',()=>setTimeout(()=>open('after-save'),650));

  if(demoView==='recipient-story')loadInvitePreview().finally(()=>setTimeout(activateRecipientPresentation,280));
  else if(demoView==='recipient-timeline')loadInvitePreview().finally(()=>setTimeout(()=>open(demoView),280));

  window.__taleraSharePrototype={open,close,show(view){open(view||'hub')}};
})();
`;

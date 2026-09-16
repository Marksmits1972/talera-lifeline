export const WORKBLAD_POLISHED_TEST_PAGE_REV = 'workblad-polished-photo-first-20260916-r1';

export const WORKBLAD_POLISHED_TEST_PAGE_STYLE = String.raw`
:root{
  --talera-paper:#F7F4EF;
  --talera-paper-deep:#EFE9E0;
  --talera-ink:#0F2747;
  --talera-body:#33465C;
  --talera-muted:#718092;
  --talera-soft:#DCEAF6;
  --talera-accent:#E7A98B;
  --talera-action:#315F87;
}

/*
 * 16-09-2026 testcompositie.
 * Doel: de echte functionaliteit beoordelen in de ervaring waarin zij straks gebruikt wordt.
 * Foto = geheugenanker, verhaal = rustige werkruimte, spraak = gereedschap, koppelen = bewuste afronding.
 */
.work-stage.talera-polished-workblad{
  height:100dvh!important;
  min-height:100dvh!important;
  display:grid!important;
  grid-template-rows:auto minmax(0,1fr) auto!important;
  overflow:hidden!important;
  background:
    radial-gradient(circle at 50% -18%,rgba(255,255,255,.98) 0,rgba(255,255,255,.58) 34%,transparent 62%),
    linear-gradient(180deg,#FBF9F6 0%,var(--talera-paper) 66%,var(--talera-paper-deep) 100%)!important;
  color:var(--talera-ink)!important;
}

.talera-workbar{
  position:relative;
  z-index:30;
  min-height:54px;
  padding:max(9px,env(safe-area-inset-top)) 17px 8px;
  display:grid;
  grid-template-columns:1fr auto 1fr;
  align-items:end;
  gap:10px;
  color:var(--talera-ink);
  background:linear-gradient(180deg,rgba(251,249,246,.97),rgba(251,249,246,.82) 74%,rgba(251,249,246,0));
}
.talera-workbar-brand{
  justify-self:start;
  font-size:13px;
  line-height:1;
  font-weight:820;
  letter-spacing:.16em;
}
.talera-workbar-mode{
  justify-self:center;
  font-size:12px;
  line-height:1;
  font-weight:690;
  color:rgba(15,39,71,.58);
}
.talera-workbar-state{
  justify-self:end;
  display:flex;
  align-items:center;
  gap:6px;
  font-size:11px;
  line-height:1;
  font-weight:650;
  color:rgba(15,39,71,.47);
}
.talera-workbar-state::before{
  content:"";
  width:6px;
  height:6px;
  border-radius:50%;
  background:var(--talera-accent);
  box-shadow:0 0 0 4px rgba(231,169,139,.12);
}

.talera-polished-workblad .work-scroll{
  min-height:0!important;
  overflow:auto!important;
  -webkit-overflow-scrolling:touch!important;
  overscroll-behavior-y:contain!important;
  padding:0!important;
}
.talera-polished-workblad .work-sheet{
  width:min(100%,700px)!important;
  min-height:100%!important;
  margin:0 auto!important;
  padding:5px 17px 42px!important;
  display:flex!important;
  flex-direction:column!important;
  gap:12px!important;
}
.talera-polished-workblad .work-top{display:none!important}
.talera-polished-workblad .work-kicker{
  display:block!important;
  order:-3;
  margin:1px 1px -3px!important;
  color:rgba(15,39,71,.47)!important;
  font-size:11px!important;
  font-weight:720!important;
  letter-spacing:.08em!important;
  text-transform:uppercase!important;
}
.talera-polished-workblad .work-hint{display:none!important}

/* Titel en datum krijgen lucht. Geen formulierkop. */
.talera-polished-workblad .work-title{
  order:-2;
  width:100%!important;
  min-height:46px!important;
  margin:0!important;
  padding:1px 1px 2px!important;
  border:0!important;
  outline:0!important;
  background:transparent!important;
  color:var(--talera-ink)!important;
  font-size:clamp(29px,8.2vw,40px)!important;
  line-height:1.02!important;
  font-weight:720!important;
  letter-spacing:-.038em!important;
}
.talera-polished-workblad .work-title::placeholder{color:rgba(15,39,71,.22)!important}
.talera-polished-workblad .work-date-row{
  order:-1;
  width:max-content!important;
  max-width:100%!important;
  min-height:34px!important;
  margin:0 0 2px!important;
  padding:0 12px 0 9px!important;
  display:flex!important;
  align-items:center!important;
  gap:8px!important;
  border:1px solid rgba(15,39,71,.07)!important;
  border-radius:999px!important;
  background:rgba(255,255,255,.58)!important;
  box-shadow:0 4px 16px rgba(15,39,71,.035)!important;
  backdrop-filter:blur(12px)!important;
  -webkit-backdrop-filter:blur(12px)!important;
}
.talera-polished-workblad .work-date{
  width:auto!important;
  max-width:min(76vw,430px)!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
  color:rgba(15,39,71,.75)!important;
  font-size:14.5px!important;
  line-height:1!important;
  font-weight:650!important;
}
.talera-polished-workblad .work-date-dot{
  width:7px!important;
  height:7px!important;
  background:var(--talera-accent)!important;
  box-shadow:0 0 0 4px rgba(231,169,139,.12)!important;
}

/* De foto is het geheugenanker en krijgt daadwerkelijk schermruimte. */
.talera-polished-workblad .work-photo-section{
  position:relative!important;
  width:calc(100% + 34px)!important;
  margin:2px -17px 2px!important;
  display:block!important;
}
.talera-polished-workblad .work-photo,
.talera-polished-workblad .work-photo.has-photo{
  position:relative!important;
  isolation:isolate!important;
  width:100%!important;
  height:clamp(290px,43dvh,440px)!important;
  min-height:290px!important;
  padding:0!important;
  overflow:hidden!important;
  border:0!important;
  border-radius:0!important;
  background:linear-gradient(145deg,#DCE7EE,#ECE8E1)!important;
  box-shadow:none!important;
  touch-action:pan-y!important;
  -webkit-user-select:none!important;
  user-select:none!important;
}
.talera-polished-workblad .work-photo.has-photo::before{
  content:"";
  position:absolute;
  z-index:0;
  inset:-24px;
  background-image:var(--talera-photo-bg,none);
  background-position:center;
  background-size:cover;
  filter:blur(21px) saturate(.84);
  opacity:.38;
  transform:scale(1.09);
}
.talera-polished-workblad .work-photo.has-photo::after{
  content:"";
  position:absolute;
  z-index:1;
  inset:0;
  pointer-events:none;
  background:linear-gradient(180deg,rgba(8,21,35,.10) 0%,transparent 24%,transparent 68%,rgba(8,21,35,.24) 100%);
}
.talera-polished-workblad .work-photo img{
  position:relative!important;
  z-index:1!important;
  width:100%!important;
  height:100%!important;
  display:block!important;
  object-fit:contain!important;
  object-position:center!important;
  pointer-events:none!important;
  background:transparent!important;
  transition:opacity .16s ease,transform .22s ease!important;
}
.talera-polished-workblad .work-photo.talera-photo-changing img{
  opacity:.72!important;
  transform:scale(.995)!important;
}
.talera-polished-workblad .work-photo-empty{
  min-height:100%!important;
  padding:42px 24px!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  gap:11px!important;
  color:rgba(15,39,71,.58)!important;
  font-size:14px!important;
  font-weight:650!important;
}
.talera-polished-workblad .work-photo-plus{
  width:60px!important;
  height:60px!important;
  display:grid!important;
  place-items:center!important;
  border:1px solid rgba(255,255,255,.75)!important;
  border-radius:50%!important;
  background:rgba(255,255,255,.76)!important;
  color:var(--talera-ink)!important;
  font-size:27px!important;
  font-weight:350!important;
  box-shadow:0 13px 34px rgba(15,39,71,.11)!important;
  backdrop-filter:blur(14px)!important;
  -webkit-backdrop-filter:blur(14px)!important;
}
.talera-polished-workblad .work-photo-change,
.talera-polished-workblad .work-photo-count,
.talera-polished-workblad .work-photo-strip{display:none!important}

.talera-photo-toolbar{
  position:absolute;
  z-index:7;
  top:12px;
  left:12px;
  right:12px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  pointer-events:none;
}
.talera-photo-position,
.talera-photo-add{
  min-height:34px;
  padding:0 12px;
  display:flex;
  align-items:center;
  justify-content:center;
  border:1px solid rgba(255,255,255,.42);
  border-radius:999px;
  background:rgba(15,39,71,.34);
  color:#fff;
  text-shadow:0 1px 6px rgba(4,15,28,.26);
  box-shadow:0 5px 18px rgba(15,39,71,.10);
  backdrop-filter:blur(13px) saturate(1.05);
  -webkit-backdrop-filter:blur(13px) saturate(1.05);
  font:700 12px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;
}
.talera-photo-add{
  pointer-events:auto;
  appearance:none;
  cursor:pointer;
}
.talera-photo-dots{
  position:absolute;
  z-index:7;
  left:50%;
  bottom:14px;
  transform:translateX(-50%);
  min-height:24px;
  max-width:calc(100% - 110px);
  padding:6px 9px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  border-radius:999px;
  background:rgba(10,28,46,.20);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
}
.talera-photo-dot{
  width:6px;
  height:6px;
  padding:0;
  border:0;
  border-radius:50%;
  background:rgba(255,255,255,.53);
  box-shadow:0 1px 5px rgba(0,0,0,.10);
}
.talera-photo-dot.active{
  width:18px;
  border-radius:99px;
  background:#fff;
}
.talera-photo-swipe-hint{
  position:absolute;
  z-index:7;
  left:50%;
  bottom:50px;
  transform:translateX(-50%);
  max-width:82%;
  padding:7px 11px;
  border-radius:999px;
  background:rgba(247,244,239,.82);
  color:rgba(15,39,71,.78);
  font-size:11.5px;
  font-weight:680;
  white-space:nowrap;
  pointer-events:none;
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  transition:opacity .22s ease,transform .22s ease;
}
.talera-photo-swipe-hint.hide{opacity:0;transform:translate(-50%,6px)}

/* Het verhaal voelt als inhoud, niet als invoerveld. */
.talera-story-heading{
  margin:5px 1px -5px;
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  gap:12px;
}
.talera-story-heading strong{
  color:var(--talera-ink);
  font-size:14px;
  line-height:1.2;
  font-weight:760;
}
.talera-story-heading span{
  color:rgba(15,39,71,.43);
  font-size:11.5px;
  line-height:1.2;
  font-weight:620;
}
.talera-polished-workblad .work-story{
  width:100%!important;
  min-height:164px!important;
  max-height:none!important;
  margin:0!important;
  padding:7px 1px 14px!important;
  resize:none!important;
  overflow:visible!important;
  border:0!important;
  outline:0!important;
  background:transparent!important;
  color:var(--talera-body)!important;
  font-size:17px!important;
  line-height:1.58!important;
  font-weight:440!important;
  letter-spacing:-.006em!important;
}
.talera-polished-workblad .work-story::placeholder{color:rgba(62,74,89,.28)!important}
.talera-polished-workblad .work-voice-note{
  margin:-3px 0 1px!important;
  padding:9px 11px!important;
  border:1px solid rgba(49,95,135,.07)!important;
  border-radius:15px!important;
  background:rgba(220,234,246,.34)!important;
  box-shadow:none!important;
}
.talera-polished-workblad .work-error{
  border:1px solid rgba(184,71,61,.08)!important;
  border-radius:15px!important;
  background:rgba(255,241,239,.88)!important;
  box-shadow:none!important;
}

/* Eén rustige commandolaag: vertellen is gereedschap, koppelen is afronding. */
.talera-polished-workblad .work-actions{
  position:relative!important;
  z-index:40!important;
  width:100%!important;
  min-height:86px!important;
  margin:0!important;
  padding:10px 14px max(12px,env(safe-area-inset-bottom))!important;
  display:grid!important;
  grid-template-columns:minmax(0,.82fr) minmax(0,1.18fr)!important;
  align-items:center!important;
  gap:9px!important;
  border:0!important;
  background:rgba(247,244,239,.78)!important;
  box-shadow:0 -1px 0 rgba(15,39,71,.035)!important;
  backdrop-filter:blur(18px) saturate(1.08)!important;
  -webkit-backdrop-filter:blur(18px) saturate(1.08)!important;
}
.talera-polished-workblad .work-actions::before{
  content:"";
  position:absolute;
  left:0;right:0;top:-48px;height:48px;
  pointer-events:none;
  background:linear-gradient(to top,rgba(247,244,239,.78),rgba(247,244,239,.28) 58%,transparent);
}
.talera-polished-workblad .work-draft{display:none!important}
.talera-polished-workblad .work-tools{
  position:relative!important;
  z-index:1!important;
  width:100%!important;
  margin:0!important;
  padding:0!important;
  display:block!important;
}
.talera-polished-workblad .work-tool.voice{
  width:100%!important;
  min-height:54px!important;
  margin:0!important;
  padding:0 15px 0 43px!important;
  position:relative!important;
  border:1px solid rgba(15,39,71,.09)!important;
  border-radius:999px!important;
  background:rgba(255,255,255,.68)!important;
  color:var(--talera-ink)!important;
  font-size:13.5px!important;
  font-weight:750!important;
  box-shadow:0 7px 22px rgba(15,39,71,.06)!important;
  backdrop-filter:blur(14px)!important;
  -webkit-backdrop-filter:blur(14px)!important;
}
.talera-polished-workblad .work-tool.voice::before{
  content:"";
  position:absolute;
  left:12px;
  top:50%;
  width:23px;
  height:23px;
  transform:translateY(-50%);
  border-radius:50%;
  background:
    radial-gradient(circle at 58% 58%,rgba(231,169,139,.92) 0 14%,transparent 15%),
    radial-gradient(circle at 36% 31%,#9FC1DB 0 12%,#5B8FB9 34%,#315F87 63%,#0F2747 100%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.48),0 3px 9px rgba(15,39,71,.14);
}
.talera-polished-workblad .work-finish{
  position:relative!important;
  z-index:1!important;
  width:100%!important;
  min-height:54px!important;
  margin:0!important;
  padding:0 16px!important;
  border:1px solid rgba(255,255,255,.22)!important;
  border-radius:999px!important;
  background:var(--talera-action)!important;
  color:#fff!important;
  font-size:13.5px!important;
  font-weight:780!important;
  letter-spacing:-.012em!important;
  box-shadow:0 10px 28px rgba(15,39,71,.18),inset 0 1px 0 rgba(255,255,255,.16)!important;
}
.talera-polished-workblad .work-tool.voice:active,
.talera-polished-workblad .work-finish:active{transform:scale(.985)!important}

/* Uploadfeedback hoort in het verhaal, niet als technische banner. */
.talera-polished-workblad .talera-photo-stage{
  margin:1px 0!important;
  padding:8px 10px!important;
  border:0!important;
  border-radius:13px!important;
  background:rgba(220,234,246,.35)!important;
  color:rgba(15,39,71,.72)!important;
  font-size:11.5px!important;
  box-shadow:none!important;
}
.talera-polished-workblad .talera-photo-stage.ready{
  background:rgba(219,237,226,.46)!important;
  color:#39634f!important;
}

@media(min-width:700px){
  .work-stage.talera-polished-workblad{
    width:min(100%,720px)!important;
    margin:0 auto!important;
    box-shadow:0 0 0 1px rgba(15,39,71,.035),0 22px 80px rgba(15,39,71,.08)!important;
  }
  .talera-polished-workblad .work-sheet{padding-left:28px!important;padding-right:28px!important}
  .talera-polished-workblad .work-photo-section{width:calc(100% + 56px)!important;margin-left:-28px!important;margin-right:-28px!important}
  .talera-polished-workblad .work-photo,.talera-polished-workblad .work-photo.has-photo{border-radius:24px!important}
}

@media(max-width:600px){
  .talera-workbar{min-height:50px;padding-left:15px;padding-right:15px}
  .talera-polished-workblad .work-sheet{padding-left:15px!important;padding-right:15px!important;gap:10px!important}
  .talera-polished-workblad .work-title{font-size:clamp(28px,8vw,34px)!important;min-height:42px!important}
  .talera-polished-workblad .work-photo-section{width:calc(100% + 30px)!important;margin-left:-15px!important;margin-right:-15px!important}
  .talera-polished-workblad .work-photo,.talera-polished-workblad .work-photo.has-photo{height:clamp(275px,41dvh,380px)!important;min-height:275px!important}
  .talera-polished-workblad .work-story{min-height:145px!important;font-size:16.5px!important;line-height:1.55!important}
}

@media(max-width:600px) and (max-height:740px){
  .talera-workbar{min-height:46px;padding-top:max(6px,env(safe-area-inset-top));padding-bottom:6px}
  .talera-polished-workblad .work-sheet{padding-top:2px!important;gap:8px!important}
  .talera-polished-workblad .work-title{font-size:25px!important;min-height:34px!important}
  .talera-polished-workblad .work-date-row{min-height:31px!important}
  .talera-polished-workblad .work-photo,.talera-polished-workblad .work-photo.has-photo{height:245px!important;min-height:245px!important}
  .talera-polished-workblad .work-story{min-height:112px!important}
  .talera-polished-workblad .work-actions{min-height:76px!important;padding-top:8px!important}
  .talera-polished-workblad .work-tool.voice,.talera-polished-workblad .work-finish{min-height:49px!important}
}

html.talera-keyboard-open .talera-polished-workblad .work-actions{
  grid-template-columns:1fr!important;
  border-radius:22px 22px 0 0!important;
  background:rgba(247,244,239,.95)!important;
}
html.talera-keyboard-open .talera-polished-workblad .work-tools{display:none!important}
`;

export const WORKBLAD_POLISHED_TEST_PAGE_SCRIPT = String.raw`<script id="talera-workblad-polished-test-page">
(() => {
  if (window.__taleraPolishedWorkblad) return;
  const REV = '${WORKBLAD_POLISHED_TEST_PAGE_REV}';
  let activePhotoIndex = 0;
  let decorateQueued = false;
  let swipeHintDismissed = false;
  let urls = [];

  try { swipeHintDismissed = localStorage.getItem('talera-workblad-photo-swipe-seen') === '1'; } catch {}

  function queueDecorate() {
    if (decorateQueued) return;
    decorateQueued = true;
    requestAnimationFrame(() => {
      decorateQueued = false;
      decorate();
    });
  }

  function readState() {
    try {
      return typeof window.__taleraWorkbladV9Read === 'function' ? window.__taleraWorkbladV9Read() : null;
    } catch {
      return null;
    }
  }

  function photoBlobs() {
    const data = readState();
    return Array.isArray(data?.photos) ? data.photos.filter(item => item instanceof Blob && item.size) : [];
  }

  function resetUrls(blobs) {
    urls.forEach(item => { try { URL.revokeObjectURL(item); } catch {} });
    urls = blobs.map(blob => URL.createObjectURL(blob));
  }

  function ensureWorkbar(stage) {
    if (stage.querySelector(':scope > .talera-workbar')) return;
    const bar = document.createElement('header');
    bar.className = 'talera-workbar';
    bar.setAttribute('aria-label','Vertelpagina');
    bar.innerHTML = '<span class="talera-workbar-brand">TALERA</span><span class="talera-workbar-mode">Vertellen</span><span class="talera-workbar-state">concept</span>';
    stage.insertBefore(bar, stage.firstChild);
  }

  function ensureStoryHeading(sheet) {
    const story = sheet.querySelector('.work-story');
    if (!story || story.previousElementSibling?.classList?.contains('talera-story-heading')) return;
    const heading = document.createElement('div');
    heading.className = 'talera-story-heading';
    heading.innerHTML = '<strong>Je verhaal</strong><span>typ of vertel in je eigen tempo</span>';
    story.parentNode.insertBefore(heading, story);
  }

  function moveVoiceToDock(stage) {
    const actions = stage.querySelector('.work-actions');
    const tools = stage.querySelector('.work-tools');
    const finish = actions?.querySelector('.work-finish');
    if (!actions || !tools || !finish || tools.parentNode === actions) return;
    actions.insertBefore(tools, finish);
  }

  function showPhoto(index, photo, dots, position, animate = true) {
    if (!urls.length || !photo) return;
    activePhotoIndex = Math.max(0, Math.min(index, urls.length - 1));
    const img = photo.querySelector('img');
    if (!img) return;
    if (animate) photo.classList.add('talera-photo-changing');
    const nextUrl = urls[activePhotoIndex];
    img.src = nextUrl;
    photo.style.setProperty('--talera-photo-bg', 'url("' + nextUrl.replace(/"/g,'%22') + '")');
    if (position) position.textContent = (activePhotoIndex + 1) + ' / ' + urls.length;
    dots?.querySelectorAll('.talera-photo-dot').forEach((dot, i) => dot.classList.toggle('active', i === activePhotoIndex));
    if (animate) setTimeout(() => photo.classList.remove('talera-photo-changing'), 120);
  }

  function dismissHint(section) {
    swipeHintDismissed = true;
    try { localStorage.setItem('talera-workblad-photo-swipe-seen','1'); } catch {}
    section?.querySelector('.talera-photo-swipe-hint')?.classList.add('hide');
  }

  function wirePhotoExperience(sheet) {
    const section = sheet.querySelector('.work-photo-section');
    const photo = section?.querySelector('.work-photo.has-photo');
    if (!section || !photo || photo.dataset.taleraPolishedPhoto === '1') return;

    const blobs = photoBlobs();
    if (!blobs.length) return;
    resetUrls(blobs);
    activePhotoIndex = Math.min(activePhotoIndex, urls.length - 1);
    photo.dataset.taleraPolishedPhoto = '1';
    photo.onclick = null;
    photo.setAttribute('aria-label', urls.length > 1 ? 'Foto bij deze herinnering. Veeg links of rechts door de foto’s.' : 'Foto bij deze herinnering.');

    const toolbar = document.createElement('div');
    toolbar.className = 'talera-photo-toolbar';
    toolbar.innerHTML = '<span class="talera-photo-position"></span><button type="button" class="talera-photo-add">+ foto</button>';
    section.appendChild(toolbar);
    const position = toolbar.querySelector('.talera-photo-position');
    const add = toolbar.querySelector('.talera-photo-add');
    add.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const input = document.getElementById('workPhotoInput');
      if (!input) return;
      input.value = '';
      input.click();
    });

    let dots = null;
    if (urls.length > 1) {
      dots = document.createElement('div');
      dots.className = 'talera-photo-dots';
      dots.setAttribute('aria-label','Foto’s in deze herinnering');
      urls.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'talera-photo-dot';
        dot.setAttribute('aria-label','Toon foto ' + (i + 1));
        dot.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          showPhoto(i, photo, dots, position);
          dismissHint(section);
        });
        dots.appendChild(dot);
      });
      section.appendChild(dots);

      if (!swipeHintDismissed) {
        const hint = document.createElement('div');
        hint.className = 'talera-photo-swipe-hint';
        hint.textContent = 'Veeg door je foto’s en vertel wat je ziet';
        section.appendChild(hint);
      }
    }

    showPhoto(activePhotoIndex, photo, dots, position, false);

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;

    photo.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      dragging = false;
      try { photo.setPointerCapture(pointerId); } catch {}
    });

    photo.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!dragging && Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy) * 1.12) dragging = true;
      if (dragging) event.preventDefault();
    });

    function finishSwipe(event) {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const wasDragging = dragging;
      pointerId = null;
      dragging = false;
      try { photo.releasePointerCapture(event.pointerId); } catch {}
      if (!wasDragging || Math.abs(dx) < 34 || Math.abs(dx) < Math.abs(dy) * 1.08 || urls.length < 2) return;
      event.preventDefault();
      const next = dx < 0
        ? Math.min(activePhotoIndex + 1, urls.length - 1)
        : Math.max(activePhotoIndex - 1, 0);
      if (next !== activePhotoIndex) showPhoto(next, photo, dots, position);
      dismissHint(section);
    }

    photo.addEventListener('pointerup', finishSwipe);
    photo.addEventListener('pointercancel', event => {
      if (pointerId === event.pointerId) {
        pointerId = null;
        dragging = false;
      }
    });
    photo.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
    });
  }

  function decorate() {
    const stage = document.querySelector('.work-stage');
    if (!stage) return;
    stage.classList.add('talera-polished-workblad');
    ensureWorkbar(stage);
    const sheet = stage.querySelector('.work-sheet');
    if (!sheet) return;
    ensureStoryHeading(sheet);
    moveVoiceToDock(stage);
    wirePhotoExperience(sheet);
  }

  new MutationObserver(queueDecorate).observe(document.documentElement,{subtree:true,childList:true});
  queueDecorate();
  window.addEventListener('pageshow',queueDecorate);
  window.__taleraPolishedWorkblad = Object.freeze({ revision:REV, refresh:queueDecorate });
})();
</script>`;

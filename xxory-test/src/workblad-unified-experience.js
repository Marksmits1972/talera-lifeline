export const WORKBLAD_UNIFIED_EXPERIENCE_STYLE = String.raw`
:root{
  --talera-paper:#F7F4EF;
  --talera-ink:#0F2747;
  --talera-body:#26384F;
  --talera-muted:#647181;
  --talera-blue:#DCEAF6;
  --talera-warm:#E7A98B;
  --talera-glass:rgba(247,244,239,.82);
}

/*
 * TALERA workblad = dezelfde wereld als vertellen en presenteren.
 * Geen formulierkaart bovenop de app, maar één rustige verhaalcanvas.
 */
.work-stage{
  position:relative!important;
  width:100%!important;
  min-height:100dvh!important;
  height:100dvh!important;
  display:grid!important;
  grid-template-rows:minmax(0,1fr) auto!important;
  gap:0!important;
  padding:max(8px,env(safe-area-inset-top)) 0 0!important;
  overflow:hidden!important;
  color:var(--talera-ink)!important;
  background:
    radial-gradient(circle at 50% -8%,rgba(255,255,255,.96) 0,rgba(255,255,255,.58) 28%,transparent 58%),
    linear-gradient(180deg,#FBF9F5 0%,var(--talera-paper) 64%,#F1ECE4 100%)!important;
}
.work-top,.work-kicker,.work-hint{display:none!important}
.work-scroll{
  min-height:0!important;
  width:100%!important;
  overflow:auto!important;
  -webkit-overflow-scrolling:touch!important;
  overscroll-behavior-y:contain;
  padding:0!important;
  scrollbar-width:none;
}
.work-scroll::-webkit-scrollbar{display:none}
.work-sheet{
  width:min(100%,660px)!important;
  min-height:100%!important;
  height:auto!important;
  margin:0 auto!important;
  padding:13px 18px 126px!important;
  display:flex!important;
  flex-direction:column!important;
  gap:10px!important;
  overflow:visible!important;
  border:0!important;
  border-radius:0!important;
  background:transparent!important;
  box-shadow:none!important;
}

/* Titel + tijd horen bij het verhaal zelf, niet bij een formulier. */
.work-title{
  width:100%!important;
  min-height:42px!important;
  margin:0!important;
  padding:1px 1px 0!important;
  border:0!important;
  border-radius:0!important;
  outline:0!important;
  background:transparent!important;
  color:var(--talera-ink)!important;
  font-size:clamp(27px,7.8vw,38px)!important;
  line-height:1.02!important;
  font-weight:690!important;
  letter-spacing:-.035em!important;
}
.work-title::placeholder{color:rgba(15,39,71,.25)!important}
.work-date-row{
  width:max-content!important;
  max-width:100%!important;
  min-height:32px!important;
  margin:0 0 4px!important;
  padding:0 11px 0 8px!important;
  display:flex!important;
  align-items:center!important;
  gap:7px!important;
  border:1px solid rgba(15,39,71,.07)!important;
  border-radius:999px!important;
  background:rgba(255,255,255,.48)!important;
  box-shadow:0 3px 14px rgba(15,39,71,.035)!important;
  backdrop-filter:blur(12px)!important;
  -webkit-backdrop-filter:blur(12px)!important;
}
.work-date-dot{width:7px!important;height:7px!important;background:var(--talera-warm)!important;box-shadow:0 0 0 4px rgba(231,169,139,.12)!important}
.work-date{
  width:auto!important;
  min-width:0!important;
  max-width:min(78vw,420px)!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
  color:rgba(15,39,71,.74)!important;
  font-size:15px!important;
  line-height:1.1!important;
  font-weight:620!important;
  text-overflow:ellipsis!important;
}

/* Foto = hetzelfde visuele zwaartepunt als in de presentatiemodus. */
.work-photo-section{
  position:relative!important;
  width:calc(100% + 36px)!important;
  margin:2px -18px 4px!important;
  gap:6px!important;
}
.work-photo,
.work-photo.has-photo{
  position:relative!important;
  width:100%!important;
  min-height:clamp(250px,40dvh,390px)!important;
  height:clamp(250px,40dvh,390px)!important;
  padding:0!important;
  overflow:hidden!important;
  border:0!important;
  border-radius:0!important;
  color:var(--talera-ink)!important;
  background:
    radial-gradient(circle at 50% 42%,rgba(220,234,246,.92),rgba(231,229,223,.72) 58%,rgba(247,244,239,.92) 100%)!important;
  box-shadow:none!important;
}
.work-photo.has-photo{background:#E8E7E3!important}
.work-photo img{
  width:100%!important;
  height:100%!important;
  min-height:0!important;
  max-height:none!important;
  display:block!important;
  object-fit:contain!important;
  object-position:center!important;
  background:linear-gradient(180deg,#E5E7E8,#EEEAE4)!important;
}
.work-photo-empty{
  min-height:100%!important;
  padding:36px 22px!important;
  display:grid!important;
  place-items:center!important;
  align-content:center!important;
  gap:10px!important;
  color:rgba(15,39,71,.56)!important;
  font-size:14px!important;
  font-weight:560!important;
}
.work-photo-plus{
  width:54px!important;
  height:54px!important;
  border:1px solid rgba(255,255,255,.72)!important;
  border-radius:50%!important;
  background:rgba(255,255,255,.68)!important;
  color:var(--talera-ink)!important;
  box-shadow:0 10px 28px rgba(15,39,71,.09)!important;
  backdrop-filter:blur(14px)!important;
  -webkit-backdrop-filter:blur(14px)!important;
}
.work-photo-change,
.work-photo-count{
  bottom:12px!important;
  min-height:34px!important;
  display:flex!important;
  align-items:center!important;
  border:1px solid rgba(255,255,255,.55)!important;
  border-radius:999px!important;
  background:rgba(15,39,71,.36)!important;
  color:#fff!important;
  text-shadow:0 1px 7px rgba(6,18,30,.28)!important;
  box-shadow:0 5px 18px rgba(15,39,71,.12)!important;
  backdrop-filter:blur(12px)!important;
  -webkit-backdrop-filter:blur(12px)!important;
}
.work-photo-change{right:12px!important;padding:0 13px!important}
.work-photo-count{left:12px!important;padding:0 11px!important}
.work-photo-strip{
  min-height:34px!important;
  padding:0 18px!important;
  gap:6px!important;
}
.work-photo-thumb{width:34px!important;height:34px!important;border-radius:9px!important}
.work-photo-more{height:34px!important;min-width:34px!important}

/* Schrijven voelt als een verhaalpagina. */
.work-story{
  width:100%!important;
  min-height:150px!important;
  max-height:none!important;
  flex:1 0 auto!important;
  margin:0!important;
  padding:5px 1px 8px!important;
  resize:none!important;
  overflow:auto!important;
  border:0!important;
  border-radius:0!important;
  outline:0!important;
  background:transparent!important;
  color:var(--talera-body)!important;
  font-size:17px!important;
  line-height:1.56!important;
  font-weight:440!important;
  letter-spacing:-.005em!important;
}
.work-story::placeholder{color:rgba(62,74,89,.32)!important}
.work-title:focus,.work-story:focus,.work-date:focus{outline:none!important;box-shadow:none!important}

.work-voice-note{
  margin-top:2px!important;
  padding:10px 12px!important;
  border:0!important;
  border-radius:16px!important;
  background:rgba(220,234,246,.34)!important;
  box-shadow:none!important;
}
.work-voice-mark{box-shadow:inset 0 0 0 1px rgba(15,39,71,.05),0 3px 11px rgba(15,39,71,.08)!important}
.work-tools{
  width:100%!important;
  margin:0!important;
  padding:0!important;
  display:flex!important;
  justify-content:flex-start!important;
  gap:8px!important;
}
.work-tool,
.work-tool.voice{
  min-height:44px!important;
  width:auto!important;
  padding:0 17px!important;
  border:1px solid rgba(15,39,71,.08)!important;
  border-radius:999px!important;
  background:rgba(255,255,255,.56)!important;
  color:var(--talera-ink)!important;
  font-size:13px!important;
  font-weight:700!important;
  box-shadow:0 5px 18px rgba(15,39,71,.05)!important;
  backdrop-filter:blur(14px)!important;
  -webkit-backdrop-filter:blur(14px)!important;
}
.work-tool.voice:active{transform:scale(.985)}
.work-error{
  border:0!important;
  border-radius:16px!important;
  background:rgba(255,241,239,.88)!important;
  box-shadow:none!important;
}

/* Eén commandolaag onderin, zoals de presentatiemodus. */
.work-actions{
  position:relative!important;
  z-index:20!important;
  width:100%!important;
  max-width:none!important;
  min-height:82px!important;
  margin:0!important;
  padding:11px 18px max(12px,env(safe-area-inset-bottom))!important;
  display:grid!important;
  grid-template-columns:1fr!important;
  place-items:center!important;
  gap:0!important;
  background:rgba(247,244,239,.72)!important;
  border:0!important;
  box-shadow:none!important;
  backdrop-filter:blur(16px) saturate(1.08)!important;
  -webkit-backdrop-filter:blur(16px) saturate(1.08)!important;
}
.work-actions::before{
  content:"";
  position:absolute;
  left:0;right:0;top:-58px;height:58px;
  pointer-events:none;
  background:linear-gradient(to top,rgba(247,244,239,.72),rgba(247,244,239,.33) 48%,transparent 100%);
}
.work-draft{display:none!important}
.work-finish{
  position:relative!important;
  z-index:1!important;
  width:min(100%,560px)!important;
  min-height:54px!important;
  margin:0 auto!important;
  padding:0 24px!important;
  border:1px solid rgba(255,255,255,.28)!important;
  border-radius:999px!important;
  background:#315F87!important;
  color:#fff!important;
  font-size:15px!important;
  font-weight:740!important;
  letter-spacing:-.01em!important;
  box-shadow:0 10px 26px rgba(15,39,71,.18),inset 0 1px 0 rgba(255,255,255,.18)!important;
}
.work-finish:active{transform:scale(.99)}

/* Opslaan/terugkeer horen bij dezelfde ervaring. */
.work-saving{
  background:rgba(247,244,239,.94)!important;
  backdrop-filter:blur(14px)!important;
  -webkit-backdrop-filter:blur(14px)!important;
}
.work-saving-card{color:var(--talera-ink)!important}
.work-saved-sheet{
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
}
.work-saved-check{background:var(--talera-blue)!important;box-shadow:0 12px 30px rgba(15,39,71,.08)!important}

/* Datumkeuze blijft een rustige TALERA-laag, niet een formulierdialoog. */
.talera-date-choice-backdrop{background:rgba(15,39,71,.18)!important;backdrop-filter:blur(11px)!important;-webkit-backdrop-filter:blur(11px)!important}
.talera-date-choice-sheet{
  border:1px solid rgba(255,255,255,.66)!important;
  border-radius:28px!important;
  background:rgba(255,253,250,.94)!important;
  box-shadow:0 22px 64px rgba(15,39,71,.18)!important;
  backdrop-filter:blur(18px)!important;
  -webkit-backdrop-filter:blur(18px)!important;
}
.talera-date-choice,.talera-date-cancel2,.talera-date-confirm2{border-radius:999px!important}

@media(min-width:700px){
  .work-stage{max-width:680px!important;margin:0 auto!important;box-shadow:0 0 0 1px rgba(15,39,71,.035),0 24px 90px rgba(15,39,71,.08)!important}
  .work-sheet{padding-left:28px!important;padding-right:28px!important}
  .work-photo-section{width:calc(100% + 56px)!important;margin-left:-28px!important;margin-right:-28px!important}
  .work-photo,.work-photo.has-photo{border-radius:24px!important}
  .work-photo-strip{padding:0 4px!important}
}

@media(max-width:600px){
  .work-stage{padding-top:max(6px,env(safe-area-inset-top))!important}
  .work-sheet{padding:10px 16px 118px!important;gap:9px!important}
  .work-title{font-size:clamp(26px,7.6vw,33px)!important;min-height:38px!important}
  .work-photo-section{width:calc(100% + 32px)!important;margin-left:-16px!important;margin-right:-16px!important}
  .work-photo,.work-photo.has-photo{min-height:clamp(235px,37dvh,340px)!important;height:clamp(235px,37dvh,340px)!important}
  .work-photo-strip{padding:0 16px!important}
  .work-story{min-height:132px!important;font-size:16.5px!important;line-height:1.52!important}
  .work-actions{min-height:78px!important;padding-left:14px!important;padding-right:14px!important}
  .work-finish{min-height:52px!important}
}

@media(max-width:600px) and (max-height:740px){
  .work-sheet{padding-top:7px!important;gap:7px!important}
  .work-title{font-size:24px!important;min-height:32px!important}
  .work-date-row{min-height:30px!important}
  .work-photo,.work-photo.has-photo{min-height:205px!important;height:205px!important}
  .work-story{min-height:104px!important}
  .work-tool,.work-tool.voice{min-height:41px!important}
  .work-actions{min-height:72px!important;padding-top:8px!important}
  .work-finish{min-height:48px!important}
}

/* Bestaande iPhone-toetsenbordgedrag blijft leidend. */
html.talera-keyboard-open .work-actions{
  background:rgba(247,244,239,.94)!important;
  border-radius:22px!important;
}
`;

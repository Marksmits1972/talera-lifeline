export const WORKBLAD_V2_STYLE = String.raw`
.work-photo-section{display:grid;gap:8px}
.work-photo-count{position:absolute;left:10px;bottom:10px;border-radius:999px;background:rgba(15,39,71,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;padding:8px 11px;font-size:11px;font-weight:700;pointer-events:none}
.work-photo-strip{display:flex;align-items:center;gap:6px;min-height:36px;overflow:hidden;padding:0 2px}
.work-photo-thumb{width:34px;height:34px;border-radius:9px;overflow:hidden;display:block;flex:0 0 auto;border:1px solid rgba(15,39,71,.08);background:#ebe8e2;opacity:.74}
.work-photo-thumb.active{opacity:1;box-shadow:0 0 0 1.5px rgba(91,143,185,.55)}
.work-photo-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.work-photo-more{height:34px;min-width:34px;padding:0 8px;border-radius:999px;display:grid;place-items:center;background:rgba(220,234,246,.7);color:#0F2747;font-size:11px;font-weight:750}
.work-saved-actions.one{grid-template-columns:1fr;max-width:300px}

/* Datum hoort bij de kern van een herinnering. Het zichtbare veld opent onze eigen picker. */
.work-date[readonly]{cursor:pointer;-webkit-user-select:none;user-select:none}
.work-required-missing{outline:2px solid rgba(193,79,69,.55)!important;outline-offset:2px!important;border-radius:10px}
.talera-date-backdrop{position:fixed;inset:0;z-index:80;background:rgba(15,39,71,.20);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;padding:16px 12px max(16px,env(safe-area-inset-bottom))}
.talera-date-sheet{width:min(100%,520px);background:#fffdfa;border-radius:26px;padding:18px;box-shadow:0 22px 70px rgba(15,39,71,.24);color:#0F2747;display:grid;gap:14px}
.talera-date-sheet h2{margin:0;font-size:22px;line-height:1.08;letter-spacing:-.02em}
.talera-date-sheet p{margin:0;color:#5e6b79;font-size:14px;line-height:1.4}
.talera-date-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;background:rgba(220,234,246,.58);padding:4px;border-radius:14px}
.talera-date-tab{border:0;border-radius:11px;min-height:42px;background:transparent;color:#0F2747;font-weight:700}
.talera-date-tab.active{background:white;box-shadow:0 2px 9px rgba(15,39,71,.10)}
.talera-date-panel{display:grid;gap:10px}.talera-date-panel[hidden]{display:none!important}
.talera-date-sheet label{font-size:12px;font-weight:750;color:#526071;letter-spacing:.02em}
.talera-date-sheet input,.talera-date-sheet select{width:100%;min-height:50px;border:1px solid rgba(15,39,71,.14);border-radius:14px;background:white;color:#0F2747;padding:0 13px;font-size:16px!important}
.talera-date-approx{display:grid;grid-template-columns:1.2fr .8fr;gap:8px}
.talera-date-actions{display:grid;grid-template-columns:auto 1fr;gap:8px;margin-top:2px}
.talera-date-cancel,.talera-date-confirm{border:0;border-radius:15px;min-height:50px;padding:0 18px;font-weight:750;font-size:15px}
.talera-date-cancel{background:rgba(220,234,246,.56);color:#0F2747}.talera-date-confirm{background:#0F2747;color:#fff}

/* iOS: never trigger Safari's automatic focus zoom. */
.work-stage input,.work-stage textarea{font-size:16px!important}

/* Mobile workblad = one stable canvas. The page itself should not need finger scrolling;
   longer story text may scroll inside its own writing field without changing the scale. */
@media(max-width:600px){
  .work-stage{grid-template-rows:28px minmax(0,1fr) auto;gap:7px;padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));}
  .work-top{min-height:28px}
  .work-brand{font-size:14px}
  .work-scroll{overflow:hidden!important;padding:0!important}
  .work-sheet{height:100%;min-height:0!important;overflow:hidden;padding:13px 14px 12px;border-radius:24px;gap:9px}
  .work-kicker{font-size:9px}
  .work-title{font-size:clamp(22px,6.2vw,29px)!important;line-height:1.06}
  .work-date-row{min-height:29px;gap:8px}
  .work-date{font-size:16px!important;line-height:1.2}
  .work-photo-section{gap:5px;min-height:0}
  .work-photo,.work-photo.has-photo{min-height:clamp(112px,19dvh,158px)!important}
  .work-photo img{height:clamp(112px,19dvh,158px)!important;min-height:0!important;max-height:none!important}
  .work-photo-empty{padding:15px}
  .work-photo-plus{width:36px;height:36px;font-size:22px}
  .work-photo-change{right:8px;bottom:8px;padding:7px 10px;font-size:11px}
  .work-photo-count{left:8px;bottom:8px;padding:7px 9px;font-size:10px}
  .work-photo-strip{min-height:28px;gap:5px}
  .work-photo-thumb{width:28px;height:28px;border-radius:7px}
  .work-photo-more{height:28px;min-width:28px;font-size:10px}
  .work-story{min-height:66px!important;max-height:16dvh;flex:1;font-size:16px!important;line-height:1.38;overflow:auto;-webkit-overflow-scrolling:touch}
  .work-voice-note{padding:8px 10px;gap:9px;border-radius:14px}
  .work-voice-mark{width:28px;height:28px}
  .work-tools{gap:6px;padding-top:0}
  .work-tool{min-height:43px;border-radius:15px}
  .work-hint{display:none}
  .work-actions{grid-template-columns:minmax(0,1fr) auto;gap:8px}
  .work-draft{font-size:10px;padding-left:2px}
  .work-finish{min-height:48px;border-radius:16px;padding:0 17px}
}
@media(max-width:600px) and (max-height:740px){
  .work-stage{gap:5px;padding:max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom))}
  .work-sheet{padding:10px 12px;gap:7px}
  .work-title{font-size:21px!important}
  .work-photo,.work-photo.has-photo{min-height:96px!important}
  .work-photo img{height:96px!important}
  .work-photo-strip{min-height:24px}
  .work-photo-thumb{width:24px;height:24px}
  .work-photo-more{height:24px;min-width:24px}
  .work-story{min-height:54px!important;max-height:13dvh}
  .work-tool{min-height:40px}
  .work-finish{min-height:44px}
}
`;

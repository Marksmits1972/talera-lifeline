export const WORKBLAD_V2_STYLE = String.raw`
.work-photo-section{display:grid;gap:8px}
.work-photo-count{position:absolute;left:10px;bottom:10px;border-radius:999px;background:rgba(15,39,71,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;padding:8px 11px;font-size:11px;font-weight:700;pointer-events:none}
.work-photo-strip{display:flex;align-items:center;gap:6px;min-height:36px;overflow:hidden;padding:0 2px}
.work-photo-thumb{width:34px;height:34px;border-radius:9px;overflow:hidden;display:block;flex:0 0 auto;border:1px solid rgba(15,39,71,.08);background:#ebe8e2;opacity:.74}
.work-photo-thumb.active{opacity:1;box-shadow:0 0 0 1.5px rgba(91,143,185,.55)}
.work-photo-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.work-photo-more{height:34px;min-width:34px;padding:0 8px;border-radius:999px;display:grid;place-items:center;background:rgba(220,234,246,.7);color:#0F2747;font-size:11px;font-weight:750}
.work-saved-actions.one{grid-template-columns:1fr;max-width:300px}
@media(max-width:430px){.work-photo.has-photo{min-height:238px}.work-photo img{min-height:238px;max-height:40dvh}}
`;

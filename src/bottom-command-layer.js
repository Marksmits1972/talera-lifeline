/*
 * Bottom command layer
 *
 * Layer order:
 * 0  active photograph (owned by the presentation screen)
 * 30 navigation container
 * 30/0 one frosted-glass surface (::before)
 * 30/1 command buttons
 *
 * The variables below are the only tuning points needed for later visual tests.
 */
export const bottomCommandLayerStyle = String.raw`
:root{
  --command-bar-height:76px;
  --command-glass-tint:rgba(15,39,71,.075);
  --command-glass-border:rgba(255,255,255,.22);
  --command-glass-blur:14px;
  --command-glass-saturation:1.10;
  --command-label:rgba(255,255,255,.88);
  --command-label-shadow:rgba(6,18,30,.42);
  --command-primary:#315f87;
  --command-primary-border:rgba(255,255,255,.46);
  --command-primary-shadow:rgba(6,18,30,.28);
  --command-accent:#E7A98B;
}

nav{
  position:absolute!important;
  left:0!important;
  right:0!important;
  bottom:0!important;
  z-index:30!important;
  isolation:isolate!important;
  width:100%!important;
  height:calc(var(--command-bar-height) + env(safe-area-inset-bottom))!important;
  min-height:var(--command-bar-height)!important;
  margin:0!important;
  padding:8px 20px max(8px,env(safe-area-inset-bottom))!important;
  display:grid!important;
  grid-template-columns:1fr 1fr 1fr!important;
  align-items:center!important;
  overflow:visible!important;
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
}

/* The command bar has exactly one shared glass surface. */
nav::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  inset:0!important;
  z-index:0!important;
  pointer-events:none!important;
  height:auto!important;
  background:linear-gradient(180deg,rgba(15,39,71,.035),var(--command-glass-tint))!important;
  border-top:1px solid var(--command-glass-border)!important;
  box-shadow:0 -10px 30px rgba(6,18,30,.045)!important;
  backdrop-filter:blur(var(--command-glass-blur)) saturate(var(--command-glass-saturation))!important;
  -webkit-backdrop-filter:blur(var(--command-glass-blur)) saturate(var(--command-glass-saturation))!important;
  -webkit-mask-image:none!important;
  mask-image:none!important;
}
nav::after{display:none!important;content:none!important}

nav > button{
  position:relative!important;
  z-index:1!important;
}

/* Vertellen is deliberately the left secondary command. */
.tell.nav-item{
  justify-self:stretch!important;
  width:auto!important;
  height:auto!important;
  min-height:48px!important;
  border:0!important;
  border-radius:0!important;
  padding:0!important;
  color:var(--command-label)!important;
  background:transparent!important;
  box-shadow:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
  font-size:9px!important;
  font-weight:620!important;
  text-shadow:0 1px 8px var(--command-label-shadow)!important;
}
.tell.nav-item::after{content:none!important;display:none!important}
.tell-icon{
  position:relative;
  width:23px;
  height:17px;
  border:1.7px solid currentColor;
  border-radius:9px;
}
.tell-icon::after{
  content:"";
  position:absolute;
  left:4px;
  bottom:-4px;
  width:7px;
  height:7px;
  border-left:1.7px solid currentColor;
  transform:skewY(-34deg);
}

/* Presentatie is the central primary destination. */
.presentation{
  position:relative!important;
  justify-self:center!important;
  align-self:center!important;
  width:58px!important;
  height:58px!important;
  min-width:58px!important;
  padding:7px 4px 6px!important;
  border:1px solid var(--command-primary-border)!important;
  border-radius:50%!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  gap:3px!important;
  color:#fff!important;
  background:var(--command-primary)!important;
  box-shadow:0 9px 24px var(--command-primary-shadow),inset 0 1px 0 rgba(255,255,255,.20)!important;
  font-size:8px!important;
  line-height:1!important;
  font-weight:720!important;
  letter-spacing:-.01em!important;
  text-shadow:0 1px 5px rgba(6,18,30,.30)!important;
}
.presentation .timeline-icon{
  width:24px!important;
  height:16px!important;
  color:#fff!important;
}
.presentation::after{
  content:""!important;
  position:absolute!important;
  right:5px!important;
  top:5px!important;
  width:6px!important;
  height:6px!important;
  border-radius:50%!important;
  background:var(--command-accent)!important;
  box-shadow:0 0 0 2px rgba(49,95,135,.72)!important;
}

@media(max-width:380px){
  nav{padding-left:14px!important;padding-right:14px!important}
}
`;

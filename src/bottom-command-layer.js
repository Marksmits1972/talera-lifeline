/*
 * Bottom command layer
 *
 * Layer order:
 * 0  active photograph (owned by the home screen)
 * 30 navigation container
 * 30/0 one feathered frosted-glass surface (::before)
 * 30/1 command buttons
 *
 * The frost follows the same principle as the top timeline: a masked blur
 * grows gradually out of the photograph. There is no border or second veil.
 */
export const bottomCommandLayerStyle = String.raw`
:root{
  --command-bar-height:76px;
  --command-frost-feather:78px;
  --command-glass-tint:rgba(15,39,71,.075);
  --command-glass-blur:14px;
  --command-glass-saturation:1.12;
  --command-label:rgba(255,255,255,.90);
  --command-label-shadow:rgba(6,18,30,.42);
  --command-home:#315f87;
  --command-home-border:rgba(255,255,255,.48);
  --command-home-shadow:rgba(6,18,30,.28);
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

/* One continuous glass surface, feathered upward into the photograph. */
nav::before{
  content:""!important;
  display:block!important;
  position:absolute!important;
  left:0!important;
  right:0!important;
  top:calc(-1 * var(--command-frost-feather))!important;
  bottom:0!important;
  z-index:0!important;
  pointer-events:none!important;
  height:auto!important;
  background:var(--command-glass-tint)!important;
  border:0!important;
  box-shadow:none!important;
  backdrop-filter:blur(var(--command-glass-blur)) saturate(var(--command-glass-saturation))!important;
  -webkit-backdrop-filter:blur(var(--command-glass-blur)) saturate(var(--command-glass-saturation))!important;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.08) 18%,rgba(0,0,0,.24) 36%,rgba(0,0,0,.52) 56%,rgba(0,0,0,.82) 76%,#000 100%)!important;
  mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.08) 18%,rgba(0,0,0,.24) 36%,rgba(0,0,0,.52) 56%,rgba(0,0,0,.82) 76%,#000 100%)!important;
}
nav::after{display:none!important;content:none!important}

nav > button{
  position:relative!important;
  z-index:1!important;
}

/* Vertellen is the left secondary command. */
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

/* Home is the central primary destination: icon only, no functional label. */
.home{
  position:relative!important;
  justify-self:center!important;
  align-self:center!important;
  width:58px!important;
  height:58px!important;
  min-width:58px!important;
  padding:0!important;
  border:1px solid var(--command-home-border)!important;
  border-radius:50%!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  color:#fff!important;
  background:var(--command-home)!important;
  box-shadow:0 9px 24px var(--command-home-shadow),inset 0 1px 0 rgba(255,255,255,.20)!important;
  text-shadow:none!important;
}
.home-icon{
  display:block;
  width:27px;
  height:27px;
  overflow:visible;
}

@media(max-width:380px){
  nav{padding-left:14px!important;padding-right:14px!important}
}
`;

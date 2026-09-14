export const chromeRefinementStyle = String.raw`
/* TALERA — compact glass chrome, visual-only refinement */
.timeline::before{
  height:calc(100% + 18px)!important;
  background:rgba(255,255,255,.012)!important;
  backdrop-filter:blur(11px) saturate(1.03)!important;
  -webkit-backdrop-filter:blur(11px) saturate(1.03)!important;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 50%,rgba(0,0,0,.88) 64%,rgba(0,0,0,.58) 78%,rgba(0,0,0,.24) 90%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,#000 0%,#000 50%,rgba(0,0,0,.88) 64%,rgba(0,0,0,.58) 78%,rgba(0,0,0,.24) 90%,transparent 100%)!important;
  opacity:.82!important;
}
.timeline::after{
  height:calc(100% + 10px)!important;
  background:linear-gradient(180deg,rgba(255,255,255,.01),rgba(255,255,255,.025) 62%,transparent 100%)!important;
}
.focus{
  top:auto!important;
  bottom:-17px!important;
  padding:4px 10px!important;
  background:rgba(255,254,252,.80)!important;
  border-color:rgba(255,255,255,.42)!important;
  box-shadow:0 4px 14px rgba(15,39,71,.09)!important;
  backdrop-filter:blur(9px) saturate(1.04)!important;
  -webkit-backdrop-filter:blur(9px) saturate(1.04)!important;
}
nav{
  background:linear-gradient(180deg,rgba(15,39,71,.018),rgba(15,39,71,.048))!important;
  border-top:1px solid rgba(255,255,255,.08)!important;
  backdrop-filter:blur(16px) saturate(1.08)!important;
  -webkit-backdrop-filter:blur(16px) saturate(1.08)!important;
}
nav::before{
  height:48px!important;
  background:rgba(15,39,71,.012)!important;
  backdrop-filter:blur(15px) saturate(1.06)!important;
  -webkit-backdrop-filter:blur(15px) saturate(1.06)!important;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.10) 32%,rgba(0,0,0,.38) 66%,#000 100%)!important;
  mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.10) 32%,rgba(0,0,0,.38) 66%,#000 100%)!important;
}
.nav-item{
  text-shadow:0 1px 9px rgba(6,18,30,.46)!important;
}
`;

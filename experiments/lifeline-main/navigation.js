// Single source of truth for the three-page TALERA footer.
// This pure component owns markup and visual tokens; page behavior stays in each page.
const NAVIGATION_STYLE=String.raw`<style id="talera-unified-navigation">
/* Exact three-tab structure and iconography from the approved timeline. */
body nav[aria-label="TALERA navigatie"]{visibility:hidden!important}
#taleraPageNav.bottom-nav,#taleraTellNav.bottom-nav{
 width:100%!important;max-width:880px!important;margin:0 auto!important;
 display:flex!important;align-items:center!important;justify-content:space-around!important;
 height:calc(65px + env(safe-area-inset-bottom,0px))!important;
 min-height:calc(65px + env(safe-area-inset-bottom,0px))!important;
 max-height:none!important;
 padding:0 7px calc(3px + env(safe-area-inset-bottom,0px))!important;
 border:0!important;border-top:1px solid #e8e9ef!important;
 background:#fff!important;opacity:1!important;visibility:visible!important;
 box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
 filter:none!important;overflow:visible!important;box-sizing:border-box!important
}
#taleraPageNav.bottom-nav{position:fixed!important;z-index:2147483640!important;bottom:0!important;left:0!important;right:0!important}
#taleraTellNav.bottom-nav{position:relative!important;z-index:5!important;flex:0 0 auto!important}
#taleraPageNav .nav-item,#taleraTellNav .nav-item{
 position:relative!important;display:flex!important;flex:1 1 0!important;
 flex-direction:column!important;justify-content:center!important;align-items:center!important;
 gap:4px!important;min-width:0!important;height:100%!important;min-height:0!important;
 padding:0!important;margin:0!important;text-decoration:none!important;
 background:transparent!important;border:0!important;border-radius:0!important;
 font:650 11px/1.2 -apple-system,BlinkMacSystemFont,sans-serif!important;
 color:#67758b!important;opacity:1!important;visibility:visible!important;
 text-shadow:none!important;filter:none!important
}
#taleraPageNav .nav-item.selected,#taleraTellNav .nav-item.selected{
 color:#2478ca!important;font-weight:780!important
}
#taleraPageNav .nav-item.selected::before,#taleraTellNav .nav-item.selected::before{
 content:''!important;position:absolute!important;top:6px!important;
 width:95%!important;max-width:130px!important;height:26px!important;
 background:#e6f1fd!important;border-radius:18px!important;
 box-shadow:none!important;z-index:0!important
}
#taleraPageNav .nav-icon,#taleraTellNav .nav-icon{
 height:23px!important;position:relative!important;z-index:1!important;
 font-size:21px!important;line-height:23px!important;color:inherit!important
}
#taleraPageNav .nav-item span:last-child,#taleraTellNav .nav-item span:last-child{
 position:relative!important;z-index:1!important;color:inherit!important
}
#taleraPageNav .nav-item:focus-visible,#taleraTellNav .nav-item:focus-visible{
 outline:2px solid #2478ca!important;outline-offset:-3px!important;border-radius:10px!important
}
</style>`;
export const NAV_SLOT='<!--TALERA_SHARED_NAV-->';
const links=[
 {page:"tell",href:"/tell",key:"nav.tell",icon:"<svg viewBox=\"0 0 24 24\" width=\"23\" height=\"23\" aria-hidden=\"true\"><path d=\"M20 11.5a8.5 8.5 0 0 1-8.5 8.5 10 10 0 0 1-4-.9L3 21l1.6-4.2A8.5 8.5 0 1 1 20 11.5Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>"},
 {page:"timeline",href:"/",key:"nav.timeline",icon:"<svg viewBox=\"0 0 24 24\" width=\"23\" height=\"23\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M12 4v8l5 1\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/></svg>"},
 {page:"present",href:"/present",key:"nav.presentation",icon:"<svg viewBox=\"0 0 24 24\" width=\"23\" height=\"23\" aria-hidden=\"true\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/><circle cx=\"8\" cy=\"8\" r=\"2\" fill=\"currentColor\"/><path d=\"m5 18 5-5 3 3 3-4 4 5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/></svg>"},
];
export function renderNavigation(page){
 if(!links.some(x=>x.page===page))throw Error('Unknown TALERA navigation page: '+page);
 const id=page==='tell'?'taleraTellNav':'taleraPageNav';
 const items=links.map(item=>{
  const active=item.page===page;
  return '<a href="'+item.href+'" class="nav-item'+(active?' selected':'')+'"'+(active?' aria-current="page"':'')+'><span class="nav-icon">'+item.icon+'</span><span data-i18n="'+item.key+'"></span></a>';
 }).join('');
 return '<nav class="bottom-nav" id="'+id+'" aria-label="Hoofdnavigatie TALERA">'+items+'</nav>';
}

/**
 * TALERA Mijn TALERA — one canonical menu, one thin router.
 *
 * The menu is a plain text module imported as a string. No runtime source
 * rewriting, version patch cascade, alternate accounts or second database.
 * The existing V56 service handles all other requests, unchanged.
 */
import menuSource from "./menu-integration.txt";
import knowledgeSource from "./kennisbank.html";
import backupSource from "./free-backup.txt";
import syncCoordinatorSource from "./premium-sync-coordinator.txt";
import currentClientSource from "./premium-current-client.txt";
import syncQueueSource from "./premium-sync-queue.txt";
import syncBridgeSource from "./premium-indexeddb-bridge.txt";
import recordsBridgeSource from "./premium-records-bridge.txt";
import recordsCoordinatorSource from "./premium-records-coordinator.txt";
import syncAuditSource from "./premium-sync-audit.txt";
import largeMediaSource from "./premium-large-media.txt";
import restoreVerifierSource from "./premium-restore-verifier.txt";
import restorePreviewSource from "./premium-cloud-restore-preview.txt";
import cloudIntegritySource from "./premium-cloud-integrity.txt";
import atomicRestoreSource from "./premium-cloud-restore-atomic.txt";
import stagedRestoreSource from "./premium-restore-stage.txt";

export const MENU_MODULE = "/__clean/menu-integration.mjs";
export const BUILD_MARKER = "mijn-talera-geconsolideerd-20261101";
// The mobile PWA may keep ES modules in a tab or WebKit's cache across deploys.
// Derive an asset revision from the actual menu source, not from a manually
// incremented release number. The same URL is used on all TALERA entry pages.
let menuFingerprint=2166136261;
for(let i=0;i<menuSource.length;i++)
  menuFingerprint=Math.imul(menuFingerprint^menuSource.charCodeAt(i),16777619)>>>0;
export const MENU_REVISION=menuFingerprint.toString(36);
const currentMenuTag='<script type="module" src="'+MENU_MODULE+'?v='+MENU_REVISION+'"></script>';
const originalMenuTag='<script type="module" src="'+MENU_MODULE+'"></script>';

// Keep the V56 home presentation, timeline and three-tab navigation.
// Fix only their visible boundaries on iOS if its visual viewport is smaller
// than the layout viewport. Do not scale the user's content or alter storage.
const HOME_FIT_STYLE = `<style id="talera-v62-iphone-fit">
@media(max-width: 800px){
 html,body{max-width:100vw!important;overflow-x:hidden!important}
 body{touch-action:pan-y pinch-zoom!important}
 .hero,.mast,.life-sheet{left:var(--talera-v62-visual-left,0px)!important;right:auto!important;width:var(--talera-v62-visual-width,100vw)!important;max-width:100vw!important;min-width:0!important}
 .sheet-body{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:hidden!important;overflow-wrap:anywhere}
 .sheet-body .main-only,.sheet-body .view-only,.cards,#v17-timebox,.v17-rail-wrap{min-width:0!important;max-width:100%!important}
 .cards{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 .v17-yearrow,.v17-yearunit,.section-head{min-width:0!important}
 .flow-nav{left:calc(var(--talera-v62-visual-left,0px) + 17px)!important;right:auto!important;width:calc(var(--talera-v62-visual-width,100vw) - 34px)!important;max-width:510px!important;min-width:0!important}
 .flow-nav a{min-width:0!important}
 input,textarea,select{font-size:max(16px,1em)}
}
</style>`;
const HOME_FIT_SCRIPT = `<script id="talera-v62-iphone-fit-script">
(function(){'use strict';
 const viewport=window.visualViewport;
 if(!viewport)return;
 const update=()=>{
  const root=document.documentElement;
  root.style.setProperty('--talera-v62-visual-left',viewport.offsetLeft+'px');
  root.style.setProperty('--talera-v62-visual-width',Math.max(1,viewport.width)+'px');
 };
 viewport.addEventListener('resize',update,{passive:true});
 viewport.addEventListener('scroll',update,{passive:true});
 window.addEventListener('pageshow',update);
 update();
})();
</script>`;



export function legacyDestination(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/gedeeld") return "shared";
  if (path === "/meldingen") return "messages";
  return null;
}

export default {
  async fetch(request, env) {
    if (!env?.V56_BASE?.fetch) {
      return new Response("TALERA-service niet aangesloten", {status:503});
    }
    const url = new URL(request.url);
    // V62's public PWA entry is /present. The previous /app bookmark was
    // proxied to Clean Core (404). Repair GET/HEAD only; preserve other routes.
    if ((request.method === "GET" || request.method === "HEAD") &&
        (url.pathname === "/app" || url.pathname === "/app/")) {
      const destination = new URL("/present", url);
      destination.search = url.search;
      return new Response(null, {status:302,headers:{
        location:destination.toString(),
        "cache-control":"no-store",
        "x-talera-integratie":BUILD_MARKER,
      }});
    }
    if ((request.method === "GET" || request.method === "HEAD") &&
        (url.pathname === "/kennisbank" || url.pathname === "/kennisbank/")) {
      return new Response(request.method === "HEAD" ? null : knowledgeSource, {
        status:200,
        headers:{
          "content-type":"text/html; charset=utf-8",
          "cache-control":"no-store",
          "x-content-type-options":"nosniff",
          "x-talera-integratie":BUILD_MARKER,
        },
      });
    }
    if (request.method === "GET") {
      const syncModules = {
        "/__clean/premium-sync-coordinator.mjs":syncCoordinatorSource,
        "/__clean/premium-current-client.mjs":currentClientSource,
        "/__clean/premium-sync-queue.mjs":syncQueueSource,
        "/__clean/premium-indexeddb-bridge.mjs":syncBridgeSource,
        "/__clean/premium-records-bridge.mjs":recordsBridgeSource,
        "/__clean/premium-records-coordinator.mjs":recordsCoordinatorSource,
        "/__clean/premium-sync-audit.mjs":syncAuditSource,
        "/__clean/premium-large-media.mjs":largeMediaSource,
        "/__clean/premium-restore-verifier.mjs":restoreVerifierSource,
        "/__clean/premium-cloud-restore-preview.mjs":restorePreviewSource,
        "/__clean/premium-cloud-integrity.mjs":cloudIntegritySource,
        "/__clean/premium-cloud-restore-atomic.mjs":atomicRestoreSource,
        "/__clean/premium-restore-stage.mjs":stagedRestoreSource,
      };
      const moduleText = syncModules[url.pathname];
      if (moduleText !== undefined) {
        return new Response(moduleText,{status:200,headers:{
          "content-type":"text/javascript; charset=utf-8",
          "cache-control":"no-store",
          "x-content-type-options":"nosniff",
        }});
      }
    }
    if (request.method === "GET" && url.pathname === "/__clean/free-backup.js") {
      return new Response(backupSource, {
        status:200,
        headers:{"content-type":"text/javascript; charset=utf-8",
                 "cache-control":"no-store","x-content-type-options":"nosniff"}
      });
    }
    if (request.method === "GET") {
      const view = legacyDestination(url.pathname);
      if (view) {
        const dest = new URL("/present", url);
        dest.searchParams.set("talera_menu", view);
        return new Response(null, {
          status:302,
          headers:{
            location:dest.toString(),
            "cache-control":"no-store",
            "x-talera-integratie":BUILD_MARKER,
          },
        });
      }
      if (url.pathname === MENU_MODULE) {
        return new Response(menuSource, {
          status:200,
          headers:{
            "content-type":"text/javascript; charset=utf-8",
            "cache-control":"no-store",
            "x-content-type-options":"nosniff",
            "x-talera-integratie":BUILD_MARKER,
          },
        });
      }
    }
    // Both /present and Mijn leven use the same canonical V62 menu.
    // Give the module a source-derived URL so iOS cannot silently reuse
    // a prior version after the Worker has been updated.
    if (request.method === "GET" &&
        ["/present","/mijn-leven","/mijn-leven/","/","/index.html"].includes(url.pathname)) {
      const response = await env.V56_BASE.fetch(request);
      if (!response.ok ||
          !(response.headers.get("content-type") || "").includes("text/html")) {
        return response;
      }
      const html = await response.clone().text();
      const isHome=url.pathname!=="/present";
      if ((isHome && !html.includes('id="navMore"')) ||
          !html.includes("</body>")) return response;
      let updated=html.includes(originalMenuTag)
        ?html.replace(originalMenuTag,currentMenuTag)
        :html.includes(currentMenuTag)
         ?html
         :html.replace("</body>",currentMenuTag+"</body>");
      if(isHome){
        if(!updated.includes('id="talera-v62-iphone-fit"') && updated.includes("</head>"))
          updated=updated.replace("</head>",HOME_FIT_STYLE+"</head>");
        if(!updated.includes('id="talera-v62-iphone-fit-script"'))
          updated=updated.replace("</body>",HOME_FIT_SCRIPT+"</body>");
      }
      if (updated===html)return response;
      const headers=new Headers(response.headers);
      headers.delete("content-length");
      headers.set("cache-control","no-store");
      headers.set("x-talera-integratie",BUILD_MARKER);
      return new Response(updated,{status:response.status,statusText:response.statusText,headers});
    }
    // Keep methods, authentication cookies, uploads and backend responses intact.
    return env.V56_BASE.fetch(request);
  },
};

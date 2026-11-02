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
import syncQueueSource from "./premium-sync-queue.txt";
import syncBridgeSource from "./premium-indexeddb-bridge.txt";
import recordsBridgeSource from "./premium-records-bridge.txt";
import recordsCoordinatorSource from "./premium-records-coordinator.txt";
import syncAuditSource from "./premium-sync-audit.txt";
import largeMediaSource from "./premium-large-media.txt";
import restoreVerifierSource from "./premium-restore-verifier.txt";
import restorePreviewSource from "./premium-cloud-restore-preview.txt";
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
        "/__clean/premium-sync-queue.mjs":syncQueueSource,
        "/__clean/premium-indexeddb-bridge.mjs":syncBridgeSource,
        "/__clean/premium-records-bridge.mjs":recordsBridgeSource,
        "/__clean/premium-records-coordinator.mjs":recordsCoordinatorSource,
        "/__clean/premium-sync-audit.mjs":syncAuditSource,
        "/__clean/premium-large-media.mjs":largeMediaSource,
        "/__clean/premium-restore-verifier.mjs":restoreVerifierSource,
        "/__clean/premium-cloud-restore-preview.mjs":restorePreviewSource,
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
      const updated=html.includes(originalMenuTag)
        ?html.replace(originalMenuTag,currentMenuTag)
        :html.includes(currentMenuTag)
         ?html
         :html.replace("</body>",currentMenuTag+"</body>");
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

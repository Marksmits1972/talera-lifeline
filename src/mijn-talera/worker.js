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

export const MENU_MODULE = "/__clean/menu-integration.mjs";
export const BUILD_MARKER = "mijn-talera-geconsolideerd-20261101";

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
    // Keep methods, authentication cookies, uploads and backend responses intact.
    return env.V56_BASE.fetch(request);
  },
};

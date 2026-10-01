import timelineWorker from "./index.js";
import tellWorker from "../xxory-test/src/orb-app-v79-worker-timeline-publish.js";

const REV = "talera-reference-complete-20260914-r1";

function rewriteRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname || "/";
  return new Request(url.toString(), request);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Keep the complete 14 September tell/workblad runtime inside this same
    // isolated reference Worker. /tell is only a routing prefix; the original
    // tell worker still receives its historical root paths.
    if (path === "/tell" || path === "/tell/" || path.startsWith("/tell/")) {
      const stripped = path.slice("/tell".length) || "/";
      return tellWorker.fetch(rewriteRequest(request, stripped), env, ctx);
    }

    // Historical tell/workblad APIs and the isolated v9 route are served by
    // the matching 14 September tell runtime, not by the current xxory-test.
    if (path === "/v9" || path === "/v9/" || path.startsWith("/api/")) {
      if (path.startsWith("/api/linked/")) {
        const linkedPath = path.replace(/^\/api\/linked/, "/api/integration");
        return tellWorker.fetch(rewriteRequest(request, linkedPath), env, ctx);
      }
      return tellWorker.fetch(request, env, ctx);
    }

    const response = await timelineWorker.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set("x-talera-reference", REV);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};

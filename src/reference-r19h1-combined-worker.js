import timelineWorker from "./timeline-polish-worker.js";
import tellWorker from "../xxory-test/src/clean-router-worker.js";

const REV = "talera-r19h1-complete-isolated-20261001-r1";

function rewrite(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Dedicated R19h1 tell entry. Always opens the exact Story Lab clean route
    // that belongs to the R19h1 baseline, while preserving query/hash context.
    if (path === "/tell" || path === "/tell/") {
      // Warm the historical API once so a fresh isolated D1 gets the exact
      // R19h1 base schema before the user starts saving/publishing.
      if (env && env.DB && ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(
          tellWorker.fetch(rewrite(request, "/api/health"), env, ctx).catch(() => null)
        );
      }
      return tellWorker.fetch(rewrite(request, "/storylab-clean"), env, ctx);
    }

    // Prefixed tell APIs used by the historical timeline integration.
    if (path.startsWith("/tell/api/")) {
      return tellWorker.fetch(rewrite(request, path.slice("/tell".length)), env, ctx);
    }

    // Native R19h1 Story Lab routes/APIs stay inside the same isolated Worker.
    if (
      path === "/storylab-clean" ||
      path === "/storylab-clean/" ||
      path === "/storylab" ||
      path === "/storylab/" ||
      path.startsWith("/api/storylab-clean") ||
      path.startsWith("/api/integration/") ||
      path.startsWith("/api/v9/")
    ) {
      return tellWorker.fetch(request, env, ctx);
    }

    // Keep timeline-owned proxy/share routes on the historical timeline worker.
    return timelineWorker.fetch(request, env, ctx);
  }
};

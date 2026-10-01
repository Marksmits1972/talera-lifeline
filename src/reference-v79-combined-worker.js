import timelineWorker from "./index.js";
import tellWorker from "../xxory-test/src/orb-app-v79-worker.js";

const REV = "talera-reference-v79-20260910-r1";

function rewriteRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

function injectTimelineRouting(html) {
  const script = `<script id="talera-reference-v79-routing">
  (() => {
    const tell = document.querySelector('.tell');
    if (tell) tell.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      location.href = '/tell';
    }, true);
  })();
  </script>`;
  return html.includes("</body>") ? html.replace("</body>", script + "</body>") : html;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/tell" || path === "/tell/") {
      return tellWorker.fetch(rewriteRequest(request, "/"), env, ctx);
    }

    if (path.startsWith("/api/")) {
      return tellWorker.fetch(request, env, ctx);
    }

    const response = await timelineWorker.fetch(request, env, ctx);
    const type = response.headers.get("content-type") || "";
    const headers = new Headers(response.headers);
    headers.set("x-talera-reference", REV);

    if (request.method === "HEAD" || !type.includes("text/html")) {
      return new Response(response.body, {status:response.status,statusText:response.statusText,headers});
    }

    const html = injectTimelineRouting(await response.text());
    headers.delete("content-length");
    return new Response(html, {status:response.status,statusText:response.statusText,headers});
  }
};

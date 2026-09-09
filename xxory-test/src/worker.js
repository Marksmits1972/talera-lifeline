import baseWorker from "./worker-base.js";
import { organicOrbStyle, organicOrbScript } from "./organic-orb.js";

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const original = await response.text();
    const html = original
      .replace("</head>", `<style id="talera-organic-orb-v1">${organicOrbStyle}</style></head>`)
      .replace("</body>", `<script id="talera-organic-orb-v1-script">${organicOrbScript}</script></body>`);

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

import { ensureSchema, handleApi, json } from "./api.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) {
        await ensureSchema(env);
        return handleApi(request, env, url);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("TALERA tell worker error", error);
      if (url.pathname.startsWith("/api/")) {
        return json({ error: "Er ging iets mis. Probeer het opnieuw." }, 500);
      }
      return env.ASSETS.fetch(new Request(new URL("/", url.origin), request));
    }
  }
};

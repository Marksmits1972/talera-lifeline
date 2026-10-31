/**
 * TALERA V57 — Mijn TALERA menu integration, staged on top of V56.
 *
 * This Worker intentionally owns no database, memory, login or social controller.
 * All application requests are forwarded unchanged to the V56 service binding.
 * Only the legacy navigation routes and one existing menu module are adapted.
 *
 * No migration, personal-data write, cache deletion or account reset.
 * Promote only after owner acceptance on a real iPhone/Safari.
 */
export const V57_MARKER = "mijn-talera-integratie-v57-20261031";
export const MENU_MODULE = "/__clean/menu-integration.mjs";
const OLD_MENU_OPEN = "if(['hub','account','login','privacy','messages','settings'].includes(requestedMenu))open(requestedMenu);";
const NEW_MENU_OPEN = "if(['hub','account','login','privacy','messages','settings','people','mine','shared','subscription','help','language','accessibility','display'].includes(requestedMenu))open(requestedMenu);";
const OLD_AUTO_LOGIN = "if(!state.open&&location.pathname==='/present'&&!new URLSearchParams(location.search).has('preview'))open('login','initial')";

export function patchMenuScript(source) {
  if (typeof source !== "string") return { ok: false, text: source, reason: "no-script" };
  if (!source.includes(OLD_MENU_OPEN) || !source.includes(OLD_AUTO_LOGIN)) {
    // Preserve the original module rather than injecting a partial or broken patch.
    return { ok: false, text: source, reason: "upstream-changed" };
  }
  const text = source.replace(OLD_MENU_OPEN, NEW_MENU_OPEN).replace(OLD_AUTO_LOGIN, "");
  return { ok: true, text, reason: "patched" };
}

export function legacyDestination(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/gedeeld") return "shared";
  if (path === "/meldingen") return "messages";
  return null;
}

export default {
  async fetch(request, env) {
    if (!env?.V56_BASE?.fetch) {
      return new Response("Upstream V56 service is not configured.", { status: 503 });
    }

    const url = new URL(request.url);
    const view = (request.method === "GET" || request.method === "HEAD")
      ? legacyDestination(url.pathname)
      : null;

    if (view) {
      const target = new URL("/present", url);
      target.searchParams.set("talera_menu", view);
      const response = Response.redirect(target.toString(), 302);
      response.headers.set("cache-control", "no-store");
      response.headers.set("x-talera-integratie", V57_MARKER);
      return response;
    }

    // Keep request method, body, cookies and authorization context untouched.
    const upstream = await env.V56_BASE.fetch(request);

    if (url.pathname !== MENU_MODULE || request.method !== "GET" || !upstream.ok) {
      const headers = new Headers(upstream.headers);
      headers.set("x-talera-integratie", V57_MARKER);
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    }

    const original = await upstream.text();
    const updated = patchMenuScript(original);
    const headers = new Headers(upstream.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.set("cache-control", "no-store");
    headers.set("content-type", "text/javascript; charset=utf-8");
    headers.set("x-talera-integratie", updated.ok ? V57_MARKER : "v57-upstream-changed");
    return new Response(updated.text, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};

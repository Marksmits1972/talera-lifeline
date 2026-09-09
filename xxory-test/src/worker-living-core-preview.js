import baseWorker from "./worker.js";

// TALERA — isolated preview for the Living Core only.
// This wrapper deliberately leaves recording, storage, photo flow, metadata,
// sharing and API behaviour in worker.js untouched. It only injects visual
// overrides for the central core into HTML responses.
const LIVING_CORE_STYLE = String.raw`
.core-wrap{
  width:min(58vw,250px);
}

/* Keep the halo local to the core: present, but never a large fog over the screen. */
.halo{
  width:94%;
  height:94%;
  border-radius:49% 51% 47% 53% / 52% 48% 54% 46%;
  background:radial-gradient(
    circle,
    rgba(220,234,246,.46) 0%,
    rgba(91,143,185,.14) 48%,
    rgba(220,234,246,.05) 63%,
    transparent 74%
  );
  filter:blur(7px);
  opacity:.42;
  animation:taleraHaloHibernation 9.6s ease-in-out infinite;
}

/*
  The core itself no longer pulses like a call-to-action. Its resting life is
  expressed through tiny organic shape/light changes. Voice/wake scale remains
  driven by the existing --awake and --voice values from worker.js.
*/
.core,
.core.active{
  animation:taleraCoreHibernation 9.6s ease-in-out infinite;
  transform:scale(calc(1 + var(--awake)*.15 + var(--voice)*.032));
  transition:
    transform .34s cubic-bezier(.22,.72,.2,1),
    filter .7s ease,
    box-shadow 1.1s ease;
}

.core.listening{
  filter:saturate(1.035) brightness(1.015);
}

/* Subtle local integration when a photo is the memory anchor. */
.stage.has-photo .halo{
  width:96%;
  height:96%;
  background:radial-gradient(
    circle,
    rgba(247,244,239,.34) 0%,
    rgba(220,234,246,.16) 48%,
    rgba(91,143,185,.05) 64%,
    transparent 75%
  );
  filter:blur(6px);
  opacity:.48;
}

@keyframes taleraHaloHibernation{
  0%,100%{
    transform:scale(.985) rotate(-.3deg);
    opacity:.34;
  }
  48%{
    transform:scale(1.022) rotate(.35deg);
    opacity:.48;
  }
  58%{
    transform:scale(1.018) rotate(.2deg);
    opacity:.46;
  }
}

@keyframes taleraCoreHibernation{
  0%,100%{
    border-radius:47% 53% 50% 50% / 50% 44% 56% 50%;
    box-shadow:
      0 28px 70px rgba(15,39,71,.115),
      inset -16px -18px 34px rgba(15,39,71,.10),
      inset 14px 12px 34px rgba(255,255,255,.56);
  }
  48%{
    border-radius:49% 51% 47% 53% / 52% 47% 53% 48%;
    box-shadow:
      0 30px 74px rgba(15,39,71,.12),
      inset -14px -17px 32px rgba(15,39,71,.095),
      inset 15px 13px 36px rgba(255,255,255,.59);
  }
  58%{
    border-radius:48% 52% 48% 52% / 51% 46% 54% 49%;
  }
}

@media (prefers-reduced-motion:reduce){
  .halo,.core,.core.active{animation:none!important;transition:none!important}
}
`;

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get("content-type") || "";

    if (url.pathname.startsWith("/api/") || !contentType.includes("text/html")) {
      return response;
    }

    const html = await response.text();
    const marker = "</head>";
    if (!html.includes(marker)) return response;

    const injected = html.replace(
      marker,
      `<style id="talera-living-core-only-preview">${LIVING_CORE_STYLE}</style></head>`
    );

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("cache-control", "no-store");

    return new Response(request.method === "HEAD" ? null : injected, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

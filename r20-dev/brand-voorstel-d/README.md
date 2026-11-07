# TALERA Voorstel D — inhoudelijke stijl, boven- en onderbalk vergrendeld

Basis: door gebruiker als huidige voorkeurslink geregistreerde Worker `talera-closed-memory-core-test-20261106`, met laatste iPhone-videocorrectie op GitHub commit `cafff6b0cf0ec7dc2294dc9b68d88578caed409e`.

Deze branch is ISOLATIE en geen productiepublicatie. De bestanden `style-worker-blue-content.mjs` en `closed-core-unmodified.worker.mjs` vormen de Cloudflare-stagingbronnen. De gesloten core Worker is 1-op-1 gekopieerd zonder codewijziging. `BRAND_CSS` is de enige gewijzigde bronconstante van de oude stijl-Worker; overige functions, routes, bindings en presentatiecode zijn ongewijzigd.

**Absoluut beschermd:** alle PWA-bovenbalken en onderbalken, inclusief iOS-safe-area/statusbalk, transparante header voor foto-doorloop, zwart of wit presentatiefotovoetstuk, de opengeklapte leestekst, actiebar en homescherm-/navigatiebalken. Ook logo IN deze balken blijft gelijk. /present wordt niet door content-style gepatcht; nooit een losse player. Geen wijziging aan recording, media-id tijdcodes, opslag, Free/Premium, routes of databases.

Officieel palet: navy #071A3D, mid #23497E, soft #5579A9, white #FFFFFF, ivory #F7F5F0, lime #B8D943 (max 1%). Nieuwe kleuren uitsluitend op gerichte contentselectors. De oude shared legacy CSS mapping en metadatakleuren worden NIET aangepast zodat de beschermde balken op de eerste stagingversie identiek blijven. Verdere visuele harmonisatie pas na test.

Status: afzonderlijke Cloudflare-staging gebouwd en via Browser Rendering gecontroleerd op 7 november 2026. GEEN iPhone-acceptatie en GEEN productiepromotie.

## Teststaging — 7 november 2026

- Staging-PWA: https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven
- Immutable functional copy: talera-closed-memory-diepblauw-test-20261107, deployment 05684118-e3ca-45ca-be14-80c3d6ce47a1.
- Cloned style Worker: talera-style-diepblauw-20261107. Only BRAND_CSS updated, original branding bar rules and all Worker functions left intact.
- Binding layout: staged closed-core -> staged style -> existing V9 functional base. The original preferred Worker and the original shared style Worker were NOT changed.
- Browser Rendering mobile 390x844 verified /present HTML is byte-equivalent after only hostname normalization, and /tell HTML is byte-equivalent after only changing hostname and the style block. The home screenshot visually retains mast and bottom navigation, while content headers, time-card and CTA use deep navy.
- PWA metadata statusbar and all existing /present CSS/JS remain unchanged. Runtime screenshot in headless Chromium does not prove installed iPhone Safari. User acceptance still required.
- Origin isolation: a different workers.dev hostname has a different local IndexedDB/localStorage, so private local memories from the current preferred app are NOT automatically copied or available in staging. Backend service bindings further down the existing chain may still share remote storage; do not perform destructive tests on real data.
- Original TALERA preferred PWA remains https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven . Do NOT replace it in the central link register until user explicitly approves the candidate.
- Remaining: account/More/Settings visual checks on iPhone, logo assets only outside bars, full regressive flow checks, user review; no production publication.

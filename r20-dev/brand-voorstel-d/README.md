# TALERA Voorstel D — inhoudelijke stijl, boven- en onderbalk vergrendeld

Basis: door gebruiker als huidige voorkeurslink geregistreerde Worker `talera-closed-memory-core-test-20261106`, met laatste iPhone-videocorrectie op GitHub commit `cafff6b0cf0ec7dc2294dc9b68d88578caed409e`.

Deze branch is ISOLATIE en geen productiepublicatie. De bestanden `style-worker-blue-content.mjs` en `closed-core-unmodified.worker.mjs` vormen de Cloudflare-stagingbronnen. De gesloten core Worker is 1-op-1 gekopieerd zonder codewijziging. `BRAND_CSS` is de enige gewijzigde bronconstante van de oude stijl-Worker; overige functions, routes, bindings en presentatiecode zijn ongewijzigd.

**Absoluut beschermd:** alle PWA-bovenbalken en onderbalken, inclusief iOS-safe-area/statusbalk, transparante header voor foto-doorloop, zwart of wit presentatiefotovoetstuk, de opengeklapte leestekst, actiebar en homescherm-/navigatiebalken. Ook logo IN deze balken blijft gelijk. /present wordt niet door content-style gepatcht; nooit een losse player. Geen wijziging aan recording, media-id tijdcodes, opslag, Free/Premium, routes of databases.

Officieel palet: navy #071A3D, mid #23497E, soft #5579A9, white #FFFFFF, ivory #F7F5F0, lime #B8D943 (max 1%). Nieuwe kleuren uitsluitend op gerichte contentselectors. De oude shared legacy CSS mapping en metadatakleuren worden NIET aangepast zodat de beschermde balken op de eerste stagingversie identiek blijven. Verdere visuele harmonisatie pas na test.

Status: technische bron opgeslagen, staging moet nog gebouwd/getest. Geen iPhone-acceptatieclaim.

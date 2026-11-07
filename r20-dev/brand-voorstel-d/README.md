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

## Ronde 2: Mijn TALERA en subpagina's, 7 november 2026

- Staging STYLE worker update: `talera-style-diepblauw-20261107`; GitHub style commit `0d9aad3e415d926fcfb65a9ea90f983a779c88bd`.
- Alleen `#talera-more-menu .body ...`-selectors (25 regels) toegevoegd voor accountkaart, instellingen, menuopties, koppen, velden, knoppen en details. De CSS wordt als één style block in de bestaande `/present`-response toegevoegd. GEEN wijzigingen aan presentatie-HTML of JS, buiten deze expliciete CSS-injectie.
- Beschermd: presentatie-overlaybalken, foto-/video-achtergrond, `.mast`, `.flow-nav`, `#talera-more-menu header` en `.headbutton`, alle iOS-safe areas en overige boven- en onderbalken.
- Automatische Browser Rendering screenshots gecontroleerd: Mijn TALERA (hub), Instellingen, Mijn account. Bestaande kopbalk van de menu-overlay ongewijzigd.
- HTML regressie: `/present`, `/present?talera_menu=hub`, `/tell` byte-identiek na normalisatie van hostnaam en toegevoegde stijlblokken. Functionele closed-core ongewijzigd.
- Computed-style guard: mobiel viewport 390x844: `.mast`, `.flow-nav`, `#talera-more-menu header`, `.headbutton`, `.panel`, `#talera-v15-appbar`, `#talera-v12-reactions-bar` geven dezelfde berekende layout/kleuren terug als de goedgekeurde voorkeurs-PWA; alleen doelbewust aangepaste inhoudsteksten verschillen.
- Veiligheidscontract: de volledige originele stijl-Worker is uit de nieuwe terug te reconstrueren door alleen de extra centrale CSS-, menu-CSS-constanten en de ene injectieregel ongedaan te maken. Alle oorspronkelijke Workerfuncties behouden.
- Open: echte iPhone-acceptatie, volledige video- en opname-/upload-regressie en aanvullende visuele controle. GEEN productiepromotie of wijziging van huidige voorkeurs-URL.

## Ronde 3: origineel TALERA-logo in voorstel D, 7 november 2026

- Officieel kleurenpaar voor de bestaande drie logopanelen: `#071A3D`, `#23497E`, `#5579A9` (RGB 7/26/61, 35/73/126, 85/121/169).
- Originele PWA PNG-asset wordt via de reeds bestaande `recolorPng()` functie gebruikt; **geen nieuwe geometrie of weg**. Alleen de drie `picks` vervangen.
- Unieke versiegebonden logo-URL's `/talera-brand-voorstel-d-icon-{180,192,512}.png` op dezelfde afzonderlijke staging Worker; dit vermijdt oude browsercache. Bestaande CSS-logo achtergrondafbeelding gebruikt nu 180px variant zonder positie, afmetingen of zichtbaarheid te veranderen.
- Op /mijn-leven en /tell alleen bestaande HTML-icoon- en Apple-touch-icon-hrefs naar de nieuwe asset URL's aangepast. Bestaande meta statusbar `black-translucent` onaangeroerd. PWA-manifest icon URLs zijn nu ook versioned. /present markup en afspeelfuncties blijven zoals eerder; bestaande originele assetaliases worden technisch ook met de nieuw gekozen RGB's gekleurd binnen staging.
- GitHub commit `5f36668c82a60da6c634eca9e00ae47e725fa674` (voorgaande `2feae0b6590958d5b55e324382a1b139fef11d7b`). Alleen geïsoleerde branch.
- Cloudflare staging-update: `talera-style-diepblauw-20261107` om 8:02 UTC; huidige voorkeurs-PWA en originele shared style Worker niet gewijzigd.
- Browser Rendering heeft 512px logo en PWA-home visueel geladen. Computed-style vergelijkingen met de oude basis op 390x844: .mast, .flow-nav, .sheet-handle, alle vaste presentatie/menu bars dezelfde achtergrond, positie en afmetingen. Verschillen uitsluitend bedoelde hoofdinhoudskleur en de nieuwe logoafbeeldings-URL. Presentatie/menu bar vergelijken met originele versie: geen verschillen.
- Functionele opname/video-upload/volledig iPhone-PWA gedrag nog niet opnieuw getest; de kandidaat mag NIET de officiële voorkeurs-URL vervangen zonder gebruikersakkoord. iOS geïnstalleerde icoon kan door het systeem gecachet zijn; niet aanraden de oude app te verwijderen of opnieuw te installeren vanwege lokale opslag.

# TALERA PWA — zelfstandige Vertelmodus geïntegreerd

**Status: CANDIDATE — nog geen goedgekeurde PWA-versie.** Bouwdatum: 27 oktober 2026.

## Directe kandidaten

- PWA / vertellen: https://talera-pwa-vertelmodus-zero-integrated-test.mark-a39.workers.dev/tell
- PWA / presentatie: https://talera-pwa-vertelmodus-zero-integrated-test.mark-a39.workers.dev/present
- Controle: https://talera-pwa-vertelmodus-zero-integrated-test.mark-a39.workers.dev/vertelmodus-health
- Cloudflare Worker: `talera-pwa-vertelmodus-zero-integrated-test`
- Deployment: `5be1127d-b0cb-494c-8f4a-b1fe2801ae03`
- Version: `bcf5b74b-2e9a-4929-8712-f38a1ec9f50a`
- Deployment gemaakt: 2026-10-27 16:23:36 UTC
- Onaangetaste Cloudflare-bronbasis: `talera-pwa-story-player-v38-test` met deployment `d17e1dc4-c60d-4429-bdf0-7d225043e9a8`.
- Onaangetaste functioneel door eigenaar goedgekeurde zelfstandige Vertelmodus: `talera-vertelmodus-zero-20261027`, deployment `2d7fbcfd-652a-4374-ac78-fb476696b1b0`.

## Integratiearchitectuur

De originele zelfstandige bron uit `standalone/vertelmodus-zero-20261027/index.html` is de technische motor. Voor PWA-gebruik draait hij op `/vertelmodus-embed`. De `embed-bridge.js` ontvangt de bestaande mediabestanden uit de geopende herinnering en stuurt een complete opname terug, met `narrationCues` en `voiceDurationMs`. De speler houdt dezelfde media-index en volgorde aan als TALERA. De PWA-`tell-adapter.js` bewaart de audio als één bestand in het bestaande IndexedDB-concept en schrijft het bestaande manifest; de vorige opname wordt pas na succesvolle opslag opgeruimd.

De nieuwe `presentation-adapter.js` registreert lokale herinneringen binnen RH19, maar gebruikt bij herinneringen met stem plus opgenomen wisselmomenten uitsluitend de zelfstandige speler voor terugkijken. Hij gebruikt niet de oude Story Player-timers of de eerdere V38-video-voorlader. Bij gewone herinneringen zonder stem blijft RH19 voor de tijdlijn en de weergave actief; een video zonder stem wordt rechtstreeks als HTML5-video getoond. De rest van de PWA blijft intact.

**Verwijderd uit de actieve kandidaatcode:** de `taleraStoryApp` V34/V37/V38-wrapper; `followRecordedImages`, oude `setupRecording`, oude `stopMic`, opname-aangestuurde `stepPhoto`; de volledige oude `LOCAL_RH19_ADAPTER` met `playbackAtTime`, V38-story-video-loader en audio-fotocontroller. `safeCues` in de bestaande memory-store slaat ook optionele `videoAtMs` op, zodat vroegtijdig doorgaan in een video bewaard blijft.

## Browsercontroles

- HTTP 200 voor `/`, `/tell`, `/present`, `/vertelmodus-embed`, `/vertelmodus-health`.
- In het TALERA-vertelscherm opent de nieuwe speler daadwerkelijk in een iframe.
- Opnamesimulatie: TALERA-concept bevat na opname een `voice`-id, `voiceCues` en duur.
- Met twee testfoto's en een gesimuleerde stemopname: cues `{t:0,index:0}`, `{t:700,index:1}`, `{t:1400,index:0}`, duur circa 1999 ms. Deze zijn in hetzelfde TALERA-concept teruggelezen.
- Route opname → Klaar → jaartal kiezen → plaatsen gaat naar `/present`; de zelfstandige presentatie-iframe verschijnt.
- Bestaande lokale herinneringenopslag `TaleraMemories.save/get`: foto, video, stem én `videoAtMs:2250` zijn correct herladen.
- Dit zijn browserautomatiseringen, geen echte iPhone/Safari-microfoon- of decoderproeven. Alle audio in de tests was synthetisch.

## Acceptatie nog open

De eigenaar moet op een echte iPhone met eigen foto's/video's een kort verhaal inspreken, een video halverwege overslaan, terugluisteren en de herinnering publiceren en opnieuw op de tijdlijn openen. Ook datum, heropenen, toestelopslag en overige PWA-functies moeten worden beoordeeld. Zonder expliciet akkoord is dit **niet** CURRENT.

**Originwaarschuwing:** de aparte kandidaten-URL heeft eigen lokale IndexedDB. Persoonlijke herinneringen van een andere workers.dev-URL worden niet automatisch overgenomen. Verwijder nooit originele worker/data om deze test te doen.

## Codebeheer

Alle zes onderdelen voor de integratie zijn in deze map apart opgeslagen. De huidige Cloudflare Worker bevat daarnaast de bestaande TALERA-PWA-bundel van V38. De bundel is in geïsoleerde stappen aangepast en gedeployd. Een vanuit deze GitHub-map volledig reproduceerbare CI-build ontbreekt nog; claim daarom niet dat alleen de zes bronbestanden al een complete compileerbare PWA zijn. Release-record en eerdere versiehistorie staan in de centrale TALERA Project Master.


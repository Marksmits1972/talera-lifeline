# TALERA V12 — bestaande geïntegreerde speler: video + restmedia in volgorde

**Status 5 november 2026:** geïsoleerde GitHub-kandidaat; regressietests groen. Niet gepubliceerd als deze nieuwe kandidaat en **niet** op iPhone goedgekeurd. Beschermde V9, stijl, Free/Premium en gebruikersdata zijn niet gewijzigd.

## Vastgelegde functionele volgorde

- De bestaande V9 stemopname en de tijdstempels blijven de enige vertellende klok. Tijdens de stem worden bijbehorende video's gedempt.
- Op het echte einde van de stem wordt de **oorspronkelijke V9-videospeler** gebruikt om video's die tijdens de vertelling al in beeld waren volledig met eigen geluid te herhalen.
- De nog niet tijdens de vertelling gebruikte media volgen daarna **in de oorspronkelijke opgeslagen volgorde**, inclusief afwisseling foto–video–foto. Foto = 4 seconden; video = eigen volledige duur, met geluid.
- Al vertelde media worden niet opnieuw als restant toegevoegd. Alle koppelingen blijven op de bestaande `mediaId` en `s.frames` gebaseerd, zonder aparte speler, nieuw datamodel of extra klok.
- De bestaande V9 voice-ended eventhandler is ongewijzigd.

## Wijziging, exact afgebakend

Alleen de HTML van `GET /present` wordt op runtime getoetst aan unieke ankerfragmenten. Bij een mismatch wordt niets gepatcht (`anchor-unmatched`); er wordt niet blind een nieuwe speler geïnjecteerd.

1. Eén helper `taleraInlineRemainingPhotos(s)` voor de vervolgqueue in de bestaande geïntegreerde presentatiemodus. Deze gebruikt de bestaande `taleraInlineSetFrame`, `taleraInlinePlayMedia`, `taleraInlineCleanVideo` en `ordinaryTimer`.
2. De oude videoronde selecteert alleen tijdens de opname **besproken video's**, zodat latere video's op hun oorspronkelijke positie in de resterende media verschijnen.
3. Beide oorspronkelijke voltooiingspaden (laatste vertelde video en geen vertelde video's) gaan naar dezelfde vervolgqueue.

Niet gewijzigd: de recorder, de audio-`ended` callback, fototijdstempels, media-IDs, lokale opslag, geüploade bestanden, CSS, V9, Cloudflare-productie en de aparte Free/Premium-ontwikkeling.

## GitHub-controle

- Branch: `fix/talera-v12-restfotos-na-videos-20261105`
- Laatste groene workflow: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42072245671
- Unit/regressietests dekken gesproken video met geluid, ongebruikte foto's, foto's en video's door elkaar in hun originele volgorde, geen dubbelen, verlaten van herinnering en ongewijzigde V9-bron buiten de drie gerichte hooks.
- De workflow is **alleen een test**, bevat geen Cloudflare-publicatie en claimt geen werkende iPhone-weergave.

## Nog verplicht vóór acceptatie

1. Publiceer de GitHub-kandidaat eerst op een **eigen geïsoleerde test-Worker** met de bestaande beschermde V9 als service-binding; nooit overschrijven naar V9, het huidige testadres of productie.
2. Controleer de live gerenderde `/present` byte-voor-byte tegen V9 op exact de helper en drie bedoelde wijzigingen; controleer dat de header `x-talera-v12-inline-restfotos` `installed` is.
3. Voer echte browser-end-to-end-tests met opgeslagen testmedia en een echte audio-`ended` uit, inclusief photo–video–photo, geen extra venster en native videogeluid.
4. Test op iPhone Safari met eigen nieuw aangemaakte testherinnering op het nieuwe testadres, zonder de bestaande PWA te verwijderen. Lokale browseropslag deelt niet automatisch tussen afzonderlijke Worker-hosts.

**Rollback:** uitsluitend het nieuwe, nog te maken testadres niet gebruiken; de bestaande V9- en andere test-Workers blijven ongemoeid.

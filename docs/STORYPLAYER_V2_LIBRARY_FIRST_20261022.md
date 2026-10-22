# TALERA Story Player V2 – library-first rebuild (22 oktober 2026)

## Architectuur (leidend)
1. De TALERA-bibliotheek is eigenaar van de originele foto-, video- en geluidsbestanden. Een import schrijft een origineel één keer weg, met een stabiele media-ID.
2. De Story Player bewaart alleen `mediaIds`, `audioId` en `cues: [{atMs, mediaId}]`. Op de tijdlijn zetten schrijft geen grote mediabestanden opnieuw weg.
3. De afspeelpositie van de stem is de klok voor de fotowisselingen. Pauzes tellen niet mee.
4. De bestaande PWA-presentatie (`#photoStage`, huidige fotolagen en fotopuntjes) is het enige beeldvlak. Geen tweede scherm of aparte afspeel-app.
5. Een oranje puntje mag pas activeren nadat de gekoppelde foto werkelijk geladen is. Een ontbrekende foto blijft een expliciete fout, niet een vervangende foto.
6. Gratis lokale opslag wordt gebouwd met OPFS voor de originelen en IndexedDB voor metadata. Premium/cloud wordt een tweede implementatie van **hetzelfde bibliotheekcontract**; is nog niet aangesloten.

## Nieuw prototype buiten productie
De nieuwe modulaire implementatie en 12 tests zijn als downloadbaar broncodepakket in de TALERA-ontwikkelchat gegenereerd: `talera_storyplayer_v2_library_first.zip`. Bevat `story-model.js`, `local-library.js`, `capture.js`, `player.js`, `presentation.js`, `pwa-bridge.js`, `index.js`, `README.md` en 4 testbestanden.

Deze feature branch is de veilige werkruimte voor herbouw, geen gepubliceerde of reeds geïntegreerde PWA. V32 t/m V40 en de huidige Cloudflare-app worden hierdoor niet aangepast.

## Afgeronde testresultaten
- 13 lokale Node-tests geslaagd.
- Foto-ID's blijven constant en verhuizen niet bij inspreken of afspelen.
- Onderbroken opname verschuift de fototijden niet.
- Ontbrekende mediabestanden blokkeren verhaalpublicatie.
- Eén geluidsopname importeert alleen het nieuwe audiobestand, nooit de foto's opnieuw.
- Snelle seek en ontbrekende foto tonen geen fictief actieve fotostand.
- Afspelen wordt gepauzeerd bij het verlaten van de pagina.
- Bibliotheekrecords bevatten uitsluitend metadata; originele bestandsbytes gaan in OPFS.

## Nog te realiseren voordat iPhone-testlink geschikt is
- De bestaande V32–V40-PWA is momenteel een samengestelde Cloudflare Worker. Er is nog geen geteste integratie en veilige migratie naar het nieuwe OPFS-bibliotheekformaat.
- Werkende Free-import met echte grote HEIC/JPEG/MOV-bestanden testen in Safari; anders geen opslagbevestiging.
- Cloud/Premium-provider en accounts/toegangsrechten bouwen.
- Legacy lokale opslag `TaleraMemories` en `talera-v4-work` veilig inventariseren en migreren zonder bestanden te verwijderen.
- De oude Story Player-controller uitschakelen en de nieuwe `pwa-bridge.js` als enige eigenaar van `#photoStage` en audio activeren.
- Nieuwe test-Worker eerst op alle routes testen vóór delen van een iPhone-link.

## Releasebeleid
Nieuwe Story Player alléén promoten bij bewezen bestand-opslag, heropenen, stem/foto synchronisatie, één presentatie en geen achterblijvende audio. Oude versies zijn terugvalbasis tot acceptatie.


## Geïntegreerde PWA-preview
- **GitHub wijziging**: https://github.com/Marksmits1972/talera-lifeline/pull/46 (draft; nog niet samengevoegd)
- **Cloudflare-preview, niet productie**: https://storyplayer-library-first-20261022-talera-timeline-prototype.mark-a39.workers.dev/
- Deze preview is daadwerkelijk geopend met Cloudflare Browser Rendering. De oude Vertellen-controller is in `src/index.js` vervangen door `integratedStoryPlayerScript`.
- Alle media komen één keer in OPFS; een verhaalrecord bevat uitsluitend media-ID's, audio-ID en fototijden. De bestaande `#photoStage`, `.talera-memory-audio` en oranje fotopuntjes worden hergebruikt.
- De vaste levenslijn-einddatum `6 september 2026` is vervangen door `Date.now()`. Daardoor kan een herinnering van vandaag op de tijdlijn worden geselecteerd.
- De automatische oude fotocarrousel wordt voor nieuwe V2-herinneringen niet meer geactiveerd.

## Browserintegratietest – bevestigd
In een verse browseromgeving:
1. Bestaande Vertellen-knop opent een paneel *in dezelfde PWA*.
2. Drie nieuwe PNG-testfoto's worden geïmporteerd in de OPFS-bibliotheek.
3. Eén herinnering wordt opgeslagen, zichtbaar op de tijdlijn onder zijn eigen ID.
4. Een WAV-testopname wordt **één keer** geïmporteerd. De bibliotheek bevat exact vier media-items en één verhaalrecord.
5. De opname bevat fotowisselingen op 0, 1.000 en 2.200 ms.
6. Bij afspelen en seek tonen de bestaande fotolagen en puntjes aantoonbaar index 0, index 1 en index 2; het beeld is geladen.
7. De bestaande `/`-route opent zonder Cloudflare-fout 1101.

De volledige GitHub-regressie bevat vijf nieuwe integratietests die slagen. Twee **andere, reeds bestaande** tests falen wegens ontbrekende bestanden `xxory-test/src/tv-player.js` en `xxory-test/src/unified-webapp.js`. Dit blokkeert de volledige CI-status totdat apart hersteld; niet maskeren of verwijderen.

**Nog niet bewezen op een echte iPhone**: zes grote HEIC/JPEG/MOV-originelen, echte microfoonopname, Safari OPFS-heropenen, achtergrondstop en migratie van eerder lokaal opgeslagen concepten. Deze resterende punten bepalen of de preview voor algemene uitrol geschikt is.

## Vaste iPhone-acceptatieversie
Op 22 oktober 2026 is de aparte preview van de geïntegreerde PWA installatieklaar gemaakt:
- https://storyplayer-library-first-20261022-talera-timeline-prototype.mark-a39.workers.dev/
- `/manifest.webmanifest` met `display: standalone`, beginpad `/` en scope `/`.
- `/talera-icon.svg`, plus iOS `apple-mobile-web-app-capable`-metadata.
- Browser Rendering: startpagina, manifest en icoon bereikbaar; nieuwe Story Player aanwezig en geen fout 1101.
- De preview blijft een afzonderlijke acceptatieversie in de branch; productie/main worden niet vervangen.
- Voeg toe via **Safari → Delen → Zet op beginscherm**. Test lokale opslag uitsluitend in de daaruit gestarte app. De vorige workers.dev-domeinen delen hun lokale bestanden niet automatisch.
- De CI-status is niet geheel groen: twee oudere, niet op deze Story Player gerichte tests missen bestanden `xxory-test/src/tv-player.js` en `xxory-test/src/unified-webapp.js`. De nieuwe integratietests slagen.
- Pas na positieve iPhone-tests kan deze versie als definitieve standaard-PWA worden gepromoveerd.

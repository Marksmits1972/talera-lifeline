# TALERA PWA V7 — Schrijven, verwijderen en vertellen zonder beelden

**28 oktober 2026 — afzonderlijke testkandidaat. Niet door eigenaar goedgekeurd.**

## Behouden basis en rollback
- V6 Worker: talera-pwa-datum-tijdlijn-v6-test, deployment 377c1a84-2e4f-4de8-892b-f1fc2801b8b2, Cloudflare version 347ceb42-b625-4329-8083-9556bfb7c7a9. Na de V7-bouw gecontroleerd: **ongewijzigd**.
- V7 Worker: talera-pwa-eenvoud-v7-test, deployment **df1b850a-4d87-4a56-b456-cb5e831d3919**, Cloudflare version **2f592fbd-7431-4d03-9e95-2697a3b1ee4e**.
- Testadres: https://talera-pwa-eenvoud-v7-test.mark-a39.workers.dev/tell
- Tijdlijn: https://talera-pwa-eenvoud-v7-test.mark-a39.workers.dev/mijn-leven
- GitHub branch: feature/v7-writer-delete-voice-20261028, van V6-branche afgetakt.
- Er is geen CURRENT- of productiepromotie. V5 en eerdere versies blijven eveneens beschikbaar.

## Afspraken en technische werking
### Schrijven
- Vanuit de bestaande bewerkpagina opent het Schrijven altijd een eigen schermvullende dialoog, los van de levenscyclus van de oude knopbinding. Een documentbrede capture-fallback zorgt dat de schrijfknop ook werkt als de bestaande bewerkpagina een andere onclick installeert.
- De pop-up toont tot zes oorspronkelijke foto's/video's boven het bestaande verhaal, zonder tweede mediabibliotheek of opslagpad. Foto's staan in dezelfde mediavolgorde; video's met kleine afspeelmarkering.
- De originele, bestaande `#story` blijft de bron van het opgeslagen concept. Wijzigingen synchroniseren via het bestaande input-event en `saveDraft`, geen losse teksttabel.
- De bestaande V4 `taleraV4WriterMotion` verzorgt de gecombineerde scrollcontainer, groeiend textarea en visualViewport-toetsenbord-afmetingen. `Klaar` bewaart en sluit, waarna dezelfde bewerkpagina blijft staan. Ook Escape kan sluiten.
- Geen extra datum, titel of publiceren in de schrijfdialoog.

### Verwijderen van concepten
- Elke kaart op 'Jouw herinneringen' heeft rechtsboven een subtiel × met een bevestigingsdialoog en Annuleren/Verwijderen. Oude lege concepten worden ook na een herstart geladen zodat de eigenaar ze kan verwijderen: `readDraft` filtert niet meer op aanwezige media/tekst.
- Definitieve verwijdering verwijdert alleen de gekozen groep uit de bestaande conceptmanifest. Daarna kunnen originele media en hun preview-caches alleen worden opgeruimd wanneer geen andere conceptgroep naar de IDs verwijst. De manifest-commit vindt plaats vóór opruimen. Als de manifest-opslag faalt, blijft de groep bestaan.
- Als een gepubliceerde herinnering nog als bewerkconcept geopend is, meldt de dialoog expliciet dat deze actie alleen dat bewerkconcept verwijdert; gepubliceerde herinnering blijft staan.

### Verwijderen van gepubliceerde herinneringen
- Onder 'Mijn herinneringen' in Mijn leven staat rechtsboven op eigen lokale herinneringskaarten één ×. Voorkomt kruisjes op voorbeeldkaarten en zoekresultaten. Geen gekruiste button-in-anchor structuur: er is een aparte wrapper rond de kaart.
- Bevestiging met Annuleren/Verwijderen. De bestaande `TaleraMemories` IndexedDB-store krijgt `remove(id)`, beperkt tot `source: pwa-local` en `local-...` IDs. De story en uitsluitend niet door andere stories gebruikte file-keys (met optionele telefoonkopieën) worden in één transactie verwijderd. Ook de overige herinneringskaarten blijven behouden.
- Andere Cloudflare-herinneringen en voorbeeldstories zijn niet verwijderbaar via deze *lokale* knop.

### Vertellen zonder foto's
- Achtergrond wordt gelijk aan het neutrale TALERA-licht: #f8f9f7, ook zonder beelden. De melding 'Geen beelden' wordt visueel verborgen.
- Bij de stemopname verschijnt een rustige minimalistische lijn op canvas, met Web Audio `AnalyserNode` die de werkelijke microfoonstream alleen uitleest. De analyser is niet op luidspreker of MediaRecorder aangesloten; opnamebestanden en geregistreerde cue-timestamps blijven onveranderd.
- Opnemen: reagerende lijn. Pauze: rustiger lijn. Stop: opnamevisualisatie beëindigd en bron vrijgegeven. iOS AudioContext `resume()` geprobeerd na toestemming.
- Zonder beelden is maar één primaire actie te zien vóór het opnemen; opnameknoppen blijven contextueel volgens V5. Met beelden blijven grote foto's/video's ongewijzigd.

### Bestaande systemen intact
- Datum van aanmaken standaard vandaag, handmatige verleden-datum, maximaal zes sleepbare beelden, stemopname+timecodes, terugkijken vanaf eerste opnamecue, muting tijdens narratie, originele videoronde met geluid, publicatie met opgeslagen record-verificatie, correcte appicon.
- V7 is een gerichte overlay/source-patch van de **werkende V6 multipart Cloudflare Worker**. De historisch volledige PWA is nog niet reproduceerbaar vanuit alleen deze GitHub-branche; de bronfragmenten in deze map documenteren de delta.

## Geautomatiseerde mobiele Chromium-browserproeven (390 × 844)
- Zeven hoofd- en presentatieroutes laden zonder Worker-fout.
- Schrijfmodus vanuit leeg concept: opent/sluit, sync van originele `#story` en heropent met bewaarde tekst.
- Zes geïmporteerde synthetische foto's: zes werkbladtegels en zes schrijfbeelden; 55 regels tekst laten scrollTop 2404 ontstaan en re-open toont alle 55 regels.
- Leeg concept: één verwijder-×. Annuleren laat het bestaan; Verwijderen haalt de gekozen groep weg en keert naar start.
- Gepubliceerde herinnering: **één** kruisje op eigen kaart. Cancel houdt de memory intact. Bevestigen verwijdert precies de gekozen memory.
- IndexedDB-test met twee gepubliceerde memories en identieke maar apart geüploade afbeelding: na verwijderen van de eerste zijn zijn file-key en memory weg, tweede memory en eigen file intact.
- Zonder media: in vertel-iframe gelijke neutrale achtergrond, gecentreerde waveform-canvas, geen zichtbare 'Geen beelden'-teller, vóór opnemen alleen primaire opnameknop.
- Opslaan met echt geïmporteerde SVG-foto en tekst vanuit V7 schrijven: nieuwe kaart en bevestiging staan op Mijn leven.
- Synthetische stem-einde-regressietest: video-foto-video geeft oorspronkelijke ongemute video's index 0 en 2 na elkaar.
- Bovenstaande **zijn geen echte iPhone-opnamen of HEVC-videogeluidsproeven.**

## Open voor test op echte iPhone
1. Start V7 vanaf de link, open Schrijven vanaf een fotoherinnering en vanuit een herinnering zonder foto's, schrijf lang met Safari/standalone toetsenbord, sluit en open opnieuw.
2. Test openen vanuit de PWA na wisselen tussen Vertellen/Klaar/Schrijven. Let op toetsenbord dat open blijft.
3. Spreek zonder beelden, controleer of de lijn echt meebeweegt met het stemvolume, pauzeert en stopt, en of de opgenomen stem terug te horen is.
4. Test in 'Jouw herinneringen' lege en gevulde concepten verwijderen, eerst Annuleren, dan Verwijderen, heropen app.
5. Publiceer één proefherinnering, verwijder deze vanuit 'Mijn herinneringen' met bevestiging, controleer dat andere verhalen blijven.
6. Stem/foto-synchronisatie, videovoorvertoning, videoronde met origineel geluid, iPhone-beeldverhoudingen en het juiste logo blijven regressiepunten.

## Opslag-/rollbackwaarschuwing
Iedere andere workers.dev-origin heeft een eigen IndexedDB en bewaart eigen concepten/herinneringen. V6-concepten komen niet automatisch in V7. Gebruik proefmateriaal en wis V6 niet. V7 wordt pas een goedgekeurde basis na expliciete eigenaaracceptatie.

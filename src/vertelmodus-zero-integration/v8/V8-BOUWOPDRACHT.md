# TALERA — V8 BOUWOPDRACHT: OPSLAAN → TIJDLIJN → PRESENTATIE

**Datum:** 28 oktober 2026. **Status:** uit te voeren; GEEN BUILD, GEEN DEPLOY, GEEN IPHONE-ACCEPTATIE. V7 blijft onaangetast totdat V8 zorgvuldig is gebouwd en op echte iPhone is getest.

## Gecontroleerd uitgangspunt

V7 geïntegreerde PWA: `https://talera-pwa-eenvoud-v7-test.mark-a39.workers.dev/`.
Cloudflare Worker `talera-pwa-eenvoud-v7-test`, deployment `df1b850a-4d87-4a56-b456-cb5e831d3919`, version `2f592fbd-7431-4d03-9e95-2697a3b1ee4e`.
GitHub beginbranch `feature/v7-writer-delete-voice-20261028`. Behoud de vorige V7/V6/V5-bundels, lokale IndexedDB en recovery-keten. Een nieuwe workers.dev-origin gebruikt andere IndexedDB: niet concluderen dat data verloren is als op een nieuw testadres geen oude herinneringen verschijnen.

## Kritieke hoofdopdracht: functionaliteit herstellen voor visueel ontwerpen

### 1. E2E opslag en integriteit
- Na Vertellen/Klaar of Schrijven/Klaar is de bewerkpagina leidend; alleen `Op mijn tijdlijn plaatsen` publiceert.
- Op één herinnering op hetzelfde origin moeten titel, gekozen datum, geschreven tekst, geordende maximaal zes mediaitems, originele foto-/videobestanden, stemopname, audioformaat, cue-indices/timestamps en vertelduur samen bewaard worden.
- Verifieer niet alleen dat `mem.get(id)` bestaat maar ook ALLE media-Blob keys, bestandstypen, werkelijke leesbaarheid/decodering, volledige stem-cues en de juiste media-index. Geen stille verwijdering/maskering bij ontbrekend Blob; toon een veilige expliciete herstelmelding.
- Cleanup van tijdelijke bronbestanden pas na controle van alle definitief geschreven media; niet gebruikte bestanden of relevante concepten niet wissen.

### 2. Presentatiemodus bereikbaar en juiste herinnering in beeld
- Open direct vanaf `Mijn leven`, vanaf de succeslink `Bekijk herinnering`, en na nieuwe appstart/reopen de juiste geheugen-ID via `/present?memory=<id>`.
- RH19 blijft de bestaande tijdlijn/presentatie bedienen. De zero-based Vertelmodus-player blijft alleen eigenaar van stem en automatische mediacues. Geen duplicatie van presentatiesystemen, geen oude Story Player herintroduceren.
- Herinnering moet zichtbaar worden in het juiste jaar/de juiste datumpositie, ook 1 januari, met complete titel/foto/video/tekst. Geen overgang naar lege weergave, demo-verhaal of andere datum.
- Controleer lifecycle/ready-event van iframe, laden blob, tijdlijnregistratie, bij terugschakelen/heropenen; debuggable logging zonder privacy/data-telemetrie.
- Controleer kritieke foutgevallen: lege cues bij gesproken herinnering zonder beelden; in huidige adapter gebeurt het openen van de narrator alleen bij `hasVoice && hasCues`. Gebruik robuuste audio-only fallback. In huidige `present()` worden ontbrekende blobs gefilterd; voorkom stil verlies. Dit zijn code-risico's, nog GEEN bewezen rootcause van de gebruikersfout.

### 3. Afspelen met stem en gesynchroniseerde media
- Iedere `Terugkijken/Afspelen` start op stempositie 0 en op het **eerste geregistreerde beeld** (eerste cue), ook wanneer de gebruiker laatst op een ander beeld stond.
- Stemklok is leidend; wisselmomenten uit opname staan bij dezelfde herinnering; automatisch volgen zonder haperende of ontbrekende foto. Bij pauze, hervatten en heropenen geen dubbele bronnen / verloren posities.
- Video's tijdens het gesproken verhaal **gedempt**, terwijl de verteller hoorbaar blijft, inclusief afgeknipte fragmenten doordat het verhaal doorloopt.
- Na voltooiing van ALLE stemopname: de originele video's van dezelfde herinnering achter elkaar, in de bestaande versleepte volgorde, **van begin tot eind met eigen geluid**. Géén dubbel vertellen; geen nieuwe geluidsopties.
- Geen gesproken verhaal: foto's normaal, video's direct met eigen geluid en geen tweede videoronde.
- iOS Safari/PWA autoplay met audio kan worden geblokkeerd. Ontwerp alleen een minimaal duidelijk gebruikersgebaar wanneer strikt noodzakelijk; niet achteruitgaan in UX.

### 4. Presentatiebediening (bestaande afspraken)
- **Tikken** = naar volgende foto/video BINNEN dezelfde herinnering.
- **Swipen** = volgende (of vorige in tegengestelde richting indien bestaand) herinnering op de tijdlijn.
- Ook bij laatste videoronde en audio-only inhoud; geen onverwacht terugvallen op browser-scroll of de verkeerde memory.
- Respecteer bestaande mediavolgorde via drag-sorting op de bewerkpagina.

### 5. Schrijfmodus apart als erkende blokkerende regressie
- Echte iPhone V7: knop Schrijven toont toetsenbord van oude onderliggende tekstinvoer, maar GEEN zichtbare schermvullende schrijf-pop-up; dit is niet opgelost omdat Chromium-tests groen waren.
- Onderzoek onclick/capture fallback, verborgen ouderpaneel, focus, z-index, fixed overlay, keyboard visualViewport, scroll en Chrome/Safari/standalone verschillen voordat extra schrijfsystemen worden gebouwd.
- Na herstel: maximaal zes media bovenin, één natuurlijk scrollbaar tekstveld, cursor altijd boven toetsenbord, tekst bewaren en via Klaar terug naar bewerken.
- Geen grote ontwerpwijzigingen zolang P0-presentatie/opslag niet stabiel is.

## Verplichte scenario's, echte iPhone
A. Alleen één foto + gesproken verhaal; bewaren; publiceren; Mijn leven; openen; terugkijken; app sluiten/heropenen.
B. 6 beelden met foto's + video, volgorde met verslepen; opgenomen cues; heropenen, tik en swipe.
C. Video → drie foto's → video met voice: tijdens voice beide video's stil; na stem volledige video1 en video2 met oorspronkelijke audio.
D. Video zonder stem: video direct met geluid; geen tweede videoronde.
E. Alleen stem zonder foto's: opnemen, opnieuw openen, afspelen en navigeren, geen lege presentatie.
F. Alleen geschreven verhaal (geen media): publiceren, terugvinden en tekst weergeven.
G. Historische datum 1 januari: bewaren, publiceren, gericht open, terug uit presentatie en opnieuw open.
H. Ontbrekend/ondecodeerbaar medium: geen stil misleidend succes; veilige herstelinstructie en behoud origineel.
I. iPhone Safari én geïnstalleerde PWA (en, indien relevant, ChatGPT-webview) met dezelfde origin en opslag.
J. Schrijven in dezelfde iPhone-PWA opent echte pop-up, toetsenbord/cursor en tekst persistent.

## Release- en kwaliteitscriteria
- Werk uitsluitend in eigen V8-branch en aparte Worker. Geen wijziging van V7-origin of bestaande lokale herinneringen. Geen automatische migratie of destructieve cleanup.
- Eerst reproduceren en loggen, dan minimale gerichte patch. Toets met echte local media en een bestaande opgeslagen herinnering; synthetic browser checks alleen als aanvulling.
- Markeer elk punt afzonderlijk: gebouwd / geautomatiseerd getest / op iPhone getest / door gebruiker geaccepteerd.
- Geen `CURRENT`-promotie, geen merge en geen claim `werkt op iPhone` zonder uitdrukkelijke eigenaaracceptatie.
- Schrijf releaserecord, rollback en precies wat (nog) niet bewezen is.

## Opdrachtvolgorde
P0 1) E2E opslag/media integriteit; 2) presentatie-routing/hydratie/heropenen; 3) stem/beeld/video-volgorde en gebaren. P1 4) iPhone autoplay/audio- en videoperformance. P1 5) schrijf-popup regressie op iPhone. P2 pas daarna visuele verfijning (zoals waveform tijdens terugluisteren en opnieuw inspreken).

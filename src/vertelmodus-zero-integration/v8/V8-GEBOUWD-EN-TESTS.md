# TALERA V8 — technische release- en acceptatiestatus

**28 oktober 2026** — afzonderlijk gebouwde TESTKANDIDAAT. **Niet** op echte iPhone geaccepteerd, **niet** als CURRENT of productie gemarkeerd.

## Geverifieerde vertrekpunten
- V7 Worker: `talera-pwa-eenvoud-v7-test`, deployment `df1b850a-4d87-4a56-b456-cb5e831d3919`. Onaangetast.
- V8 Worker: `talera-pwa-presentatie-herstel-v8-test`, deployment `420dda3a-4739-419c-b7d1-22541f01ffa3`, Cloudflare versie `f9c43741-fbce-4741-bf85-d19c90140918`.
- V8 test-PWA: https://talera-pwa-presentatie-herstel-v8-test.mark-a39.workers.dev/
- Tijdlijn: https://talera-pwa-presentatie-herstel-v8-test.mark-a39.workers.dev/mijn-leven
- Direct presenteren: https://talera-pwa-presentatie-herstel-v8-test.mark-a39.workers.dev/present
- Base GitHub branch: `feature/v7-writer-delete-voice-20261028`. V8 delta branch: `feature/v8-presentatie-keten-herstel-20261028`.

## Gebouwde bronwijzigingen (gericht op V7 Worker-bundel)

### 1. Presentatie adapter LOCAL_RH19_ADAPTER
- Gesproken verhaal wordt aangeboden aan de narrator wanneer **voice aanwezig is**, niet alleen bij de vroegere voorwaarde `hasVoice && hasCues`. Dat ondersteunt een ingesproken herinnering zonder foto's of met lege beeldcues.
- Na succesvol hydrateren van foto's in een gekozen herinnering wordt die herinnering opnieuw **geactiveerd**; een rechstreekse `/present?memory=local-...` route activeert de exact gevonden herinnering na `setCenter`, `writeMemory` en `draw`.
- De afzonderlijke player krijgt alle opgeslagen media uit de originele store. Voor het INIT-bericht worden ze nu allemaal tegen `Blob` en `blob.size > 0` gecontroleerd; een ontbrekend origineel wordt niet stil gefilterd.
- Bij een mislukte hydratatie verschijnt een begrijpelijke statusmelding in plaats van een zonder uitleg leeg verhaal. Een ouder foutvenster wordt bij wisselen van herinnering weggehaald.
- Het INIT-bericht wordt alleen tijdens één lopende poging verstuurd; de succesvolle status wordt pas ná een verstuurd bericht gezet en niet voor het lezen van alle bestanden. De bestaande READY/iframe-structuur blijft behouden.

### 2. Publicatie-integriteit
- De reeds bestaande `mem.save` + `mem.get` routine in `TALERA_V4_HTML` controleert nu de aantallen van opgeslagen media tegenover de aangeboden uploads.
- Voor **elk** opgeslagen foto/video/stembestand wordt de originele Blob via de stored key teruggelezen en op niet-nul bestandsgrootte gecontroleerd; bij een fout worden de oorspronkelijke conceptbestanden NIET opgeruimd.
- Opgeslagen audiobestand en stemcues worden op aanwezigheid gecontroleerd; foto/video-volgorde krijgt een basischeck tegen onverwachte audio-items.
- De bestaande publicatienavigatie `/mijn-leven?published=<id>` en verder `/present?memory=<id>` blijft behouden.

### 3. Schrijfmodus bestaande knoproute
- De verouderde tweede `write.onclick` binnen `taleraCompactWorkbench` is weggehaald. De knop gebruikt nu de V7-schrijf-popupfunctie; de documentbrede fallback blijft bestaan.
- Focus gaat van de oude invoer weg, de schrijf-popup is expliciet viewportvullend en wordt pas na layout zichtbaar gefocust. CSS top-layer `z-index:2147483000`, `100dvh`; de bestaande tekst/thumbnailopslag is niet gedupliceerd.
- De oudere visualViewport-scrollroutine blijft leidend.

### 4. Onveranderde afspraken
- RH19 blijft eigenaar van de tijdlijn en algemene presentatiemodus; de zero-based player blijft eigenaar van opgenomen stemcues en mediawisselingen.
- Tik = volgende foto/video binnen hetzelfde verhaal; swipe = ander verhaal.
- Voice-afspelen begint met de **eerste opgenomen cue**; video's zijn tijdens de stem gedempt. Na de stem worden originele video's achter elkaar, volledig en niet gedempt, aangeboden.
- Zonder voice video direct met oorspronkelijk geluid; bestaande Safari-beperkingen blijven als acceptatierisico.
- Datum default vandaag, gebruiker kan handmatig verleden kiezen; zes media ordenen via bestaande editor; V7 waveform en verwijderen blijven bewaard.

## Automatisch uitgevoerde browserproeven (iPhone-achtig 390×844, geen echte iPhone)
1. **PASS**: alle belangrijkste PWA-routes /, /tell, /mijn-leven, /present en beide vertel-iframe-modi openen zonder Worker-uncaught-exception.
2. **PASS**: echt in geïsoleerde IndexedDB opgeslagen SVG-foto plus WAV-stem + één cue, datum 1 januari 2026, daarna navigatie naar exacte `/present?memory=...`: juiste titel en player-iframe aanwezig.
3. **PASS**: dezelfde route met **alleen WAV-stem en lege cues**: juiste stemherinnering en iframe aanwezig.
4. **PASS**: schrijfmodus vanuit fotoloos concept opent een zichtbare `fixed` dialoog van bovenkant 0 tot onderkant 844, focus is op `#taleraWriterText`, zeer hoge top-layer.
5. **PASS**: zes verschillende SVG-testfoto's laden, zes thumbnails in schrijver; 40 regels geschreven tekst veroorzaken scrollTop 477 en zijn bij opnieuw openen aanwezig.
6. **PASS**: normale foto-upload → titel zetten → `Op mijn tijdlijn plaatsen` → nieuwe kaart in Mijn leven plus knop ‘Bekijk herinnering’; media-integriteitscontrole loopt voor navigatie/cleanup.
7. **PASS**: schrijvende foto-loze route → concepttekst → Klaar → publicatie naar Mijn leven.
8. **PASS, gebeurtenissimulatie**: video-foto-foto-foto-video met ingesproken voice-einde selecteert vervolgens de originele videoplayer indices **0** en **4** met `muted=false` in volgorde.
9. De eerste test met zes identieke foto's blokkeerde terecht de uploadroute vanwege de bestaande duplicaatcontrole; met zes verschillende bestanden werkte de proef.

## Nog NIET bewezen
- Echte iPhone Safari en geïnstalleerde PWA: het oorspronkelijke gebruikersprobleem met presentatiescherm en schrijf-popup is daarmee **niet bewezen opgelost**.
- Echte microfoonopname, originele iPhone MOV/HEVC-videobestanden, daadwerkelijke geluidshoorgang, Safari autoplay-geluid, twee opeenvolgende video-decoders.
- Swipe/tik op aanraakscherm, volledige cue-follow synchrone audio en heropenen na volledig sluiten van echte geïnstalleerde app.
- Oude V7-herinneringen zijn niet overgezet: iedere Worker-origin heeft **eigen IndexedDB**. Test met nieuwe herinneringen op V8; wis of verwijder de V7-origin niet.
- De historische geïntegreerde Cloudflare Worker is nog niet volledig als gewone CI-build uit de GitHub branch reproduceerbaar. De daadwerkelijk gedeployde code is een **apart gekopieerde en gerichte aangepaste multipart Worker-bundel**, en deze GitHub-map bevat audit-trace van de wijzigingen; V7-deployment is rollback.

## Verplichte acceptatie op de iPhone
1. Open V8 als PWA, maak één herinnering met foto + stem, sluit Vertellen met Klaar, publiceer, ga via Mijn leven naar die **exacte** herinnering, terug naar presentatie, controleer herstart.
2. Doe hetzelfde met één spoken-only herinnering zonder foto's.
3. Maak video–foto–foto–foto–video, vertel met wisselmomenten en controleer eerst stil onder stem, daarna volledige originele video's met geluid.
4. Tik volgend beeld, swipe volgend verhaal; controles in normale presentatie en in laatste videoronde.
5. Tik Schrijven bij 0 en 6 foto's, controleer echte schermvullende schrijf-popup, het iPhone-toetsenbord, cursor, tekst bewaren en terugkeren via Klaar.
6. Controleer originele herinneringen in V7 onafhankelijk; geen data-migratie zonder expliciete aparte afspraak.

**V8 blijft uitsluitend testkandidaat totdat de gebruiker de echte iPhone-functie expliciet goedkeurt.**

# TALERA — ÉÉN herinnering, één opname, één doorlopende presentatie

**GitHub-branch:** `feature/clean-one-memory-flow-20261105`. Nieuwe zelfstandige logische module in `src/one-memory-flow.js`, met geautomatiseerde tests in `test/one-memory-flow.test.mjs`. Geen imports uit oudere vXX-patches, geen tweede speler of nieuwe UI, geen eigen swipe-handler, geen tweede database, geen nieuwe Worker-origin.

## De afgesproken volgorde van echt gebruik

1. De gebruiker kiest uit de **bestaande** bibliotheek alle foto's en video's voor de herinnering. Elk origineel behoudt `mediaId` en `storageKey`, ongeacht of het tijdens de stemopname wordt bekeken. Volgorde is de opgeslagen arrayvolgorde.
2. Wanneer de **reeds bestaande** microfoonopname werkelijk start: `const clock = new RecordingClock(); const capture = new CaptureTimeline({ memoryId, media, clock }); capture.start(currentVisibleMediaId)`. De eerste zichtbare foto krijgt onmiddellijk cue `{audioTimeMs:0, mediaId}`.
3. De bestaande foto-/videoweergave bevestigt bij een **voltooide zichtbare** swipe of handmatige keuze de nieuwe media-ID. Pas vanuit die bestaande bevestigingscallback: `capture.confirmedVisible(mediaId)`. Géén cue bij touchstart, mislukte swipe, laadfout of het alvast aankleuren van een puntje.
4. In de bestaande recorder-pauze/hervat-callbacks: `capture.pause()` en `capture.resume()`. Er loopt tijdens pauze geen tijd bij. Gedempte video in hetzelfde beeldvlak pauzeert mee; microfoonopname gaat gewoon door wanneer hij wordt hervat.
5. Bij de bestaande knop **Klaar**: `const { cues } = capture.finish()`. Laat de recorder de originele audio blob opslaan en meet de daadwerkelijke audioduur. Daarna `await buildMemoryManifest({ memoryId, media, audio: {storageKey: audioKey}, narrationDurationMs: audioDurationMs, cues, verifyMedia: async item => originalExists(item.storageKey), verifyAudio: async a => originalExists(a.storageKey) })`. Dit geeft één manifest voor de bestaande herinneringsrecord; het kopieert of verwijdert **geen** originele blobs. Publiceer alleen als **alle** media en audio werkelijk bestaan. Bij fout: concept behouden, geen vals succes.
6. Op de bestaande tijdlijn, met dezelfde gewone afspeelknop, maak `new OnePresentation({manifest,audioElement,showMedia,syncVideo,setIndicator,onError,onEnded})`. Het is een **controller voor de bestaande presentatie**, niet een tweede speler. `audioElement` is de reeds aanwezige narration-audio. `showMedia(mediaId,frame)` werkt met het **reeds bestaande** foto-/videovlak en lost de Promise uitsluitend op met de werkelijke ID nadat het beeld geladen en zichtbaar is. De bestaande renderlus roept `tick()` aan, de bestaande audio-`ended` callback roept `onAudioEnded()` aan. `play()`, `pause()`, `seek()` worden door de bestaande knoppen aangeroepen.
7. Dezelfde controller toont eerst alles op de audiocues en gaat bij de laatste gesproken seconde direct over naar `tail[]`, **zonder extra scherm of tweede playknop**. Als de laatste zichtbare video nog niet klaar is, speelt hij gedempt uit. Daarna komen alleen de niet-bezochte foto's en video's in bibliotheekvolgorde. Foto's staan voorlopig **4 seconden** (instelbaar via `photoDurationMs`), video's exact hun eigen duur.
8. Pas na de **laatste** naloop-media eindigt de presentatie. `setIndicator(mediaId)` wordt uitsluitend aangeroepen na aantoonbare succesvolle foto-/videoweergave; laat geworden oude laadacties zijn ongeldig. Voor video krijgt `syncVideo` steeds `{ mediaId, videoPositionMs, playing, muted:true, playsInline:true }`; stemgeluid blijft zelfstandig hoorbaar.
9. Voor oudere `narrationCues` met `{t,index}` is `upgradeLegacyCues(oldCues,savedOrderedMedia)` beschikbaar. Gebruik éénmalig de destijds opgeslagen volgorde om de indexen naar vaste IDs om te zetten; **niet** naar een nieuw gesorteerde lijst.
10. Een herinnering zonder stem gebruikt dezelfde `tail`-logica voor alle media. Bij afspelen na `seek(0)` moet foto 1 weer werkelijk zichtbaar zijn. Pauzeren, hervatten en handmatige navigatie wijzigen de opgeslagen cues niet.

## Koppeling nog expliciet nodig

Het GitHub-project heeft een oudere Worker-structuur en documentatie van aparte eerdere PWA-proeven. Er is **niet bewezen** dat dit de actuele 5-november-live-PWA-bron is. Daarom bewust **geen** wijziging aan de bestaande oude vertelmodus, routes, opslag of productiecode. De functiecore en de geautomatiseerde tests zijn gebouwd, maar pas nadat de actuele PWA haar **bestaande** recorder-, zichtbare-media-, opslag- en presentatiecallbacks aansluit, werkt de wijziging ook in de echte app. Een iPhone/Safari-acceptatietest ontbreekt nog.

Dit mag dus **niet** als gereed in productie worden geclaimd. Het doel van deze branch is juist eerst zuiver aantonen dat de tijdlijn/naloop klopt, zonder opnieuw v32/v40/v43 bovenop elkaar te stapelen.

## Automatische tests

`node --test test/one-memory-flow.test.mjs`

De tests bevatten onder meer zes verschillende foto's, twee video's, 20 seconden gesproken audio, swipes rond 0, 6, 9 en 13 seconden (inclusief terugvegen), pauze, het gedempt afronden van een video, het achteraan tonen van niet-bezochte originelen, indicator-na-render, opslagfouten en Apple-autoplayblokkering. De standaard naloopduur van 4 s voor foto's blijft expliciet instelbaar.

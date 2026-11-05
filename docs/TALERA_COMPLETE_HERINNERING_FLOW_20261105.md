# TALERA — Eén herinnering, één doorlopende opname- en presentatiestroom
**Bouwcontract · 5 november 2026 · functionele specificatie, nog niet geïmplementeerd of op iPhone geaccepteerd**

## Harde uitgangspunten
TALERA heeft één bestaande bibliotheek met blijvende bestands-ID's, één herinnering en één bestaande presentatieweergave. Geen losse Story Player, overlay, aparte route, andere Worker-origin, kopie van de bibliotheek of eigen afspeelomgeving. De bestaande, werkende vertelmodus/recorder blijft intact. Geen beeld mag verdwijnen doordat het niet tijdens de opname werd getoond. De tijdlijn en alle originele bestanden horen bij **dezelfde** herinnerings-ID. Het einde van audio is niet het einde van de herinnering.

## Eén volledige gebruikershandeling, van start tot einde
1. Gebruiker opent TALERA en kiest een nieuwe of bestaande herinnering. Geselecteerde foto's en video's worden via de bestaande bibliotheek toegevoegd. De volgorde is zichtbaar en veranderbaar. Elk item heeft een stabiele `mediaId` en `storageKey`, niet alleen een positie in een lijst; de originele blobs worden slechts één keer opgeslagen.
2. De gebruiker ziet de eerste foto/video, drukt op de reeds bestaande vertelknop en spreekt. De huidige opnamefunctie blijft werken. De opname bewaart de audio en de visuele gebeurtenissen met **één audio-gerelateerde tijdsbasis**, zonder losse klok voor beelden en puntjes. Eerste zichtbare media-ID wordt als cue vastgelegd. Voorspraakstilte of opname-startvertraging wordt correct aan de audiotijd gekoppeld.
3. Iedere **daadwerkelijk voltooide** swipe of handmatige selectie tijdens de opname voegt `{audioTimeMs, mediaId}` toe. Een mislukte, geannuleerde of niet-voltooide swipe is géén cue. Een nieuw beeld kan alleen worden bevestigd na renderen; dots volgen het zichtbare beeld, nooit omgekeerd. Meerdere swipes, achteruit swipen en revisits mogen voorkomen; de chronologie blijft behouden. Bij pauze loopt de audiotijd niet verder; na hervatten sluiten cues daarop aan.
4. Staat er tijdens het vertellen een video in beeld, dan wordt die in hetzelfde beeldvlak zichtbaar en **gemute** gespeeld, zonder het microfoongeluid te onderbreken. De video loopt zolang hij actief in beeld is; bij pauze pauzeert ook de video, bij hervatten synchroon verder. Als hij eerder eindigt dan de volgende swipe blijft het laatste frame zichtbaar. Als de gebruiker weg swipet, begint het volgende zichtbare item op de vastgelegde tijd.
5. Als de gebruiker op 'Klaar' drukt, sluit de opname in de bestaande workflow en wordt één samenhangende herinnering opgeslagen. **Alle** geselecteerde media blijven gekoppeld, inclusief de niet bezochte foto’s en video's. De oorspronkelijke opname en alle media blijven apart als originele bestanden bewaard, maar hun relaties/timing staan in één herinneringsmanifest. De publicatie gebeurt pas na controle van audiobestand, ID-verwijzingen en tijdlijn.
6. In hetzelfde manifest volgt na de gesproken audio de **naloop**: de laatste actieve video mag, indien nodig, zonder geluid uitspelen; vervolgens worden de niet tijdens de opname getoonde items afgehandeld in de bewaarde bibliotheekvolgorde. Elke resterende video speelt gemute gedurende haar werkelijke lengte. Elke resterende foto krijgt een voorspelbare ingestelde schermduur (voorlopig voorstel: 4 s, expliciet te bevestigen; dus geen willekeurige 2,4-s wissel). Een foto die al tijdens de opname is getoond wordt niet ongevraagd opnieuw toegevoegd. Een video die bewust is weggeswipet wordt evenmin dubbel ingevoegd. Uitzonderingen moeten zichtbaar instelbaar zijn en nooit content verwijderen.
7. De gebruiker opent de herinnering op de bestaande TALERA-tijdlijn en drukt op de gewone afspeelknop. Hetzelfde TALERA-fotovlak laat eerst het gesproken gedeelte zien met precieze cue-wisselingen, daarna loopt **zonder tweede speler, nieuw venster, overgangsscherm of herstartknop** de naloop door.
8. Pas na het laatste beeld/video-item van de naloop is de herinnering volledig afgelopen. Bestond geen naloop, dan eindigt hij na de audio. Bestond geen audio, dan kan de bestaande presentatie de volledige mediareeks tonen zonder een kunstmatige opname.

## Eén afspeeltijdlijn, niet twee onafhankelijke systemen
De enkele presentatiestatus bevat: `memoryId`, `playState`, `segment` ('narration' of 'tail'), `positionMs`, `visibleMediaId`. Tijdens de gesproken fase is `audio.currentTime` de autoriteit; de cue met het laatst verstreken tijdstip bepaalt de gewenste media-ID. Bij video is de plaatselijke clippositie de tijd sinds de cue (begrensd op de clipduur). Als audio eindigt, gaat de **zelfde** presentatie over op de aaneengesloten naloop; de klok daar is de verstreken presentatietijd. Er komt **geen tweede player of onafhankelijke slideshow-timer**. Bij pauze stoppen stem, video en naloop; bij hervatten gaan zij op de juiste positie verder. Bij zoeken/scrubben wordt het juiste item en tijdstip berekend; bij opnieuw afspelen keert de presentatie werkelijk terug naar het eerste beeld.

De bestaande foto-/videolaag is de enige bron voor zichtbaar beeld. De actieve indicator wordt pas na een werkelijk geladen, zichtbaar item aangepast. Ontbrekende/beschadigde bestanden worden benoemd, nooit stilzwijgend vervangen door een ander beeld. Verouderde asynchrone laadaanvragen mogen het inmiddels gekozen beeld niet overschrijven. Dit volgt de bewezen principes van V42/V43.

## Bibliotheek- en opslagcontract
Eén herinnerings-ID verwijst naar een bestaande geordende set `media[] = {mediaId, storageKey, type, order, videoDurationMs?, muted:true}`, een origineel audio-bestand, `cues[] = {audioTimeMs,mediaId}`, `narrationDurationMs`, optionele `speechStartOffsetMs` en een deterministische `tail[] = {mediaId,startMs,durationMs,videoStartMs?}`. De naloop wordt bij het afronden uit bezochte media-ID's en de bewaarde mediavolgorde samengesteld. Een hernieuwde publicatie mag niet uit oude indexen plotseling andere media aanwijzen. Voor oudere `narrationCues:{t,index}` geldt: lees de bestaande volgorde éénmalig om bijbehorende ID's te herleiden; laat oude herinneringen verder correct functioneren. Bij ordening veranderen uitsluitend volgorde en expliciet gewenste timing; originelen niet kopiëren of verwijderen.

Concepten en uploads worden eerst gevalideerd, dan veilig bevestigd. Bij opslagfout blijven originelen en concept beschikbaar; geen succesmelding wanneer een foto/video niet is opgeslagen. Grote HEIC/MOV-bestanden op iPhone mogen niet door onbedoelde kopieën of conversie de opslag laten vollopen. Geen nieuwe browser-origin voor deze bouwronde: IndexedDB is per origin geïsoleerd.

## Reacties en uitzonderingen
- **Opname start**: eerste actuele media-ID en audio-gekoppeld nulpunt vastleggen; niet wachten op de volgende swipe.
- **Swipe links/rechts tijdens spreken**: na succesvolle, zichtbare wissel exact één cue; geen cue bij geannuleerd gebaar.
- **Video tijdens spreken**: gedempt; bij korte video het laatste frame vasthouden; bij pauze/hervatten en terugspoelen synchroon.
- **Opname eindigt op foto**: geen kunstmatige extra kopie van deze foto; daarna de nog niet vertoonde media.
- **Opname eindigt op video**: lopende gedempte video laten afronden voordat het volgende nog niet vertoonde item komt.
- **Niet bezochte media**: altijd achter het gesproken verhaal, in opgeslagen volgorde; foto op ingestelde tijd, video op eigen volledige lengte, mute.
- **Handmatig swipen tijdens afspelen**: de automatische volgorde bewust pauzeren of navigeren; niet de opgeslagen cues herschrijven. Hervatten resynchroniseert met de gekozen afspeelpositie.
- **Foto of video ontbreekt**: heldere melding; vorige zichtbare foto en indicator niet vals vooruit sturen; gebruiker kan opnieuw proberen of overslaan.
- **Gesloten app / inkomend gesprek / microfoononderbreking**: geen gegarandeerde achtergrondopname claimen. Laat concept en bekende cues staan en geef een herstelmelding; nooit stilzwijgend de opname als voltooid presenteren.
- **Video autoplay geblokkeerd op iPhone**: gebruik de bestaande gebruikersactie op 'afspelen', `muted` en `playsInline`; toon herstelbare melding bij echte blokkade.
- **Geen foto's of alleen één foto**: bestaande opnamefunctie en eenvoudige presentatie blijven functioneren zonder extra schermen.
- **Herhaald afspelen / scrubben / terug naar begin**: daadwerkelijke eerste foto zichtbaar; indicator nooit vóór het beeld.

## Kortste bouwroute en vrijgave
A. Maak eerst een terugvalkopie van de **huidige** werkende moderne TALERA-versie; identificeer de actuele live-bron. De GitHub-repository `talera-lifeline` bevat V41/V42/V43-documentatie, maar is **niet aantoonbaar** de volledige actuele 5-november-PWA-bundel. Dus: geen wijziging in het oudere prototype of een willekeurige Worker als vervanging voor de echte PWA.
B. Voeg in de bestaande vertelcode de cue-registratie toe, op hetzelfde moment dat het bestaande foto-/videovlak de mediawissel bevestigt. Geen tweede swipe-handler.
C. Sla tijdens de bestaande afrond-/bewaaractie alle mediamanifestgegevens en de naloop samen met de bestaande audio in één herinnering op. Geen aparte Story Player-route en geen tweede opslagdatabase.
D. Laat de bestaande presentatielogica hetzelfde manifest uitlezen: audio-cues volgen, daarna naloop. Schakel oude automatische 2,4-seconden-beeldwissels tijdens gesproken audio uit. De bestaande fotolaag en bestaande bediening blijven de enige UI.
E. Test dezelfde bouw als één geïntegreerde stroom, eerst met synthetische media, daarna op een echte iPhone. Bescherm de huidige werkende vertelmodus.

### Acceptatietest
Maak één herinnering met zes sterk verschillende foto's en twee gemute video's. Spreek circa 20 seconden, swipe op circa 0, 6 en 13 seconden (ook één keer terug), laat enkele foto's en één video bewust ongetoond, eindig eventueel op een video. Controleer:
1. alle geselecteerde ID's en originelen bestaan na opslaan en heropenen;
2. stemgeluid blijft intact en mediawissels zijn op de exact opgeslagen audiotijden zichtbaar;
3. video tijdens spreken blijft gemute en de gesproken stem hoorbaar;
4. direct na de laatste gesproken seconde loopt dezelfde presentatie door zonder pop-up, extra speler of onderbreking;
5. niet-getoonde foto's volgen in juiste volgorde, gemute video's duren hun volledige tijd; ook bij pauze/terugspoelen;
6. puntje en daadwerkelijk zichtbare media-ID zijn altijd gelijk; herstart begint bij media 1;
7. mislukte media, volle opslag en Safari-autoplay geven herstelbare foutmeldingen zonder verlies.

**Status op 5 november:** functionele bouwspecificatie. Niet claimen dat de huidige live PWA is aangepast of dat de iPhone-eindtest al is geslaagd. Eerst de actuele bron vaststellen, daarna deze hele stroom in één bouwronde implementeren.

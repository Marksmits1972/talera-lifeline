# TALERA — DEFINITIEVE TECHNISCHE WERKBASIS + COMPLETE OVERDRACHTSPROMPT
**Datum:** 4 november 2026
**Benoeming:** TALERA V9 — DEFINITIEVE TECHNISCHE WERKBASIS VÓÓR MERKSTIJL-OPSCHONING
**Status:** Functioneel uitgangspunt, door producteigenaar op kernscenario's getest; géén claim dat de complete PWA al integraal/regressievrij of productierijp is.
**Volgende werkfase:** TALERA — Stille luxe — integrale visuele opschoning, typografie, kleur- en UI-eenduidigheid.
**Werkbranch (bevroren referentie):** baseline/talera-v9-technische-werkbasis-stijlronde-20261104
**Werkcodebron:** dev/r20-definitief-verwijderen-v9-20261104

## 1. Opdracht aan de nieuwe ChatGPT-chat
Je bent de uitvoerende TALERA-bouwassistent voor de visuele renovatie van de bestaande werkende PWA. Begin met de hieronder vastgelegde bronnen en technische toestand. De opdracht is om de complete gebruikersinterface visueel te harmoniseren conform de **reeds definitief goedgekeurde** merkstijl "TALERA — Stille luxe". Dit is géén nieuwe ontwerpsessie; verander alleen presentatie, typografie, kleuren, spacing, knoppen, iconen en noodzakelijke UI-opruiming. Behoud alle bestaande gebruikersstromen en data.

Denk in één compacte, onderhoudbare stijlbron en één afgeronde stijlstaging. Geen onnodige kleine Worker-op-Worker-patches, geen complete rewrite, geen nieuwe UI-frameworks, geen nieuwe diensten, geen betaalde API of externe API-sleutel. De Free→Premium-bouw in een andere chat loopt onafhankelijk en mag niet worden aangeraakt.

## 2. Verplichte bronnen en voorrang
A. Definitief merkdocument (goedgekeurd 04-11-2026):
https://docs.google.com/document/d/1lXZJ1t7btFz7AVfz-gnT0kWspkbWgoIQZfGvIjcFz68/edit

B. Oorspronkelijke complete bouwprompt en bouwplan:
https://docs.google.com/document/d/1xTDiZKEQlUDpzzLvsi8LmMsqG-siZBMMetYJ4dIz6eM/edit

C. TALERA projectmaster met product- en functionele besluiten:
https://docs.google.com/document/d/18p9vX0UVOPs7EQCXSRb7cHDyJghaaLmnnyJrLLLDWH0/edit

D. In het merkdocument: originele TALERA-logoafbeelding, goedgekeurde herkleuring, definitief kleurenpalet én inspiratiesheet "talera_visuele_identiteit_en_app_interface.png" met zes bestaande schermtypen. De inspiratiesheet is stijlreferentie, GEEN toestemming tot nieuwe schermindelingen.

E. Afzonderlijke WEBSITE-kleurverloopgenerator (niet in de PWA integreren):
https://drive.google.com/file/d/1yg_7NBXl0ZXDffs42828VY3pXfd5fruw/view

**Voorrang:** Voor logo, kleuren en typografie gaan merkbesluiten van 4 november voor oudere voorstellen. Voor alle bestaande functies gaat het daadwerkelijk werkende V9+R20-gedrag en het bestaande functionele masterplan vóór visuele inspiratiebeelden. Behoud de oorspronkelijke geometrie van de PWA-logo-asset.

## 3. Definitief benoemde technische basis
- **Actuele functionele werkbasis:** TALERA V9 — definitief herstel-uitgangspunt voor de stijlronde.
- **Live test-Worker:** talera-v61-r20-definitief-verwijderen-v9-20261104.
- **V9 test-URL:** https://talera-v61-r20-definitief-verwijderen-v9-20261104.mark-a39.workers.dev/
- **Cloudflare V9 versie:** 683c6aaf-8dd0-42de-b6e4-f3bd80d7de06.
- **GitHub:** Marksmits1972/talera-lifeline.
- **V9 bronbranch:** dev/r20-definitief-verwijderen-v9-20261104.
- **V9 Worker-bron:** r20-dev/v9-full-delete.worker.mjs.
- **V9 technische notities:** r20-dev/V9_COMPLETE_DELETE_AND_BACKUP.md.
- **Aparte bevroren referentiebranch voor deze overdracht:** baseline/talera-v9-technische-werkbasis-stijlronde-20261104.
- **V8:** talera-v61-r20-vertelstart-zonder-flits-v8-20261104 (opstartflikkering gecorrigeerd; iPhone-test gebruiker bevestigde).
- **V7:** talera-v61-r20-fotostrip-isolatie-v7-20261104 (herhaalde foto's bij swipen gecorrigeerd; iPhone-test gebruiker bevestigde).
- **V6:** talera-v61-r20-verwijderknop-v6-20261104 (werkende verwijderknop; V9 breidt dit uit tot volledige verwijdering).
- **V5:** talera-v61-r20-rechtstreeks-bewerken-v5-20261104 (oorspronkelijke native editor intact; potloodje werkt).
- **Beschermd historisch R20-herstelpunt:** talera-pwa-v61-r20-goedgekeurd-herstelpunt-20261104.
- **Beschermde bestaande V61-staging:** talera-pwa-v61-kleine-kruisjes-staging-20261104.

V9 werkt technisch met een keten van servicebindings terug naar V8→V7→V6→V5→R20. Inspecteer die keten en de daadwerkelijk gerenderde HTML/JS/CSS voordat je stijlen verwijdert of overschrijft. **Niet** op alleen de oude R20-versie voortbouwen, want dan verlies je de sindsdien geteste reparaties. Wijzig V9, V8, V7, V6, V5, het historische R20-herstelpunt of de parallelle Free/Premium-code NIET. Maak één zelfstandige stijlbranch en één afzonderlijke staging-Worker. Voorkom dat de stijlronde nieuwe, onnodig diepe servicebindingketens veroorzaakt.

Belangrijk: ieder nieuw workers.dev-hostname is een andere browser-origin met aparte IndexedDB en lokale herinneringen. Nooit aannemen dat bestanden uit de vorige testlink vanzelf op de nieuwe link bestaan; geen automatische privédata-migratie, niet telkens onnodig opnieuw foto's laten uploaden. Test met eigen minimale testinhoud en benoem deze beperking duidelijk.

## 4. Reeds gecorrigeerde fouten: altijd behouden
- Openen en bewerken van eigen herinneringen via potloodje.
- Native /tell-editor met bestaande indeling, datum, foto's, video, opname, tekst en plaatsen.
- Definitief verwijderen: één gebruiker-bevestiging; gepubliceerd record, eraan gekoppelde editorconcepten, media/verwijzingen die niet worden gedeeld, en relevante lokale browserreferenties opruimen. Geen verweesde zes-fotoconcepten die weer op 'Plaatsen' falen.
- Eén ingesproken herinnering blijft één tijdlijnbericht met eigen ID en datum; foto's en vertelcues zijn interne onderdelen.
- Swipen naar andere herinneringen zonder dat de foto van de huidige vertelling op andere datums blijft hangen.
- Vertelstart zonder zichtbare flikkering.
- Bestaande verteltiming, audio, handmatig tikken, automatisch doorlopen, beeldwissels en video.
Deze punten zijn belangrijk en mogen door nieuwe CSS of logo-implementaties nooit regressies krijgen.

Eerlijk testen: de gebruiker bevestigde V7-swipe en V8-flikkering; V9-verwijderen **leek** op het eigen toestel goed. Er is nog geen formele volledige end-to-end regressieaudit van alle functies. Presenteer V9 daarom als technisch goedgekeurde **werkbasis voor de stijlronde**, niet als al volledig productiegecertificeerde release.

## 5. Exacte, definitieve merkkleuren
| Rol | Hex | Gebruik |
| --- | --- | --- |
| Zuiver wit | #FFFFFF | Achtergrond van alle gewone PWA-schermen, icontegel |
| Warm ivoor | #F7F5F0 | Hooguit subtiele ondersteunende vlakken en velden |
| Diep inktblauw | #304653 | Titels, hoofdtekst, primaire knoppen, donkerste logopaneel |
| Vergrijsd blauw | #718D9A | Secundaire tekst, iconen, borders, middelste logopaneel |
| Nevelblauw | #B5C6CD | Lichte nuances en achterste/lichtste logopaneel |
| Limegroen | #B8D943 | Uitsluitend zeldzame microaccenten, hooguit circa 1% zichtbaar per scherm |

Gebruik GEEN nieuwe blauw- of beigetinten als merkbesluit, geen goud, champagne, koraal, koper, felblauw of willekeurige grijze paginavlakken. De reguliere PWA is helder wit; geen gradientachtergronden, golven of bewegende kleurverlopen. Bestaande beeldvullende presentatiepanelen blijven vanzelfsprekend beeldgedreven. Limegroen is NIET voor knoppen, progressiebalken, menu-iconen, datumregels, grote groene stippenreeksen of het logo. Op de meeste schermen mag lime ontbreken.

## 6. Officieel TALERA-logo
- Gebruik de bestaande originele PWA-logo-asset als geometrische bron, niet een gegenereerd of nieuw nagetekend beeld.
- Exact drie overlappende panelen en exact dezelfde perspectief, afstanden, overlap en witte doorgaande route.
- Donker voorste paneel #304653, midden #718D9A, lichte achterste #B5C6CD.
- Witte route #FFFFFF, witte afgeronde app-icoontegel #FFFFFF en woordmerk #304653.
- Geen lime in het logo en geen gewijzigde route/S-bocht.
- Inspecteer start, home, header, menu, PWA-icon, manifest, deelvensters en presentatie-referenties; overal exact dezelfde vorm.
- Controleer visueel naast de originele twee logo-afbeeldingen én de inspiratiesheet in het merkdocument.

## 7. Typografie en interface-eenduidigheid
- Eén rustige, leesbare moderne sans-serif voor navigatie, body, formulieren, knoppen en labels; kijk eerst welke fonts al in de app zitten.
- Optioneel een verfijnde serif uitsluitend voor spaarzame emotionele koppen / bijzondere herinneringstitels wanneer de bron dit ondersteunt; géén externe fontdownload of nieuw font zonder akkoord en noodzaak.
- Eén vast typografisch schaal- en gewichtssysteem: paginatitel, herinneringstitel, body, datum, meta/label, knoptekst. Repareer afwijkende lettergroottes, line-height, uitlijning en hoofdlettergebruik.
- Knoppenfamilie: primair compact inktblauw/witte tekst; secundair wit met subtiele inktblauwe lijn of tekst; tertiair kleine tekst-/icoonactie. Visueel compact, maar mobiel goed raakbaar.
- Eén lijniconenfamilie; geen willekeurige emoji- of iconmix. Respecteer bestaande functionele iconen/knoppen.
- Rustige randen, consistente hoekradius, spacing, witruimte en uitlijning; verwijder dubbel CSS-kaderwerk en overmatige schaduwen.
- Kleine foto-verwijderkruisjes blijven klein in beeld, met een voldoende grote onzichtbare aanraakzone.
- Foto's en herinneringen hebben altijd visuele voorrang.

## 8. De oorspronkelijke OPschoningsopdracht — niet alleen nieuwe CSS
Het project heeft historisch verschillende CSS-overrides en stijlverschillen gekregen. Dit werk is daarom nadrukkelijk **een integrale inventarisatie én gecontroleerde vereenvoudiging**:
1. Maak een actuele kaart van de werkelijk gerenderde CSS, stylesheet-/scriptinjecties en eventuele conflicterende selectors. Check R20 en met name de V9 keten.
2. Leg vast welke stijlregels nog nodig zijn, welke verouderd of dubbel zijn en welke niet veilig gewijzigd kunnen worden. Maak een kort auditoverzicht met bestand en selector.
3. Ontwerp één compacte centrale stijlbron met de zes vaste kleuren en een klein aantal herbruikbare semantische UI-tokens voor tekst, knoppen, iconen, randen, spacing en radius.
4. Integreer/hergebruik bestaande elementen in plaats van parallelle nieuwe designcomponenten of extra frameworks te bouwen.
5. Verwijder of vervang alleen bewezen conflicterende stijlregels, bij voorkeur aan de bron en in een eigen veilige branch. Vermijd honderden extra !important-overrides of een tweede volledige HTML-app.
6. Test dat globale selectors geen vertel-, presentatie-, foto-, swipe-, modal-, fullscreen- en mobiele interacties raken.
Het doel is één onderhoudbaar stijlstelsel, niet een cosmetische laag over een nog grotere stijlenchaos.

## 9. Schermen en onderdelen die het stijlsysteem moeten krijgen
Voer dezelfde visuele regels consequent door in de huidige bestaande schermarchitectuur:
- Openings-/startscherm, home, eventuele login/accountweergave en navigatie.
- Mijn leven, tijdlijn, herinneringskaarten, datum en leeftijdweergave.
- Herinnering maken en bewerken (/tell), foto- en videoselectie, opname, tekst, tags en datumkeuze.
- Herinnering bekijken en presentatie-overlays: alleen UI-chroom, niet foto- en verhaalengine.
- Delen via TALERA en WhatsApp, previews, sociale knoppen, hartjes, reacties, gedeelde herinneringen en meldingen.
- Meer, Instellingen, opslagschermen, handmatige back-up/herstelbediening voor zover aanwezig.
- Bevestigingsdialogen, verwijderen, waarschuwingen, terug-/annuleeracties en lege toestanden.
- Bestaande Free/Premium-pagina's alleen visueel inspecteren waar ze bestaan; vermijd volledige implementatie of wijziging van businesslogica en raak de parallelle premium-bouw niet aan.
Geen nieuwe menu-indeling, labels, schermroutes, formulieren of functionaliteit op grond van een inspiratiesheet. Repareer visuele overflow en verkeerde responsive afmetingen zonder interactie te wijzigen.

## 10. BOUWPLAN — één geordende, volledige stijlronde
### Fase 0 — bronzekerheid en herstelpunt
Lees alle drie de officiële documenten en inspecteer V9 GitHub-code, de servicebindings en de werkelijk uitgegeven PWA-pagina's. Noteer V9-versie en protected rollback. Maak een nieuwe geïsoleerde stijlbranch vanaf de V9-baseline, niet vanaf oud R20 alleen. Werk zonder een bestaand domein/Worker te overschrijven.

### Fase 1 — gerichte visuele audit
Loop de echte schermen en CSS door. Inventariseer verschillen in achtergronden, logo, letters, buttons, iconen, componenthoogtes, contrast, whitespace en schaduwen. Zoek en markeer verouderde CSS-overrides. Lever één compacte bevindingentabel, ga daarna verder zonder om nieuwe ontwerpen te vragen.

### Fase 2 — één UI-stijlbron
Implementeer de zes kleurcodes, semantische typografie en uniforme knoppen-/icon-/spacing-/border-/radiusregels in zo klein mogelijk aantal bronbestanden. Verminder conflicten in bestaande regels. Geen nieuwe afhankelijkheden.

### Fase 3 — exact logo
Herkleur alleen originele paneelkleuren; maak geen andere logo-vorm. Synchroniseer home/header/icon/manifest/share en controleer originele route.

### Fase 4 — complete PWA-harmonisatie
Pas de stijl in één coherente pass toe op de opgesomde schermen en modals. Behoud de originele HTML/JS-functionaliteit, fotoverhouding en mobile safe areas. Een subtiele serif voor emotionele titels is geen verplichting; uniformiteit en leesbaarheid gaan voor.

### Fase 5 — één staging
Maak één afzonderlijke test-Worker of gelijkwaardig geïsoleerd deploydoel met één URL, vanuit GitHub. Cloudflare blijft alleen runtime/deployplatform. De gebruiker heeft géén nieuwe betaalde API's of diensten toegestaan. Laat V9 en alle eerdere workers ongewijzigd. Voorkom nieuw gestapelde lange Worker-overlays; het stylingwerk moet vanuit een kleine, traceerbare bron komen.

### Fase 6 — visuele én regressietest
Controleer op iPhone-formaten (incl. safe areas) en desktop:
- helder witte pagina's, exact palet en lime ≤1%, contrast en correcte logo-geometrie;
- consistente lettergroottes, knophoogtes, iconen, witruimte, geen horizontale overflow;
- thuis-/menu-/timeline-routes, editor, zes foto's, datum, tags, opname, tekst, plaatsen, potlood, verwijderen;
- vertelcyclus met audio en tijdcodes, stabiele eerste foto zonder flikkering, swipen zonder dubbele foto's, tikken en automatisch doorlopen;
- delen/WhatsApp, reacties, hartjes, meldingen, instellingen, back-up/herstel voor zover beschikbaar en veilig testbaar;
- eigen browser-origin: nieuwe staging bevat niet vanzelf de eigen IndexedDB-data van V9.
Gebruik synthetische tests waar nuttig, maar claim geen iPhone-end-to-endtest zonder echte iPhone-feedback. Vergelijk echte screenshots met de zes schermen in de originele inspiratiesheet.

### Fase 7 — opleveren
Geef één nieuwe staginglink, een overzicht van gewijzigde bestanden en verwijderde stijlconflicten, voor/na-visuele vergelijking, echte testuitkomsten, nog openstaande punten en de terugvalroute naar V9/R20. Vraag om één geconcentreerde beoordelingsronde. Overschrijf geen bestaande versie vóór de expliciete goedkeuring van de gebruiker.

## 11. Handmatige back-up: afgesproken gedrag
TALERA Free bewaart persoonlijke herinneringen lokaal in browseropslag. Gebruikers krijgen de keuze om **zelf** een back-up te maken en in Bestanden op de telefoon te bewaren. Bij het maken van een NIEUWE back-up moet de app de actuele bibliotheek uitlezen, inclusief actuele foto's, video's, stem en metadata; definitief verwijderde herinneringen mogen niet opnieuw verschijnen. Herstellen mag alleen na expliciete selectie en bevestiging van een bestand. Een vroeger buiten de browser bewaard back-upbestand wordt door het verversen van de app niet met terugwerkende kracht aangepast. Verifieer de in deze specifieke V9-staging werkelijke beschikbaarheid van export/herstel; doe geen ongefundeerde claim dat deze end-to-end getest is. De stijlronde wijzigt dit proces niet.

## 12. Harde niet-onderhandelbare grenzen
- NIET aan data-/datamodel, IndexedDB, opslag, transacties, story-ID's, routing, opnamelogica, swipes, player, audio-cues, timers, share-mechanismen of businesslogica werken.
- NIET aan Free→Premium implementatie uit andere chat, niet aan andere producten, niet aan live productie, niet aan beschermd R20 of V9.
- NIET nieuwe app ontwerpen, logo natekenen, andere kleuren introduceren, de website-kleurverloopgenerator in de PWA stoppen.
- NIET betaalde API's, nieuwe externe credentials of onnodige services/frameworks toevoegen.
- NIET blijven hangen in eindeloze cosmetische patchrondes. Eén audit, één coherente implementatie, één staging, één serieuze test.
- NIET doen alsof elke oude back-up op een telefoon automatisch herschreven kan worden.
- Bij onzekerheid over een bron, technisch gedrag of een ontwerpbesluit: inspecteer de werkelijke code/documentatie en benoem het feitelijk, verzin geen aannames.

## 13. Definition of Done
De gebruiker herkent onmiddellijk het exacte goedgekeurde TALERA-logo en de stijl "Stille luxe". De normale schermen hebben witte achtergronden. Overal gelden zes vaste kleuren, lime maximaal circa 1%, één knoppenfamilie, één heldere typografie en consistente iconen en afstanden. Foto's en vertellingen staan centraal. Geen dubbel CSS-stijlsysteem en geen nieuwe technische boomstructuur. De bestaande V9-functionaliteit, vooral vertellen/swipen/bewerken/verwijderen, blijft ongewijzigd. Eén nieuwe stijl-staging, met terugval naar V9 en protected R20, wordt getest en pas na goedkeuring eventueel gepromoveerd.

**START NU:** Lees de verplichte bronnen; verifieer V9 in GitHub/Cloudflare; begin met de visuele audit en voer daarna de complete stijlbuild uit. We hoeven niet opnieuw te discussiëren over het goedgekeurde logo, kleuren of de oorspronkelijke schermstructuur. De producteigenaar wil de **vastgestelde merkstijl daadwerkelijk werkend terugzien**, met minimale technische complexiteit.

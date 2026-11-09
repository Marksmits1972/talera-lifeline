# TALERA FREE — éénmalige iPhone-acceptatie en veilig afronden
Datum: 8 november 2026
Status: **Free-code geïntegreerd en aantoonbaar groen in aparte EU-stage; niet vrijgegeven in productie**.

## Vastliggend eindbewijs (NIET opnieuw uitvoeren)
- Lokale Cloudflare-integratie: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42516137608
- Echte aparte EU-Cloudflare- en Chromium-mobiele browsertest: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42516137777 — **succesvol**.
- Deze browsertest heeft met uitsluitend fictieve bestanden een foto, MP4-video, WAV-audio, tijdstempels, cue-volgorde, herladen, dezelfde lokale opslag in Mijn leven en Presentatie en accountisolatie bewezen.
- Pristine Linux WebKit faalde al zonder TALERA-code bij het schrijven van Blob/File naar IndexedDB; dat testplatform is daarom niet geschikt om iPhone-Safari-mediaopslag te beoordelen. Geen wijzigingen aan recorder/player door dit Linux-testprobleem.

## Safari/in-app-browser toegang gerepareerd op 9 november 2026

De eerdere foutmelding `{"ok":false,"error":"Ongeldige herkomst"}` ontstond doordat de F5-code bij de toegangspagina vereiste dat ieder normaal iPhone-formulier de HTTP-`Origin`-header meestuurde. Die header kan bij Safari of een in-app browser ontbreken. **Het is niet veroorzaakt door het kopiëren van de toegangscode via WhatsApp.**

Oplossing in **uitsluitend de geïsoleerde F5 Worker**: het formulier krijgt bij GET een HMAC-ondertekend CSRF-veld en een Secure/HttpOnly/SameSite=Strict-cookie die tien minuten geldig zijn. Bij POST is een uitdrukkelijk vreemde Origin nog steeds verboden; als de browser Origin weglaat, wordt de aanvraag alleen aanvaard met de geldige ondertekende form- en cookiecombinatie. De toegangscode zelf blijft een aparte geheimcontrole. Live deployment en drie specifieke security-tests zijn geslaagd in [GitHub Actions run 42584185216](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42584185216). Hierna is de automatische hotfix-uitrol weer uitgezet om sleutels en iPhone-test stabiel te laten.

**Aandachtspunt:** de eerder aan de gebruiker getoonde toegangscode werkt alleen wanneer exact dezelfde waarde ook als `STAGING_F5_KEY` op deze specifieke testworker in Cloudflare is opgeslagen. Een code kopiëren naar WhatsApp en het formulier invullen wijzigt deze Cloudflare-secret niet. Een mismatch toont nu de duidelijkere melding `Toegangscode niet herkend. Controleer of deze in Cloudflare is opgeslagen.` Bewaar de geheime code buiten GitHub en screenshots. Open de link opnieuw zodat de verse ondertekende formcookie wordt gezet; gebruik bij voorkeur Safari rechtstreeks voor de opname-/cameraacceptatie.

## De nieuwe eenvoudige toegang (9 november 2026)

**Nieuw en live getest:** een één-klik-uitnodiging voor precies deze geïsoleerde Free-testworker. Geen Cloudflare-sleutel instellen, geen code in WhatsApp kopiëren, geen registratie of accountaanmelding. De browser opent een tijdelijke pagina die zelf één fictief Free-account met geboortedatum 1974-04-02 aanmaakt, de ondertekende testcookie én eigen sessiecookie ontvangt en automatisch naar `/mijn-leven` gaat. Dit gebruikt exact de bestaande F5-account-DO's en de goedgekeurde oorspronkelijke vertel- en presentatieschermen.

**Beveiliging:** de volledige 256-bit uitnodiging is uitsluitend via een gebruikerslink met URL-`#fragment` gedeeld; de Worker bevat alleen SHA-256 van het geheim. Het fragment wordt niet bij GET verzonden en wordt onmiddellijk uit de browserhistorie gehaald. De testlink werkt tot **16 november 2026, 21:00 uur Nederlandse tijd**. Valse of cross-origin uitnodigingen worden geweigerd; de afzonderlijke TALERA-productiedata zijn niet verbonden. Een ingebouwde rate limiter voorkomt onbeperkt fictieve accounts op dezelfde IP binnen tien minuten. Deel de geheime volledige uitnodigingslink niet publiek.

**Bevestigde technische checks:** echte lokale Cloudflare-integratie met volledig automatisch fictief account, sessie, QA-gate en persoonlijke tijdlijn plus expliciet afwijzen van vervalste tokens is groen; [real EU deployment + GET/reject checks 42585407955](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42585407955) groen. De werkelijke geheime uitnodiging is niet in de repository, buildlogs of workflow opgenomen. Dit is geen vervanging van handmatige echte iPhone-microfoon-/videotest. De originele permanente TALERA-app is niet gewijzigd.

**De onderstaande oudere stappen met `STAGING_F5_KEY` zijn voor normale handmatige toegang en zijn niet meer nodig voor de nieuwe één-klik-uitnodiging.** 

## ECHTE iPhone: precies één laatste acceptatieronde
**Testlink**: https://talera-free-f5-combined-stage-20261108.mark-a39.workers.dev/__f5/entry

Dit is de **aparte F5-testapp**, niet de officiële permanente PWA. De F5-Worker heeft alleen zijn eigen zeven EU-Durable Object-klassen en statische code; geen koppeling naar de officiële TALERA-accounts, D1, R2 of Premium.

**Toegang**: de besloten test vraagt een `STAGING_F5_KEY` (64 willekeurige hextekens). De oude sleutel werd automatisch in GitHub Actions gegenereerd en gemaskeerd en kan om veiligheidsredenen niet worden teruggelezen. Vóór de fysieke test moet de eigenaar **alleen in het dashboard van de geïsoleerde testworker** bij Settings → Variables and Secrets → `STAGING_F5_KEY` een nieuwe eigen 64-hex-testsleutel instellen; de andere vier QA-secrets NIET wijzigen. Bewaar die sleutel privé en plak hem op de iPhone in het veld ‘Testtoegang’. Stel een testaccount in met een **fictief e-mailadres**, uniek gebruikersnaam, synthetische geboortedatum en niet-hergebruikt wachtwoord. Voeg geen echte of persoonlijke foto's, video's of spraakbestanden toe.

**Eenmalig fysiek gebruiksscenario**:
1. Open de testlink op een echte iPhone in Safari, voer de eigen testtoegang in, registreer een fictief **Free** account. Controleer dat de eigen geboortedatum/levenslijn in Mijn leven en Presentatie klopt.
2. Open Vertellen, gebruik de echte microfoontoestemming en voeg een zelfgemaakte **fictieve** foto en video toe. Spreek een korte onpersoonlijke zin in en swipe één- of tweemaal door de beelden tijdens het spreken. Stop, bewaar het verhaal.
3. Ga via de bestaande presentatie, **zonder tweede losse speler**, terug naar de herinnering. Controleer dat audio, stilstaande beelden, de bewegende video en swipes tegelijk worden afgespeeld, inclusief de beeldwisselingen op de juiste momenten.
4. Herlaad de app. Controleer hetzelfde verhaal opnieuw. Log uit, log in op hetzelfde testaccount en controleer het nogmaals. Wissel indien nodig naar een tweede fictief Free-account op dezelfde iPhone; de eerste herinnering mag daar niet zichtbaar zijn.
5. Noteer uitsluitend **GESLAAGD** of één concreet falend onderdeel (bijvoorbeeld ‘video blijft stil terwijl audio speelt’). Alleen dat onderdeel herstellen en opnieuw beproeven. Geen algemene nieuwe testrondes.

## Verplichte veiligheidsgrens vóór een productieomschakeling
- **NIET automatisch overschakelen.** Bestaande TALERA-accounts, sessies en sociaal/deelrecht moeten expliciet veilig gemigreerd of overeenkomstig een vastgesteld contract voortgezet worden. De oudste audit betrof slechts een read-only steekproef, geen echte migratie.
- **Lokale herinneringen zijn origin-gebonden IndexedDB**. Een nieuwe workers.dev-hostnaam ziet de reeds opgeslagen foto's, video's, audio en cues van de vorige app **niet**. Een browser kan die opslag niet stilzwijgend uit een andere host ophalen. De overstap moet daarom ofwel op de oorspronkelijke PWA-origin plaatsvinden met compatibele opslag, of een zichtbare lokale export/import met integriteitscontrole en terugval naar de originele versie bevatten. Niet doen alsof een nieuwe link oude verhalen automatisch heeft overgenomen.
- Een oude database mag pas worden losgekoppeld nadat aantal accounts, birthdates, sessies, shares, storymetadata en rechten gecontroleerd zijn en een rollback beschikbaar is. Herinneringen van echte gebruikers NOOIT via deze synthetische stage importeren.
- De QA-sleutel is **geen productie-authenticatie**; bij productie moeten QA-toegang, test-HMAC-identiteit en stagingconfiguratie uit de klantroute verwijderd worden. De origineel goedgekeurde vertel- en presentatiecyclus blijft exact zoals hij is.

## Definitief stopmoment
- **Technische Free-integratie: GROEN.**
- **Fysieke iPhone/Safari-gebruikersacceptatie: nog éénmaal uitvoeren**.
- **Productieovergang: alleen na expliciet akkoord en een bewezen migratie-/rollback-contract**.
- **10 miljoen: schaalarchitectuur voor 10 miljoen geregistreerde Free-gebruikers structureel beoordeeld**, niet 10 miljoen simultane livegebruikers bewezen. Beperk gefaseerde uitrol met echte CPU, Durable Object-duration, hotspot-/kostenmonitoring (zie F6-BEOORDELING-10M-FREE.md).
- **Premium: niet bouwen, niet testen, niet deployen vóór Free afgerond is.**

Geen extra rondes. Alleen één falende harde acceptatiestap herstellen en opnieuw controleren.

## 9 november 2026 — gerichte reparatie echte iPhone-fout bij Plaatsen

De echte iPhone-screenshot toont: **'Nog niet geplaatst: Het tijdschema met media-ID’s kon niet worden teruggelezen.'** Dit was reproduceerbaar op basis van de **daadwerkelijk goedgekeurde anonieme `/tell`-bron**: op dezelfde pagina bestonden drie IndexedDB-referenties: `talera-memory-store-v1` (originele foto/video/audio + `get`), de editor-`dbOpen()` (concepten, video-posters en finale `taleraV61PersistMediaIds`), plus de verwijderfunctie `talera-v9-complete-delete`. F5 verving tot dan toe alleen de eerste vaste databasenaam door de accountgebonden naam. Daardoor sloeg `mem.save()` media op in de accountgebonden database, maar schreef `taleraV61PersistMediaIds` de finale media-ID-tijdstempels naar een **andere, oude, gedeelde** database. `mem.get()` kon die daarna niet vinden en toonde exact de foutmelding van de screenshot.

**Opgelost en op aparte EU F5-worker uitgerold:**
- `f5-local-scope.mjs` vervangt nu elke bekende originele IndexedDB-databasereferentie in de goedgekeurde ingelogde HTML, veilig en uitsluitend met de account-hash. Daardoor delen opslag, editor en verwijderfunctie de **exactzelfde accountprivate database**. Geen wijziging aan opname-, swipe- of presentatieklokken; geen koppeling naar oude TALERA-backend.
- Na succesvolle opslag gebruikt de originele editor `/mijn-leven?published=local-...`. De F5-gateway stond tot nu toe helemaal geen querystring toe en zou daarom daarna alsnog 404 tonen. Uitsluitend deze lokale succesroute en `/tell?edit=local-...` zijn voortaan toegestaan; willekeurige queries en niet-lokale herinnerings-ID's blijven verboden.
- De bestaande één-klik-testlink behoudt nu bij heropenen een nog geldige originele testsessie, in plaats van telkens een nieuw fictief account aan te maken. Dit voorkomt dat opgeslagen lokale verhalen na heropenen verborgen lijken te zijn.
- [CI-integratietest 42588408218](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42588408218): **GESLAAGD** met 2/1/3 originele databasereferenties respectievelijk op `/mijn-leven`, `/present`, `/tell`, allemaal accountgebonden; test van veilig publiceren/redigeren en hergebruik van één-kliksessie.
- [Echte Cloudflare-stage-deployment en gesloten-gatecontrole 42588408187](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42588408187): **GESLAAGD**. Rechtstreeks lezen van de Cloudflare-Worker bevestigt alle drie wijzigingen; nog zeven aparte DO-namespaces, vijf bestaande geheimen en géén D1/R2/service-binding met TALERA-productie. Automatische herdeploy voor dit hotfix-workflow weer uitgeschakeld.

**Belangrijke iPhone-gebruiksgrens:** een reeds geopend tabblad draait nog de **oude JavaScript** tot de pagina opnieuw wordt geopend. De media die bij de mislukte controle al met `mem.save()` zijn opgeslagen, **kunnen** onder hetzelfde testaccount al zichtbaar zijn in `Mijn leven`. **Eerst controleren voor opnieuw dezelfde herinnering te plaatsen** om duplicatie te voorkomen. Bewaar eventuele huidige foto's/spraak uit een nog open concept, indien mogelijk; een pagina opnieuw laden kan dit concept onzichtbaar maken omdat we geen oude, ongeïsoleerde conceptdata zonder toestemming naar een andere accountdatabase migreren. De foto's in de iPhone-fotobibliotheek worden niet verwijderd.

## 9 november — echte iPhone-fout: video uit gemengde selectie ontbreekt zonder melding

Gebruiker toont vijf foto's in de Free-vertel-editor maar meldt dat er daarnaast bewust een iPhone-video geselecteerd was; geen zesde video-tegel of foutmelding. **De exacte oorzaak in de iOS-fotokiezer is niet vast te stellen uit de screenshot**: de browser kan alleen bestanden doorgeven die de native picker werkelijk aan de pagina verstrekt. De oorspronkelijke code accepteerde al `image/*,video/*`, maar gaf niet duidelijk aan of JavaScript 0 of 1 video had ontvangen. Een video boven de bestaande 95 MB-limiet gaf wel een fout, maar niet altijd blijvend zichtbaar in het editoroverzicht. Bij maximaal zes bestanden was splitsing over meerdere herinneringen geen verklaring, want de goedgekeurde `makeGroups` houdt maximaal zes bestanden samen.

**F5-specifieke gerichte correctie (de goedgekeurde recorder en presentatie blijven exact onaangetast):**
- De editor toont nu een duidelijke telling van de daadwerkelijk lokaal aanwezige media (`5 foto's en 1 video`) én van de laatste selectie die de iPhone daadwerkelijk aan JavaScript heeft doorgegeven. Daarmee wordt een discrepantie zichtbaar, in plaats van stilzwijgend als succes getoond.
- Naast de bestaande `+`-tegel staat een aparte **`▶ Video apart toevoegen`**-knop, die specifiek `.MOV`, `.MP4`, `.M4V` en `video/*` opvraagt. De knop gebruikt daarna de **bestaande** `importPhotos(files,g.id)` van TALERA, het onveranderde originele File-object, dezelfde account-private IndexedDB en de oorspronkelijke media-ID-volgorde.
- Wanneer de iPhone geen video doorgeeft, meldt de editor dit. Onjuist type, lege/iCloud-onbeschikbare video of te groot bestand (huidige Free-testgrens 95 MB) krijgt een expliciete melding. Geen stilzwijgend overslaan.
- Er is niets aan de permanente TALERA-Worker of aan bestaande accounts/mediabestanden veranderd.

**Verifieerbaar bewijs:**
- [Gerichte browser plus 7 DO-regressie 42592146298](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42592146298) **groen**. Twee onafhankelijke fictieve iPhone-Chromium-scenario's: **(a)** vijf echte gegenereerde PNG's en een kleine werkelijke MP4 in één selectie; **(b)** vijf PNG's eerst en daarna een video via de nieuwe aparte knop. Beide tonen 5 foto's + 1 video, bewaren **alle zes originele Blobs** in de eigen IndexedDB en zijn na browser-reload én terugopenen van hetzelfde concept nog intact. Verder geen wijzigingen aan voice, swipe-clock, presentatie of private account-ID.
- [Echte EU-clouddeploy en servercheck 42592547423](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42592547423) **groen**. Rechtstreekse Cloudflare code-/settings-readback bevestigt de F5-only videoknop en telling. Zeven bestaande DO-verbindingen, vijf geheime staging-variabelen intact, nul verbindingen naar oorspronkelijke TALERA D1/R2/productie. Automatische deploy daarna uitgezet.

**Enige echte device-check die nog openstaat:** open dezelfde eenmalige Free-link op de **zelfde iPhone, in dezelfde browsercontext**, zodat het eerder begonnen concept zichtbaar blijft. In de editor eerst bestaande vijf foto's controleren, daarna **Video apart toevoegen** kiezen. Het resultaat moet expliciet **5 foto's en 1 video** tonen en na bewaren/terugopenen afspelen. **Niet op Plaatsen drukken als de video nog op 0 staat.** Als iPhone geen bestand levert of het bestand te groot is, nu de foutmelding gebruiken om uitsluitend dát geval te herstellen. Eén praktische device-acceptatie, geen nieuwe algemene testrondes.

## 9 november 2026 — ‘Bekijk herinnering’ gaf ‘Niet gevonden’ ondanks vijf eigen verhalen

Op de echte iPhone toonde ‘Mijn leven’ **2026 – 5 eigen** en de eigen herinneringsfoto in de achtergrond. Publicatie en lokale IndexedDB-opslag functioneerden dus, maar na ‘Bekijk herinnering’ verscheen `{"ok":false,"error":"Niet gevonden"}`.

**Exacte bewezen oorzaak:** de originele TALERA HTML construeert de aangeklikte kaart met de URL `/present?memory=local-<UUID>`. De F5 Worker liet na de vorige patch uitsluitend `/mijn-leven?published=local-<UUID>` en `/tell?edit=local-<UUID>` toe. Daardoor gaf de nieuwe F5-gateway **404 vóórdat** de oorspronkelijke presentatiepagina en mediaspeler konden laden.

**Gerichte reparatie, geen wijziging aan vertelcyclus of video:**
- In `f5-worker.mjs` staat nu ook precies `/present?memory=local-<ID>` op de beperkte lijst van toegestane lokale navigatielinks. De accountgecontroleerde pagina gebruikt nog dezelfde private IndexedDB, presentatiebron, mediaplayer, voice/cues en per-account-gate.
- Onbekende queryparameters, tweede parameters en externe URL's worden nog steeds geweigerd; er is geen fallback naar bestaande TALERA API's.
- De eerdere vijf eigen herinneringen zijn NIET verwijderd, verplaatst of gemigreerd.

**Tests en bewijs:**
- [Volledige synthetische lokale F5 Cloudflare-/mobiele browsertest 42594668859](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42594668859): **GROEN**. Nieuwe test met echte opgeslagen synthetische video creëert een lokale herinnering, vindt de oorspronkelijke `/present?memory=local-...`-kaartlink onder ‘Mijn leven’, opent de bestaande presentatie met HTTP 200 in de mobiele browser en bevestigt de video in de persoonlijke lokale opslag. Invalide of extra queryparameters blijven HTTP 404.
- [Herhaalde geïntegreerde F5-test 42595071141](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42595071141): **GROEN**.
- [Gerichte EU-Cloudflare-uitrol en afgeschermde-gatecontrole 42595071195](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42595071195): **GROEN**. Rechtstreekse Cloudflare-worker-readback bewijst de toegestane `/present`-memory-route; zeven DO-bindings en vijf bestaande secret-bindings blijven, zonder koppeling naar oorspronkelijke D1/R2/services. Daarna automatische heruitrol uitgezet.

**Resterende fysieke check:** laat de gebruiker de **reeds bestaande** vijf herinneringen openen vanaf ‘Mijn leven’ op exact dezelfde iPhone en browsercontext. Geen nieuwe verhalen aanmaken. Controleer specifiek foto- én videoweergave in het origineel goedgekeurde presentatiescherm. De code is nu live in de aparte F5-stage, niet in de officiële TALERA-link.

## 9 november 2026 — ontwikkeling op expliciet aangewezen design-cleanup-basis

De eigenaar verduidelijkte op 9 november dat `https://talera-design-cleanup-fase1-test-20261107.mark-a39.workers.dev/mijn-leven` **NIET** de officiële voorkeur uit het centrale linkregister is, maar **WEL** een latere ontwikkelbasis waarin stijl, vijf talen en diverse eerdere app-verbeteringen zitten. Nooit verwarren met de officiële `https://talera-account-birthdate-test-20261107.mark-a39.workers.dev/mijn-leven` (gebruikersgoedgekeurd herstelpunt). De design-cleanup Worker is een visuele wrapper op `talera-vijftalen-onderhoud-test-20261107`, die terugloopt naar de bestaande R20-keten; op `/present` wordt doorgegeven naar de ingebouwde **V61 R20 inline**-speler, dus geen oude iframe-speler.

**Nieuwe ontwikkelbasis en behoud van Free-aanpassingen:** `r20-dev/free-10m-delivery/build.mjs` en `r20-dev/free-10m-f5/f5-public-assets.mjs` gebruiken de door de eigenaar aangewezen design-cleanup-origin voor alle anonieme bron-snapshots. Daar bovenop blijven dezelfde Free F5-accountisolatie, 7 DO-bindings, 5 bestaande secrets, per-account lokale IndexedDB, video-importknop, media-ID-opslag en /present-memoryroute actief. Geen D1/R2/service-binding met bestaande TALERA-klantdata.

**Hervalidatie van de ACTUELE speler:** oude synthetic browsercheck op `iframe.talera-zero-present-frame` was fout voor de nieuwere R20 inline-speler en is vervangen. [Volledige lokale F5-integratie / mobiele browsertest 42606061617](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42606061617) **groen**: werkelijk zichtbaar foto 1 → foto 2 en native, zichtbare video op de cue, audio loopt, de originele mediabestanden blijven lokaal, en beide iPhone-like importvarianten bewaren vijf foto's en video. [Na snapshot-bronbevestiging volledig herhaald 42606536199](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42606536199) **groen**.

**Geïsoleerd uitgerold:** [42606536228](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42606536228) **groen** op exact dezelfde F5-testworker en hetzelfde origin: `talera-free-f5-combined-stage-20261108.mark-a39.workers.dev`. De tijdelijke ene-testlink blijft intact; CI-readback bevestigt 7 DO + 5 geheimen, geen D1/R2/service, en bestaande veilige lokale `/present?memory=local-...`. De deployworkflow is weer handmatig/bevroren om bestaande iPhone-sessies en verhalen niet onnodig te verstoren. Geen originele TALERA-worker of centrale PWA-voorkeurslink gewijzigd.

**Nog NIET bewezen:** de daadwerkelijke vijf verhalen zijn niet op het echte iPhone-apparaat door GPT uitgelezen en het iPhone-Safari-resultaat na deze rebase is nog niet door de eigenaar geaccepteerd. Dezelfde origin, sessieopslag en lokale DB-naam bleven behouden; geen media gemigreerd of gewist. De enige resterende stap is na gerichte codecontrole één echte iPhone-presentatiecontrole met een al bestaand verhaal, zonder nieuwe import of registratie. Noteer de werkelijke iPhone-uitkomst voordat de versie wordt vrijgegeven.


## 9 november 2026 — één bestaand zes-media-verhaal blijft op foto 1

De eigenaar meldde op de echte iPhone: de meeste verhalen werken (swipes/taps/gesproken tekst en video), maar één bestaande herinnering met **vijf foto's en één video** blijft op de eerste foto staan, zelfs na Bewerken en opnieuw plaatsen. De editor herkent alle zes originele media (screenshot 12:17); de presentatie toont zes puntjes maar staat op het eerste. **Het eigenlijke datum-ID, de audio-cuestatus en de blobinhoud blijven privé in de IndexedDB van de iPhone en kunnen niet vanuit een Cloudflare-account of GitHub worden uitgelezen.** Niet destructief herimporteren of resetten.

Gerichte bronanalyse van de meest recente door de gebruiker aangewezen design-cleanup-ontwikkelbasis + V61 R20 toont:
- `/tell` bewaart voor alle nieuwe herinneringen standaard `time:'12:00:00'`; bestaande herinneringen kunnen dus eenzelfde tijdstempel delen. De native `nearestMemory` beschermt uitdrukkelijk de actieve memory-ID bij een tie, en de huidige weergave gebruikt die ID. Een geforceerde tap op een afgedekte photoStage gaf aanvankelijk een wissel naar een andere memory-ID, maar **die synthetisch geforceerde interactie is niet representatief voor de echte iPhone**. Herhaald met fysiek hit-tested `#memoryStoryScroll`-taps: de daadwerkelijk zichtbare foto wisselt, beide herinneringen op exact dezelfde datum blijven geselecteerd. Geen datum-/tijdmigratie uitvoeren op basis van de eerdere geforceerde test.
- Werkelijk defect bij Bewerken van reeds ingesproken herinneringen: `boot()` herconstrueert alle originele Files met nieuwe tijdelijke editor-media-ID's, maar kopieert het bestaande `row.narrationCues` met nog oude canonieke opgeslagen media-ID's. De veilige V61 R20 `taleraV61PersistMediaIds` zoekt terecht naar de tijdelijke ID's en faalt anders **na** `mem.save()`. Dat kon een mislukte nieuwe publicatie of een onduidelijke tijdschema-koppeling veroorzaken, zonder dat het originele aantal media ontbreekt.
- Gericht en niet-destructief hersteld met `f5-edit-cue-rebind.mjs` op de bestaande `/tell?edit=`-route: herleid het oorspronkelijke cue-media-ID via de originele `row.items` naar de overeenkomstige **nieuw opgebouwde** editor-ID **vóór** een nieuwe draftwrite. Bewaar exacte cue-tijden, mediavolgorde en videoAtMs. Als een bron-ID ontbreekt, stop veilig zonder de gepubliceerde herinnering aan te passen. De Free-accountdatabase, runtime, audio-opname, foto/player, R20 en de reguliere navigatie blijven ongemoeid.
- `f5-edit-cue-regression.mjs` test het echte editorbronfragment, browser-JS-parse, volledige remap plus foutscenario; [volledige CI inclusief iPhone-achtige presentatietest, 42611215472](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42611215472) **groen**. Met een fictief album vijf foto's plus video, zonder stem, en twee andere verhalen met dezelfde datum: de eerste en volgende originele foto's wisselen zichtbaar bij een native touch; voice+cue test toont foto1→foto2→native video. Tests blijven ondersteunend, geen bewijs van het ene bestaande iPhone-verhaal.
- Gecontroleerde **alleen-F5-stage-uitrol** [42611596789](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42611596789) **groen**, rechtstreeks Cloudflare-codebewijs toont `alignEditedNarrationCueRefs`, behoud originele videoselector, `/present?memory`, per-account-IDB en 7 DO/5 secrets/geen oorspronkelijke D1/R2/services. Automatische herdeployment daarna weer uitgeschakeld. De officiële TALERA voorkeurs-PWA in het ene centrale register bleef ongewijzigd.

**Open:** fysieke iPhone-acceptatie van **juist deze** herinnering na gerichte F5-hotfix. De code kan niet uit remote bronnen afleiden of deze herinnering een eerder opgenomen stemverhaal bevat en welke geldige cues in haar eigen lokale opslag staan. Geen garantie dat deze codewijziging het stilstaande beeld bij een al opgeslagen verhaal volledig herstelt. Eerst onderscheid maken tussen gewone tap-presentatie zonder stem en ingesproken voice+cue-verhaal, zonder bestanden te verwijderen.


## 9 november 2026 — witte strook uitsluitend bij eerste swipe na appopenen

Echte iPhone-screenshots rond 13:36 tonen een eerste overgang tussen bestaande persoonlijke herinneringen waarop de volgende foto rechts eerst wit/licht wordt en daarna pas verschijnt. Bij terugswipen en opnieuw dezelfde overgang is het beeld meteen zichtbaar. Dit is een **eerste-load/decode-performantieafwijking**, geen bewijs van corrupte originele foto's of verkeerde media-ID's. De huidige goedgekeurde RH19-`renderJourneyPreview()` schuift `left.image` en `right.image` al in de afzonderlijke zichtbare lagen zodra de swipe begint, maar de lokale adapter heeft de **volgende** account-private foto dan mogelijk nog niet uit IndexedDB geladen/`img.decode()` voltooid. Een reeds lokaal gecachete afbeelding heeft deze vertraging niet. Bijna wit correspondeert ook met de bestaande lichtkleurige `placeholder`.

**Gerichte niet-destructieve Free F5-correctie** `f5-neighbor-preview.mjs`:
- uitsluitend op `/present` in de bestaande, user-selected design-cleanup-ontwikkelbasis, bovenop alle Free-functies;
- prewarm bij koude start maximaal **één voorafgaande en één volgende** account-eigen herinnering; laad via bestaande `hydrate()`/private `TaleraMemories` en decode alleen **de eerste foto** vooruit; geen volledige video-/audiodecode, opslagkopie, cloudverzoek of nieuwe database;
- zolang de buurherinnering nog `_photoLoading` is, gebruikt de oorspronkelijke RH19-overgang het reeds zichtbare beeld als tijdelijke bron in plaats van de lichtgekleurde placeholder. De goedgekeurde overgangsduur, `1-p`/`p`-opaciteit en horizontale transformaties blijven precies ongewijzigd;
- vertelcyclus, media-ID's, originele Blob-data, per-account-IndexedDB, vijf verhalen en gecertificeerde officiële PWA worden niet aangeraakt.

**Bewijs:** [Volledige geïntegreerde CI + Chromium mobiele scenario's 42619763954](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42619763954) groen: nieuwe precieze bron- en syntaxcontrole `TALERA_F5_FIRST_SWIPE_BOUNDED_PREWARM` geslaagd (30 bestaande presentatiescripts parsebaar, max. twee buren, RH19-animatie en vertelcyclus intact); echte synthetische foto-/videoplayback en accountisolatie blijven groen. [Echte afzonderlijke EU-stage-uitrol 42620079538](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42620079538) groen, Cloudflare-code-/bindingsreadback bevestigt de nieuwe begrensde prewarm, 7 DO-bindings, 5 secrets en nul verbindingen naar oorspronkelijke D1/R2/service. Workflow na geslaagde uitrol weer handmatig bevroren.

**Open praktijkacceptatie:** dezelfde iPhone-browser en bestaande herinneringen opnieuw openen en uitsluitend de **allereerste** swipe controleren op witte strook. Er is nog geen bewijs dat ook de eerste koude overgang op echte iPhone iOS WebKit volledig witvrij is. Als hij nog optreedt, dan browser-instrumentatie voor de echte eerste `img.decode()`-wachttijd zonder de werkende vertelcyclus te veranderen. Geen versieregisterpromotie zonder Mark.

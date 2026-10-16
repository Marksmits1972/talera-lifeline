# TALERA — Levenslijn als hoofdpagina, verbonden met RH19

**Status: broncode gebouwd en apart opgeslagen. Nog niet live op Cloudflare of op iPhone getest.**

Werkbranch: work/r19h2-lifeline-main-20261014.

## Beschermde referenties
- Goedgekeurde RH19: reference/prototype-free-final-r19h2-20261001
- Geïsoleerde RH19-presentatie en vertelroute: archive/r19h2-presentation-live-route-20261013
- Bevroren Life Space: freeze/life-space-definitief-20261008

Niets wijzigen op die branches of op de originele Cloudflare Worker talera-r19-reference.

## Opgeleverd in deze aparte versie
1. Nieuwe hoofdpagina: jaren, maanden en zeven verhaalkaarten rond één vaste centrale middenmarker.
2. Alle drie niveaus blijven gekoppeld in dezelfde tijdpositie; snel of langzaam bewegen zonder snap.
3. Zichtbaar bewegen van foto's met rustige, afgeremde grote preview; stoppen kiest de dichtstbijzijnde herinnering.
4. Filters op meerdere afzonderlijke tags, OF-logica. De huidige tijdpositie blijft staan, ook als een jaar daardoor leeg is.
5. Dateringslogica: exact/maand/seizoen/jaar; grove datums worden binnen de betreffende periode zelfstandig en gelijkmatig verdeeld. Winter is december van vorig jaar plus januari/februari van opgegeven jaar. Een grove oorspronkelijke datum blijft als grove datum zichtbaar.
6. Vinger langer op een verhaal: vastpakken, slepen naar de maandkolom, maand aanwijzen, naar rechts en tussen twee verhalen plaatsen; datering wordt opzettelijk aangepast bij een nieuwe maand. Ongedaan maken is zeven seconden beschikbaar. Demonavigatie bewaart wijzigingen lokaal in de browser.
7. Werkt met exact dezelfde 50 oorspronkelijke RH19 demo-ID's, afbeeldingen en teksten.
8. /present?memory=ID laadt het bestaande RH19 presentatiescherm op het geselecteerde verhaal, met een extra terugknop naar de nieuwe hoofdpagina.
9. /tell opent de bestaande vertelpagina als uitsluitend-lezen demonstratie; POST/PUT/PATCH/DELETE worden volledig geblokkeerd. Geen koppeling met de echte database of mediabucket.

## Bestanden
- experiments/lifeline-main/index.html — complete mobiele hoofdpagina.
- experiments/lifeline-main/demo-memories.js — de oorspronkelijke 50 herinneringen plus demonstratieve tags.
- experiments/lifeline-main/worker.js — adapter naar de bestaande RH19-schermen.
- experiments/lifeline-main/wrangler.jsonc — strikt gescheiden Worker-configuratie.
- test/lifeline-main.test.mjs — inhouds-, veiligheids- en syntaxcontroles.

## Test en publicatie
Run vanuit repository-root:

    node --test test/lifeline-main.test.mjs
    npx wrangler deploy --dry-run --config experiments/lifeline-main/wrangler.jsonc

Daarna uitsluitend in de nieuwe testomgeving publiceren:

    npx wrangler deploy --config experiments/lifeline-main/wrangler.jsonc

**Worker-naam: talera-r19-lifeline-main-dev. Niet talera-r19-reference.** De originele rootconfiguratie is niet voor deze proef.

Routes: / voor nieuwe hoofdpagina, /api/demo-memories voor de 50 demo-items, /present?memory=ID voor presentatie, /tell voor de read-only vertelroute.

## Beperkingen / acceptatietest
Nog geen echte Cloudflare-live-link, Safari/iPhone-handtest of duurzame serveropslag bevestigd. Demo-versleepwijzigingen zitten alleen in localStorage op de testtelefoon. Er is een eigen test-D1/R2 nodig voor echte opslag. Test op iPhone vooral het snel/langzaam scrollen, positie zonder vastklikken, wisselen bij lege jaren, meerdere tags, grof gedateerde verhalen, slepen/Undo, behoud na herladen, alle 50 previews, RH19-presentatie en de terugknop.

## Deployment activation

De afzonderlijke GitHub Actions deploy wordt na het instellen van de beveiligde repository secrets en de expliciete variable geactiveerd via een wijziging op deze werkbranch. De beschermde R19H2-basis blijft onaangeroerd.

## v5 — Volledig scherm / PWA-basis (14 oktober 2026)

- De goedgekeurde interactieve levenslijn draait nu zonder ingekaderd telefoonvenster: volledige browserbreedte en volledige bruikbare viewporthoogte, zowel op telefoon als op pc.
- Voor standalone gebruik op iPhone worden de iOS safe areas gerespecteerd; het scherm toont geen externe browserbalk wanneer het via Safari → Deel → Zet op beginscherm geopend wordt.
- `/manifest.webmanifest` en PNG-icons (180/192/512) ondersteunen installeren op het beginscherm.
- `/sw.js` is strikt *network-first* zonder cache van herinneringen of pagina's, zodat nieuwe testversies niet door een oud appcache blijven hangen. Offline wordt alleen een simpele foutmelding getoond.
- Levenslijn, Presentatie en Vertellen houden hun eigen routes (`/`, `/present`, `/tell`); het bestaande RH19 en de vertelcode zijn niet gewijzigd.
- De oorspronkelijke v4 blijft veilig bestaan in `visual-v4.html`; nieuwe actuele startpagina is `visual-v5-fullscreen.html`.

## v6 — Swipe-stabiliteit (15 oktober 2026)

- De body staat vast aan het iPhone-scherm; een verticale veegbeweging verplaatst niet meer de hele webpagina.
- Jaar-, maand- en herinneringsspoor blijven los bedienbaar met vinger, muis en toetsenbord. Zoom met twee vingers blijft toegestaan.
- Een iOS/WKWebView-vangnet voorkomt native eenvinger-bewegen van de pagina; na pointercancel start geen ongewenste momentumbeweging.
- Onbedoeld verslepen van losse foto's is uitgeschakeld. Bestaand ontwerp, voorbeeldherinneringen, PWA en ELP/RH19-koppelingen blijven gelijk.
- **Beperking:** ChatGPT's ingebouwde browser kan als externe vensterlaag alsnog met een systeemgebaar wegschuiven. Gebruik daarom de bestaande installeerbare TALERA-PWA via Safari → Delen → Zet op beginscherm.
- Terugvalversie blijft bewaard in `visual-v5-fullscreen.html`.

## V7 — Fotobalans, leesbaarheid en rust (15 oktober 2026)

- **Nieuwe actuele PWA-home:** `visual-v7-photo-balance.html`. V6 blijft ongewijzigd aanwezig als snelle visuele terugval; bovendien staat vóór deze bouwronde een eigen backup-branch.
- De levensfasekolom is op mobiele schermen smaller, maar de leeftijdsfoto's blijven herkenbaar en krijgen duidelijke kaders. De herinneringspreview wint effectieve hoogte.
- De maanden staan in een eigen, beter leesbare strook; verhaalkaartjes beginnen pas ná die strook en hebben geen conflicterende tekst-overlap.
- Herinneringstitels mogen twee regels innemen; hoofdmeta (datum/plaats) krijgt meer contrast zonder onnodig groot te worden.
- De grote herinneringsfoto blijft beeldbepalend; het beschrijvingspaneel is compact maar leesbaar en begrenst lange tekst netjes.
- Bij scrollen volgt de maandenschaal de fractionele vingerbeweging; het onrustige versnellen/afrollen na loslaten wordt gedempt. Door story drag ontstane ghost clicks worden onderdrukt.
- De eerder kapotte compacte CSS-mediaquery voor korte mobiele schermen is hersteld.
- De ongewijzigde RH19-presentatie, vertelpagina, bestaande demogegevens en PWA-installatieroute blijven gekoppeld.
- Tests zijn uitgebreid met fotobalans, leesbaarheid, syntaxis, swipegedrag en presentatiehandoff.
- **Status:** codekandidaat. GitHub CI en live deploy volgen automatisch; echte mobiele acceptatie door de gebruiker blijft nodig.

**Terugval:** `backup/lifeline-pwa-v6-before-visual-balance-20261015` (en in dezelfde map `visual-v6-swipe-stable.html`).

## V8 — grotere leeftijdsfoto's en verbonden multimedia-test (15 oktober 2026)

- **Actuele startpagina:** `visual-v8-photo-space.html`. V7 is afzonderlijk beschermd in `backup/lifeline-v7-before-multimedia-20261015`; de V7-bron blijft in de map staan.
- Leeftijdsfoto's krijgen meer van de bestaande linkerkolom, door leeftijdlabels compacter te maken in plaats van de maand- en herinneringskolom ruimte af te nemen.
- Nieuwe `/tell`-testpagina: titel, datum, plaats, vrije tekst, optioneel geboortejaar, selectie van foto's en video's op iPhone, microfoonopname (MediaRecorder) met terugluisteren.
- Testherinneringen worden als één record in de browser-IndexedDB vastgelegd met aparte Blob-bestanden per foto, video en audio. **Deze lokale opslag is geen cloud-back-up en synchroniseert niet tussen apparaten.**
- Nieuwe herinneringen worden onder het kenmerk **Mijn verhalen** op hun gekozen datum in de bestaande V8-tijdlijn ingevoegd. Leeftijdsfoto's kiezen bij voorkeur een foto uit dat levensjaar.
- Aanraken van een eigen herinnering opent `/present?local=ID`: presentatie met foto/video-carousel, optionele audio en verhaaltekst. De bestaande RH19-demopresentatie blijft onveranderd.
- De test-Worker blijft **GET/HEAD-only** en heeft **geen D1/R2-binding**. De bestaande live omgeving, RH19-bronnen en persoonlijke opslag worden niet gewijzigd; deze eerste bouwronde test uitsluitend de UI- en gegevensketen.
- **Vervolg voor volledige productfunctionaliteit:** aparte beveiligde D1/R2-configuratie met gebruikersauthenticatie, autorisatie per herinnering, uploadcontrole, media streaming, quota, back-up/restore en end-to-end tests. Niet stilzwijgend het bestaande R2/D1-account openen.
- **Belangrijk bij testen:** alleen wegwerp-testbestanden gebruiken. Bij wissen van Safari/PWA-sitegegevens of verwijderen van de PWA kan lokale data verdwijnen. Een verhaal op iPhone verschijnt niet op de TV/andere browser voordat veilige synchronisatie klaar is.

## V9 — PWA-logo en versiecontrole zonder dataverlies (15 oktober 2026)

- **Huidige V9 is V8 met update/branding:** `visual-v8-photo-space.html` blijft de ongewijzigde visuele en functionele basis. De test-Worker identificeert de nieuwe build via `x-talera-build: talera-lifeline-v9-brand-auto-update-20261015`.
- **Goedkeurd merkbeeld:** `TALERA_LOGO_PRIMARY.png` uit Google Drive (bestands-ID `1TGPkhoNaRzt7M41C_hHPwzS4R9lVfsbZ`) is onveranderd overgenomen als Apple touch icon (`/talera-brand-v9.png` en het compatibele pad `/apple-touch-icon.png`), als PNG-favicon en als SVG-merkicon voor het manifest. De bron is 179×174 pixels. De bestaande 192/512-pixel PNG's zijn voor overige apparaten voorlopig behouden als fallback; voor het definitieve merkbeeld op alle platforms moeten hier later nog officiële gerasterde exports van worden gemaakt.
- **Actuele versie:** `GET /api/version` geeft de huidige build terug, met `cache-control: no-store`. Opnieuw openen of terugkeren naar de **tijdlijn** controleert dit en laadt bij een nieuwere build automatisch de pagina opnieuw, met een herlaad-lusbeveiliging. Vertel en Presentatie worden niet automatisch herladen om onafgemaakte input of mediaplayback te beschermen.
- **Diagnose in menu:** de knop `Controleer appversie` toont de huidige codeversie en herkomst (`location.origin`), plus hoeveel gebruikersherinneringen in de lokale IndexedDB op dit apparaat uitleesbaar zijn. Dit is een read-only controle, geen synchronisatie of cloudback-up.
- **Opslagbescherming:** er is geen code die IndexedDB, cookies, localStorage of de geïnstalleerde PWA verwijdert. Testherinneringen blijven beperkt tot de bestaande origin/browsersandbox en zijn zonder cloud-back-up niet gegarandeerd bij wissen van websitegegevens of verwijderen van de PWA.
- **iOS-beperking:** een reeds geïnstalleerd iPhone-homescreenpictogram kan door iOS worden gecachet; JavaScript kan het OS-pictogram niet afdwingen. Verwijder de bestaande installatie niet zolang testherinneringen niet zijn veiliggesteld. Controleer eerst via het menu of het pictogram dezelfde `workers.dev`-origin opent als de nieuwste ontwikkelversie.
- **Herstelpunt:** `backup/lifeline-v8-before-pwa-logo-updates-20261015` op de vorige V8-commit. Productie, historische RH19 en andere Workers zijn niet gewijzigd.
- **Nazorg:** na de eerstvolgende echte iPhone-check bevestigen of de oude homescreen-installatie V9 laadt, en welk pictogram iOS laat zien. Een app-update is niet hetzelfde als het automatisch vernieuwen van een OS-home-icon.

## V10 — Foto's eerst, spreken bij grote beelden, daarna aanvullen (15 oktober 2026)

**Alleen de geïsoleerde ontwikkel-Worker** `talera-r19-lifeline-main-dev`; eerdere V9 veiliggesteld als `backup/lifeline-v9-before-media-first-story-20261015`. De visueel goedgekeurde V8-tijdlijn en originele RH19-presentatie blijven herkenbaar.

1. **Media eerst:** tot tien foto- en videobestanden in één herinnering. Per afbeelding SHA-256-detectie van dubbele inhoud (voor grote video's een hash van begin+einde+lengte om iPhone-geheugen te sparen). Dubbelen worden overgeslagen, niet verwijderd uit de iPhone-fotobibliotheek. Tik op × om een gekozen beeld te verwijderen. Volgorde met vinger of muis wijzigen via het ☰-greepje; swipen tussen beelden. Eerste foto in de geordende reeks is de omslag van tijdlijn en eigen presentatie.
2. **Grote fotostudio bij opname:** opname start op expliciete gebruikersactie, grote foto/video met links/rechts-veeg of knoppen, opnametimer en zichtbare stopknop. Navigeren onderbreekt de MediaRecorder-audio niet. Audio wordt apart opgeslagen na bevestiging van de gehele herinnering. Ook zonder beelden is een gesproken of geschreven herinnering mogelijk.
3. **Letterlijke transcriptie:** waar `SpeechRecognition` / `webkitSpeechRecognition` in de browser beschikbaar is, kan de gebruiker bewust toestemming geven om die te proberen. Deze browserdienst kan spraak buiten de lokale app verwerken: daarom opt-in, nooit standaard aan. Weergave is letterlijk de tekst die de browser herkent, géén AI-herschrijving. De tekst blijft bewerkbaar. Als de browser het niet ondersteunt, kan de gebruiker de opname bewaren en handmatig tekst invullen; **automatische transcriptie is dus nog niet gegarandeerd op iPhone**.
4. **Titel en datering als derde stap:** zelf ingevoerde titel, keuze tussen exacte dag, maand, jaar of periode. De zichtbare tijdlijn en presentatie tonen die precisie en verzinnen geen dag. Een knop voor een *echte* AI-titel staat herkenbaar maar uitgeschakeld totdat veilige AI-integratie beschikbaar is.
5. **Zonder zwevende onderste balk:** de Vertel-app bestaat uit een viewport-grid met vaste kop, eigen scrollend middenpaneel en onderste navigatie in een aparte rij. De grote opnamestudio heeft een eigen scherm met altijd zichtbare knoppen. Dit moet op een echte iPhone nog handmatig worden goedgekeurd.
6. **Lokaal schema uitgebreid zonder dataverlies:** oude records blijven leesbaar. Nieuwe metadata bewaart `datePrecision`, optioneel `dateEnd` en `transcriptionStatus`, daarnaast de bestaande mediaitems in geselecteerde volgorde (max. 10 beelden + 1 audio). Geen D1/R2-schrijfrechten, geen massaopslag, geen cloudback-up, geen multi-device sync.
7. **Acceptatie vóór goedkeuring:** voeg 3 foto's + 1 video toe; controleer duplicaatfilter, verwijderen en met vinger slepen; blader door beelden terwijl microfoon loopt; stop, luister terug, controleer transcript (of handmatige invoer), kies een maand/jaar/periode en bewaar. Controleer vervolgens volgorde en omslag in Tijdlijn én Presentatie. Herhaal met tekst-only, alleen audio en bestaande V8-herinneringen. Gebruik uitsluitend wegwerp-testmateriaal.

**Technische verificatie:** bron- en gedragstests + Cloudflare smoke tests zijn geautomatiseerd. Audio/video-opname, iOS-spraakherkenning en slepen moeten op een echte iPhone worden getest, die tests kunnen niet door GitHub CI worden bewezen.

## V11 — TALERA Free: 25 foto's importeren, maximaal zes per herinnering (16 oktober 2026)

- **Back-up van ongewijzigde V10**: `backup/lifeline-v10-before-free-bulk-20261016` op commit `57e88861a39c47efe4a72e42a4a09092c4023262`. Geïsoleerde werkbranch en Worker blijven `work/r19h2-lifeline-main-20261014` en `talera-r19-lifeline-main-dev`, met ongewijzigde `workers.dev`-URL. Geen wijzigingen aan originele RH19, V9-logo of de commerciële website.
- **Free eerst**: 100% lokaal in IndexedDB, geen AI, geen cloud, geen betaalde services, geen server-opslag of authenticatieschijn. In de gewone Vertel-flow maximaal zes foto's/video's plus apart het audiobestand. Geen AI-titelknop of automatische spraakherkenning in Free. Mensen kunnen wel zelf schrijven en gewoon audio opnemen. Premium blijft een afzonderlijke latere uitbouw.
- **Bulkimport op /tell**: één intuïtieve keuze 'Meerdere foto's toevoegen', maximaal 25 foto's per selectie. SHA-256 vergelijkt bestandsinhoud en slaat gelijke foto's in die selectie over. JPEG EXIF DateTimeOriginal/DateTimeDigitized/DateTime wordt lokaal gelezen als opnamedatum en -tijd. *Geen aannames* op basis van gewijzigde bestandsdatums wanneer oorspronkelijke opnamedata ontbreken; datums zonder bruikbare JPEG EXIF blijven onbekend en worden gevraagd vóór opslaan. HEIC/PNG kunnen in deze versie mogelijk geen datum leveren.
- **Chronologische automatisch voorgestelde blokken**: sorteren per opnamedatum en tijd (vroegste vooraan). Iedere andere kalenderdag vormt een nieuwe herinnering; bij meer dan zes foto's op dezelfde dag splitst Free deterministisch naar een volgende herinnering op dezelfde datum. Uit 25 foto's met 25 verschillende dagen ontstaan 25 afzonderlijke kaarten. Maximaal zes per kaart, ongeacht aantal kaarten.
- **Bewerken in de kaart**: foto's verwijderen zonder de origineel gekozen foto op het toestel te verwijderen, met ☰ binnen en tussen kaarten slepen, blokkeren als bestemmingskaart al zes foto's heeft. De kaart verdwijnt automatisch wanneer de laatste foto is verplaatst of verwijderd. Bij handmatig mengen van datums is de kaartdatum leidend totdat de gebruiker die aanpast. Een los blok toevoegen uit een groep kan met één knop.
- **Per kaart apart inspreken** in beeldvullende bladerstudio (met expliciete start/stop), optioneel eigen titel of zelf geschreven tekst. Per kaart bewaren óf alle kaarten achter elkaar lokaal bewaren. Alleen *bewaarde* kaarten verschijnen in de tijdlijn. Bij het bewaren verschijnt een directe link naar `/tell?edit=local-id`; de gewone Vertelpagina kan bestaande herinneringen inclusief oorspronkelijke foto- en audio-items opnieuw openen, aanpassen en atomair vervangen zonder de ongewijzigde originelen te wissen vóór commit. De historie of versie-back-up van iedere individuele wijziging is nog niet uitgewerkt.
- **Grenzen**: bulkselectie is voorlopig foto's en geen video's; max 20 MB per foto; video blijft mogelijk via één herinnering. De importvoorstellen bestaan in browsergeheugen totdat men op Bewaar drukt: bij herladen of sluiten kunnen *nog niet opgeslagen* bulkconcepten verloren gaan. Geplaatste bestanden en opgeslagen herinneringen zijn niet gesynchroniseerd en verdwijnen mogelijk bij app- of sitegegevens wissen. Gebruik testfoto's, geen waardevolle originelen.
- **Acceptatie op echte iPhone**: probeer 12 foto's van één dag (= 2 kaarten), 25 foto's met 25 datums, ontbrekende EXIF, dubbel bestand, verslepen van een enige foto (lege kaart weg), verplaatsen naar volle kaart (weigering), narratie bij foto en bewaren, alle 25, terug naar tijdlijn, `?edit`-route, PWA-verversing en bestaand V10-herinneringenbestand. Automatische tests bewijzen browsergedrag en iOS-fotorechten niet.

**Integriteitsregel voor conceptkaarten:** een kaart met alleen gesproken of geschreven inhoud mag nooit automatisch worden weggegooid wanneer de laatste foto is verwijderd. Alleen volledig lege conceptkaarten verdwijnen.

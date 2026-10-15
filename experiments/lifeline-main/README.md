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

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

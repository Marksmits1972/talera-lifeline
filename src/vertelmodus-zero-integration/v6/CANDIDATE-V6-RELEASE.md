# TALERA V6 — datum standaard vandaag, gevonden herinnering op tijdlijn

**Datum:** 28 oktober 2026. **Status:** aparte kandidaat gebouwd; gecontroleerd in mobiele Chromium-browser; **nog niet door eigenaar op iPhone getest of geaccepteerd**.

## Behouden / rollback
- Bevroren V5 Worker: talera-pwa-vertel-eenvoud-v5-test; deployment 34cd6fad-c289-4d60-8e3f-964672836075; niet gewijzigd.
- Eerdere V4/V3/V2/zero-integrated Workers blijven onaangeroerd.
- Nieuwe V6 Worker: talera-pwa-datum-tijdlijn-v6-test
- Testlink: https://talera-pwa-datum-tijdlijn-v6-test.mark-a39.workers.dev/tell
- Tijdlijn: https://talera-pwa-datum-tijdlijn-v6-test.mark-a39.workers.dev/mijn-leven
- Cloudflare deployment 377c1a84-2e4f-4de8-892b-f1fc2801b8b2; version 347ceb42-b625-4329-8083-9556bfb7c7a9.
- GitHub branch feature/datum-tijdlijn-v6-20261028 (afgetakt van V5).
- Deze branch documenteert de wijzigingen aan de V5 Cloudflare-bundel. De historische volledige PWA heeft nog geen volledig reproduceerbare GitHub-CI-build.

## Oorzaak en wensen
Eigenaar meldde dat gekozen datum 1 januari niet leidde tot zichtbaar resultaat en een nieuwe herinnering steeds begon met "Datum nog te kiezen". Screenshot toont onvoltooide datumdialoog: zonder bevestiging werd er nog geen geldige g.date opgeslagen. V5 kende nieuwe concepten zonder datum; de datumkiezer toonde bij alleen jaartal standaard 1 januari. Bovendien leidde publiceren naar /mijn-leven, waar de herinnering zonder expliciete dagfocus voor gebruiker moeilijk terug te vinden kon zijn (en presentatie staat niet automatisch op een datum als die niet expliciet via memory-ID is geopend). Eerdere testversies gebruiken elk hun eigen origin+IndexedDB: op V5 opgeslagen herinneringen verschijnen niet automatisch op V6.

## Bouw V6 (noodzakelijke wijzigingen, niet elders)
1. De al bestaande `today()` helper leest de **lokale datum van de browser**. Nieuwe fotoloze concepten, nieuwe foto-importgroepen, en via "nieuwe herinnering" tijdens verplaatsen gemaakte concepten beginnen met g.date=today(), g.precision='exact', dateSource='creation', dateConfirmed=true. Foto-EXIF mag nog bepalen hoe een reeks >6 wordt gegroepeerd, maar **de herinneringsdatum zelf start altijd op vandaag**, zoals de eigenaar wil. Het is uitsluitend een initiële default bij maken, geen automatische wijziging bij heropenen en geen overschrijven van handmatig gekozen datums.
2. De bestaande datum-editor blijft beschikbaar met het huidige dagveld ingevuld. Een gebruiker kan bewust een datum in het verleden kiezen; die wijziging wordt in hetzelfde g.date opgeslagen. Validatie voorkomt toekomstdata; mem.save ontvangt de exacte gekozen date, en mem.get controleert de opgeslagen id vóór conceptopruiming.
3. De V4 route naar /mijn-leven?published=<id> blijft behouden zodat publiceren altijd eerst zichtbaar is in Mijn leven. V6 injecteert **alleen op die route** een compacte succeskaart na onafhankelijke `TaleraMemories.get(id)` bevestiging, met exacte bewaarde datum en één actie "Bekijk herinnering". Deze opent `/present?memory=<id>`, zodat de RH19 runtime exact de opgeslagen historische herinnering centreert, in plaats van bij de huidige datum te beginnen. De oude V4 korte melding wordt alleen verborgen wanneer V6 verificatie geslaagd is. Geen nieuwe algemene knoppen of tweede mediasysteem.
4. Geen veranderingen aan de Vertelmodus, foto-/video-ordening, stemopname en wisselmomenten, extra originele videoronde of logo.

## Reële geautomatiseerde browserproeven (390 × 844 iPhone-achtige viewport)
- Alle routes `/`, `/tell`, `/mijn-leven`, `/present`, `/vertelmodus-embed?mode=record` en health openen zonder Worker-fouten.
- Nieuw fotoloos concept: lokale klok 2026-10-28, `dateToggle = 28 oktober 2026`, `precision=exact`, datuminput `2026-10-28`.
- Import van twee originele SVG-foto's: huidige datum automatisch zichtbaar; daarna veranderd naar `2026-01-01` met bestaand datumveld, na bevestiging blijft gekozen "1 januari 2026" in het werkblad staan.
- Tekstherinnering met handmatig gekozen 1 januari 2026 via gewone werkblad-UI gepubliceerd; werkelijk op /mijn-leven verschenen. V6-succesmelding bevat "Op je tijdlijn geplaatst · 1 januari 2026" plus klikbaar pad /present?memory=local-<id>.
- Herhaalde proef met een echt geïmporteerde synthetische foto en 1 januari 2026: record in Mijn leven aanwezig; opslagbevestiging en exacte memory-link aanwezig.
- Afzonderlijke opslagproef met foto, lokaal opgeslagen WAV-stem en narrator cues van januari 2026; `/present?memory=local-...` opent het juiste historische verhaal en een `talera-zero-present-frame` iframe.
- Dit zijn browsertests, geen echte Safari-iPhone-test met microfoon/HEVC.

## Nog open iPhone-acceptatie
1. Open V6, voeg een nieuw moment toe: **zonder datumkeuze** toont bewerken meteen de huidige lokale datum. Controleer na "Op mijn tijdlijn plaatsen" de melding met "Bekijk herinnering".
2. Kies bewust 1 januari of andere historische datum; bevestig en controleer dat dezelfde datum in bewerken staat, daarna publiceren, in Mijn leven zien en via "Bekijk herinnering" op precies dat moment in de presentatiemodus terechtkomen.
3. Maak opname met bestaande Vertelmodus, druk Klaar, daarna **Op mijn tijdlijn plaatsen**, en controleer dat audio met de juiste foto/video-tijdstempels wordt afgespeeld.
4. Onderzoek iPhone PWA/ChatGPT-webview IndexedDB-isolatie, Safari/cache en video sound; V5-gegevens blijven op V5-origin. Niet wissen of migreren zonder apart overeengekomen dataplan.

**Geen CURRENT of productiepromotie, geen merge, voordat de gebruiker de werking goedkeurt.**

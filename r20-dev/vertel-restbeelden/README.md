# TALERA V10 — Ontbrekende foto's na stemopname

**Status:** onafhankelijke test-Worker, 5 november 2026; na de eerste iPhone-proef heeft V10 een tweede, gerichte correctie gekregen. Nog te accepteren op iPhone.

## Doel

Als de gebruiker bijvoorbeeld zes foto's aan een herinnering toevoegt en de stemopname al stopt na het bespreken van de derde foto, mogen de overige foto's niet worden overgeslagen. TALERA toont na afloop van de bestaande ingesproken stemcyclus automatisch de foto's zonder een eigen stem-tijdcode. Daarna volgt **ongewijzigd** de al bestaande tweede ronde waarin video's hun oorspronkelijke geluid hebben.

Volgorde: `voice + tijdcodes → niet besproken stilstaande foto's → originele video's met geluid → klaar`.

## Implementatie

- Nieuwe, strikt geïsoleerde Worker `talera-vertel-restbeelden-v10-test-20261105`; **alleen** GET `/vertelmodus-embed` wordt geadresseerd. De overkoepelende pagina en de oorspronkelijke HTML/CSS/speler blijven intact. De oorspronkelijke `voice.ended`-afhandeling is in de tweede correctie weer **letterlijk ongewijzigd**. Enkel de aanroep van de bestaande videoronde wordt omgeleid: eerst onbesproken foto's, daarna de originele videoaanroep.
- Worker-code: `r20-dev/vertel-restbeelden/vertel-restbeelden.worker.mjs`.
- Op basis van de bestaande opgeslagen `cues[].index` bepaalt een zuivere functie welke `state.items` van type `image` nog niet bij een gesproken tijdcode voorkwamen. De koppeling via de oorspronkelijke `g.media`-volgorde blijft behouden.
- Alleen die foto's worden in hun originele volgorde getoond, **4 seconden per foto**. Alle oorspronkelijke video-items worden uitgesloten van deze fotoreeks; via de apart bewaarde originele functie `taleraV10SavedStartOriginalVideoRound()` speelt daarna exact dezelfde originele videocode de oorspronkelijke video's met geluid af.
- Wanneer alle foto's al besproken zijn, start de oorspronkelijke videoronde direct zoals vroeger. In de recorder en de editor wordt de presentatie-uitbreiding niet uitgevoerd. Bij `INIT`, `PAUSE_PLAYER` of het sluiten van de iframe worden geplande foto-timers opgeruimd.
- Geen wijziging aan de opgeslagen stem-`Blob`, `narrationCues`, `voiceCues`, geluidsduur, oorspronkelijke foto- of video-ID's, originele microfoonbesturing, beeldformaten, volgorde van video's, IndexedDB, R2, D1, betaalde diensten of Free/Premium.
- De patch vereist de originele `voice.ended`-afhandeling en precies **één** herkenbaar punt onmiddellijk na `taleraStartOriginalRound()`. Bij ontbrekend/dubbel invoegpunt wordt de speler onveranderd doorgestuurd en meldt de diagnoseheader `anchor-unmatched`. Het eerdere vervangen van de `voice.ended`-afhandeling is bewust volledig teruggedraaid.

## Staging en bescherming

- Testlink: https://talera-vertel-restbeelden-v10-test-20261105.mark-a39.workers.dev/
- Eigen GitHub-branch: `feature/talera-vertel-restbeelden-20261105`
- Enige binding: `STYLE_BASE` → `talera-v9-stille-luxe-stijlstaging-20261104`
- De werkende stijl-Worker blijft versie `bc36d913-49f8-4f4d-b00d-3d5894a11146`.
- De oorspronkelijke beschermde V9 blijft versie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`.
- Cloudflare V10-versie: `8b6a2a29-4487-4fe7-8ecc-f63464321331`, deployment `73cdd0f9-cfbe-4638-b823-f5eaf0cb72d1`.
- Regressie: de tweede correctie doorstaat 16 Node-tests, waaronder precies zes geüploade media-ID's met vier gesproken koppelingen en twee ontbrekende foto's; 5 read-only live routes. Live-controle: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42019850303.
- Cloudflare-bron teruggelezen: exact gelijk aan GitHub-bron.

## Test op iPhone

1. Open de aparte testlink **zonder de bestaande TALERA-PWA te verwijderen**. Deze nieuwe host heeft een eigen IndexedDB en ziet dus niet automatisch bestaande lokale herinneringen op andere TALERA-URL's.
2. Maak een tijdelijke herinnering met zes foto's, of bijvoorbeeld vier foto's en twee video's.
3. Spreek alleen over de eerste twee of drie foto's; stop de stemopname vóór de andere beelden. Rond af volgens de bestaande workflow.
4. Speel de herinnering in presentatiemodus af. Controleer of het ingesproken deel de bestaande cuefoto's volgt, daarna alle niet besproken foto's éénmaal in de oorspronkelijke volgorde verschijnen, en als laatste de opgenomen video's met origineel geluid worden afgespeeld.
5. Herhaal met een opname waarin **alle** foto's zijn besproken; dan mag er géén extra fotoreeks komen.
6. Wis of herstel de normale app niet vanwege deze test. Bij onjuist gedrag is de rollback simpel: stop gebruik van de aparte V10-testlink; de beschermde basis is niet veranderd.

## Uitgangspunt voor toekomstige integratie

De code is voorlopig uitsluitend een **afspeeluitbreiding**: de oorspronkelijke, onzichtbare stem-tijdlijn wordt **niet herschreven**. De reeks wordt iedere keer uit de blijvend opgeslagen media en gesproken cues afgeleid, waardoor bestaande herinneringen niet worden gemuteerd. Definitieve goedkeuring vereist een echte iPhone-test met gemengde foto-/video- en opnamegegevens.

## 5 november, tweede correctie na iPhone-feedback

De gebruiker bevestigde dat de bestaande video mét origineel geluid nog steeds correct doorliep, maar dat twee onbesproken foto's uit een herinnering met zes beelden niet werden getoond. De eerste V10-uitvoering verving de audio-eindlistener rechtstreeks; de technische tests controleerden de aanwezigheid van die code, maar niet of het echte werkende overgangspunt naar de originele video werd benut. De correctie installeert nu een kleine wrapper **op** `taleraStartOriginalRound` net vóór de bestaande eventhandlers. Die wrapper toont eerst de op basis van alle `items` en gekoppelde `voiceCues` ontbrekende stilstaande beelden; daarna roept hij de **ongewijzigde** oorspronkelijke videofunctie aan. De oorspronkelijke `voice.ended`-regel is nu weer exact gelijk aan de beschermde V56-basis.

Dit maakt geen nieuwe tijdcodes in de audio en raakt geen persistente gegevens. Als er zes foto's aan de herinnering gekoppeld zijn en er vier verschillende foto-indexen in de ingesproken tijdcodes voorkomen, moeten de twee resterende foto's eenmaal 4 seconden zichtbaar zijn. Bij geen ontbrekende foto's start de oorspronkelijke video direct zoals eerder.

**Nieuwe echte browsertest (geslaagd op 5 november):** via een echte Chrome-iframe met `mode=present`, zes fictieve image-Blobs, vier tijdcodes en een gesimuleerd `voice.ended`-event bevestigde de browser: `itemCount:6`, eerste extra `data-index=4` (`5 / 6`), na vier seconden `data-index=5` (`6 / 6`), en daarna dezelfde laatste foto. Bron: `r20-dev/vertel-restbeelden/browser-smoke.mjs`, CI https://github.com/Marksmits1972/talera-lifeline/actions/runs/42020609142. Daarnaast 16/16 regressietests en 5/5 HTTP-controles geslaagd. **Nog niet goedgekeurd op het echte iPhone-apparaat**: Chrome bevestigt nu de concrete afspeelcyclus, maar de gebruiker moet de twee resterende foto's nog in TALERA zelf zien verschijnen.

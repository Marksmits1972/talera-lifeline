# TALERA V10 — Ontbrekende foto's na stemopname

**Status:** onafhankelijke test-Worker, 5 november 2026, nog te accepteren op iPhone.

## Doel

Als de gebruiker bijvoorbeeld zes foto's aan een herinnering toevoegt en de stemopname al stopt na het bespreken van de derde foto, mogen de overige foto's niet worden overgeslagen. TALERA toont na afloop van de bestaande ingesproken stemcyclus automatisch de foto's zonder een eigen stem-tijdcode. Daarna volgt **ongewijzigd** de al bestaande tweede ronde waarin video's hun oorspronkelijke geluid hebben.

Volgorde: `voice + tijdcodes → niet besproken stilstaande foto's → originele video's met geluid → klaar`.

## Implementatie

- Nieuwe, strikt geïsoleerde Worker `talera-vertel-restbeelden-v10-test-20261105`; **alleen** GET `/vertelmodus-embed` wordt geadresseerd. De overkoepelende pagina en de oorspronkelijke HTML/CSS/speler blijven intact, met uitzondering van de exacte `voice.ended`-afhandeling in die ene speler.
- Worker-code: `r20-dev/vertel-restbeelden/vertel-restbeelden.worker.mjs`.
- Op basis van de bestaande opgeslagen `cues[].index` bepaalt een zuivere functie welke `state.items` van type `image` nog niet bij een gesproken tijdcode voorkwamen. De koppeling via de oorspronkelijke `g.media`-volgorde blijft behouden.
- Alleen die foto's worden in hun originele volgorde getoond, **4 seconden per foto**. Alle oorspronkelijke video-items worden uitgesloten van deze fotoreeks; de goedgekeurde `taleraStartOriginalRound()` speelt daarna de originele video's af zoals voorheen.
- Wanneer alle foto's al besproken zijn, start de oorspronkelijke videoronde direct zoals vroeger. In de recorder en de editor wordt de presentatie-uitbreiding niet uitgevoerd. Bij `INIT`, `PAUSE_PLAYER` of het sluiten van de iframe worden geplande foto-timers opgeruimd.
- Geen wijziging aan de opgeslagen stem-`Blob`, `narrationCues`, `voiceCues`, geluidsduur, oorspronkelijke foto- of video-ID's, originele microfoonbesturing, beeldformaten, volgorde van video's, IndexedDB, R2, D1, betaalde diensten of Free/Premium.
- De patch werkt alleen bij precies **één** matching `voice.ended`-anker. Bij ontbrekend/duplicaat anker wordt de speler onveranderd doorgestuurd en meldt een diagnoseheader `anchor-unmatched`.

## Staging en bescherming

- Testlink: https://talera-vertel-restbeelden-v10-test-20261105.mark-a39.workers.dev/
- Eigen GitHub-branch: `feature/talera-vertel-restbeelden-20261105`
- Enige binding: `STYLE_BASE` → `talera-v9-stille-luxe-stijlstaging-20261104`
- De werkende stijl-Worker blijft versie `bc36d913-49f8-4f4d-b00d-3d5894a11146`.
- De oorspronkelijke beschermde V9 blijft versie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`.
- Cloudflare V10-versie: `48f96172-b492-4784-94a8-1f9c23ad4cca`, deployment `1a589cf8-e21a-4163-ac55-da2daa314323`.
- Regressie: **15/15** Node-tests; **5/5** read-only live routes; GitHub Actions https://github.com/Marksmits1972/talera-lifeline/actions/runs/42016935811.
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

# TALERA V12 — beschermde V9 + ontbrekende foto's

5 november 2026 — uitsluitend aparte test-Worker; **nog niet goedgekeurd op iPhone**.

## Grens van de wijziging
- Basis: `talera-v9-stille-luxe-stijlstaging-20261104` als Cloudflare service-binding.
- Bestaande vertelspeler, stemopname, wisseltijdcodes, `show()`, videofunctie `taleraStartOriginalRound()`, lokale opslag en stijl veranderen **niet**.
- In `/vertelmodus-embed`: één aanvullende functie berekent de nog niet tijdens de opname gebruikte **foto-posities** en toont ze na het native einde van de spraakopname, ieder 4 seconden, in originele mediavolgorde; daarna roept zij de bestaande videofunctie aan. De oorspronkelijke voice-ended eventregel krijgt alleen de nieuwe functieaanroep.
- In `/present`: (a) de bestaande activatiefunctie zoekt de `photoStage` pas opnieuw op wanneer deze nodig is, ook als deze tijdens de initiële scriptuitvoering nog ontbrak; (b) bij het opnieuw openen wordt de bestaande, reeds gehydrateerde herinnering expliciet geactiveerd. Exact drie atomische tekstvervangingen in het bestaande lokale presentatie-adapterfragment.
- Geen diagnose-overlay en geen nieuwe afspeellaag, opslagwaarde, media-ID, videocontroller of API.

## Onderzoek achter de podiumverwijzing
De native IndexedDB-integratietest maakt een echte lokale herinnering aan met zes mediabestanden, een korte audio-opname en drie fototijdcodes. In oudere tests werd deze herinnering opnieuw gevonden (zes beelden plus spraak), maar verscheen het originele vertelvenster niet. De oorspronkelijke lokale adapter vroeg `document.getElementById('photoStage')` slechts eenmaal op en bewaarde dat resultaat als `const`. Als de DOM op dat moment niet klaarstaat, stopt `present(memory)` vroegtijdig. V12 past dit beperkt aan in dezelfde originele adapter.

## Validatie en terugrollen
- `restfotos.test.mjs`: unit regressies inclusief gemengde beelden, herhaalde tijdcodes, annulering bij gewijzigde herinnering, originele recorder en originele video.
- `smoke-live.mjs`: bewijs dat de opgeleverde V12-HTML volledig gelijk is aan de beschermde V9 behalve de uitdrukkelijk vermelde vier brontransformaties.
- `browser-smoke.mjs`: echte browser, lokale IndexedDB, heropenen, originele iframe, echte audio-`ended`, daarna drie restfoto's en de originele ongemute video.
- Pas geschikt voor iPhone nadat de laatste volledige browsertest groen is. De testbrowser bevat tijdelijke observatiecode **uitsluitend in de testscript-runner**, niet in de Cloudflare Worker.
- Rollback = uitsluitend aparte V12-testlink niet meer gebruiken; V9, V10 en V11 blijven intact. De V12-testhost heeft zijn eigen browseropslag, dus bestaande iPhone-PWA's niet verwijderen.

Branch: `feature/talera-v12-restfotos-veilige-activatie-20261105`.
Testworker: `talera-v12-restfotos-veilige-test-20261105`.

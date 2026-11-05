# TALERA V12 — beschermde V9 + ontbrekende foto's

5 november 2026 — uitsluitend aparte test-Worker; **nog niet goedgekeurd op iPhone**.

## Grens van de wijziging
- Basis: `talera-v9-stille-luxe-stijlstaging-20261104` als Cloudflare service-binding.
- Bestaande vertelspeler, stemopname, wisseltijdcodes, `show()`, videofunctie `taleraStartOriginalRound()`, lokale opslag en stijl veranderen **niet**.
- In `/vertelmodus-embed`: één aanvullende functie berekent de nog niet tijdens de opname gebruikte **foto-posities** en toont ze na het native einde van de spraakopname, ieder 4 seconden, in originele mediavolgorde; daarna roept zij de bestaande videofunctie aan. De oorspronkelijke voice-ended eventregel krijgt alleen de nieuwe functieaanroep.
- In `/present`: (a) de bestaande speler slaat de activatie alleen over als dezelfde herinnering **én een nog gekoppeld iframe** actief zijn; een verdwenen iframe kan met de bestaande functie opnieuw worden opgebouwd; (b) na heropenen wordt de bestaande, reeds gehydrateerde herinnering expliciet geactiveerd. Exact twee atomische tekstvervangingen in de oorspronkelijke presentatie-adapter.
- Geen diagnose-overlay en geen nieuwe afspeellaag, opslagwaarde, media-ID, videocontroller of API.

## Onderzoek achter de podiumverwijzing
De native IndexedDB-integratietest maakt een lokale herinnering aan met zes media, een korte stemopname en drie fototijdcodes. Die gegevens werden correct gevonden, maar het originele vertelvenster ontbrak. Een controletest riep de originele activator direct aan: lokaal geheugen en audio waren aanwezig, het fotovenster was al beschikbaar, maar er werd geen iframe aangemaakt. De vermoedelijke blokkade was de originele korte controle `if(activeId===id)return`, ook wanneer het iframe niet langer was gekoppeld. V12 vervangt deze controle door `if(activeId===id&&currentPresentation?.frame?.isConnected)return`. Geen nieuwe videofunctie of speler.

## Validatie en terugrollen
- `restfotos.test.mjs`: unit regressies inclusief gemengde beelden, herhaalde tijdcodes, annulering bij gewijzigde herinnering, originele recorder en originele video.
- `smoke-live.mjs`: bewijs dat de opgeleverde V12-HTML volledig gelijk is aan de beschermde V9 behalve de uitdrukkelijk vermelde drie bronvervangingen plus één functie.
- `browser-smoke.mjs`: echte browser, lokale IndexedDB, heropenen, originele iframe, echte audio-`ended`, daarna drie restfoto's en de originele ongemute video.
- Pas geschikt voor iPhone nadat de laatste volledige browsertest groen is. De testbrowser bevat tijdelijke observatiecode **uitsluitend in de testscript-runner**, niet in de Cloudflare Worker.
- Rollback = uitsluitend aparte V12-testlink niet meer gebruiken; V9, V10 en V11 blijven intact. De V12-testhost heeft zijn eigen browseropslag, dus bestaande iPhone-PWA's niet verwijderen.

Branch: `feature/talera-v12-restfotos-veilige-activatie-20261105`.
Testworker: `talera-v12-restfotos-veilige-test-20261105`.

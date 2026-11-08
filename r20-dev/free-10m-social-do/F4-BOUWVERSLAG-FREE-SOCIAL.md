# TALERA FREE F4 — sociale opslag zonder gedeelde D1

**8 november 2026. Status: echte nieuwe code + lokale Cloudflare test + afzonderlijke ECHTE EU Cloudflare smoke test geslaagd. Niet geïntegreerd in huidige TALERA-PWA, geen bestaande data aangepast.**

## Waar dit voor dient
Free-herinneringen kunnen lokaal op de telefoon blijven staan, maar interacties rond gedeelde herinneringen (rechten, deelkoppelingen, reacties, likes) vragen wel serververwerking. De huidige TALERA-core gebruikt daarvoor centrale D1-tabellen. Deze aparte proef laat een alternatief zien zonder gedeelde D1-verzoeken voor iedere sociale interactie.

Nieuwe route: **story-ID → precies één blijvend SQLite Durable Object met rechten, likes en reacties**. Iedere gedeelde token krijgt daarnaast een **eigen pointer-object op basis van SHA-256-hash**. Bij het openen van een link controleert het systeem opnieuw de actuele rechten van het story-object. Een ingetrokken link blijft onbruikbaar, ook als de token-pointer nog bestaat. Er is geen enkele verwijzing naar een bestaande TALERA D1, accountdatabase of R2-mediaopslag.

## Veiligheid
- Eigendom en rechten worden per herinnering gecontroleerd, met afzonderlijke toegang per fictief account.
- Alleen de eigenaar kan personen toegang verlenen of intrekken en nieuwe deelkoppelingen aanmaken of intrekken.
- Een gebruiker zonder recht kan de herinnering niet openen, liken of becommentariëren.
- Dubbele likes van hetzelfde account tellen maar één keer. Reactietekst blijft afzonderlijk van foto's, video's en audio.
- Nieuwe QA-authenticatie via HMAC en afgesloten stagingkey is **uitsluitend synthetische testbeveiliging**; mag NOOIT voor echte TALERA-accounts worden gebruikt. De bestaande echte sessielogica is hierdoor niet veranderd.
- De nieuwe stagingnaam is uniek. Het echte Cloudflare-script is alleen voor tests en staat los van de bestaande TALERA-PWA.
- Bestaande deel-URL's en database-inhoud worden niet gemigreerd en zijn in de test niet gewijzigd.

## Feitelijke uitgevoerde tests
**Lokale Cloudflare + SQLite DO:** https://github.com/Marksmits1972/talera-lifeline/actions/runs/42507514587 . Twee fictieve herinneringen, drie fictieve accounts, eigenaarschap, grant-revocation, share-revocation, guest-link, dubbele likes, reacties, data behouden na Worker-restart. 107 lokale verzoeken. Drie leesbanden van 24 verzoeken bij 1, 5 en 20 gelijktijdige verzoeken geslaagd.

**ECHTE EU Cloudflare-staging:** https://github.com/Marksmits1972/talera-lifeline/actions/runs/42507774180 . Eén fictieve herinnering, drie fictieve accounts; controle van eigendom, gedeelde link en intrekking. 48 live HTTP-verzoeken, inclusief 36 succesvolle leescontroles. Gemeten p95 vanaf GitHub-runner:
- 1 gelijktijdig: ca. 398 ms.
- 5 gelijktijdig: ca. **2.675 ms** (opvallende vertraging).
- 10 gelijktijdig: ca. 642 ms.

De afwijkende 2,7 seconden is een echte observatie, mag niet als succesclaim voor snelheid worden weggepoetst. De proef heeft 12 verzoeken per band, geen statistisch representatieve schaalmeting. Er zijn geen echte 10 miljoen gebruikers belast.

## Wat F4 NOG NIET oplost
- Bestaande TALERA-server gebruikt ook centrale D1 voor berichten, ontdekbaarheid, accountlinks en andere sociale routes. De nieuwe proef is nog niet op al die bestaande routes aangesloten.
- Gebeurtenissen met veel bezoekers op exact één populaire herinnering kunnen een hot Durable Object veroorzaken; piekbelasting en eventueel verdelen van reacties over meerdere onderliggende objecten moet worden getest.
- De huidige app, oorspronkelijke gekoppelde media, bestaande delen/legacy-ID's en oude rechten zijn nog niet veilig gekoppeld of overgezet.
- Geen Safari/iPhone-acceptatie en geen schaalproef met een miljoen/tien miljoen gelijktijdig actieve gebruikers.
- Volledige Free-gereedverklaring vereist F5 (integratie in losse volledige Free PWA) en F6 (afgesproken echte piek- en kostentest); oude data nooit overschrijven zonder volledig gecontroleerde migratie.

**Conclusie:** een werkelijk werkende Free-sociale storage route is gebouwd en op Cloudflare getest, maar de volledige sociale migratie/schaalbaarheid is nog NIET afgerond.

Dit is de vierde technische bouwfase. Eerdere fases: PR #93 (statics), PR #94 (geboortedatum per account), PR #95 (per-account auth/sessie). De huidige werkende TALERA-omgeving is in alle fasen onaangetast gebleven.

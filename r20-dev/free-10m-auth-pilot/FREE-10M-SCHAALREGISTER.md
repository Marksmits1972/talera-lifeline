# TALERA Free – centraal schaalregister (8 november 2026)

**Doel: TALERA Free voor 10 miljoen gebruikers voorbereiden; Premium komt pas daarna.** De afzonderlijke onderdelen zijn gebouwd, maar tien miljoen gelijktijdige gebruikers zijn nog niet bewezen. De bestaande TALERA-app en accounts zijn ongemoeid gelaten.

| Poort | Status | Bewijs |
|---|---|---|
| F1. Wereldwijde distributie van gedeelde app-code | Gebouwd en lokaal getest | PR #93, GitHub run 42493578810 |
| F2. Apart en direct accountgebonden opslaan van geboortedatum | Gebouwd en lokaal getest met 64 fictieve accounts | PR #94, GitHub run 42503295621 |
| F3. Login, registratie, individuele sessies, directe intrekking zonder centrale D1 | Nieuw geïsoleerd pilot gebouwd en lokaal plus op echte EU Cloudflare getest | PR #95, GitHub run 42506218404 |
| F3b. Kleine echte belasting op Cloudflare | 120 succesvolle parallelle sessiecontroles, in trappen met maximaal 30 gelijktijdige verzoeken en gemeten p95 359–424 ms vanaf GitHub-runner | Run 42506218404 |
| F3c. Bestaande accounts veilig overzetten | Migratie-preflight met synthetische gegevens gebouwd; 9/9 tests geslaagd. Geen echte migratie uitgevoerd | Run 42506887577 |
| F4. Delen, likes en reacties | Per-herinnering SQLite Durable Objects en afzonderlijke intrekbare deelkoppelingen nu echt gebouwd, lokaal en in EU Cloudflare getest. **Nog niet geïntegreerd, oude links en berichten niet verhuisd.** | PR #96, run 42507774180 |
| F5. Gehele Free-PWA op iPhone/Safari | **Niet getest** met nieuwe backend | Nog open |
| F6. De volledige tienmiljoen-gebruikersbelasting, kosten en piekcapaciteit | **Niet bewezen** | Nog open |

## Alleen-lezen inventaris oorspronkelijke Cloudflare-databases

Momentopname: oorspronkelijke account-D1 heeft 6 accounts (6 actief), 23 sessierecords. Aparte geboortedatum-D1 heeft 0 geboortedatumrecords. De oorspronkelijke account-core bevat ook 15 memories, 16 shares, 4 grants, 10 comments, 4 likes, 25 messages en andere gerelateerde records. Alleen aantallen en kolomnamen zijn gelezen: geen klantidentiteiten of geheime tokens geëxporteerd; geen oude database aangepast. De gegevens kunnen na deze momentopname veranderen.

## Waarom Free nog niet definitief klaar is

De nieuwe authenticatieservice bezit eigen Durable Objects per account, sessie en inloglimiet. De losse EU-Cloudflare-staging werkte met twee nieuwe fictieve accounts en heeft geen verbinding met de originele TALERA D1, core of media. Dat betekent niet dat de originele Free-app al is omgezet. Sociale en deelroutes kunnen nog de gedeelde D1 belasten. Bestaande wachtwoordhashes, accounts, actieve sessies, rechten en koppelingen moeten veilig overgezet kunnen worden voordat enige omschakeling plaatsvindt. Een bestaande sessie kan technisch worden geïdentificeerd via haar opgeslagen SHA-256-hash zonder rauwe cookie uit te lezen; een veilige echte migratie is nog niet uitgevoerd. De stagingtestsleutels wisselen bewust per CI-run, waardoor uitsluitend fictieve stagingaccounts opnieuw aangemaakt moeten worden; dit mag absoluut niet in een productiesysteem gebeuren.

## Enige volgende werkroute

1. Breng de werkelijk gebruikte Free-sociale en deelroutes onder een schaalbaar, afgeschermd opslagpad met de juiste revocatie, identiteit en oude storylinks; maak aparte tests, geen wijzigingen aan bestaande data.
2. Combineer de nieuwe statische app-code, account-DO, login-DO en schaalbare sociale route in één onafhankelijke Free-PWA-staging. Doe vervolgens alle mobiele regressietests zonder aan de vertelcyclus, foto's, video of tijdlijnen te veranderen.
3. Bereid de echte account- en gegevensoverstap met controle van alle records, privacy en rollback voor. Oude opslag blijft onaangetast totdat expliciete toestemming en verificatie aanwezig zijn.
4. Meet stapsgewijs echte piekbelasting en kosten op uitsluitend staging, met vooraf afgesproken grenzen. Het aantal van 10 miljoen is een te bewijzen capaciteit, geen conclusie uit een kleine test.
5. Pas bij volledig bewezen Free-capaciteit gaan we naar Premium.

Bewijs: https://github.com/Marksmits1972/talera-lifeline/pull/93 , https://github.com/Marksmits1972/talera-lifeline/pull/94 , https://github.com/Marksmits1972/talera-lifeline/pull/95 ; echte EU-cloudtest https://github.com/Marksmits1972/talera-lifeline/actions/runs/42506218404 ; migratiepreflight https://github.com/Marksmits1972/talera-lifeline/actions/runs/42506887577 .

## F4-update: nieuwe sociale route

Sociale DO-staging op echte EU Cloudflare geslaagd: 48 kleine, synthetische HTTP-verzoeken, delen en revocatie en 36 parallelle reads zonder fouten. Eén 12-requestsband had circa 2,7 seconde p95, zodat dit **geen snelheidsgarantie** is. Het hotstory-risico, berichten/discovery, migratie van oude rechten en integratie in de gehele app staan nog open. PR #96: https://github.com/Marksmits1972/talera-lifeline/pull/96 . Bestaande D1 en verhalen niet gewijzigd.

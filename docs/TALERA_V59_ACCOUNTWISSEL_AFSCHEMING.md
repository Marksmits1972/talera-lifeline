# TALERA V59 — Afscherming bij wisselen van account

**Status:** onafhankelijke Cloudflare-testversie, geen productierelease, geen wijziging in bestaande V56-V58 Workers of databases.

## Bevinding en reden
De bestaande `Mijn TALERA`-menucontroller bewaart tijdelijk berichten, ontvangen herinneringen, deellinks, gevonden personen, gespreksinhoud en ontvangerinformatie in browsergeheugen. Bij het wisselen van account werd het account-id wel bijgewerkt, maar niet elke gevoelige lijst leeggehaald. Een oude, vertraagde API-reactie kon na een wissel alsnog in de menu-state terechtkomen.

## Technische aanpassing
- Eén `setActiveAccount`-overgang, aangeroepen bij aanmelden, registratie, uitloggen, hercontrole van sessie en `/api/me` in een menulading.
- Bij een **andere accountidentiteit**: wist alle accountgebonden cachelijsten en opgeslagen gesprekselecties, ook de teller van ongelezen berichten; lokale browserherinneringen blijven ongemoeid.
- `authEpoch` koppelt GET-antwoorden aan de sessiegeneratie die de aanvraag startte. Reacties uit een eerdere sessie worden niet toegepast en vereisen opnieuw openen. `/api/me` wordt afzonderlijk bewaakt, zodat een oude sessiecontrole geen nieuw account kan overschrijven.
- Alle bestaande account-API-routes en achterliggende gegevens blijven onveranderd.
- De afgeschermde codepatch is atomair: als een upstream-verankering ontbreekt, wordt de originele menu-module behouden en wordt dit in de responsheader gemarkeerd.

## Testplan
1. CI: eigen module-tests V57, V58, V59 plus totale regressie (historische issue #61 apart).
2. Cloudflare mobiele webtest: menu, lokale opslag, berichten, gedeelde herinneringen, aanmelden zonder bestaand wachtwoord of echte gebruikersgegevens te gebruiken.
3. Geïsoleerde test A→uitloggen→B: inhoud van A mag niet in B-schermen komen; late async-respons uit A wordt genegeerd. Dit is te automatiseren met een gecontroleerde fake API; een echte twee-account-eindtest blijft vereist.
4. Controleer dat geen data in D1/R2 of IndexedDB is aangepast.
5. Definitieve iPhone-acceptatie met twee expliciet daarvoor aangemaakte accounts, voordat V59 als goedgekeurde bouwversie kan gelden.

## Rollback
V56 en V57/V58 blijven op hun eigen URL beschikbaar; deze nieuwe laag gebruikt uitsluitend een servicebinding `V56_BASE`. Geen database-migraties of cache-wipe van het apparaat. 

**Nog niet opgelost:** centrale eenduidige opslag/migratie, backup-herstel, daadwerkelijke delen van foto's op twee apparaten, Family en abonnement.

## Resultaat bouwronde 1 november 2026

**Afzonderlijke test-URL:** https://talera-pwa-v59-accountisolatie-20261101.mark-a39.workers.dev/present

### Bevestigde checks
- Mobiele browser (390×844): Mijn TALERA, Opslag en herinneringen, Met mij gedeeld, Berichten en de anonieme Free-presentatie laden zonder Cloudflare-exceptie; er verschijnt geen automatische inlogpop-up.
- Gecontroleerde *simulatie* in dezelfde browser: testaccount A had ‘SECRET_A_ONLY’; tijdens de tweede A-opvraag werd een GET bewust vertraagd, vervolgens werd de getoonde sessie omgezet naar testaccount B met ‘SECRET_B_ONLY’. Verificatie: `sawA=true`, `account=sim-B`, `sawB=true`, `leakedA=false`, `staleWarning=false`. Test onderschept API-aanroepen in de browser; er zijn **geen echte gebruikers of gegevens** aangemaakt of gewijzigd.
- Anoniem vanaf schone browser: `GET /api/me`, `/api/memories`, `/api/shared-with-me`, `/api/messages`, `/api/shares`, `/api/my-grants` en `/api/people/search` antwoorden alle met HTTP 401. Deze controle bewijst niet dat alle ingelogde rechten en herroepingen correct zijn.
- GitHub Actions: [run 41283855771](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41283855771) liet **122 geslaagd / 2 gefaald** zien; de twee resterende fouten zijn de al bekende ontbrekende oude bestanden `tv-player.js` en `unified-webapp.js` (issue #61). De extra V59-regressiechecks zijn geslaagd. Niet markeren als volledig groene release.
- Na de browserproeven: aantallen in de bestaande Clean Core-testdatabase nog ongewijzigd: 4 accounts, 12 herinneringen, 23 berichten, 10 deellinks, 4 directe grants en 5 lokale koppelingen. Dat bewijst geen volledige data-integriteit, maar bevestigt dat deze controle geen records heeft toegevoegd of verwijderd.
- V59 is alleen verbonden via `V56_BASE` met de V56-Worker; geen D1/R2 bindingen in V59. V56, V57 en V58 blijven op hun eigen deployments staan.

### Nog niet akkoord / releaseblokkade
Echte afzonderlijke ingelogde account A/B met correct toegekende rechten, reacties en hartjes op twee iPhones of andere toestellen; status van rechten na intrekken; daadwerkelijke media-aflevering; behoud van bestaande lokale herinneringen; afhandeling van offline/sessie-expiratie. Geen productiemerge en geen accountdata-migratie zonder deze acceptatie.

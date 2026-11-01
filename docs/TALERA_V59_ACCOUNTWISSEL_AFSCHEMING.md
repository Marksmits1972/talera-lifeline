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

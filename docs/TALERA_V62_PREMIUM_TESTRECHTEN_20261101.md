# TALERA V62 — Premium testrechten en beheercockpit (bouwblok 1)
Datum: 1 november 2026
Status: **technisch gebouwd en gepubliceerd in bestaande V62-STAGING**. Beheerder-bootstrap en echte meervoudige accountsessie-acceptatie blijven open. Geen werkende betaling, AI, cloudmigratie of TV als onderdeel van dit bouwblok.

## Bevindingen vóór de bouw
- Bestaande TALERA Clean Core in Cloudflare: `talera-clean-core-staging-20261030`, D1 `DB` met accounts, sessions, stories, shares, messages. Geen bestaande `entitlements`, subscription of plan-catalog in de actieve core.
- Bestaande V62 `Mijn TALERA → Mijn abonnement` was een placeholder: 'Abonnement nog niet aangesloten'.
- Historisch beheerprototype `talera-admin-dev` is geen aan de bestaande accountdienst gekoppelde Premium-autoriteit. Niet gereactiveerd, niet gekopieerd.

## Nu gerealiseerd
### Bestaande D1-database, additieve schemawijziging
`migrations/20261101_premium_test_rights.sql`:
1. `talera_premium_admins`: expliciet geautoriseerde bestaande TALERA-account-ID's. **De tabel blijft bij installatie leeg.** Een account kan zichzelf niet aanwijzen.
2. `talera_premium_test_grants`: maximaal één actief testpakket per account met code, einddatum, datum wijziging en verantwoordelijke beheerder.
3. `talera_premium_test_audit`: wie, welk doelaccount, actie, oud/nieuw pakket en timestamp. Geen klantinhoud, wachtwoorden of betalingsgegevens.
Twee nuttige indexen. Geen migratie van bestaande privémedia, verhalen, Free-bibliotheek of sessies.

### Serverzijdige entitlement policy
Bron: `src/core/premium-test-rights.js`, ingevoegd in **bestaande** Clean Core Worker.
- `GET /api/me/entitlements`: uitsluitend na TALERA-accountauthenticatie. Retourneert effectief pakket en ingeschakelde **testrechten**, vervaldatum, optionele `canManageTests` en `commercialBillingActive:false`.
- Plans: `free`, `individual`, `family_light`, `family`, `family_heavy`. Testpakket heeft separaat serverbeleid voor `cloud_storage`, `cloud_sync`, `ai_tags`, `ai_titles`, `tv_pairing`, `family_members`, `profiles`. Er wordt **geen** verkoopprijs gehardcodeerd.
- `available` voor de zes nog niet gebouwde diensten staat bewust op `false`: toestemming betekent **niet** dat media vanzelf in de cloud staan of dat AI al werkt.
- Verlopen rechten vallen automatisch terug op `free`, zonder achtergrondjob of persoonlijke datawijziging.

### Beveiligde beheeroperaties
- `GET /api/admin/premium/account?email=...`: enkel expliciet toegelaten beheerder mag één exact bekend, actief account zoeken.
- `GET /api/admin/premium/audit?accountId=...`: laatste 20 wijzigingsevenementen na beheerdercheck.
- `POST /api/admin/premium/grant`: alleen een expliciet beheerderaccount met **opnieuw aangemelde sessie jonger dan 15 minuten**. Alleen 7/30/90 dagen en bekende pakketten. Nooit aan eigen beheerderaccount. Rechten en audit in één D1 batch. Herhaalde keuze vervangt de tijdelijke grant en schrijft een auditevent.
- `POST /api/admin/premium/revoke`: dezelfde beveiliging; directe terugval naar Free; auditevent in dezelfde batch.
- Bestaande Origin/CSRF-check, rate limiting en sessierechten blijven gelden.
- **GEEN** overzetten van persoonlijke Free-herinneringen, geen werkende billing, geen automatische upgrades door aankoop of social grants.

### PWA
- Bestaande `src/mijn-talera/menu-integration.txt`, bestaande route `Mijn TALERA → Mijn abonnement` toont het werkelijke accountrecht, vervaldatum en de duidelijk vermelde **teststatus**.
- Alleen voor servergeverifieerde operators verschijnt `Premium-testrechten beheren`, daarin een exact e-mailadres opzoeken, keuze van pakket en dagen, toekennen/intrekken met bevestiging. Geen algemene zoekbare lijst met persoonsgegevens.
- Zonder login: alleen verzoek aan te melden. Bij accountwisseling wordt gecachte staat gewist.
- Geen tweede accountcontroller, geen nieuwe Cloudflare Worker of D1-database.

## Toetsing
1. SQL in bestaande D1 geplaatst, alle drie nieuwe tabellen en indexen aanwezig; nieuwe SELECTs via D1 `EXPLAIN QUERY PLAN` gevalideerd.
2. In een volledig geïsoleerde mock van dezelfde code en D1-interface: Free bij ontbreken grant; 30 dagen toekennen; ontvanger ziet het recht; bestaande `available:false`; intrekken -> Free; audit voor beide; automatische afloop; verkeerde looptijd en zelf-toekennen geweigerd; een gewone gebruiker kan geen beheeroperaties uitvoeren. 13/13 asserties groen.
3. Gepubliceerde API zonder aanmelding retourneert correct ‘Aanmelden bij TALERA is nodig’ op account- en adminroutes.
4. Mobiele PWA-test met schermbreedte 390 px toont bij ‘Mijn abonnement’ zonder inloggen correct de aanmeldinstructie.
5. Na publicatie de database gelezen: `admins=0`, `grants=0`, `audit=0`; geen accounts of gebruikersrechten gewijzigd.
6. Persistent code-contracttests toegevoegd: `test/premium-test-entitlements-v62.test.mjs`. Deze zijn aan bron gekoppeld, maar de bestaande globale GitHub CI blijft nog los van deze handmatige controles.

## Volgende vereiste activering, niet automatisch uitgevoerd
**Kies en verifieer expliciet welk bestaand TALERA-account de beheerdersrol krijgt.**
- Verifieer identiteit en account-ID buiten de PWA, met huidige Cloudflare-eigenaarstoegang.
- Voeg uitsluitend dat gecontroleerde account-ID toe aan `talera_premium_admins` met `enabled=1`. Geen e-mailadressen raden, geen standaard admin aanmaken.
- Beheerder meldt zich opnieuw aan en opent **Mijn TALERA → Mijn abonnement → Premium-testrechten beheren**.
- Proef met twee echte **fictieve** testaccounts, inclusief tijdsverloop en intrekking. Pas hierna eigenaaracceptatie. Reguliere Free-gebruikers zien geen admincontrols.

## Geen commerciële Premium-livegang
De testrechten staan nog niet op werkende Cloud, AI, TV, Family of Billing. Daarvoor volgen expliciete server-side guards in elk toekomstig functie-endpoint, geverifieerde upload/synchronisatie, Family-privacy, en betaalproviderbevestiging. Ook de commerciële prijs/GB-limitmatrix staat nog niet definitief vast.

## Rollback
- Clean Core `talera-clean-core-staging-20261030`: actief deployment `164d870b-da22-4a74-b6a3-ea12bc3a9279`, version `1ae8bd64-81ba-4b45-88c3-361938679c85`; vorige deployment `50191730-8c70-44cf-9975-ffd23fe236fe`, version `adc64616-6a2a-4e68-b8ad-25835204a9c3`.
- PWA V62 `talera-pwa-v62-mijn-profiel-20261101`: actief deployment `68362e0b-da22-4ce9-8d81-0b5e29d2ec57`, version `73a651ba-5c87-4268-8b97-078d71969400`; vorige deployment `98bd4070-1f66-43d4-a34a-15462d411963`, version `7c2439f3-cb67-42ba-bbb7-b2a6990f7858`.
- De additieve D1-tabellen hoeven bij code-rollback niet verwijderd te worden. Verwijdering van een DB-tabel is geen veilige rollback.

# TALERA — werkende uitbreidingbare D1-router in geïsoleerde testomgeving

**Datum:** 8 november 2026. **Status: echte D1-test geslaagd, nog NIET geïntegreerd in de live TALERA-account-, verhalen- of mediasystemen.**

## Waarom dit bestaat

Voor de lancering een blijvende opslagrouter voorbereiden. Nu één werkende database voor gebruikersgebonden *testverhalen*, later extra onafhankelijke database(s) toevoegen zonder een bestaand account opnieuw toe te wijzen.

## Wat daadwerkelijk is gebouwd en geverifieerd

- Nieuw, volledig apart Cloudflare Worker-adres: `https://talera-d1-stable-router-test-20261108.mark-a39.workers.dev/health`.
- Twee **nieuwe, alleen voor deze proef bedoelde D1-databases** met EU-jurisdictie: `talera-d1-router-directory-test-20261108` (de permanente routing-adreslijst) en `talera-d1-router-shard-a-test-20261108` (de eerste **gegevensdatabase**). Geen bestaande database hergebruikt.
- `r20-dev/d1-router-staging/router.worker.mjs` bevat een echte D1 API-router. Database-id voor iedere account staat duurzaam in de *directory*; de rest van de databewerking kiest alleen die fysieke shard. Ontbreekt de binding, dan een fout in plaats van gegevens bij een andere account of database wegschrijven.
- `POST /_demo/provision`: alleen afgeschermde, kunstmatige `demo-`-identiteiten; een bestaande toewijzing verandert nooit.
- `POST /_demo/story` en `GET /_demo/story`: exact één fictief verhaal opgeslagen en weer teruggelezen, met gebonden SQL-parameters en de D1 Sessions API in de leesroute.
- `/health` is publiek maar bevat geen persoonsgegevens en voert geen SQL-query uit. Alle overige test-API's vereisen een server-side secret die GitHub Actions aanmaakt; geen wachtwoorden of accounts in dit testproject.
- Geen servicebinding naar de bestaande TALERA-PWA, opslagdiensten of accounts; geen toegang tot echte stories, uploads, media, Premium of historie.
- GitHub Actions [run 42457415475](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42457415475) geslaagd: **8 unit-/foutscenario-tests; D1's werkelijk aangemaakt; schema's toegepast; losse Worker gepubliceerd; echte account-toewijzing en schrijf/leesronde bewezen.**

## Hoe later een database toevoegen zonder de routercode te veranderen

1. In `r20-dev/d1-router-staging/shard-catalog.json` één nieuwe regel toevoegen, bijvoorbeeld `{ "id": "B", "database_name": "talera-d1-router-shard-b-test-20261108" }`.
2. De branch via GitHub laten testen/publiceren: `provision-staging.mjs prepare` vindt de bestaande databases, creëert alleen de ontbrekende *nieuwe testdatabase*, brengt het schema aan en bouwt een nieuwe bindingsconfiguratie.
3. Na succesvolle, afzonderlijke Worker-deployment: `provision-staging.mjs activate` voegt opslaggroep B toe aan de actieve directory. Pas dan kunnen **nieuwe testaccounts** op A of B terechtkomen; bestaande accounts blijven aan A gekoppeld.
4. Bij een fout in database of binding faalt de route expliciet; het systeem schrijft nooit als alternatief stilletjes naar een verkeerde shard.
5. Bij rustige tijden blijven de databases en hun gebruikers op hun plaats. Er is geen dure, gevaarlijke automatische terugmigratie.

**Grenzen:** de GitHub-pipeline kan nieuwe vooraf gedefinieerde opslaggroepen toevoegen zonder routercodewijziging. Hij monitort nog niet zelf de echte drukte en creëert nog niet automatisch op basis van gemeten CPU/queryduur een nieuwe database. Daarvoor zijn gecontroleerde alarmsignalen, quota, autorisatie en rollback-/herstelproeven nodig. De bestaande account-/media- en social-opslag moet worden ingepast en geïsoleerd getest vóór ooit productieoverschakeling.

## Een belangrijk schaalpunt dat we NIET mogen vergeten

De directory is een apart D1-systeem en wordt in dit proefontwerp bij elke accountgebonden aanvraag bevraagd. Daardoor is het nog geen bewijs voor 100.000/1.000.000 actieve gebruikers: de directory zelf kan een hotspot worden. Vóór productie kiezen we veilige caching of een geauthenticeerde shardverwijzing en eventueel D1-readreplica's, met consistente reads na registratie. Ook globale auth, sociale interacties, meldingen en zoeken moeten een eigen schaalplan krijgen.

## Hoe we verdergaan zonder TALERA te riskeren

- Eerst de echte datastromen, gebruikers-/mediabibliotheek, accountauth, Free/Premium en publicatie volledig inventariseren.
- Dan een afzonderlijke integratietest met nieuwe testgebruikers op de nieuwe opslagrouter, inclusief privacy, rechten, restore, R2-media-IDs, cue-tijden, delen en wijzigingen.
- Vervolgens gecontroleerd bewijzen dat het toevoegen van shard B volledig werkt en een afgescheiden capaciteits-/fouttest uitvoeren.
- Pas daarna een launchbesluit. Tot dat moment **blijft de door gebruiker gekozen TALERA-versie onaangetast**.

## Beveiliging en technisch eigendom

- De nieuwe testtoken wordt niet in GitHub-code of Actions-logs opgeslagen. Een GitHub-run zet hem rechtstreeks als Worker secret; bij iedere volgende run wordt hij vernieuwd.
- Ieder D1-object wordt uitsluitend in de unieke stagingnaamruimte aangemaakt; er zijn geen SQL-migraties op bestaande TALERA-D1's uitgevoerd.
- De demonstratierouter is niet bedoeld als publiek accountsysteem; hij accepteert uitsluitend synthetische namen met prefix `demo-` en heeft géén TALERA-loginintegratie.
- Als de GitHub-token ooit D1-bewerkrechten mist, moet de workflow stoppen, niet uitwijken naar bestaande echte databases.

**Conclusie:** de basis **werkt echt** met een aparte directory en eerste D1-gegevensshard. Het uitbreidingsmechanisme is voorbereid en offline getest, maar de volledige TALERA-integratie en automatische druktegestuurde uitbreiding zijn nog open.
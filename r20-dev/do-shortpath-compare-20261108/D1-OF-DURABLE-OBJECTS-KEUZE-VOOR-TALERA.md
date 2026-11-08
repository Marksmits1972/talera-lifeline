# TALERA — technische keuze: D1+R2 of eigen SQLite Durable Object per account + R2?

**8 november 2026 | Status: actueel Cloudflare-onderzoek én geslaagde ECHTE, afzonderlijke EU Durable Objects + R2-praktijkproef. De bestaande TALERA-PWA, bestaande D1's, R2-buckets, accounts en vertelcyclus zijn niet aangepast.**

## Antwoord op de vraag 'Waarom eigenlijk nog D1?'

Zowel D1 als een SQLite-backed Durable Object kan kleine, onderling samenhangende gegevens beheren: verhalen, tekst, tijdstempels, media-ID's, eigendom, toegangsrechten, status. Grote foto's, video's en audio moeten in de objectopslag R2 blijven. **Alleen R2 gebruiken** zou TALERA's behoefte aan relaties, tijdlijnopvragingen, consistente bewerkingsrechten en meerdere gekoppelde verhaalrecords lastiger maken. R2 is als bestandsopslag sterk en biedt key-prefixopvragingen, maar is geen directe vervanging voor de SQL- en transactielogica van TALERA.

De kortste route kan op twee manieren:

```text
OPTIE A — D1 + R2 (al gedeeltelijk beproefd)
TALERA -> geldige account/sessie -> ondertekende accountlocatie -> D1-shard(A/B/...)
                                                \-> R2 voor originele media
  + Eén D1 per accountGROEP, veel accounts per D1
  + De locatie moet bij registratie eenmaal duurzaam worden vastgelegd
  + Indien zonder ondertekende routehint: centrale directory bij elke actie, ongewenst
  + Bij volle shard nieuwe accounts op nieuwe D1; vaste oude accounts blijven staan

OPTIE B — Durable Objects SQLite + R2 (nieuw, fysiek beproefd)
TALERA -> geldige account/sessie -> AccountHome(account-ID) -> EIGEN SQLite
                                                       \-> R2 voor originele media
  + Eén SQLite Durable Object per account, geen apart account→database-register
  + Cloudflare vindt dezelfde named Durable Object opnieuw via de geverifieerde account-ID
  + Nieuwe accounts hoeven niet vooraf aan een fysieke D1-shard verbonden te worden
  + Binnen één account kunnen verhaal/tekst/cues/rechten in dezelfde SQL-transactie
```

**LET OP:** in beide ontwerpen blijven bestaande *echte logincontrole* en *identiteitsbeheer* noodzakelijk. Een account-ID of URL-parameter alleen is GEEN authenticatie. Optie B maakt alleen de fysieke **opslagrouter** overbodig; de login-, rechten- en gedeelde-linkcontrole worden niet magisch overbodig.

## Directe vergelijking (evidence + open tests)

| Eigenschap | D1 per accountgroep + R2 | SQLite Durable Object per account + R2 |
|---|---|---|
| Eigen accountgegevens bij elkaar | Ja, als alle tabellen van één account op dezelfde shard worden geschreven | Ja, ieder object bevat zijn eigen SQLite |
| Centrale locatie-directory op elke verhaalactie | Niet nodig bij beveiligde routehint; originele stagingdemo deed het nog wel | Niet nodig: `jurisdiction('eu').idFromName(vastAccountID)` |
| Nieuwe gebruikers automatisch een nieuwe fysiek geïsoleerde gegevensplek geven | Nieuwe D1-groepen via gecontroleerde provisioning en bindings | Nieuwe eigen DO-objecten ontstaan indien aangeroepen en er data geschreven wordt |
| Schrijfbelasting tussen accounts spreiden | Ja, als accounts goed over primaire D1's verdeeld zijn | Natuurlijk: verschillende accountobjecten hebben afzonderlijke opslag en verwerking |
| Zeer actief enkel account | Kan delen van één primaire shard belastingen; veel accounts delen er één | Kan één eigen object overbelasten (single-threaded per object, soft ~1.000 requests/s); die account zelf is hotspot |
| SQL-tooling, export/import, analytics | D1 standaard tooling en SQL over zijn database | Eigen code en beheertooling per object; niet direct D1-compatible |
| Wereldwijd lezen | Cloudflare D1 read replicas met Sessions API mogelijk | Object heeft vaste locatie; geen D1-style automatische read replicas van één object; remote toegang kan meer latency geven |
| Maximale SQL-opslag | 10 GB per fysieke D1, gedeeld door accounts op die shard | 10 GB per SQLite-backed object op Workers Paid, per account |
| Originele foto's/video/audio | R2, ongewijzigd | R2, ongewijzigd |
| Historische TALERA-code hergebruiken | Grootste voordeel; veel bestaande endpoints gebruiken `env.DB.prepare` / `env.DB.batch` | Volledige backend-adapter en data-/schema-/rechtenmigratie nodig |
| Kosten | D1 rijen/GB opslag, geen afzonderlijke DO-duration-billing | SQLite-rijkosten vergelijkbaar, plus DO-aanvragen en duurkosten; benchmark is nodig |

Bron: https://developers.cloudflare.com/workers/platform/storage-options/#sql-in-durable-objects-vs-d1 en https://developers.cloudflare.com/workers/databases/connecting-to-databases/ . D1-limieten: https://developers.cloudflare.com/d1/platform/limits/ . DO-limieten: https://developers.cloudflare.com/durable-objects/platform/limits/ . DO-prijzen: https://developers.cloudflare.com/durable-objects/platform/pricing/ . EU-jurisdictie: https://developers.cloudflare.com/durable-objects/reference/data-location/ .

## Wat werkelijk is gebouwd en uitgevoerd

De afzonderlijke, uitsluitend voor dit onderzoek gepubliceerde Worker `talera-do-shortpath-compare-test-20261108` bevat `SyntheticAccountHome extends DurableObject` met eigen SQLite-tabel voor synthetische verhalen, plus een **nieuwe afzonderlijke EU R2-bucket** `talera-do-shortpath-media-test-20261108` met alleen fictieve testtekst.

- `env.ACCOUNT_HOME.jurisdiction('eu').idFromName('talera-do-owner-v1:'+accountID)` selecteert direct hetzelfde object; geen D1-directory en geen D1-queries. Account-ID moet in het toekomstige echte TALERA door de server zijn geverifieerd.
- Één werkelijk R2-mediaobject is eerst opgeslagen; vóór het publiceren van het fictieve verhaal controleert de Worker met `R2.head` of die verwijzing bestaat. Pas daarna wordt het verhaal in de eigen SQLite geschreven. Een niet-bestaande mediareferentie wordt geweigerd.
- Twee verschillende fictieve accounts hadden **afzonderlijke werkelijk gemaakte** Durable Objects met eigen SQLite, het tweede account vond in zijn eigen object het verhaal van het eerste niet.
- Hetzelfde verhaal, dezelfde mediareferentie en dezelfde eigen opslag werden **na een tweede afzonderlijke GitHub-deployment opnieuw teruggevonden**, `STORY_SURVIVED_PREVIOUS_DEPLOY true`.
- Via de object-ID is `ctx.id.jurisdiction === 'eu'` daadwerkelijk gecontroleerd. De R2-bucket is eveneens met EU-jurisdictie gecreëerd en bij latere runs idempotent hergebruikt.
- Openbare `/health` bevat geen gegevens; alle test-API's vereisen een eenmalig via GitHub aangemaakt geheim; niet-toegestane namen worden geblokkeerd. **Belangrijk:** dit demo-bearertoken bewijst niet de echte privacy-isolatie bij meerdere normale TALERA-accounts: één testtoken kan bewust meerdere *fictieve* accounts aanspreken. Echte login- en sharemachtigingen vereisen apart werk.
- Offline test: **1.000.000 unieke account-objectnamen** berekend, nul echte DO's voor deze miljoen aangemaakt. Andere test: 1.200 synthetische requests selecteerden steeds hetzelfde EU-object, zonder directoryopzoeking. Dit bewijst alleen de deterministische routelogica, niet miljoen echte gebruikers of gelijktijdige capaciteit.
- **4/4 offline tests groen** en de echte R2/DO-end-to-end smoke geslaagd. GitHub Actions: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42468437983 en tweede herpublicatie https://github.com/Marksmits1972/talera-lifeline/actions/runs/42468598756 .

## Veiligheid, data-integriteit en het niet 'kwijtraken' van herinneringen

1. **Geen automatische verhuisroutes.** Het named object is levenslang gekoppeld aan de stabiele, intern geverifieerde account-ID. De naamgeving en EU-jurisdictie kunnen niet zomaar worden gewijzigd: `idFromName('account')` en `jurisdiction('eu').idFromName('account')` verwijzen naar *andere* objecten!
2. **Alle kleinschalige accountgegevens bij elkaar.** Herinneringstekst, tijdlijndatum, foto-/videocues en media-ID's horen in één SQL-opslag. Externe R2 houdt echte mediabytes op één vaste objectkey.
3. **D1 en R2 / DO en R2 hebben GEEN gezamenlijke SQL-transactie.** Maak een herstelbaar protocol: tijdelijke upload + checksum, commit manifest in de accountdatabase, idempotente retry, audit voor orphaned media, gecontroleerd opruimen en onafhankelijk geteste mediaherstelkopieën. De huidige proef controleert alleen bestaan vóór commit, nog niet het complete herstelprotocol.
4. **Back-ups zijn afzonderlijk nodig.** D1 Time Travel en SQLite Durable Objects bieden PITR tot 30 dagen op ondersteunde opslag. Dat herstelt R2-objecten niet automatisch. Bij live TALERA moet R2-backup/recovery expliciet worden ingericht en getest.
5. **Delen, volgen, berichten en zoeken** kunnen gericht verwijzen naar de juiste eigenaar met een ondertekende *niet-autoriserende* locator of een geautoriseerde globale index. De eigenaar-DO moet dan rechten/expiry/revocation echt controleren. Geen scan door alle DO's of D1's bij ieder verzoek.
6. **Huidige media, accounts en links blijven intact.** De bestaande TALERA heeft meerdere D1's, R2-buckets, Premium- en socialroutes, `talera_sid`, V9-story-ID's en beheerhashlinks. Een nieuw opslagsysteem mag niet alleen nieuwe verhalen opslaan en daardoor oude links laten verdwijnen.
7. **Een account kan op zichzelf druk of groot zijn.** DO's hebben per-object limieten. Metadata hoort klein te blijven; media blijft in R2. Een zeer drukke account-DO kan alsnog een geoptimaliseerd protocol vereisen.

## Eerlijk advies voor TALERA

**Uitgangspunt op lange termijn: kies SQLite Durable Objects + R2 als voorkeursmodel voor account-eigen verhaalgegevens, ALS een complete geïsoleerde TALERA-kopie bewijst dat alle bestaande functies zonder regressie werken.** Het voldoet natuurlijker aan de expliciete eis 'één account → één vaste opslagplek → korte lijn', zonder een centraal account-shard-register of fysieke D1-reserveplanning.

**Niet nu de bestaande D1-infrastructuur verwijderen of automatisch overzetten.** D1 blijft voorlopig nuttig voor het bestaande accounts-/sessiesysteem, gedeelde/sociale indexen en historisch werkende verhalen; elke wijziging aan de 18 Worker-grafiek en originele vertelcyclus heeft regressierisico. Optie A (de al werkende geshardde D1-opslag) is een technisch bewezen terugvalkeuze als echte DO-integratie te veel complexiteit, kosten of latency veroorzaakt.

Het gaat niet om *alle databaseproducten vervangen* maar om de **kortste route voor eigen herinneringen**, met een klein aantal bewust noodzakelijke ondersteunende functies.

## Juiste vervolgfases — geen livewijziging zonder acceptatie

- **V1 (afgerond):** fysieke EU DO+SQLite + aparte R2 en account-eigen mediareferenties met synthetische data, inclusief persistente herpublicatie.
- **V2:** op aparte TALERA-testorigin het echte authmodel (`register`, `login`, `me`, `logout`, herstel), geboortedatum, story/audio/tijdstempels, private media, Free/Premium, delen/intrekken en alle oude storylinks koppelen aan een **accountlokale service-interface**. Stop bij mislukte test; nog geen echte klantdata.
- **V3:** consistente herstelprocedures voor mislukte R2/SQLite-writes, data-backups, afgezonderde performance- en kostentest D1 versus DO bij vergelijkbare belasting, zeer drukke accounts en wereldwijd lezen.
- **V4:** door gebruiker goedgekeurde iPhone-acceptatie van identieke TALERA-vertelcyclus, één native presenter/video, swipe-cues, timeline-verdeling, privacy en accountgeschiedenis; pas daarna een zorgvuldig gefaseerd productie- of migratiebesluit.

**Releasebescherming:** geen merge naar `main`, geen wijzigingen aan officiële beste PWA, geen oude Workers/databases/buckets verwijderen, geen upload of read van bestaande klantmedia.
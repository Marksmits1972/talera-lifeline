# TALERA — kortste opslaglijn, één vaste gegevensplek per account

**Datum:** 8 november 2026 | **Status:** ontwerp + offline GitHub-proef geslaagd. Nog GEEN integratie in bestaande TALERA, geen echte D1/R2-mutaties en geen herprogrammering van de vertelcyclus.

## Correctie van eerdere uitspraak

Meer databases veroorzaken op zichzelf **geen gegevensverlies**. Dat risico ontstaat vooral bij foutieve migratie, half geslaagde D1/R2-schrijfacties, onjuiste autorisatie of ontbrekende back-ups/restore. We hebben **niet vastgesteld** dat de bestaande TALERA-databases nu te vol zijn of dat alle huidige data niet in één D1 zouden passen. Cloudflare D1 heeft wel een vast maximum van 10 GB per afzonderlijke D1, dus vóór groei moet de opslag uitbreidbaar zijn.

## Door gebruiker gevraagde kern: zo kort mogelijk

```text
Gebruiker -> TALERA (bestaande app)
           -> bestaande veilige login / accountidentiteit
           -> vastgestelde, ondertekende account->shard-locatie
           -> precies ÉÉN D1 voor eigen gegevens van die account:
              verhalen + tekst + foto-/videocues + media-ID's + datum + rechten*
                           |
                           +-> R2: originele video/foto/audio wanneer echt nodig
```

`*` Sommige gegevens vereisen noodzakelijk een centrale dienst: bestaande accounts/sessies, gedeelde zoek-/sociale indexen en samenwerking tussen meerdere accounts. Die staan logisch gescheiden en mogen niet bij iedere privé-verhaalbewerking als extra verplichte hop worden geraadpleegd.

### Eén database per ACCOUNTGROEP, niet letterlijk één fysieke D1 per account

Een D1-shard bevat **veel** gebruikers. Maar alle gegevens die bij één account horen en samen moeten worden opgeslagen, staan in **dezelfde shard**. Accounts worden niet op basis van 'foto in A, verhaal in B, cue in C' uit elkaar getrokken. Media zelf blijven in R2 vanwege bestandsgrootte en streaming.

De ene fysieke D1 per accountsamengroep en de centrale accountauth mogen we niet verwarren met één gedeelde centrale D1 voor ALLE accounts. Het eerste kan horizontaal groeien; het tweede zou één bottleneck blijven.

## Wat er in eerdere staging nog te lang was

De bestaande geteste router `r20-dev/d1-router-staging/router.worker.mjs` voert in `getShard()` bij **iedere** accountgebonden verhaalhandeling eerst een D1 `SELECT shard_id FROM account_shard WHERE account_id=?` uit op de centrale directory (via replica met primary fallback). Daarmee kan die directory alsnog overbelast raken bij grote aantallen gelijktijdige gebruikers.

**Nieuw principe:** lees en valideer de accountplaatsing bij de bestaande login/sessie-uitgifte. Maak daarvan een kortlevende cryptografisch ondertekende *routehint* (account-ID + fysieke D1-groep). Bij normale verhaalbewerkingen controleert de backend de handtekening, de vervaltijd en de door het **bestaande echte TALERA-authsysteem** bevestigde account-ID. Daarna gaat het SQL-verzoek **rechtstreeks** naar die ene shard; geen extra directory-SELECT per verhaalhandeling.

**Authenticatie blijft essentieel:** de routehint op zichzelf is NOOIT een login, recht of toegangstoken. TALERA's bestaande login gebruikt momenteel o.a. `talera_sid` en `/api/me`; daadwerkelijke sessieverificatie kan nog een centrale DB-query vragen. Het verwijderen van zulke auth-queries is NIET bewezen en wordt niet stilzwijgend beloofd. Een later volledig geïntegreerd ontwerp kan na formele securityreview een authentieke, ondertekende sessie met shardclaim uitgeven; logout/revocation moeten dan correct blijven werken.

## Verhaal-ID en delen zonder scan over alle databases

- De bestaande verhalen en bewerklinks worden ook op **story-ID** teruggevonden. Een route zonder account mag niet alle D1's doorzoeken; voeg een ondertekende of permanent geregistreerde, opaque story-locator toe. Verhaal, tekst, media-ID's, tijdstempels en correcties blijven in één shard.
- Voor gedeelde verhalen bevat een link een **niet-autoriserende shardlocator**. De feitelijke toegang moet daarna nog in diezelfde shard worden gecontroleerd met een onvoorspelbare share-token/hash, vervaldatum en intrekking. De locator is dus niet genoeg om een privéverhaal te zien.
- Bestaande oude story- en sharelinks kunnen niet opeens een nieuwe locatorsyntaxis krijgen. Zij vragen een compatibiliteitsresolver zonder klantgegevens te verplaatsen of oude links te breken.
- Als later een enkel zeer groot account moet worden verplaatst, moeten ook story- en sharelocators veilig bijgewerkt worden via een **apart migratieprotocol**; geen stille doorverwijzing naar willekeurige nieuwe shards.

## Ondersteunde offline proef (geen livebelasting)

GitHub Actions: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42466536266

- **8/8 tests groen.**
- **1.000.000 synthetische accounts** verdeeld over **8 in-memory fysieke opslaggroepen**, 125.000 per groep. Eén account bleef altijd toegewezen aan dezelfde groep.
- Een afgescheiden test deed **1.200 geauthenticeerd gemodelleerde verhaalhandelingen** met één initiële adreslijstcontrole bij login en nul extra directory-SELECTs voor verhaalbewerkingen. Dit bewijst het *algoritmische pad*, geen werkelijke D1- of Cloudflare-CPU-belasting.
- Nieuwe database B later toegevoegd: 10.000 oude accounts op A bleven intact, terwijl 10.000 nieuwe accounts naar B konden worden verdeeld.
- Een ontbrekende doelshard veroorzaakt een expliciete fout, **geen opslag of leesactie op een andere fysieke D1**.
- Ondertekende routehint vervalt na 15 minuten en wordt aan de echte bevestigde account-ID gebonden; een geknoeide shard-ID of accountwisseling faalt in de test.
- Een geldige gedeelde shardlocator geeft zelf géén toegang: apart controleren of share-token geldig en niet ingetrokken is.

## Permanente beheersregels om verlies te minimaliseren

1. **Geen automatische verhuizing bij drukte.** Een nieuwe D1 neemt nieuwe accounts aan. Oude accounts blijven stabiel gekoppeld. Bij rust geen samenvoeging of verwijdering van bezette databases.
2. **Samen bewaren waar één SQL-transactie nodig is.** Verhaal, tekst, cue-rijen, fotovolgorde, media-manifest, eigen machtigingen en bewerkstatus in dezelfde D1; geen multi-shard-transacties als basis voor één verhaal.
3. **R2 en D1 hebben geen gezamenlijke transactie.** Sla media eerst onder tijdelijke unieke sleutel op, bevestig grootte/checksum, publiceer pas daarna het SQL-media-manifest, registreer idempotente upload-ID's en herstel of ruim achterblijvende uploads via een gecontroleerde reconciliatie. Geen ongecontroleerde verwijderactie vóór referentiecheck.
4. **Back-ups + restore oefenen.** Cloudflare D1 Time Travel ondersteunt herstel tot 30 dagen terug op ondersteunde databases. Dit beschermt D1, maar **niet automatisch R2-objecten**; R2 vraagt een apart retentie-, kopie- en herstelplan. Leg bewijs van hersteltesten vast voordat echte data omgezet wordt.
5. **Schrijven moet idempotent zijn.** Niet tweemaal een verhaal aanmaken door retry, geen verdwaalde media-ID bij time-out. Sla stabiele request-ID en voltooiingsstatus op en test crash/herstart tussen R2 en D1.
6. **Echte gedeelde indexen scheiden van privé-opslag.** Sociale feeds en samenwerking kunnen afgeleide indexen nodig hebben; geen volledige scan door alle accounts bij ieder verzoek.
7. **Capaciteitsgrenzen per shard vooraf plannen.** D1 maximaal 10 GB per DB, dus 75/80% alarmsignalen plus aantoonbaar werkende uitbreiding; een zeer actief account kan ook een bestaande shard volschrijven. Een herstelbare, gecontroleerde eigenaarmigratie moet apart worden getest vóór 10GB wordt geraakt.
8. **Geen belofte van absoluut nul risico.** We kunnen schade sterk beperken met stabiele toewijzing, controles, redundante media, backup/restore, logging en niet-destructieve uitbreiding. Techniek kent altijd storingsrisico.

## Heel belangrijk: verschil in de bestaande TALERA-kern

De read-only inventaris in PR #87 toont een account-/Premium-kern, aparte geboortedatum-D1 en legacy-verhaal- en socialroutes met eigen D1/R2. `xxory-test`-verhalen hebben historisch zelfs géén `account_id` in de `stories`-tabel: zij gebruiken story-ID en beheerhash. Daarom mag het model hierboven **niet rechtstreeks als productiecode** worden ingekopieerd of alle bestaande databases plots samenvoegen. De bestaande opslag mag onaangeraakt blijven totdat een compatibiliteitsadapter *alle* huidige account- en storyroutes op een aparte testorigin correct verwerkt.

## Volgende concrete ontwikkelstap

**STAGE K1**: Integreer ondertekende accountlocatie *alleen* in de bestaande **gescheiden D1-routertest** en meet dat echte D1 A/B-verhalen één DB-locatie per bewerking gebruiken; maak tegelijk een afgeschermde story-/share-locator met echte revocation-test. Gebruik uitsluitend `demo-`-accounts en de huidige geïsoleerde staging-D1. Niet mergen naar de officiële PWA.

**STAGE K2**: Eén gescheiden TALERA-kopie met nieuwe fictieve accounts en originele recorder/UI, verhaal+foto/video+audio, tijdlijn, bewerk/verwijder/deel-cases. Controleer herstel bij R2/D1-halffout, server-auth en iPhone. Pas na 100% geslaagde tests de opslagroute in een nieuwe PWA-kandidaat overwegen.

**STAGE K3**: Afgeschermde belastingtest en herstelproef; daarna pas een expliciet productie-/migratiebesluit. De aangewezen voorkeurslink blijft ongewijzigd.

## Cloudflare referenties

- D1 horizontale databases, doorvoer en 10GB-grens: https://developers.cloudflare.com/d1/platform/limits/
- Aanbevolen D1-verbindingen en account-/tenantpartitionering: https://developers.cloudflare.com/workers/databases/connecting-to-databases/
- D1 Time Travel en herstel: https://developers.cloudflare.com/d1/reference/time-travel/
- D1 Sessions/read replicas: https://developers.cloudflare.com/d1/best-practices/read-replication/
- R2-objectopslag en afzonderlijke media: https://developers.cloudflare.com/r2/

**Bescherming:** deze wijziging bevat uitsluitend documentatie, één lokaal cryptografisch routercontract en testcode op een nieuwe GitHub-branch; geen enkele bestaande Cloudflare Worker, D1, R2-object, account of officiële PWA werd gewijzigd.
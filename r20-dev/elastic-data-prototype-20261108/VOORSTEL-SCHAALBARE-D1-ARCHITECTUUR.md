# TALERA — voorbereiden van automatisch schaalbare databaseverdeling vóór lancering

**Datum:** 8 november 2026 | **Status:** ontwerprichting en geslaagd **offline** GitHub-prototype. Geen database gemaakt, gebonden, verplaatst, aangepast of belast. **Dit is GEEN geïntegreerde TALERA-functie en geen bewijs van 1.000.000 live gebruikers.**

## De vraag van de eigenaar

Vóór livegang een mechanisme maken zodat TALERA bij piekdruk niet vastloopt op één D1-database, eenvoudig op meerdere databases kan werken, bij dalen van de druk geen onnodige actieve databasecapaciteit betaalt en er na lancering geen ingrijpende codewijzigingen voor groei nodig zijn.

## Wat Cloudflare zelf al kan

1. **Automatische read replicas** op D1: bij `read_replication.mode='auto'` worden leesreplica's door Cloudflare geplaatst. **Alleen daadwerkelijk te benutten via de D1 Sessions API**; standaardbinding zonder Sessions blijft op de primary. Replica's helpen de leessnelheid en gelijktijdige leesdoorvoer, niet de schrijfcapaciteit. Documentatie: https://developers.cloudflare.com/d1/best-practices/read-replication/
2. **Scale-to-zero van D1-compute**: bij nul queries zijn er geen databasecompute-kosten, maar opgeslagen data en gebruik tellen mee in de prijs. https://developers.cloudflare.com/d1/platform/pricing/
3. **Schaalverdeling voor veel writes**: één D1-primary is single-threaded; meerdere **onafhankelijke** D1-databases met verschillende userpartities leveren afzonderlijke schrijfcapaciteit. Cloudflare verplaatst persoonlijke data niet automatisch tussen onafhankelijke D1-databases. https://developers.cloudflare.com/d1/platform/limits/
4. **D1 limieten**: maximaal 10 GB per individuele D1 op Workers Paid, rekening houden met totale accountopslaglimiet en privacyregio. Originele foto's/video's horen niet als SQL-BLOB in D1; behoud hun originele mediabibliotheek en R2-/mediasysteem.

## Aanbevolen toekomstige architectuur

```text
Dezelfde bestaande TALERA PWA en presentatielaag
            |
  dezelfde login, auth- en rechtencontroles
            |
    Stabiele datarouter (één geautoriseerd storagecontract)
     /               |                  \
  accountkern      account-eigen           gedeelde social/feed index
  / identiteit     verhalen/metadata       (apart schaalbaar ontwerp)
  (beveiligd)      |
                  +-- DB shard A -- auto READ replicas
                  +-- DB shard B -- auto READ replicas
                  +-- DB shard C -- auto READ replicas
                  +-- DB shard ...
                       |
              media-ID's -> bestaande originele mediabibliotheek
```

### Regels die de datarouter ALTIJD moet volgen

- **Vast account→shard-contract**: bij accountaanmaak één opslaggroep bepalen. In elke volgende sessie gaat de account naar dezelfde groep, ongeacht drukte. Gebruik uitsluitend server-side geverifieerde account-ID's; vertrouw geen meegegeven shardnummer van een onbekende client.
- **Geen splits op basis van het huidige aantal shards (`id % active_count`) zonder permanente registry.** Anders verandert de locatie van gebruikers zodra er een shard wordt toegevoegd.
- **Geen nachtelijke verhuizing**: als het rustig is, blijft opgeslagen data op zijn plek en worden niet-gebruikte databases vanzelf idle. Terugschakelen naar één fysieke database vereist migratie en is niet nodig voor compute-besparing.
- **Automatisch bijkoppelen van nieuwe schrijfpartities** vereist vooraf uitgewerkt provisioning-/bindingsbeheer, schema-initialisatie, waarschuwingen, quota-, privacy- en back-upcontrole. Het gebeurt in een gecontroleerde beheertaak, nooit als ongeautoriseerde side effect van een individuele request.
- **Alleen nieuwe accounts/nieuwe nog niet gevulde partities** direct naar nieuwe databases sturen is een veilige groeistap; het verlicht NIET automatisch een drukke bestaande database. Daarom vroeg beginnen met partities of doelgerichte, zorgvuldig geteste migratie vóór echte schaaldruk.
- **Read-after-write consistentie** met D1 Sessions/bookmarks voor informatie die direct zichtbaar moet zijn na opslaan of wijzigen. Controleer weergave van eigen verhaal, foto-cues en berichten; geen stale privacywijzigingen tonen.
- **Gedeelde gegevens** zoals account-authenticatie, social interacties, publieksverhalen, zoekindex, likes, meldingen en cross-account machtigingen mogen niet worden vergeten. Scheid alleen wat werkelijk per gebruiker onafhankelijk is. Een ene globale auth-DB kan anders alsnog het knelpunt blijven.
- Bescherm expliciet de **éne** presentatielaag, bestaande vertelcyclus, media-ID's, originele bestanden en volgorde. Geen nieuwe player of tweede mediabibliotheek.

## Proef van 8 november: werkelijk via GitHub uitgevoerd

De pure code `offline-shard-router.mjs` legt voor testaccount-ID's een **permanente toewijzing in een tijdelijke geheugen-map** vast. Het is een ontwerpstub, niet de productieopslag-registratie en bevat geen authenticatie of D1-binding.

- **1.000.000 synthetische accounts**: verdeeld over **16 fictieve databases**, telkens **62.500 accounts** bij evenwichtige nieuw-accounttoewijzing.
- Een tweede test start met één opslaggroep en voegt later een tweede toe. **Bestaande accounts verhuizen niet en krijgen geen tweede locatie.**
- Ook bij rustige druk wordt een database met accounts niet samengevoegd of verwijderd.
- 6 tests geslaagd, 0 mislukt. GitHub Actions: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42456569083

## Wat scheelt het in het oude fictieve spitsuurmodel?

**Aannames blijven fictief**: 100.000 dagelijks actieve gebruikers; 15 reads en 1 write per DAU per dag; piek = 12× daggemiddelde; 5 ms per databasequery; alle vragen gelijkmatig over onafhankelijke schrijfpartities verdeeld; geen extra overhead of gedeelde globale-databasebelasting.

| Onafhankelijke D1-primaries | Totaal piekqueries/s | Als perfect gelijkmatig verdeeld: piekqueries/s per primary | Theoretische bezetting per primary |
|---:|---:|---:|---:|
| 1 | 222,22 | 222,22 | 111,11% |
| 4 | 222,22 | 55,56 | 27,78% |
| 16 | 222,22 | 13,89 | 6,94% |

**Dit betekent NIET dat TALERA nú 16 D1-databases nodig heeft.** In werkelijkheid helpen read replicas wellicht al sterk; de echte writes/s, queryduur, storageschema, hotspotaccounts en global indexes moeten eerst read-only worden gemeten. De 16 zijn een offline testinstelling.

## Veilig plan vóór livegang (fasegewijs, GitHub)

**Fase R1 — gereed: ontwerp/prototype en 1M offline test.** Alleen code in nieuwe GitHub-branch; nul verandering aan bestaande app, database of Worker.

**Fase R2 — nog niet uitgevoerd:** maak een expliciete opslagkaart van bestaande auth, Premium/Free-herinneringen, gedeelde social/likes/meldingen, foto-/video-/audio-ID's, privégeboortedatum en bestaande D1/R2-bindings. Leg vast welke DB centraal moet blijven en welke tabellen eigenaar-gepartitioneerd kunnen worden. Geen mutaties.

**Fase R3 — nog niet uitgevoerd:** bouw één abstracte, geïsoleerde storage-router achter een testorigin met **uitsluitend fictieve testdatabases**. Alle account-, share- en media-routes door regressie; geen wijzigingen aan huidige officiële PWA. Begin met gecontroleerde D1 read replicas + Sessions API met bookmarktesten.

**Fase R4 — nog niet uitgevoerd:** voeg meerdere onafhankelijke D1-shards toe in staging, test nieuwe accounttoewijzing, schrijfdynamiek, fouten, failover en event consistency. Control-plane kan bij gemeten blijvende overschrijding gecontroleerd uitbreiden; bindings/schema/permissions veilig voorbereiden. Verwijder bezette shards NOOIT automatisch bij rustig verkeer.

**Fase R5 — nog niet uitgevoerd:** werkelijk afgeschermde synthetische loadproef met aparte backend, plus privacy-, index-, performance- en kostenmetingen. Pas wanneer alle originele TALERA-functies slagen op echte iPhone besluiten over productie voor launch.

## Besluit

**Begin nu met de scheiding tussen de app en de opslag, maar raak de werkende functies niet aan voordat de contractmatrix compleet is.** Het model ondersteunt automatische leesschaal (Cloudflare) en ontwerpbare uitrol van nieuwe schrijfpartities (eigen beheerautomatisering). Automatisch 'van 16 naar één database terug' is geen veilige of zinvolle doelstelling; de betere doelstelling is permanent stabiele opslag bij nul onnodig draaiende capaciteit.

**BELANGRIJK:** Er is GEEN productieimplementatie en NIET automatisch een nieuwe D1 gemaakt. Voor integratie is expliciete acceptatie en functionele regressie nodig. Officiële favoriete PWA: ongewijzigd.
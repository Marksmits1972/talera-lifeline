# TALERA — uitbreidbare D1-capaciteit, echte stagingimplementatie en grenzen

**8 november 2026** — status: **werkende, geïsoleerde D1-testarchitectuur; NIET aan de echte TALERA-app gekoppeld en NIET gereed voor productie**.

## Wat is echt aangetoond?

- **Vier onafhankelijke fysieke testgegevensdatabases A, B, C en D** plus een aparte D1-adreslijst zijn via GitHub aangemaakt in EU-jurisdictie.
- **A en B zijn actief**. Bestaande demoaccounts op A blijven daar; nieuw gegenereerde demoaccounts worden over A en B verdeeld. Echt opslaan/lezen van fictieve verhalen op beide D1's is geslaagd. C en D blijven **uitgeschakelde reserves** voor nieuw toe te wijzen accounts.
- **Cloudflare D1 read_replication.mode=auto** is voor de adreslijst en alle gegevensdatabases A, B, C, D aangezet. De router gebruikt de D1 Sessions API voor het lezen van permanente account-toewijzingen, met een consistente primary-fallback.
- Een tweede, **niet publiek bereikbare Cloudflare Worker** (`talera-d1-capacity-monitor-staging-20261108`) is via GitHub gepubliceerd met **CRON iedere vijf minuten** en een accountgebonden Analytics SQL-binding.
- Bij voldoende D1 Analytics met drie opeenvolgende complete vijfminutenvensters van blijvende hoge querydruk mag die CRON-Worker maximaal één **reeds gebonden en geïnitialiseerde** reserve activeren. Bij incomplete of ontoegankelijke meetgegevens verandert er niets. Dit beslissingspad is met mocks getest. **Er is nog geen echte automatische activatie door echte hoge productielast waargenomen.**
- De uitbreidingspipeline keek via de Cloudflare REST API naar de **werkelijke file_size** van alle bestaande EU-test-D1's, zag nog één reserve C en besliste zelf een tweede reserve D aan te maken. GitHub committeerde de nieuwe shardcatalogus, maakte D werkelijk aan, maakte tabellen aan, publiceerde de router met een extra D1-binding, testte A/B opnieuw en publiceerde de CRON-monitor met D in het bindoverzicht. **Dit is een echte uitbreidingsproef, geen simulatie.**
- [Geslaagde A/B + C + D1 read replicas](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42458631596), [geslaagde Cloudflare CRON-installatie](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42459181323), [geslaagde echte D1 reserve-aanmaak D](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42459514815).

## Hoe meer opslag in de toekomst kan worden aangemaakt

1. GitHub controleert uitsluitend de goedgekeurde staging-D1's, hun accounttoewijzingen en hun daadwerkelijke bestandsgrootte (`file_size`), niet de bestaande TALERA-databases.
2. Een zuivere planner bewaakt voorlopig **minimaal twee koude reservegegevensdatabases**. Bij minder dan twee wordt exact **één** nieuwe D1 in de catalogus toegevoegd. Volgende naam na D is E, daarna F, enzovoort.
3. De GitHub-pipeline controleert het budgetplafond en de toegestane naamruimte, legt nieuwe configuratie vast in de branch, maakt de D1 met EU-jurisdictie aan, past dezelfde versiebeheerde SQL-tabellen toe en deployt de router met de extra binding.
4. Die nieuwe database begint uitgeschakeld, ontvangt **geen enkele nieuwe account** totdat de drukteregeling haar gecontroleerd activeert, en kan dus veilig voorbereid worden zonder bestaande accounttoewijzingen te veranderen.
5. Kostenbeveiliging: standaard maximaal **16 gegevensshards** in deze stagingconfiguratie. Het onderliggende contract ondersteunt tot 128, maar het plafond moet afzonderlijk worden verhoogd en quota/kosten moeten worden gecontroleerd. **Geen onbeperkte automatische databasecreatie.**
6. Cloudflare D1 heeft een **harde limiet van 10 GB per database**, zie https://developers.cloudflare.com/d1/platform/limits/ . De echte `file_size` is de signaalbron. Vanaf **7,5 GB** loggen we een waarschuwing, vanaf **8 GB** kan de gecontroleerde GitHub-regeling een bestaande reserve activeren en de bijna volle shard voor **nieuwe** accounts op `draining` zetten. Bestaande account-shardlocaties blijven gelijk.
7. **Belangrijk:** dit lost niet automatisch het risico op dat bestaande gebruikers blijven doorschrijven op een bijna volle D1. Daarvoor is vóór productie een expliciete, back-upgeteste migratieprocedure nodig; nooit stilzwijgend accounts herrouteren of data verwijderen.

## Twee verschillende soorten automatisering

| Onderdeel | Huidige toestand |
|---|---|
| Bestaande dataopslag door router | Echt bewezen op D1 A en B met synthetische testgegevens |
| Automatische leesreplica's | Ingesteld bij Cloudflare; benutting/snelheidswinst bij hoge load niet afzonderlijk gemeten |
| CRON-bewaking en automatisch inschakelen van reserve | Cloudflare CRON geïnstalleerd; veilige beslissing op kunstmatige meetgegevens bewezen; nog geen echte drukte-trigger aangetoond |
| Nieuwe fysieke reserve-D1 via GitHub | **Werkelijk uitgevoerd en bewezen**: database D is automatisch aan manifest en bestaande testrouter toegevoegd |
| Nieuwe fysieke D1 volledig onbemand blijven aanvullen | GitHub-workflow heeft een zesuurlijkse `schedule`, maar **GitHub voert schedules alleen uit vanaf de default branch (`main`)**. De veilige stagingbranch is bewust NIET naar main gemerged; deze terugkerende trigger is dus **nog niet actief**. De GitHub-workflow werkt wel zodra aangeroepen en heeft de echte D1-aanmaak bewezen. |
| Live TALERA-accounts, persoonlijke verhalen, media en sociale functies | **Nog niet gekoppeld of gemigreerd**, om de werkende vertelcyclus en accounts niet te riskeren |

## Fotos en videos zijn een apart opslagprobleem

Originele media staan in de bestaande R2-/mediaopslag, niet in de nieuwe D1-testtabellen. D1 is bedoeld voor accounttoewijzing en metadata. **Extra D1's creëren niet automatisch extra R2-mediaopslag of extra videotranscodecapaciteit**. R2 is object storage die afzonderlijk mee kan groeien; upload- en streamingkosten en daadwerkelijke mediarechten moeten afzonderlijk worden getest. Zie https://developers.cloudflare.com/r2/platform/limits/ .

## Voorkeurs-PWA blijft intact

- Geen bestaande TALERA Worker, originele accountdatabase, bestaande Premium/Free-verhalen, R2-bucket, audio/video, tijdlijnweergave, frontend, cookies, officiële link of gebruiker is veranderd.
- De nieuwe API accepteert alleen synthetische demo-ID's en een Worker-secret; de interne CRON is niet op een publiek adres beschikbaar.
- GitHub schrijft en deployt alleen nieuwe stagingresources. De gebruiker moet nog apart akkoord geven voor de **andere, veel gevoeligere stap**: TALERA's echte accounts/verhalen/media via een nieuw routercontract laten werken na een volledige migratie- en veiligheidstest.

## Wat nog ontbreekt voor echt schaalbare TALERA

1. De huidige echte account-, verhalen-, privacy-, Premium-, social-, mediacue- en R2-/D1-bronnen exact inventariseren. De PWA heeft verschillende gekoppelde Workers; de gehele opslag is niet automatisch één `env.DB`.
2. Een opslagcontract opzet voor een permanent geverifieerde account-ID → shard koppeling, metadata en media-IDs, en gedeelde social-/zoekgegevens. Auth en directory zelf kunnen nieuwe centrale knelpunten worden.
3. De bestaande TALERA-API op een aparte staging-PWA koppelen aan nieuwe testaccounts en echte D1-shards, zonder de bestaande opname- of presentatiebediening te veranderen.
4. Staging expliciet laten bewijzen dat database C door drukteregeling veilig wordt geactiveerd en dat daarna database E met dezelfde GitHub-pipeline wordt toegevoegd. De code is zo ontworpen, maar die keten is nog niet live doorlopen.
5. Testen van privacy, authenticatie, gedeeld verhaal, wissen, wijzigen, media-ID, cue-synchronisatie, consistentie en iPhone-acceptatie; daarna gecontroleerde belastingstesten en back-up-/herstelscenario.
6. Een expliciet releasebesluit om de terugkerende GitHub-aanvultaak op de default-/deploybranche te activeren, met geïsoleerde bevoegdheden, kostenlimiet en monitoring. **Niet nu al onbewust main/voorkeurs-PWA wijzigen.**

**Conclusie:** de echte stagingarchitectuur kan nu een nieuwe D1 toevoegen terwijl de reeds bestaande data intact blijven. Het unieke opslagcontract, de beveiligde uitbreidingscontrole en de triggers zijn aanwezig. Volledig automatisch onbeheerd nieuwe D1's aanmaken én integratie in de bestaande TALERA-app is nog een afzonderlijke, te testen releasefase; het zou onjuist zijn deze fase al 'productieklaar' te noemen.
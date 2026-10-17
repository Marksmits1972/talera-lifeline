# TALERA — architectuurtoets tegenover de goedgekeurde Ontwerpvisie 1.0

**Werkstatus 17 oktober 2026:** dynamische datumgrenzen en één oorspronkelijke referentiecatalogus geïmplementeerd en automatisch getest; onafhankelijke Free-back-up, profielinterface, Premium en de echte iPhone-test nog open. Niet productie- of iPhone-vrijgegeven.
**Broncode:** `work/talera-clean-architecture-20261017` (op de afzonderlijke i18n-branch, PR #45). Bestaande iPhone-PWA blijft op de huidige test-Worker; originele RH19-referentie en IndexedDB zijn niet gewijzigd.

## Definitieve gegevensroute

```
Vertellen: valideer -> TaleraMemories.save() -> ID
Tijdlijn: TaleraMemories.list() -> orden op canonieke datum -> geselecteerde ID
Presenteren: memory-ID -> TaleraMemories.list()/get() -> RH19-input -> bestaande RH19-presentatie
Terug: huidige memory-ID -> Tijdlijn zoekt exact dezelfde herinnering
```

De browserroute verstuurt nooit originele foto's, audio of verhaalinhoud. RH19 gebruikt voor de oorspronkelijke demoverhalen momenteel nog een aparte read-only referentiecatalogus; dit moet uiteindelijk één gedeelde bron worden zonder bestaande presentatiegedrag te veranderen.

## Onderdeel voor onderdeel

| Afspraak | Huidige toestand | Uitkomst / bewijs | Toets voor vrijgave |
|---|---|---|---|
| Eén permanente herinnerings-ID | `TaleraMemories.save()` bewaart `local-...` ID en behoudt die bij bewerking | **GOED op contractniveau** | Maak/bewerk/navigate/keer terug naar dezelfde ID met echte lokale data |
| Eén gebruikersopslag | IndexedDB `talera-lifeline-dev-local-v1`, stores `stories` en `files` | **GOED op structuur**, **GAT bij back-up** | Originele media intact, herstelbaar na verlies van browseropslag |
| Tijdlijn leest dezelfde herinneringen | `store.list()` en lokale mediaverwijzingen, alleen zichtbare thumbnails, inclusief nieuwe open-vocabulary `characteristics` | **GOED op code- en 1000-recordtest** | 1, 50, 1000 echte records inclusief AI-kenmerken en impreciese datums, scrollprestaties op iPhone |
| RH19 leest dezelfde herinneringen | `local-rh19-adapter.js` registreert metadata, haalt geselecteerde media pas later op | **GOED als één noodzakelijke adapter**, **RISICO bij tijdsgrenzen** | Zelfde tijd, tekst, foto's en gespreksopname; 1900–heden en toekomst toegestaan volgens opslagregels |
| RH19 originele bediening | `presentation-controller.js`, `memory-story-scroll`, originele swipe- en taplogica blijven | **BRON BEHOUDEN**, praktische acceptatie open | Tik, swipe, fotoformaat, wit uitschuifbaar verhaalpaneel en audio/video controleren |
| Consistente navigatie | `navigation.js` is één pure component; `?memory=` na opslaan/bewerken/retime | **GOED** | Alle drie de pagina's dezelfde onderbalk; actieve herinnering terug naar tijdlijn |
| Gemeenschappelijke tijdslogica | Eén functie `src/life-range.js` wordt in RH19 en Tijdlijn gebruikt; vroegste herinnering of eerder geboortejaar tot vandaag. RH19 herberekent ook zijn dichtheid bij nieuwe herinneringen | **CODE GEREALISEERD, CI GROEN; echte iPhone-acceptatie OPEN** | Werking met 1948, profiel 1952, meerdere herinneringen, volledig bereik en gebaren op iPhone |
| Eén originele 50-verhalenbron | `src/reference-memories.js` is de enige bron; beide routes importeren dezelfde records, oude import is alleen een re-export | **CODE GEREALISEERD, CI GROEN** | Vaste snapshot-hash `5805a021` over de 50 goedgekeurde IDs, datums, verhalen en foto-URL's blijft onveranderd |
| Foto-opslag | Origineel in files, telefoonweergave max 1440px optionele eigen cachesleutel | **GOED op opslagmodel** | Test opslagquota, HEIC, foto draaien, 6 foto's, iPhone eerste- en tweede-laadtijd |
| Geen extra mediaspeler | RH19 voor foto's; video en audio als media-elementen binnen actieve herinnering | **GOED in ontwerp, latency onbekend** | Meet dubbele render-/videospeleracties en piekgeheugen voor snelle wissels |
| Vijf talen schaalbaar | `i18n.js` + vijf catalogi; stabiele sleutel-API; runtime fallback | **FUNDAMENT KLAAR**, migratie onvolledig | Elke zichtbare string/verzoek, datumparser en foutmelding getest in NL/EN/DE/FR/ES |
| Free back-up/herstel | Alleen IndexedDB-lokaal, geen onafhankelijke kopie of betrouwbare import/export | **NOG NIET GEBOUWD** | Export én volledig herstelscenario zonder toegang tot de oude PWA-origin |
| Premium / AI-kenmerken | Opslag bewaart bij bewerken bestaande `characteristics`; de tijdlijn kan nieuwe brede AI-tags zonder vaste whitelist in hetzelfde herinneringsrecord filteren. AI-beeldanalyse, Cloudflare-back-end en rechten zijn nog niet gebouwd. | **OPEN-VOCABULARY GEGEVENSCONTRACT DEELS GEBOUWD**, dienstverlening OPEN | Werkelijke fotoanalyse, accordering en Cloudflare-auth/sync testen |
| Televisiepresentatie | Bestaand ontwerp; gedeelde herinnerings-ID blijft contract | **ONTWERP**, nog niet end-to-end getest | Telefoon stuurt huidige ID/media-offset; originele grote media, sessiebeveiliging |
| Updateveiligheid | Geïnstalleerde PWA-origin en IndexedDB-sleutels onveranderd | **VEILIG OP CODE**, acceptatie open | Update zonder app-verwijderen of wissen van foto's, browsercache of IndexedDB |

## Vastgestelde concrete codecorrectie deze ronde

- In `visual-v8-photo-space.html` verwees `dateOf()` na de introductie van de taalmodule nog naar `ML[m.month]`, terwijl die tabel was verwijderd. Dat kon een ReferenceError veroorzaken bij een exacte herinneringsdatum. Vervangen door de bestaande `monthLabel(m.month)`, zonder wijziging aan de datumgegevens.
- `test/lifeline-architecture-contract.test.mjs` bewaakt voortaan de canonieke route, één footer, de originele opslag, geen onverwachte reset en de bestaande RH19-besturing. Vier bekende ontbrekende eindtoetsen blijven als `test.todo` zichtbaar in de testuitvoer.

## Alleen de kortste zuivere oplossingen toestaan

1. **Geen extra bovenliggende 'memory manager'** naast de bestaande `TaleraMemories`-opslag. Alleen een noodzakelijk, uitwisselbaar opslagcontract voor lokaal/cloud.
2. **Geen tweede presentatie** en geen handgeschreven mediacarousel. Eén adapter van canonieke records naar het originele RH19-presentatiecontract.
3. **Geen opslagbundels in URL/sessionStorage** bij navigatie: alleen ID.
4. **Geen duplicatie van foto-/audiobestanden** tenzij het een expliciet opnieuw afleidbare weergavecache of een onafhankelijke gebruikersback-up betreft.
5. **Geen harde preloading van alle media**; alleen actieve en benodigde nabije items laden. Prestaties eerst meten, dan aanpassen.
6. **Geen globale reset of destructieve upgrade**; herstel en rollback moeten gegevensverlies uitsluiten.
7. **Geen parallelle Free/Premium-datamodellen**, behalve noodzakelijke opslagtoegang en aanvullende rechten/diensten.
8. **Geen ongecontroleerde wijzigingen aan RH19**: snapshotvergelijkingen van goedgekeurde lay-out en gebaren zijn verplicht.

## Aanpak van de resterende fouten zonder herbouw

**Volgorde van prioriteit:**
A. Leg werkende functies en testscenario's vast als regressies voordat code beweegt.
B. **Afgedekt in code:** RH19 en Tijdlijn hanteren dezelfde dynamische berekening van vroegste herinnering of geboortejaar tot vandaag. Nog te testen op een echte iPhone.
C. **Afgedekt in code:** één bron voor de 50 originele RH19-voorbeelden, met onveranderlijke snapshotverificatie.
D. Bouw een expliciete profielinstelling voor het geboortejaar en rond de Free-herstelarchitectuur af en onderzoek de iPhone-mogelijkheden voor een werkelijk onafhankelijke, herstelbare kopie. Beloof geen automatische externe map zonder te bewijzen dat iOS/PWA dat kan.
E. Maak de vijf taalcatalogi compleet, inclusief de invoerparser en toegankelijkheidslabels.
F. Meet echte eerste-laad-/wisseltijden en geheugengebruik; optimaliseer alleen bewezen knelpunten.

**Release-gate:** geen merge naar de huidige PWA totdat de bovenstaande end-to-end toetsen op een afzonderlijke acceptatieomgeving geslaagd zijn en de gebruiker de iPhone-werking expliciet goedkeurt. Groene CI ≠ een volledige acceptatietest.

## Afbakening van '100%'

Groene CI toont aan dat de huidige automatische regressietests slagen. Dat is nog geen bewijs van een onafhankelijke, herstelbare iOS-bestandsback-up, volledige premium Cloudflare-autorisatie en AI-bijschriften, en tv-bediening of de prestaties op een fysieke iPhone. Deze hiaten blijven expliciet niet-afgerond. Ook het zichtbare niveau-0-overzicht (nu een vaste zoomschaal) moet nog UX-getoetst worden voor een leven van 1948 tot heden; de wiskundige tijdgrenzen zijn wel dynamisch.

## Nieuwe controles op dezelfde ontwikkelbranch

- Profielgeboortejaar is instelbaar via het bestaande menu en gebruikt dezelfde `talera-dev-birthyear-v1`-voorkeur voor beide tijdlijnen; vijf taalcatalogi hebben dezelfde nieuwe labelkey.
- Het bewerken van een lokaal verhaal gooit bestaande AI-kenmerken niet stilzwijgend weg. Het is nadrukkelijk een bewaar-/filtercontract, **geen** claim dat Premium-AI inmiddels foto's analyseert.
- CI op commit `e5141e4` groen. Oude goedgekeurde RH19-beeld-, swipe- en opslaglogica blijft inhoudelijk onaangeroerd, maar praktijkcontrole op een iPhone blijft verplicht.

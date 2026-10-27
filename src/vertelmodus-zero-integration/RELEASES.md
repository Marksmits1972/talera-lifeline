# TALERA — geïntegreerde Vertelmodus vanaf nul · testrelease I1

Datum: 27 oktober 2026

**Status:** CANDIDATE. Op een apart Cloudflare-testadres gebouwd en browsergetest; nog **niet** op iPhone goedgekeurd, niet CURRENT en niet de bestaande live PWA.

## Immutable versiereferenties

| Onderdeel | Identificatie |
| --- | --- |
| Testadres | https://talera-pwa-vertelmodus-zero-integrated-test.mark-a39.workers.dev/tell |
| Worker | `talera-pwa-vertelmodus-zero-integrated-test` |
| Deployment | `5be1127d-b0cb-494c-8f4a-b1fe2801ae03` |
| Cloudflare version | `bcf5b74b-2e9a-4929-8712-f38a1ec9f50a` |
| Basis-PWA | originele V38 Worker, deployment `d17e1dc4-c60d-4429-bdf0-7d225043e9a8`, **onaangepast** |
| Technische vertelbasis | `talera-vertelmodus-zero-20261027`, deployment `2d7fbcfd-652a-4374-ac78-fb476696b1b0`, **onaangepast** |
| Integratiebron | `feature/vertelmodus-zero-pwa-integration-20261027` / `src/vertelmodus-zero-integration/` |

## Wat is vervangen?

Actieve opnamecontroller op `/tell`, oude `followRecordedImages`, `setupRecording`, `stopMic`, opname-timings in `stepPhoto`, oude `LOCAL_RH19_ADAPTER` met `playbackAtTime`, V38-videovoorlader en de V34/V37/V38 Story Player-wrappers. De goedgekeurde zelfstandige speler bepaalt zelfstandig timing, beeldwisseling en videopositie. De TALERA PWA gebruikt een kleine brug voor het aanleveren van bestaande foto's/video's en het opslaan van opgenomen stem/cues, zonder tweede mediabibliotheek.

Bestaande datum-/titelvelden, oorspronkelijke fotoverzameling/volgorde, concept-IndexedDB, `TaleraMemories`-opslag, standaardtijdlijn en RH19-presentatielaag blijven staan; RH19 leidt **niet** de opname-synchronisatie.

De optionele `videoAtMs` is toegevoegd aan dezelfde `safeCues`-sanitisatie bij het bewaren van een herinnering.

## Uitgevoerde controles

- Vijf routes op de kandidaat (tijdlijn `/`, `/tell`, `/present`, `/vertelmodus-embed`, `/vertelmodus-health`) leveren HTTP 200.
- In TALERA `/tell`: nieuwe speler opent in zijn eigen iframe, gebruiker kan opname starten/stoppen.
- Na gesimuleerde microfoonopname wordt het audiobestand onder het bestaande `talera-v4-work:manifest` als concept geregistreerd.
- Twee geïmporteerde testfoto's; manuele overgangen **1 → 2 → 1** resulteerden in `[{t:0,index:0},{t:700,index:1},{t:1400,index:0}]`; de opname en de cues bleven in hetzelfde concept.
- Een gebruiker kan na opname sluiten, datum kiezen en op de tijdlijn publiceren; browser navigatie naar `/present` getoetst.
- `TaleraMemories.save/get` bewaart en herstelt media (foto, video, audio) plus cue `{t:680,index:1,videoAtMs:2250}`.
- Uitgebreide presentatieproef: een opgeslagen herinnering geopend met `/present?memory=local-…`, gekozen herinnering en ingebedde speler zichtbaar en audio geladen.
- Bij gesimuleerde audiosprongen schakelde het gepubliceerde verhaal **0 seconden: 1/2; 0,95 seconde: 2/2; 1,65 seconde: 1/2**. De foto's volgden aantoonbaar de opgeslagen cue-klok bij terugkijken op de tijdlijn.
- Oude Story Player opnamefunctie en `playbackAtTime` ontbreken in de gerenderde actieve vertel- en presentatieroutes.

## Nog te toetsen

De eigenaar moet de **nieuwe geïntegreerde uitvoering** op een echte iPhone/Safari testen: echte hoorbare stemopname, foto + video halverwege overslaan, pause/resume, terugluisteren, plaatsen, opnieuw openen, bestaande PWA-regressies, opmaak en opslag. De onafhankelijke speler **is** eerder functioneel goedgekeurd; dat is géén automatische goedkeuring van deze PWA-koppeling.

**Belangrijk:** de kandidaten-Worker gebruikt een andere workers.dev-origin. De lokale bestaande herinneringen op de voorgaande origin verschijnen niet automatisch in deze nieuwe test. Dit is geen dataverwijdering. Inbouw op bestaande origin volgt pas na expliciete acceptatie en herstelafspraak.

## Veilig terugzetten

Cloudflare bewaart de kandidaatversies. De oudere testworkers, V38-bron en zelfstandige goedgekeurde nul-versie zijn niet aangepast. Zonder eigenaarakkoord geen vervanging van de eerder goedgekeurde PWA en geen stilzwijgende wijziging van CURRENT.

## Bouwbaarheid

De zes adapter- en stylesheetbestanden staan in deze branch. De huidige Cloudflare-bundel werd geïsoleerd opgebouwd uit de eerdere Worker en goedgekeurde standalone bron; er is **nog geen volledig reproduceerbare CI-bundelbouw vanuit GitHub**. Maak dit alsnog voordat je deze kandidaat als release naar productie brengt.

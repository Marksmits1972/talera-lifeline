# TALERA – geïntegreerde Story Player, herstelproef (22 oktober 2026)

## Status
**Afzonderlijke proefversie; nog niet vrijgegeven als definitieve PWA.**

- Cloudflare Worker: `talera-pwa-unified-storyplayer-test`
- Proefadres: https://talera-pwa-unified-storyplayer-test.mark-a39.workers.dev/
- Basis: de eerder gepubliceerde, werkende V39-bundel.
- V32 t/m V40 en de andere bestaande Workers zijn niet overschreven.
- De huidige herstelproef staat nog als samengestelde Cloudflare-Worker; deze documentatie is een overdrachts- en acceptatierecord, **niet** een verklaring dat de volledige bundel al reproduceerbaar vanuit GitHub wordt gebouwd.

## Vastgestelde hoofdoorzaak van fout 1101
`taleraV20TagsInTell(html)` voert dynamische tekstvervangingen uit op de vertelpagina en gooit een exception zodra een letterlijk bronfragment niet meer bestaat. De eerdere opslagwijzigingen in V40 veranderden het fragment voor `narrationCues` en daardoor crashte `/tell` met:

`TALERA V20 patchlocatie ontbreekt: transcriptionStatus:'not-requested',narrationCues:g.voi`

De herstelproef behoudt het oorspronkelijke fragment tot na de bestaande V20-transformatie. In de V20-vervangingsstap worden `draftFileKeys` en tags samengevoegd. De publicatie mag niet worden vrijgegeven als deze transformatiestap opnieuw faalt.

## Herstelde onderdelen
1. Foto-originelen worden op de vertelpagina serieel in aparte IndexedDB-transacties geschreven, met beperkte retries.
2. Fotovoorbeelden starten na de commit van de originelen, om piekbelasting te verminderen.
3. Voor het plaatsen op de tijdlijn wordt expliciet gecontroleerd of ieder origineel bestaat en qua grootte overeenkomt.
4. Een geplaatste herinnering verwijst naar de reeds opgeslagen originelen via hun bestaande `talera-v4-work:`-sleutels. Bij plaatsen worden de grote bestanden niet opnieuw gekopieerd.
5. De conceptopruiming verwijdert wel tijdelijke voorbeelden, maar niet de originelen die inmiddels door de tijdlijn gebruikt worden.
6. Kostbare alternatieve telefoonfoto's worden niet tijdens de hoofdopslag geconverteerd. De bestaande weergavefunctie kan deze zo nodig later maken.
7. Bij een ontbrekende foto wordt de fotopositie niet vervangen door een andere geselecteerde foto. Er wordt een zichtbare foutmelding getoond.
8. Wanneer bij een stemopname tijdstempels ontbreken wordt de automatische verdeling expliciet aangeduid.
9. De presentatie gebruikt één actieve wrapper voor de Story Player boven op de bestaande TALERA-presentatie; de eerdere dubbele wrapper is uitgeschakeld.
10. Bij het verlaten van het scherm worden alle aanwezige audio- en video-elementen gepauzeerd.

## Gecontroleerde browsertests (Cloudflare Browser Rendering)
- `/`, `/tell`, `/present` en `/story-player-health` renderen zonder fout 1101.
- Zes afzonderlijke synthetische PNG-bestanden in de vertelpagina geselecteerd: 6 originele blobs opgeslagen, 1 conceptmanifest, geen foutmelding.
- Drie synthetische foto's + een WAV-testopname opgeslagen: 4 media-items, 3 tijdstempels en verwijzingen naar exact de reeds opgeslagen blobs.
- Presentatie geladen met deze herinnering, waarbij het beeld daadwerkelijk zichtbaar was.
- Bij afspeeltijd 0,20 s: foto en actief puntje op index 0.
- Bij afspeeltijd 1,35 s: foto en actief puntje op index 1.
- Bij afspeeltijd 2,55 s: foto en actief puntje op index 2.
- Één actief narratie-element bij de testherinnering.

## Nog niet bewezen en dus releaseblokkades
- Echte Safari-opslag van zes volledige iPhone-foto's en eventuele HEIC-bestanden, gevolgd door het heropenen van de PWA.
- Stem opnemen op een echte iPhone, tijdens de opname bladeren, tijdstempels bewaren en later in de presentatie synchroon terugluisteren.
- Echte iPhone-video's (onder meer MOV/HEVC) dempen, synchroniseren, pauzeren en zonder crash laten wisselen.
- Werkelijke achtergrondbediening en stoppen bij sluiten of verlaten van de iPhone-PWA. Browser-autoplay bood hiervoor geen betrouwbare simulatie.
- Herstelgedrag bij volle iPhone-opslag; melding en gebruikersgegevens moeten behouden blijven.
- Migratie van concepten tussen oudere verschillende `workers.dev`-webadressen. IndexedDB is per origin gescheiden; gegevens worden niet automatisch overgezet.
- Reproduceerbare build van deze specifieke Cloudflare-bundel vanuit de bewaarde GitHub-bronbestanden.

## Acceptatiestap op iPhone
1. Open de **aparte proeflink** en maak een nieuwe herinnering met zes eigen foto's; controleer dat er geen opslagwaarschuwing verschijnt.
2. Sluit en heropen de proef na veilig opslaan; controleer aanwezigheid van alle zes originele beelden.
3. Spreek een korte herinnering in, blader op drie herkenbare momenten en plaats deze op de tijdlijn.
4. Speel terug; controleer dat iedere foto daadwerkelijk zichtbaar is op het gesproken moment, niet alleen de oranje indicator.
5. Herhaal met één video en controleer dat videogeluid gedempt is en stoppen/pauzeren betrouwbaar werkt.
6. Keur pas daarna deze proef goed als basis voor verdere ontwikkeling.

**Promotiebeleid:** een geslaagde upload/deployment is geen acceptatietest. V39 blijft terugvalbasis zolang iPhone-acceptatie niet voltooid is.

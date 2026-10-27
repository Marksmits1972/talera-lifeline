# TALERA — Vertelmodus (schone herbouw)

**Status:** geïsoleerde CANDIDATE, technisch getest op 27 oktober 2026. Geen productierelease.

## Wat is schoon vervangen?

Dit onderdeel vervangt de voormalige aparte Story Player-runtime en diens tijds-/fotokoppeling op de actieve routes. De bestaande TALERA-PWA, herinneringenopslag en RH19-presentatie-engine blijven intact.

- `recording.js`: nieuwe opnamecontroller in de bestaande `/tell`-app, onafhankelijk van oude player-UI. Bewaart het audiobestand en `narrationCues` samen in de bestaande geheugenopslag. Het oude audiobestand wordt pas vervangen na succesvolle opslag.
- `photo-navigation.js`: dezelfde reeds aanwezige fotoweergave; handmatige volgende/vorige foto tijdens opname legt alleen de verandering van foto-index en milliseconde vast.
- `presentation-sync.js`: vervangt de oude `playbackAtTime`-implementatie in de lokale RH19-media-adapter. Laat beelden uitsluitend op daadwerkelijk opgenomen wisselmomenten meelopen; geen kunstmatige tijdverdeling.
- `vertelmodus.css`: schermvullend opnamevenster dat de bestaande foto-weergave vergroot.
- `vertelmodus.js`: openen/sluiten, swipetolerantie en volledig afspelen van video. **Geen automatische fototimer tijdens opname**.

De code is bedoeld voor integratie in de bestaande `TALERA_V4_HTML` closure en `LOCAL_RH19_ADAPTER`. Dit zijn bronbestanden voor de huidige gedeployde integratie, **niet** losse browserpagina's of vijf onafhankelijk uitvoerbare modules.

## Herbouwbasis en versiekoppeling

Baseline: Cloudflare-script `talera-pwa-story-player-v38-test` op 27 oktober 2026. In de nieuwe gecompileerde Worker is alles vanaf `const storyBase=` verwijderd: hierdoor worden de oude V34/V37/V38 Story Player-wrappers niet meer geladen. De oorspronkelijke `TALERA_V4_HTML` is aangepast door de volledige oude `followRecordedImages` / `setupRecording`-implementatie en `stepPhoto` te vervangen door deze nieuwe code. In de oorspronkelijke RH19-media-adapter is het voormalige `playbackAtTime`-blok vervangen. De bestaande foto-/videoopslag, navigatie, presentatie en andere kerncode zijn bewust behouden.

Staging Worker: `talera-pwa-vertelmodus-clean-v1-test`. Test-URL: https://talera-pwa-vertelmodus-clean-v1-test.mark-a39.workers.dev/tell.

De originele V38-scriptcode is nog een vaste, afzonderlijke herstelbasis op Cloudflare. Dit repository bevat de nieuwe moduledelen; het bevat **nog geen volledig autonoom reproduceerbare bundelbouw met CI**. Verwar de GitHub-bronbestandentak niet met een volledig gebouwde PWA.

## Verwachte gebruikersflow

1. Open een bestaande of nieuwe herinnering, zonder extra fotobibliotheek.
2. Kies `Inspreken`: de foto komt groot op hetzelfde scherm.
3. Begin met opnemen. De afbeelding blijft staan totdat de gebruiker tikt, swipet of via pijlen navigeert. Een video loopt wel tot het einde, tenzij de gebruiker eerder doorgaat.
4. De stem wordt opgenomen; de foto-overgangen worden slechts als `[{t: milliseconden, index: fotoIndex}]` vastgelegd.
5. Na stoppen wordt de audio opgeslagen als concept. De terugluisterspeler selecteert per audio-afspeeltijd de laatst geldige cue.
6. Bij publiceren op de tijdlijn gebruikt de presentatie-engine diezelfde cues.

Bestaande audiobestanden zonder cues worden niet kunstmatig uitgelijnd; de gebruiker kan nieuwe opname maken als die koppeling gewenst is. De gebruiker bepaalt de timing; er is geen cue-editor, oranje stippeneditor of los spelersscherm.

## Uitgevoerde technische tests op staging

- GET `/mijn-leven`, `/tell`, `/present`, `/vertelmodus-health`: HTTP 200.
- Twee synthetische foto's: geen automatische wissel tijdens opname.
- Gesimuleerde MediaRecorder: handmatige foto-overgangen (1 → 2 → 1) geven `narrationCues` met juiste foto-index en oplopende milliseconden.
- Afspelen met synthetische audiotijd: 1 → 2 → 1 gevolgd.
- Opname stoppen terwijl recorder is gepauzeerd: pauzetijd wordt niet ten onrechte bij de opnameduur opgeteld.
- Losse tekstherinnering met jaartal publiceren: route eindigt bij `/present`.
- Echte iPhone/Safari en visuele regressies met foto/video/audio moeten door de eigenaar worden getest.

**Belangrijk:** er is nog geen volledig automatische unittestsuite voor de gegenereerde Cloudflare-bundel. Deze kandidaat mag niet stilzwijgend naar CURRENT worden gepromoveerd.

## Herstelafspraak

Werk op een afzonderlijke branch; verander de huidige V38 nooit direct. Gebruik Cloudflare-deployments als terugvalpunt en documenteer iedere nieuw bevestigde versie in de TALERA Project Master. Behoud voor gebruikerstests zo mogelijk dezelfde workers.dev-origin, omdat lokale IndexedDB-data origin-gebonden is.

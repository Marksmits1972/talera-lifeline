# TALERA — CLEAN VERTELMODUS · RELEASE- EN TESTREGISTER

Datum: 27 oktober 2026

## Huidige kandidaat

- Onderdeel: TALERA PWA, ingebouwde Vertelmodus.
- Status: **CANDIDATE, niet CURRENT/GOEDGEKEURD**.
- Werkende gebruikerslink: https://talera-pwa-vertelmodus-v1-test.mark-a39.workers.dev/tell
- Worker: `talera-pwa-vertelmodus-v1-test`; naam bevat nog v1 om bestaande origin/IndexedDB te behouden.
- Actual deployment: `5264c39e-ed9d-484f-a58b-1a3fabd79062`.
- Actual version ID: `53db998b-e9c5-4d57-9a23-f8a332c0a695`.
- Published: `2026-10-27T13:50:54.630049Z`.
- Staging worker: `talera-pwa-vertelmodus-clean-v1-test`.
- Baseline source: Worker `talera-pwa-story-player-v38-test`; V38 zelf ongewijzigd.
- Core PWA V37 blijft de eerdere auditreferentie; nieuw kandidatenbeheer hier verandert die basis niet.

## Verwijderde oude code

- Geen actieve `taleraStoryApp`, `taleraV38App`, V34/V37/V38 Story Player-wrapper, `followRecordedImages` of automatisch audio-gerelateerd schatten van foto-tijden.
- Vervangen: oude `setupRecording` en `stepPhoto` in de vertelpagina, oude `playbackAtTime` in de presentatie-adapter, oude V38 video-preloader en Story Player-fotolaagnamen.
- Behouden: herinneringenopslag/IndexedDB, RH19-presentatie-engine, fotoselectie, fotovolgorde, datum, tijdlijn, iPhone-PWA-navigatie. Geen nieuwe mediabibliotheek.
- Audio heeft uitsluitend verborgen `narrationCues` als noodzakelijke koppeling: index per door gebruiker gekozen foto en milliseconden in de opname.

## Regressiecontroles die uitgevoerd zijn

1. `/vertelmodus-health`, `/tell`, `/present`, `/mijn-leven` via browser-rendering HTTP 200 op staging én gedeployde gebruikerslink.
2. Twee synthetische foto's: geen timerwissel gedurende de opname; tik/pijl wisselt foto.
3. Met gesimuleerde audiorecorder ontstonden `narrationCues` op 0 ms (foto 1), 750 ms (foto 2), 1300 ms (terug foto 1), bewaard bij de opname.
4. Gesimuleerde opname-afspeeltijden: beeld 1 bij 0 s, beeld 2 bij 0,82 s, beeld 1 bij 1,5 s.
5. Opname stoppen tijdens pauze: circa 600 ms werkelijke audiotijd in test, de pauze telt niet mee.
6. Afzonderlijke tekstherinnering met jaartal naar `/present` gepubliceerd.
7. Broninspectie van gedeployde Worker: geen oude Story Player-wrappers, geen Story Player-functienamen; aangepaste onderliggende lokale media-adapter is nog steeds gekoppeld aan RH19.

## Nog open vóór goedkeuring

- Test met echte microfoon, foto's en videobestanden in **Safari op iPhone**.
- Bij meerdere tikken en swipes: geen dubbele fotowissel, audio/foto synchronisatie na publiceren en heropenen.
- Volledige video afspelen en correct dempen bij stemopname; later videogeluid kunnen kiezen.
- Visuele uitlijning en merk-kleuren van het opnamepaneel; gebruikersfeedback was dat V2-kleurgebruik/knoppositie nog niet definitief is.
- Test alle overige PWA-functies en voorkom regressies.
- Volledig geautomatiseerde CI/bundelrebuild ontbreekt nog.

## Terugval

Cloudflare-versiebeheer voor hetzelfde gebruikersadres:

- V3 vorige test: deployment `94d88aef-a565-4f32-a092-70cfafe2997c`; versie `cbaae018-c6ba-4377-b97e-ea92b614a6f0`.
- V2: deployment `ac16c740-6b59-4505-b3ad-3326287b92e9`; versie `f02a2f88-b3b5-4916-be3d-9de082a3d5d3`.
- V1: deployment `e83d168f-a86d-4b07-9ba0-43b474d57cdb`; versie `ceb6a18f-358d-434e-b373-e19b6c082596`.

Deze versie is alleen voor toetsing door de eigenaar. Zonder expliciet akkoord **geen promotie naar CURRENT**. De locatie van opgeslagen browsergegevens hangt af van de workers.dev-origin; die origin is bij het overzetten ongewijzigd gehouden.

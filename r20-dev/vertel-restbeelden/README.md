# TALERA V10 — Eenvoudige aanvulling ontbrekende foto's

**Teststatus:** 5 november 2026. Afzonderlijke test-Worker; nog niet op echte iPhone bevestigd.

## Exacte werking

Er zijn bijvoorbeeld zes media-items in één herinnering. De bestaande gesproken tijdlijn verwijst met `cue.index` naar vier posities uit die lijst. Direct na afloop van de stemopname worden alleen de nog niet gebruikte **foto's** in de oorspronkelijke media-volgorde getoond, vier seconden per foto. Daarna begint ongewijzigd de al bestaande ronde met het oorspronkelijke geluid van video's.

Afspelen = ingesproken verhaal + gekoppelde beelden → niet in de opname gebruikte foto's → bestaande video-afspeelfunctie met geluid → klaar.

## Wat is er vereenvoudigd?

De eerder geïmplementeerde V10-laag met `taleraStartOriginalRound = ...` (onderschepping), `taleraV10PendingStillIndices` (extra wachtrij), cancel-state, en extra `message`-/`pagehide`-listeners is **verwijderd** uit de V10-test-Worker.

Er resteert slechts:
- één kleine functie `taleraV10PlayRemainingPhotosThenVideos()` in de originele vertelspeler, die `state.items` en `state.cues` leest, de ontbrekende foto's toont met de bestaande `show(index)`, en daarna de **letterlijk ongewijzigde** `taleraStartOriginalRound()` aanroept;
- één gewijzigde functieaanroep in de originele `voice.ended`-handler: `taleraStartOriginalRound()` → `taleraV10PlayRemainingPhotosThenVideos()`;
- geen nieuwe opslag of tijdcodes, geen nieuwe media-ID's, geen wijzigingen aan het opnameproces, bestaande video-inhoud of videogeluid.

Het is technisch mogelijk deze ene helper later rechtstreeks in de gekozen TALERA-basis op te nemen. Voorlopig gebruikt de bestaande V10-test-Worker alleen GET `/vertelmodus-embed` om dit ene stukje aan de servergeleverde vertelspeler toe te voegen, **zonder** de beschermde basis aan te passen.

## Waarom vergelijken we posities?

De bestaande opnames slaan `cue.index` op. De iframe zet de mediabestanden in exact dezelfde volgorde in `state.items`. De originele ID's zijn elders in de herinnering opgeslagen, maar worden niet als aparte ID meegegeven aan deze speler. De kleinste veilige uitbreiding vergelijkt daarom de reeds bestaande cue-posities met de originele volgorde van de in de speler beschikbare foto's. Dit vraagt geen nieuwe ID-registerlaag.

## Testresultaten

- **11/11 regressietests**: onder andere 6 foto's / 4 cues / 2 ontbrekende foto's, reeds gebruikte foto's niet dubbel, originele videoaanroep intact, gemengde video/foto-volgorde, oude timer stopt bij laden van andere herinnering.
- **5/5 read-only live HTTP-controles**: alleen `/vertelmodus-embed` wordt aangepast; geen wijzigingen aan het beginscherm, `/present`, `/tell` of API's.
- **Echte Chrome-iframe test** met 6 synthetische foto's en 4 gesproken cues: direct na de gesimuleerde einde-stem-event verschijnt werkelijk foto 5 (`5 / 6`), na 4 seconden foto 6 (`6 / 6`). De Chrome-test gebruikt geen echte persoonlijke foto's.
- GitHub Actions: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42022699948

## Versies en bescherming

- GitHub-branch: `feature/talera-vertel-restbeelden-20261105`
- Enige Worker-bron: `r20-dev/vertel-restbeelden/vertel-restbeelden.worker.mjs`
- Cloudflare-test-Worker: `talera-vertel-restbeelden-v10-test-20261105`
- Cloudflare-versie: `21db9955-a8f2-40d3-915d-21d0ed0372b2`
- Deployment: `9fd3eefc-1b7e-48bf-9e5d-96b2ac160d1b`
- Testlink: https://talera-vertel-restbeelden-v10-test-20261105.mark-a39.workers.dev/
- Bestaande stijl-Worker blijft `bc36d913-49f8-4f4d-b00d-3d5894a11146`
- Beschermde V9 blijft `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`

**Acceptatievoorwaarde:** de gebruiker moet op een echte iPhone met zes eigen foto's waarvan er vier besproken zijn, werkelijk foto 5 en foto 6 na de gesproken cyclus zien. Tot dat moment is de werking met echte opnames niet bewezen.

Let op: de aparte testhost heeft een eigen lokale opslagcontext. Verwijder de reeds geïnstalleerde TALERA-PWA niet; maak desgewenst op de aparte testhost een tijdelijke herinnering.
